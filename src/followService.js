/**
 * Follow Service — Real-time Directional Follow Management
 * 
 * Answers two distinct directional queries:
 * 1. isFollowing: Does CURRENT_USER follow TARGET_USER?
 * 2. followsYou: Does TARGET_USER follow CURRENT_USER?
 * 
 * Rules:
 * - isFollowing controls whether [ + Follow ] or [ ✓ Following ] is rendered
 * - followsYou NEVER causes the button to show "Following"
 * - isOwnProfile strictly prevents rendering any Follow button on self
 * - Directional relationship: follower_id = CURRENT_USER, following_id = TARGET_USER
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const AUTH_USER_KEY = 'gitprofile_authenticated_user';
const FOLLOWS_CACHE_KEY = 'gitprofile_directional_follows_cache';

export const DEFAULT_AUTHENTICATED_USER = {
  id: 'usr_vnit07',
  githubUsername: 'VNIT-07',
};

/**
 * Get the currently authenticated user's profile identity.
 */
export function getAuthenticatedUser() {
  try {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.githubUsername) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_AUTHENTICATED_USER;
}

/**
 * Set the currently authenticated user's profile identity.
 */
export function setAuthenticatedUser(user) {
  if (!user || !user.githubUsername) return;
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    notifyFollowListeners();
  } catch { /* ignore */ }
}

/**
 * Check if the given GitHub username belongs to the currently authenticated user.
 * Universal helper used across the entire site.
 */
export function isOwnProfile(targetUsername) {
  if (!targetUsername || typeof targetUsername !== 'string') return false;
  const current = getAuthenticatedUser();
  return targetUsername.trim().toLowerCase() === current.githubUsername.trim().toLowerCase();
}

function getLocalCache() {
  try {
    const raw = localStorage.getItem(FOLLOWS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCache(cache) {
  try {
    localStorage.setItem(FOLLOWS_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

const followListeners = new Set();

export function subscribeToFollowChanges(callback) {
  followListeners.add(callback);
  return () => followListeners.delete(callback);
}

function notifyFollowListeners(target, isFollowing, followsYou) {
  const norm = (target || '').toLowerCase().trim();
  followListeners.forEach((cb) => {
    try {
      cb({ target: norm, isFollowing, followsYou });
    } catch { /* ignore */ }
  });
}

// ── Cross-tab Real-time Broadcast Channel ──────────────────────────────────
let broadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('gitprofile_follow_directional_realtime');
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.target) {
        const cache = getLocalCache();
        const current = getAuthenticatedUser();
        const currentNorm = current.githubUsername.toLowerCase();
        
        // Update directional entry: CURRENT -> TARGET
        cache[`${currentNorm}->${data.target}`] = {
          isFollowing: data.isFollowing,
          followsYou: data.followsYou || false,
        };
        saveLocalCache(cache);

        notifyFollowListeners(data.target, data.isFollowing, data.followsYou);
      }
    };
  }
} catch { /* ignore */ }

// Storage listener fallback
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FOLLOWS_CACHE_KEY && e.newValue) {
      try {
        const cache = JSON.parse(e.newValue);
        const current = getAuthenticatedUser();
        const prefix = `${current.githubUsername.toLowerCase()}->`;
        Object.keys(cache).forEach((key) => {
          if (key.startsWith(prefix)) {
            const target = key.replace(prefix, '');
            const entry = cache[key];
            notifyFollowListeners(target, entry?.isFollowing, entry?.followsYou);
          }
        });
      } catch { /* ignore */ }
    }
  });
}

/**
 * Check directional follow status:
 * isFollowing: Does CURRENT_USER follow TARGET_USER?
 * followsYou: Does TARGET_USER follow CURRENT_USER?
 */
export async function getFollowStatus(targetUsername) {
  if (!targetUsername) {
    return { isFollowing: false, followsYou: false, isOwnProfile: false };
  }

  const normTarget = targetUsername.toLowerCase().trim();

  // Self-profile check: strictly no following possible
  if (isOwnProfile(normTarget)) {
    return {
      isFollowing: false,
      followsYou: false,
      isOwnProfile: true,
    };
  }

  const current = getAuthenticatedUser();
  const currentNorm = current.githubUsername.toLowerCase().trim();
  const cacheKey = `${currentNorm}->${normTarget}`;

  // 1. Read cached state
  const cache = getLocalCache();
  const cachedEntry = cache[cacheKey];
  const initialFollowing = Boolean(cachedEntry?.isFollowing);
  const initialFollowsYou = Boolean(cachedEntry?.followsYou);

  // 2. Fetch from backend API to confirm
  try {
    const res = await fetch(
      `/api/follows?target=${encodeURIComponent(normTarget)}&currentUser=${encodeURIComponent(currentNorm)}`
    );
    if (res.ok) {
      const data = await res.json();
      cache[cacheKey] = {
        isFollowing: Boolean(data.isFollowing),
        followsYou: Boolean(data.followsYou),
      };
      saveLocalCache(cache);

      return {
        isFollowing: Boolean(data.isFollowing),
        followsYou: Boolean(data.followsYou),
        isOwnProfile: false,
      };
    }
  } catch (err) {
    // Graceful fallback to cache
  }

  return {
    isFollowing: initialFollowing,
    followsYou: initialFollowsYou,
    isOwnProfile: false,
  };
}

/**
 * Toggle follow status for target user.
 * CURRENT_USER -> TARGET_USER
 */
export async function toggleFollow(targetUsername, currentFollowingState = false) {
  if (!targetUsername) throw new Error('Target username is required');

  const normTarget = targetUsername.toLowerCase().trim();

  // Self-follow rejection
  if (isOwnProfile(normTarget)) {
    throw new Error('Users cannot follow themselves.');
  }

  const current = getAuthenticatedUser();
  const currentNorm = current.githubUsername.toLowerCase().trim();
  const cacheKey = `${currentNorm}->${normTarget}`;
  const nextFollowing = !currentFollowingState;
  const action = nextFollowing ? 'follow' : 'unfollow';

  const cache = getLocalCache();
  const previousFollowsYou = cache[cacheKey]?.followsYou || false;

  // 1. Optimistic update
  cache[cacheKey] = {
    isFollowing: nextFollowing,
    followsYou: previousFollowsYou,
  };
  saveLocalCache(cache);
  notifyFollowListeners(normTarget, nextFollowing, previousFollowsYou);

  // 2. Broadcast across tabs
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        target: normTarget,
        isFollowing: nextFollowing,
        followsYou: previousFollowsYou,
      });
    }
  } catch { /* ignore */ }

  // 3. Broadcast via Supabase Realtime
  try {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase.channel('gitprofile-online-users');
      channel.send({
        type: 'broadcast',
        event: 'follow_change',
        payload: { target: normTarget, isFollowing: nextFollowing },
      }).catch(() => {});
    }
  } catch { /* ignore */ }

  // 4. Persist to API
  try {
    const res = await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: normTarget,
        follower: currentNorm,
        targetUserId: `usr_${normTarget}`,
        followerUserId: current.id,
        action,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      cache[cacheKey] = {
        isFollowing: Boolean(data.isFollowing),
        followsYou: Boolean(data.followsYou),
      };
      saveLocalCache(cache);
      return {
        success: true,
        isFollowing: data.isFollowing,
        followsYou: data.followsYou,
        message: data.message,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update follow status');
    }
  } catch (err) {
    if (err.message && err.message.includes('cannot follow themselves')) {
      delete cache[cacheKey];
      saveLocalCache(cache);
      notifyFollowListeners(normTarget, false, previousFollowsYou);
      throw err;
    }
  }

  return {
    success: true,
    isFollowing: nextFollowing,
    followsYou: previousFollowsYou,
    message: nextFollowing ? `Now following @${targetUsername}` : `Unfollowed @${targetUsername}`,
  };
}
