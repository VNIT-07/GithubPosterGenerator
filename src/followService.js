/**
 * Follow Service — Authoritative Real-time Follow State Management
 * 
 * Core Principles:
 * - State is based on the ACTUAL relationship between currentUser.id and targetUser.id
 * - Single source of truth for the entire application (Profile, Following, Followers, Search, Modals)
 * - Directional relationship: follower_id = currentUser.id, following_id = targetUser.id
 * - "Following me" and "I am following them" are strictly separated
 * - Self-profile strictly returns isOwnProfile: true, isFollowing: false (no button rendered)
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const AUTH_USER_KEY = 'gitprofile_authenticated_user';
const FOLLOWING_IDS_KEY = 'gitprofile_following_user_ids';
const FOLLOWING_USERNAMES_KEY = 'gitprofile_following_usernames';

export const DEFAULT_AUTHENTICATED_USER = {
  id: 175917534,
  githubUsername: 'VNIT-07',
  login: 'VNIT-07',
};

// ── In-Memory Authoritative Store (Singleton) ──────────────────────────────
const followingIdsSet = new Set();
const followingUsernamesSet = new Set();
let isInitialized = false;
let initPromise = null;

export function getAuthenticatedUser() {
  try {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.githubUsername) {
        return {
          id: Number(parsed.id) || (parsed.githubUsername.toLowerCase() === 'vnit-07' ? 175917534 : parsed.id),
          githubUsername: parsed.githubUsername,
          login: parsed.githubUsername,
        };
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_AUTHENTICATED_USER;
}

export function setAuthenticatedUser(user) {
  if (!user || !user.githubUsername) return;
  try {
    const userToSave = {
      id: Number(user.id) || (user.githubUsername.toLowerCase() === 'vnit-07' ? 175917534 : user.id),
      githubUsername: user.githubUsername,
      login: user.githubUsername,
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userToSave));
    initAuthoritativeFollows(true);
  } catch { /* ignore */ }
}

/**
 * Check if target is the authenticated user's own profile.
 */
export function isOwnProfile(target) {
  if (!target) return false;
  const current = getAuthenticatedUser();
  const currentNorm = (current.githubUsername || '').trim().toLowerCase();
  const currentId = Number(current.id);

  if (typeof target === 'object') {
    if (target.id && Number(target.id) === currentId) return true;
    const tLogin = (target.login || target.username || '').trim().toLowerCase();
    if (tLogin && tLogin === currentNorm) return true;
  } else if (typeof target === 'number') {
    return target === currentId;
  } else if (typeof target === 'string') {
    const trimmed = target.trim().toLowerCase();
    const num = Number(trimmed);
    if (!isNaN(num) && num === currentId) return true;
    return trimmed === currentNorm;
  }
  return false;
}

// ── Extract standard user identity helpers ─────────────────────────────────
export function extractTargetInfo(target) {
  if (!target) return { targetId: null, targetUsername: '' };

  if (typeof target === 'object') {
    const targetId = Number(target.id) || (typeof target.id === 'string' ? target.id : null);
    const targetUsername = (target.login || target.username || '').trim().toLowerCase();
    return { targetId, targetUsername };
  }
  if (typeof target === 'number') {
    return { targetId: target, targetUsername: '' };
  }
  if (typeof target === 'string') {
    const trimmed = target.trim().toLowerCase();
    const num = Number(trimmed);
    if (!isNaN(num) && num > 0) {
      return { targetId: num, targetUsername: '' };
    }
    return { targetId: null, targetUsername: trimmed };
  }
  return { targetId: null, targetUsername: '' };
}

// ── Listener Subscription System ───────────────────────────────────────────
const followListeners = new Set();

export function subscribeToFollowChanges(callback) {
  followListeners.add(callback);
  return () => followListeners.delete(callback);
}

function notifyFollowListeners(target, isFollowing) {
  const { targetId, targetUsername } = extractTargetInfo(target);
  followListeners.forEach((cb) => {
    try {
      cb({ targetId, targetUsername, isFollowing });
    } catch { /* ignore */ }
  });
}

// ── LocalStorage Helpers ───────────────────────────────────────────────────
function loadFromStorage() {
  try {
    const rawIds = localStorage.getItem(FOLLOWING_IDS_KEY);
    if (rawIds) {
      const arr = JSON.parse(rawIds);
      if (Array.isArray(arr)) {
        arr.forEach((id) => followingIdsSet.add(Number(id)));
      }
    }
    const rawUsernames = localStorage.getItem(FOLLOWING_USERNAMES_KEY);
    if (rawUsernames) {
      const arr = JSON.parse(rawUsernames);
      if (Array.isArray(arr)) {
        arr.forEach((u) => followingUsernamesSet.add(String(u).trim().toLowerCase()));
      }
    }
  } catch { /* ignore */ }
}

function saveToStorage() {
  try {
    localStorage.setItem(FOLLOWING_IDS_KEY, JSON.stringify(Array.from(followingIdsSet)));
    localStorage.setItem(FOLLOWING_USERNAMES_KEY, JSON.stringify(Array.from(followingUsernamesSet)));
  } catch { /* ignore */ }
}

// ── Cross-tab Broadcast Channel ────────────────────────────────────────────
let broadcastChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('gitprofile_follow_directional_realtime');
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (data) {
        if (data.action === 'sync') {
          if (Array.isArray(data.followingIds)) {
            data.followingIds.forEach((id) => followingIdsSet.add(Number(id)));
          }
          if (Array.isArray(data.followingUsernames)) {
            data.followingUsernames.forEach((u) => followingUsernamesSet.add(String(u).toLowerCase()));
          }
          saveToStorage();
          notifyFollowListeners(null, null);
        } else if (data.targetId || data.targetUsername) {
          if (data.isFollowing) {
            if (data.targetId) followingIdsSet.add(Number(data.targetId));
            if (data.targetUsername) followingUsernamesSet.add(data.targetUsername.toLowerCase());
          } else {
            if (data.targetId) followingIdsSet.delete(Number(data.targetId));
            if (data.targetUsername) followingUsernamesSet.delete(data.targetUsername.toLowerCase());
          }
          saveToStorage();
          notifyFollowListeners(data, data.isFollowing);
        }
      }
    };
  }
} catch { /* ignore */ }

// Load storage cache immediately on module evaluation
loadFromStorage();

/**
 * Initialize Authoritative Follows graph from backend and GitHub.
 */
export async function initAuthoritativeFollows(force = false) {
  if (isInitialized && !force) return;
  if (initPromise && !force) return initPromise;

  initPromise = (async () => {
    const current = getAuthenticatedUser();
    const currentNorm = current.githubUsername.toLowerCase().trim();

    try {
      // 1. Fetch from local backend API /api/follows?list=true
      const apiRes = await fetch(
        `/api/follows?list=true&currentUser=${encodeURIComponent(currentNorm)}&currentUserId=${current.id}`
      );
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (Array.isArray(data.followingIds)) {
          data.followingIds.forEach((id) => followingIdsSet.add(Number(id)));
        }
        if (Array.isArray(data.followingUsernames)) {
          data.followingUsernames.forEach((u) => followingUsernamesSet.add(String(u).toLowerCase()));
        }
      }
    } catch { /* fallback to GitHub API directly */ }

    try {
      // 2. Direct GitHub following list to ensure 100% authoritative sync
      const token = import.meta.env.VITE_GITHUB_TOKEN;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const ghRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(current.githubUsername)}/following?per_page=100`,
        { headers }
      );
      if (ghRes.ok) {
        const ghUsers = await ghRes.json();
        if (Array.isArray(ghUsers)) {
          ghUsers.forEach((u) => {
            if (u.id) followingIdsSet.add(Number(u.id));
            if (u.login) followingUsernamesSet.add(u.login.toLowerCase());
          });
        }
      }
    } catch { /* ignore network error */ }

    saveToStorage();
    isInitialized = true;
    notifyFollowListeners(null, null);
  })();

  return initPromise;
}

// Trigger initial authoritative sync in background immediately
if (typeof window !== 'undefined') {
  initAuthoritativeFollows().catch(() => {});
}

/**
 * Authoritative check: Does the currently authenticated user follow targetUser?
 * 
 * Synchronous, highly optimized lookup:
 * - Checks targetUser.id against followingIdsSet
 * - Checks targetUser.login against followingUsernamesSet
 */
export function isUserFollowed(target) {
  if (!target) return false;
  if (isOwnProfile(target)) return false;

  const { targetId, targetUsername } = extractTargetInfo(target);

  if (targetId && followingIdsSet.has(Number(targetId))) {
    return true;
  }
  if (targetUsername && followingUsernamesSet.has(targetUsername)) {
    return true;
  }
  return false;
}

/**
 * Get follow status object.
 */
export async function getFollowStatus(target) {
  if (!target) {
    return { isFollowing: false, followsYou: false, isOwnProfile: false };
  }

  if (isOwnProfile(target)) {
    return { isFollowing: false, followsYou: false, isOwnProfile: true };
  }

  // Ensure initialized
  if (!isInitialized) {
    await initAuthoritativeFollows();
  }

  return {
    isFollowing: isUserFollowed(target),
    followsYou: false,
    isOwnProfile: false,
  };
}

/**
 * Toggle follow status for target user.
 * currentUser → targetUser
 */
export async function toggleFollow(target, currentFollowingState = null) {
  if (!target) throw new Error('Target user is required');
  if (isOwnProfile(target)) {
    throw new Error('Users cannot follow themselves.');
  }

  const { targetId, targetUsername } = extractTargetInfo(target);
  const currentFollowing = currentFollowingState !== null ? currentFollowingState : isUserFollowed(target);
  const nextFollowing = !currentFollowing;

  // 1. Optimistic Update on authoritative sets
  if (nextFollowing) {
    if (targetId) followingIdsSet.add(Number(targetId));
    if (targetUsername) followingUsernamesSet.add(targetUsername);
  } else {
    if (targetId) followingIdsSet.delete(Number(targetId));
    if (targetUsername) followingUsernamesSet.delete(targetUsername);
  }

  saveToStorage();
  notifyFollowListeners({ targetId, targetUsername }, nextFollowing);

  // 2. Broadcast across browser tabs
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        targetId,
        targetUsername,
        isFollowing: nextFollowing,
      });
    }
  } catch { /* ignore */ }

  // 3. Broadcast via Supabase Realtime if configured
  try {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase.channel('gitprofile-online-users');
      channel.send({
        type: 'broadcast',
        event: 'follow_change',
        payload: { targetId, targetUsername, isFollowing: nextFollowing },
      }).catch(() => {});
    }
  } catch { /* ignore */ }

  // 4. Persist to API
  const current = getAuthenticatedUser();
  try {
    const res = await fetch('/api/follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: targetUsername,
        targetUserId: targetId,
        follower: current.githubUsername,
        followerUserId: current.id,
        action: nextFollowing ? 'follow' : 'unfollow',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        isFollowing: Boolean(data.isFollowing),
        followsYou: Boolean(data.followsYou),
        message: data.message,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update follow status');
    }
  } catch (err) {
    // Revert optimistic update on backend error
    if (nextFollowing) {
      if (targetId) followingIdsSet.delete(Number(targetId));
      if (targetUsername) followingUsernamesSet.delete(targetUsername);
    } else {
      if (targetId) followingIdsSet.add(Number(targetId));
      if (targetUsername) followingUsernamesSet.add(targetUsername);
    }
    saveToStorage();
    notifyFollowListeners({ targetId, targetUsername }, currentFollowing);
    throw err;
  }
}
