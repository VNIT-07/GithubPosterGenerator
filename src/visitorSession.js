/**
 * Visitor Session Manager & API Client
 * 
 * Manages anonymous UUID-based visitor identity across browser tabs without PII,
 * and handles heartbeat requests to the serverless backend.
 */

const STORAGE_KEY = 'gh_poster_visitor_session_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate an RFC4122 version 4 compliant UUID.
 * Uses crypto.randomUUID when available, with a cryptographically secure fallback.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Per RFC 4122 section 4.4: set bits for version 4 and variant
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Fallback for non-crypto environments (math.random)
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
 * Stored in localStorage so multiple tabs in the same browser share the same ID,
 * preventing artificial visitor inflation.
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
    // Fallback to sessionStorage if localStorage is restricted
    try {
      const sessionExisting = sessionStorage.getItem(STORAGE_KEY);
      if (sessionExisting && isValidUUID(sessionExisting)) {
        return sessionExisting.trim();
      }
      const newId = generateUUID();
      sessionStorage.setItem(STORAGE_KEY, newId);
      return newId;
    } catch {
      // In-memory fallback
      return generateUUID();
    }
  }
}

/**
 * Send heartbeat ping to the backend.
 * Returns the latest verified active count from the server.
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
    return {
      count: typeof data.count === 'number' ? Math.max(1, data.count) : null,
      status: data.status || 'ok',
      isLive: true,
    };
  } catch (err) {
    // Return graceful fallback without crashing UI
    return {
      count: null,
      status: 'error',
      isLive: false,
      error: err.message,
    };
  }
}

/**
 * Notify server that the visitor has left (best-effort beacon on unload).
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
    // Fallback fetch with keepalive
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
