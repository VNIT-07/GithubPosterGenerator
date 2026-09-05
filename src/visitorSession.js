/**
 * Visitor Presence Manager — Supabase Realtime Presence
 *
 * Provides TRUE GLOBAL REAL-TIME presence synchronization.
 * All connected clients share a single Supabase Realtime Presence channel.
 * When any client joins or leaves, every other connected client is notified
 * instantly via WebSocket push — no polling required.
 *
 * React Strict Mode safe: handles mount → unmount → remount without duplicates.
 */

import { supabase } from './supabaseClient.js';

// ── Subscriber system (unchanged API surface) ──────────────────────────────
const countListeners = new Set();
let currentKnownCount = null;
let currentIsLive = false;

/**
 * Subscribe to visitor count updates.
 * Callback receives { count: number, isLive: boolean }.
 * Returns an unsubscribe function.
 */
export function subscribeToVisitorCount(callback) {
  countListeners.add(callback);
  // Immediately emit current known state if we have one
  if (currentKnownCount !== null) {
    try {
      callback({ count: currentKnownCount, isLive: currentIsLive });
    } catch { /* ignore */ }
  }
  return () => {
    countListeners.delete(callback);
  };
}

function notifyCountListeners(payload) {
  if (typeof payload?.count === 'number') {
    currentKnownCount = payload.count;
    currentIsLive = payload.isLive !== false;
  }
  countListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (e) {
      console.warn('[Presence] Listener error:', e);
    }
  });
}

// ── Presence Channel Management ────────────────────────────────────────────

const CHANNEL_NAME = 'gitprofile-online-users';
let activeChannel = null;
let connectionId = null;   // unique per connection/tab
let initCount = 0;         // guards against React Strict Mode double-mount

/**
 * Generate a unique connection ID for this tab/session.
 * NOT persisted — each page load / tab gets a fresh ID.
 */
function generateConnectionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculate total active connections from presence state.
 */
function countPresences(channel) {
  const state = channel.presenceState();
  let total = 0;
  for (const key of Object.keys(state)) {
    total += state[key].length;
  }
  return Math.max(0, total);
}

/**
 * Initialize the Supabase Realtime Presence channel.
 * Safe to call multiple times — only one channel is active at a time.
 * Returns true if initialization succeeded, false otherwise.
 */
export function initPresence() {
  // Guard: Supabase not configured
  if (!supabase) {
    notifyCountListeners({ count: null, isLive: false, error: 'Supabase not configured' });
    return false;
  }

  // If we already have an active channel, just re-track
  if (activeChannel && connectionId) {
    activeChannel.track({
      connection_id: connectionId,
      online_at: new Date().toISOString(),
    }).catch(() => { /* ignore re-track errors */ });
    return true;
  }

  initCount++;
  const currentInit = initCount;
  connectionId = generateConnectionId();

  const channel = supabase.channel(CHANNEL_NAME, {
    config: {
      presence: {
        key: connectionId,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      // Fired whenever the full presence state changes (join, leave, or periodic sync)
      if (currentInit !== initCount) return; // stale mount guard
      const count = countPresences(channel);
      notifyCountListeners({ count, isLive: true });
    })
    .on('presence', { event: 'join' }, () => {
      // Also recount on explicit join for fastest UI update
      if (currentInit !== initCount) return;
      const count = countPresences(channel);
      notifyCountListeners({ count, isLive: true });
    })
    .on('presence', { event: 'leave' }, () => {
      // Also recount on explicit leave
      if (currentInit !== initCount) return;
      const count = countPresences(channel);
      notifyCountListeners({ count, isLive: true });
    })
    .subscribe(async (status) => {
      if (currentInit !== initCount) return; // stale mount guard

      if (status === 'SUBSCRIBED') {
        // Track our presence
        await channel.track({
          connection_id: connectionId,
          online_at: new Date().toISOString(),
        });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        notifyCountListeners({ count: currentKnownCount, isLive: false, error: status });
      }
    });

  activeChannel = channel;
  return true;
}

/**
 * Clean up the presence channel.
 * Call on component unmount or page unload.
 */
export function cleanupPresence() {
  initCount++; // invalidate any pending callbacks from previous init

  if (activeChannel) {
    try {
      activeChannel.untrack().catch(() => {});
    } catch { /* ignore */ }

    try {
      supabase?.removeChannel(activeChannel);
    } catch { /* ignore */ }

    activeChannel = null;
  }

  connectionId = null;
}

// ── Legacy exports (kept for backward compat but no longer used) ───────────

/**
 * @deprecated No longer used — presence is managed via Supabase Realtime.
 */
export function generateUUID() {
  return generateConnectionId();
}

/**
 * @deprecated No longer used — presence is managed via Supabase Realtime.
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid.trim());
}

/**
 * @deprecated Kept for backward compatibility. Returns a UUID but is not used by presence.
 */
export function getOrCreateSessionId() {
  return generateConnectionId();
}

/**
 * @deprecated No-op. Heartbeat is replaced by Supabase Presence tracking.
 */
export async function sendHeartbeat() {
  return { count: currentKnownCount, status: 'noop', isLive: currentIsLive };
}

/**
 * @deprecated No-op. Leave is handled by Supabase connection lifecycle.
 */
export function sendLeaveBeacon() {
  // Supabase Realtime handles disconnect automatically
}
