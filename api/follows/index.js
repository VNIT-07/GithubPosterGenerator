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
 * Key guarantees:
 * - Authoritative state based on actual relationship between currentUser.id and targetUser.id
 * - Support for querying entire following ID set (list=true)
 * - Auto-seeding from GitHub graph for authenticated user
 * - Rejects self-follow attempts with 400 Bad Request
 * - Enforces unique relational constraints
 */

// Relational Table: Map<`${follower_id}->${following_id}`, { follower_id, following_id, follower_username, following_username, created_at }>
const followTable = new Map();

// Index by user ID: userId -> Set of target user IDs
const followingIdsIndex = new Map();

// Index by username: username -> Set of target usernames (lowercase)
const followingUsernamesIndex = new Map();

// Reverse index: target userId -> Set of follower user IDs
const followersIdsIndex = new Map();

// Reverse index: target username -> Set of follower usernames
const followersUsernamesIndex = new Map();

// Track users whose following graph has been seeded
const seededUsers = new Set();

function normalizeUser(u) {
  if (!u || typeof u !== 'string') return '';
  return u.trim().toLowerCase();
}

function normalizeId(id) {
  if (!id) return null;
  const num = Number(id);
  return !isNaN(num) && num > 0 ? num : String(id).trim().toLowerCase();
}

function getFollowingIdsSet(userId) {
  const norm = normalizeId(userId);
  if (!norm) return new Set();
  const key = String(norm);
  if (!followingIdsIndex.has(key)) {
    followingIdsIndex.set(key, new Set());
  }
  return followingIdsIndex.get(key);
}

function getFollowingUsernamesSet(username) {
  const norm = normalizeUser(username);
  if (!norm) return new Set();
  if (!followingUsernamesIndex.has(norm)) {
    followingUsernamesIndex.set(norm, new Set());
  }
  return followingUsernamesIndex.get(norm);
}

function getFollowersUsernamesSet(username) {
  const norm = normalizeUser(username);
  if (!norm) return new Set();
  if (!followersUsernamesIndex.has(norm)) {
    followersUsernamesIndex.set(norm, new Set());
  }
  return followersUsernamesIndex.get(norm);
}

/**
 * Check if followerUser follows targetUser.
 * Checks both ID-level and username-level relationships.
 */
function hasFollow({ followerId, followerUsername, targetId, targetUsername }) {
  const fId = normalizeId(followerId);
  const tId = normalizeId(targetId);
  const fUser = normalizeUser(followerUsername);
  const tUser = normalizeUser(targetUsername);

  if (fId && tId && getFollowingIdsSet(fId).has(tId)) {
    return true;
  }
  if (fUser && tUser && getFollowingUsernamesSet(fUser).has(tUser)) {
    return true;
  }
  if (fUser && tId && getFollowingIdsSet(fUser).has(tId)) {
    return true;
  }
  if (fId && tUser && getFollowingUsernamesSet(fId).has(tUser)) {
    return true;
  }
  return false;
}

/**
 * Seed initial following graph from GitHub for a user.
 */
async function ensureUserFollowsSeeded(username, userId) {
  const normUser = normalizeUser(username);
  if (!normUser || seededUsers.has(normUser)) return;

  seededUsers.add(normUser);

  try {
    const token = process.env.VITE_GITHUB_TOKEN;
    const headers = { 'User-Agent': 'GitHubPosterGenerator-FollowService' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/following?per_page=100`, { headers });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const currentId = normalizeId(userId) || (normUser === 'vnit-07' ? 175917534 : normUser);

        list.forEach((u) => {
          const tId = normalizeId(u.id);
          const tUser = normalizeUser(u.login);

          if (tId) getFollowingIdsSet(currentId).add(tId);
          if (tUser) {
            getFollowingUsernamesSet(normUser).add(tUser);
            getFollowersUsernamesSet(tUser).add(normUser);
          }

          const relationKey = `${currentId}->${tId || tUser}`;
          followTable.set(relationKey, {
            follower_id: currentId,
            following_id: tId || tUser,
            follower_username: normUser,
            following_username: tUser,
            created_at: new Date().toISOString(),
          });
        });
      }
    }
  } catch (err) {
    // Graceful fallback
  }
}

export default async function handler(req, res) {
  const method = req.method || 'GET';

  // GET: Query directional follow status or list of followed users
  if (method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const isList = url.searchParams.get('list') === 'true' || req.query?.list === 'true';

    const currentUsername = normalizeUser(
      url.searchParams.get('currentUser') ||
      url.searchParams.get('follower') ||
      req.query?.currentUser ||
      req.query?.follower ||
      'vnit-07'
    );
    const currentUserId = normalizeId(
      url.searchParams.get('currentUserId') ||
      url.searchParams.get('followerId') ||
      req.query?.currentUserId ||
      req.query?.followerId ||
      (currentUsername === 'vnit-07' ? 175917534 : null)
    );

    // Auto-seed user's following list from GitHub if not already seeded
    await ensureUserFollowsSeeded(currentUsername, currentUserId);

    // List mode: returns all followed IDs and usernames for current user
    if (isList) {
      const ids = Array.from(getFollowingIdsSet(currentUserId || currentUsername));
      const usernames = Array.from(getFollowingUsernamesSet(currentUsername));
      return res.status(200).json({
        success: true,
        currentUser: currentUsername,
        currentUserId,
        followingIds: ids,
        followingUsernames: usernames,
        total: Math.max(ids.length, usernames.length)
      });
    }

    const targetUsername = normalizeUser(url.searchParams.get('target') || req.query?.target);
    const targetUserId = normalizeId(url.searchParams.get('targetId') || req.query?.targetId);

    if (!targetUsername && !targetUserId) {
      return res.status(400).json({ error: 'Missing target username or ID' });
    }

    // Own profile check
    const isOwn = (currentUserId && targetUserId && currentUserId === targetUserId) ||
                  (currentUsername && targetUsername && currentUsername === targetUsername);

    if (isOwn) {
      return res.status(200).json({
        currentUser: currentUsername,
        currentUserId,
        targetUser: targetUsername,
        targetUserId,
        isOwnProfile: true,
        isFollowing: false,
        followsYou: false,
      });
    }

    // Directional queries:
    // 1. isFollowing: Does CURRENT follow TARGET?
    const isFollowing = hasFollow({
      followerId: currentUserId,
      followerUsername: currentUsername,
      targetId: targetUserId,
      targetUsername: targetUsername,
    });

    // 2. followsYou: Does TARGET follow CURRENT?
    const followsYou = hasFollow({
      followerId: targetUserId,
      followerUsername: targetUsername,
      targetId: currentUserId,
      targetUsername: currentUsername,
    });

    return res.status(200).json({
      currentUser: currentUsername,
      currentUserId,
      targetUser: targetUsername,
      targetUserId,
      isOwnProfile: false,
      isFollowing,
      followsYou,
      targetFollowersCount: getFollowersUsernamesSet(targetUsername).size,
      currentFollowingCount: getFollowingUsernamesSet(currentUsername).size,
    });
  }

  // POST: Create or Remove directional relationship
  if (method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const targetUsername = normalizeUser(body.target || body.following_username || body.following_id);
    const targetUserId = normalizeId(body.targetUserId || body.following_id);
    const followerUsername = normalizeUser(body.follower || body.currentUser || body.follower_username || body.follower_id || 'vnit-07');
    const followerUserId = normalizeId(body.followerUserId || body.follower_id || (followerUsername === 'vnit-07' ? 175917534 : null));
    const action = body.action || 'toggle'; // 'follow' | 'unfollow' | 'toggle'

    if (!targetUsername && !targetUserId) {
      return res.status(400).json({ error: 'Target profile username or ID is required' });
    }

    if (!followerUsername && !followerUserId) {
      return res.status(401).json({ error: 'Authentication required: current user identity is missing' });
    }

    // ── CONSTRAINT: REJECT SELF-FOLLOW ATTEMPTS ────────────────
    const isSelfByUsername = targetUsername && followerUsername && targetUsername === followerUsername;
    const isSelfById = targetUserId && followerUserId && targetUserId === followerUserId;

    if (isSelfByUsername || isSelfById) {
      return res.status(400).json({
        error: 'Users cannot follow themselves.',
        code: 'SELF_FOLLOW_FORBIDDEN',
      });
    }

    // Ensure initial following list is seeded before modifying
    await ensureUserFollowsSeeded(followerUsername, followerUserId);

    const currentlyFollowing = hasFollow({
      followerId: followerUserId,
      followerUsername,
      targetId: targetUserId,
      targetUsername,
    });

    let nextFollowing = currentlyFollowing;

    if (action === 'follow') {
      nextFollowing = true;
    } else if (action === 'unfollow') {
      nextFollowing = false;
    } else {
      nextFollowing = !currentlyFollowing;
    }

    const relationKey = `${followerUserId || followerUsername}->${targetUserId || targetUsername}`;

    if (nextFollowing) {
      followTable.set(relationKey, {
        follower_id: followerUserId,
        following_id: targetUserId,
        follower_username: followerUsername,
        following_username: targetUsername,
        created_at: new Date().toISOString(),
      });
      if (followerUserId && targetUserId) {
        getFollowingIdsSet(followerUserId).add(targetUserId);
      }
      if (followerUsername && targetUsername) {
        getFollowingUsernamesSet(followerUsername).add(targetUsername);
        getFollowersUsernamesSet(targetUsername).add(followerUsername);
      }
    } else {
      followTable.delete(relationKey);
      if (followerUserId && targetUserId) {
        getFollowingIdsSet(followerUserId).delete(targetUserId);
      }
      if (followerUsername && targetUsername) {
        getFollowingUsernamesSet(followerUsername).delete(targetUsername);
        getFollowersUsernamesSet(targetUsername).delete(followerUsername);
      }
    }

    const followsYou = hasFollow({
      followerId: targetUserId,
      followerUsername: targetUsername,
      targetId: followerUserId,
      targetUsername: followerUsername,
    });

    return res.status(200).json({
      success: true,
      currentUser: followerUsername,
      currentUserId: followerUserId,
      targetUser: targetUsername,
      targetUserId,
      isFollowing: nextFollowing,
      followsYou,
      targetFollowersCount: getFollowersUsernamesSet(targetUsername).size,
      currentFollowingCount: getFollowingUsernamesSet(followerUsername).size,
      message: nextFollowing ? `Now following @${targetUsername || targetUserId}` : `Unfollowed @${targetUsername || targetUserId}`,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
