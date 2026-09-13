/**
 * Serverless API Endpoint: Follow / Unfollow System
 * 
 * Strict Directional Follow Architecture:
 * - follower_id: User who initiates the follow (CURRENT_USER)
 * - following_id: Profile being followed (TARGET_USER)
 * 
 * Answers two distinct directional questions:
 * 1. isFollowing: Does CURRENT_USER follow TARGET_USER? (follower_id = current, following_id = target)
 * 2. followsYou: Does TARGET_USER follow CURRENT_USER? (follower_id = target, following_id = current)
 * 
 * Strict multi-layer validation:
 * - Rejects self-follow attempts (follower_id === following_id) with 400 Bad Request
 * - Enforces unique relational constraints (no duplicates)
 */

// Relational Table: Map<`${follower_id}->${following_id}`, { follower_id, following_id, created_at }>
const followTable = new Map();

// Index: user -> Set of userIds that this user is FOLLOWING
const followingIndex = new Map();

// Index: user -> Set of userIds that FOLLOW this user
const followersIndex = new Map();

function normalizeUser(u) {
  if (!u || typeof u !== 'string') return '';
  return u.trim().toLowerCase();
}

function getFollowingSet(userId) {
  const norm = normalizeUser(userId);
  if (!norm) return new Set();
  if (!followingIndex.has(norm)) {
    followingIndex.set(norm, new Set());
  }
  return followingIndex.get(norm);
}

function getFollowersSet(userId) {
  const norm = normalizeUser(userId);
  if (!norm) return new Set();
  if (!followersIndex.has(norm)) {
    followersIndex.set(norm, new Set());
  }
  return followersIndex.get(norm);
}

function hasFollow(fromUser, toUser) {
  const from = normalizeUser(fromUser);
  const to = normalizeUser(toUser);
  if (!from || !to) return false;
  return getFollowingSet(from).has(to);
}

export default async function handler(req, res) {
  const method = req.method || 'GET';

  // GET: Query directional follow status
  if (method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const target = normalizeUser(url.searchParams.get('target') || req.query?.target);
    const current = normalizeUser(
      url.searchParams.get('currentUser') ||
      url.searchParams.get('follower') ||
      req.query?.currentUser ||
      req.query?.follower
    );

    if (!target) {
      return res.status(400).json({ error: 'Missing target username' });
    }

    // Own profile check
    if (current && target === current) {
      return res.status(200).json({
        currentUser: current,
        targetUser: target,
        isOwnProfile: true,
        isFollowing: false,
        followsYou: false,
        targetFollowersCount: getFollowersSet(target).size,
        currentFollowingCount: getFollowingSet(current).size,
      });
    }

    // Directional queries:
    // 1. isFollowing: Does CURRENT follow TARGET?
    const isFollowing = current ? hasFollow(current, target) : false;

    // 2. followsYou: Does TARGET follow CURRENT?
    const followsYou = current ? hasFollow(target, current) : false;

    return res.status(200).json({
      currentUser: current,
      targetUser: target,
      isOwnProfile: false,
      isFollowing,
      followsYou,
      targetFollowersCount: getFollowersSet(target).size,
      currentFollowingCount: current ? getFollowingSet(current).size : 0,
    });
  }

  // POST: Create or Remove directional relationship
  if (method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const target = normalizeUser(body.target || body.following_id);
    const follower = normalizeUser(body.follower || body.currentUser || body.follower_id);
    const targetUserId = body.targetUserId ? String(body.targetUserId).trim().toLowerCase() : null;
    const followerUserId = body.followerUserId ? String(body.followerUserId).trim().toLowerCase() : null;
    const action = body.action || 'toggle'; // 'follow' | 'unfollow' | 'toggle'

    if (!target) {
      return res.status(400).json({ error: 'Target profile username is required' });
    }

    if (!follower) {
      return res.status(401).json({ error: 'Authentication required: current user identity is missing' });
    }

    // ── DATABASE & API CONSTRAINT: REJECT SELF-FOLLOW ATTEMPTS ────────────────
    const isSelfByUsername = target === follower;
    const isSelfById = targetUserId && followerUserId && targetUserId === followerUserId;

    if (isSelfByUsername || isSelfById) {
      return res.status(400).json({
        error: 'Users cannot follow themselves.',
        code: 'SELF_FOLLOW_FORBIDDEN',
      });
    }

    const relationKey = `${follower}->${target}`;
    const currentlyFollowing = hasFollow(follower, target);
    let nextFollowing = currentlyFollowing;

    if (action === 'follow') {
      nextFollowing = true;
      if (!currentlyFollowing) {
        followTable.set(relationKey, {
          follower_id: followerUserId || follower,
          following_id: targetUserId || target,
          created_at: new Date().toISOString(),
        });
        getFollowingSet(follower).add(target);
        getFollowersSet(target).add(follower);
      }
    } else if (action === 'unfollow') {
      nextFollowing = false;
      followTable.delete(relationKey);
      getFollowingSet(follower).delete(target);
      getFollowersSet(target).delete(follower);
    } else {
      // Toggle
      if (currentlyFollowing) {
        nextFollowing = false;
        followTable.delete(relationKey);
        getFollowingSet(follower).delete(target);
        getFollowersSet(target).delete(follower);
      } else {
        nextFollowing = true;
        followTable.set(relationKey, {
          follower_id: followerUserId || follower,
          following_id: targetUserId || target,
          created_at: new Date().toISOString(),
        });
        getFollowingSet(follower).add(target);
        getFollowersSet(target).add(follower);
      }
    }

    const followsYou = hasFollow(target, follower);

    return res.status(200).json({
      success: true,
      currentUser: follower,
      targetUser: target,
      isFollowing: nextFollowing,
      followsYou,
      targetFollowersCount: getFollowersSet(target).size,
      currentFollowingCount: getFollowingSet(follower).size,
      message: nextFollowing ? `Now following @${body.target}` : `Unfollowed @${body.target}`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
