/**
 * Visitor Presence Manager — Supabase Realtime Presence
 *
 * Provides globally synchronized real-time presence across all GitProfile visitors.
 * All connected clients share a single Supabase Realtime Presence channel ("gitprofile-online-users").
 * Each browser session maintains its own unique presence key.
 * 
 * Multi-component & React Strict Mode Safe:
 * Uses reference counting so multiple LiveVisitorCounter instances on the same page
 * and StrictMode mount/unmount cycles do not destroy the shared channel prematurely.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

// ── Subscriber system ──────────────────────────────────────────────────────
const countListeners = new Set();
let currentKnownCount = null;
let currentStatus = 'connecting'; // 'connecting' | 'connected' | 'unavailable' | 'error'
let currentIsLive = false;
let currentError = null;

/**
 * Subscribe to visitor count updates.
 * Callback receives { count: number | null, status: string, isLive: boolean, error?: string }.
 * Returns an unsubscribe function.
 */
export function subscribeToVisitorCount(callback) {
  countListeners.add(callback);
  // Immediately emit current known state if initialized
  try {
    callback({
      count: currentKnownCount,
      status: currentStatus,
      isLive: currentIsLive,
      error: currentError,
    });
  } catch { /* ignore */ }

  return () => {
    countListeners.delete(callback);
  };
}

function notifyCountListeners(payload) {
  if (typeof payload?.count === 'number') {
    currentKnownCount = payload.count;
  }
  if (payload?.status) {
    currentStatus = payload.status;
  }
  if (typeof payload?.isLive === 'boolean') {
    currentIsLive = payload.isLive;
  }
  currentError = payload?.error || null;

  const data = {
    count: currentKnownCount,
    status: currentStatus,
    isLive: currentIsLive,
    error: currentError,
    ...payload,
  };

  countListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (e) {
      console.warn('[Presence] Listener error:', e);
    }
  });
}

// ── Presence Channel Management ────────────────────────────────────────────

const CHANNEL_NAME = 'gitprofile-online-users';
let activeChannel = null;
let connectionId = null;
let activeSubscribersCount = 0;
let channelSubscriptionStatus = 'DISCONNECTED';

/**
 * Generate or get a unique connection ID for this browser session.
 */
function getOrCreateConnectionId() {
  if (connectionId) return connectionId;
  try {
    const stored = sessionStorage.getItem('gitprofile_presence_connection_id');
    if (stored) {
      connectionId = stored;
      return connectionId;
    }
  } catch { /* ignore */ }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    connectionId = crypto.randomUUID();
  } else {
    connectionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  try {
    sessionStorage.setItem('gitprofile_presence_connection_id', connectionId);
  } catch { /* ignore */ }

  return connectionId;
}

/**
 * Calculate total active unique connections from presence state.
 */
function calculatePresences(channel) {
  if (!channel) return 1;
  try {
    const state = channel.presenceState();
    if (!state || typeof state !== 'object') return 1;
    const keys = Object.keys(state);
    let count = 0;
    for (const key of keys) {
      const list = state[key];
      if (Array.isArray(list) && list.length > 0) {
        count++;
      }
    }
    return Math.max(1, count);
  } catch (err) {
    console.warn('[Presence] Error reading presence state:', err);
    return 1;
  }
}

/**
 * Initialize the Supabase Realtime Presence channel.
 * Uses reference counting so multiple component mounts don't create duplicate channels.
 */
export function initPresence() {
  activeSubscribersCount++;

  // Guard: Supabase credentials not configured
  if (!isSupabaseConfigured || !supabase) {
    notifyCountListeners({
      count: null,
      status: 'unavailable',
      isLive: false,
      error: 'Supabase credentials not configured',
    });
    return false;
  }

  // Already have an active connected or connecting channel
  if (activeChannel) {
    if (channelSubscriptionStatus === 'SUBSCRIBED') {
      const count = calculatePresences(activeChannel);
      notifyCountListeners({ count, status: 'connected', isLive: true });
    } else {
      notifyCountListeners({ count: currentKnownCount, status: 'connecting', isLive: false });
    }
    return true;
  }

  const connId = getOrCreateConnectionId();
  notifyCountListeners({ count: currentKnownCount, status: 'connecting', isLive: false });

  try {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        presence: {
          key: connId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const count = calculatePresences(channel);
        notifyCountListeners({ count, status: 'connected', isLive: true });
      })
      .on('presence', { event: 'join' }, () => {
        const count = calculatePresences(channel);
        notifyCountListeners({ count, status: 'connected', isLive: true });
      })
      .on('presence', { event: 'leave' }, () => {
        const count = calculatePresences(channel);
        notifyCountListeners({ count, status: 'connected', isLive: true });
      })
      .subscribe(async (status, err) => {
        channelSubscriptionStatus = status;

        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              connection_id: connId,
              online_at: new Date().toISOString(),
              user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            });
            const count = calculatePresences(channel);
            notifyCountListeners({ count, status: 'connected', isLive: true });
          } catch (trackErr) {
            console.warn('[Presence] Failed to track presence:', trackErr);
            notifyCountListeners({ count: 1, status: 'connected', isLive: true });
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`[Presence] Channel status: ${status}`, err);
          notifyCountListeners({
            count: null,
            status: 'error',
            isLive: false,
            error: err?.message || status,
          });
        }
      });

    activeChannel = channel;
    return true;
  } catch (err) {
    console.error('[Presence] Error initializing channel:', err);
    notifyCountListeners({
      count: null,
      status: 'error',
      isLive: false,
      error: err.message,
    });
    return false;
  }
}

/**
 * Clean up the presence channel.
 * Only tears down the real WebSocket connection when all component subscribers have unmounted.
 */
export function cleanupPresence() {
  activeSubscribersCount = Math.max(0, activeSubscribersCount - 1);

  if (activeSubscribersCount > 0) {
    return; // Other components are still using the channel
  }

  if (activeChannel) {
    try {
      activeChannel.untrack().catch(() => {});
    } catch { /* ignore */ }

    try {
      supabase?.removeChannel(activeChannel);
    } catch { /* ignore */ }

    activeChannel = null;
    channelSubscriptionStatus = 'DISCONNECTED';
  }
}

// ── Legacy exports (kept for backward compatibility) ───────────────────────
export function generateUUID() {
  return getOrCreateConnectionId();
}

export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid.trim());
}

export function getOrCreateSessionId() {
  return getOrCreateConnectionId();
}

export async function sendHeartbeat() {
  return { count: currentKnownCount, status: currentStatus, isLive: currentIsLive };
}

export function sendLeaveBeacon() {
  // Disconnect lifecycle handled by Supabase Realtime
}
