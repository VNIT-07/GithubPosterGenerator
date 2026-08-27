/**
 * Visitor Session Manager & Real-Time Client
 * 
 * - Anonymous UUID v4 generation and persistence.
 * - 0ms Cross-Tab Synchronization via BroadcastChannel API.
 * - Dynamic 8-second Heartbeat Loop.
 * - Mobile lifecycle listeners (visibilitychange, pagehide, beforeunload, online/offline).
 */

const STORAGE_KEY = 'gh_poster_visitor_session_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BROADCAST_CHANNEL_NAME = 'gh_poster_visitor_presence_v1';

// BroadcastChannel for instant same-device cross-tab communication
let broadcastChannel = null;
if (typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.BroadcastChannel === 'function') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

// Active listeners for visitor count updates
const countListeners = new Set();
let currentKnownCount = null;

export function subscribeToVisitorCount(callback) {
  countListeners.add(callback);
  if (currentKnownCount !== null) {
    callback({ count: currentKnownCount, isLive: true });
  }
  return () => {
    countListeners.delete(callback);
  };
}

function notifyCountListeners(payload) {
  if (typeof payload?.count === 'number') {
    currentKnownCount = payload.count;
  }
  countListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (e) {
      console.warn('Listener error:', e);
    }
  });
}

// Listen to messages from other tabs on the same device
if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'COUNT_UPDATE' && typeof event.data.count === 'number') {
      notifyCountListeners({
        count: event.data.count,
        isLive: true,
        source: 'broadcast',
      });
    }
  };
}

/**
 * Generate an RFC4122 version 4 compliant UUID.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates whether a string is a valid UUID v4.
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Get or create the anonymous session ID.
 */
export function getOrCreateSessionId() {
  if (typeof window === 'undefined') {
    return generateUUID();
  }

  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && isValidUUID(existing)) {
      return existing.trim();
    }

    const newId = generateUUID();
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    try {
      const sessionExisting = sessionStorage.getItem(STORAGE_KEY);
      if (sessionExisting && isValidUUID(sessionExisting)) {
        return sessionExisting.trim();
      }
      const newId = generateUUID();
      sessionStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch {
      return generateUUID();
    }
  }
}

/**
 * Send heartbeat ping to the backend.
 */
export async function sendHeartbeat(sessionId, endpoint = '/api/visitors/heartbeat') {
  if (!sessionId || !isValidUUID(sessionId)) {
    sessionId = getOrCreateSessionId();
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'heartbeat',
        sessionId,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const count = typeof data.count === 'number' ? Math.max(1, data.count) : null;
    
    const payload = {
      count,
      status: data.status || 'ok',
      storage: data.storage || 'default',
      isLive: true,
    };

    // Notify local subscribers
    notifyCountListeners(payload);

    // Broadcast update to all other open tabs on this browser
    if (broadcastChannel && count !== null) {
      try {
        broadcastChannel.postMessage({
          type: 'COUNT_UPDATE',
          count,
        });
      } catch {
        // Ignore broadcast errors
      }
    }

    return payload;
  } catch (err) {
    const payload = {
      count: currentKnownCount !== null ? currentKnownCount : null,
      status: 'error',
      isLive: false,
      error: err.message,
    };
    notifyCountListeners(payload);
    return payload;
  }
}

/**
 * Notify server that the visitor has left (supports beacon and keepalive for mobile).
 */
export function sendLeaveBeacon(sessionId, endpoint = '/api/visitors/heartbeat') {
  if (!sessionId || !isValidUUID(sessionId) || typeof window === 'undefined') return;

  const payload = JSON.stringify({
    action: 'leave',
    sessionId,
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
  } else {
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore unload errors
    }
  }
}
