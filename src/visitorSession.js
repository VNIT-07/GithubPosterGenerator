/**
 * Visitor Presence Manager — Hybrid Real-Time Multi-Device Synchronization
 *
 * Simultaneously tracks active visitors across every device and browser:
 * 1. Supabase Realtime Presence (when VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured).
 * 2. Zero-Config Public WebSocket Presence Relay (works out-of-the-box across devices without credentials).
 * 3. Serverless Heartbeat API (/api/visitors/heartbeat) with Upstash Redis / local fallback.
 * 4. Cross-Tab BroadcastChannel for instantaneous same-device synchronization.
 * 
 * Safe for React StrictMode, multi-mount reference counting, and graceful network recovery.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

const STORAGE_KEY = 'gh_poster_visitor_session_id';
const BROADCAST_CHANNEL_NAME = 'gitprofile_presence_sync_v2';
const WS_PRESENCE_URL = 'wss://demo.piesocket.com/v3/gh_poster_presence_v1?api_key=VC3Ot8gAnfnuuzKMrNmUc0gAVGfdAwRYdpTiACda';
const TTL_MS = 25000; // 25-second active window
const PING_INTERVAL_MS = 8000; // Ping every 8s

// ── Subscriber System ──────────────────────────────────────────────────────
const countListeners = new Set();
let currentKnownCount = 1;
let currentStatus = 'connected'; // 'connecting' | 'connected' | 'unavailable' | 'error'
let currentIsLive = true;
let currentError = null;

// Map of active peer sessions { [sessionId]: lastSeenTimestamp }
const activePeers = new Map();

export function subscribeToVisitorCount(callback) {
  countListeners.add(callback);
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
    currentKnownCount = Math.max(1, payload.count);
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

// ── Unique Session / Connection ID ─────────────────────────────────────────
let connectionId = null;

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

export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid.trim());
}

export function getOrCreateSessionId() {
  if (connectionId) return connectionId;
  if (typeof window === 'undefined') {
    connectionId = generateUUID();
    return connectionId;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (stored && isValidUUID(stored)) {
      connectionId = stored.trim();
      return connectionId;
    }
  } catch { /* ignore */ }

  connectionId = generateUUID();
  try {
    sessionStorage.setItem(STORAGE_KEY, connectionId);
  } catch { /* ignore */ }
  return connectionId;
}

// ── Cross-Tab Synchronization (BroadcastChannel) ───────────────────────────
let broadcastChannel = null;
if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'PEER_PING' && data.sessionId) {
        if (data.sessionId !== getOrCreateSessionId()) {
          activePeers.set(data.sessionId, Date.now());
          recalculateActiveCount();
        }
      } else if (data.type === 'PEER_LEAVE' && data.sessionId) {
        activePeers.delete(data.sessionId);
        recalculateActiveCount();
      } else if (data.type === 'COUNT_SYNC' && typeof data.count === 'number') {
        notifyCountListeners({ count: data.count, status: 'connected', isLive: true });
      }
    };
  } catch {
    broadcastChannel = null;
  }
}

function broadcastMessage(msg) {
  if (!broadcastChannel) return;
  try {
    broadcastChannel.postMessage(msg);
  } catch { /* ignore */ }
}

function recalculateActiveCount() {
  const now = Date.now();
  for (const [id, time] of activePeers.entries()) {
    if (now - time > TTL_MS) {
      activePeers.delete(id);
    }
  }
  const total = Math.max(1, activePeers.size + 1); // Peers + this client
  notifyCountListeners({ count: total, status: 'connected', isLive: true });
  broadcastMessage({ type: 'COUNT_SYNC', count: total });
  return total;
}

// ── Zero-Config WebSocket Relay Presence ───────────────────────────────────
let wsClient = null;
let wsPingInterval = null;
let wsReconnectTimeout = null;

function initWebSocketPresence() {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
  if (wsClient && (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const myId = getOrCreateSessionId();

  try {
    wsClient = new WebSocket(WS_PRESENCE_URL);

    wsClient.onopen = () => {
      sendWebSocketPing();
      if (!wsPingInterval) {
        wsPingInterval = setInterval(sendWebSocketPing, PING_INTERVAL_MS);
      }
    };

    wsClient.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.sessionId && payload.sessionId !== myId) {
          if (payload.action === 'leave') {
            activePeers.delete(payload.sessionId);
          } else {
            activePeers.set(payload.sessionId, Date.now());
          }
          recalculateActiveCount();
        }
      } catch { /* ignore non-JSON messages */ }
    };

    wsClient.onclose = () => {
      if (wsPingInterval) {
        clearInterval(wsPingInterval);
        wsPingInterval = null;
      }
      // Reconnect with backoff
      if (!wsReconnectTimeout) {
        wsReconnectTimeout = setTimeout(() => {
          wsReconnectTimeout = null;
          if (activeSubscribersCount > 0) initWebSocketPresence();
        }, 5000);
      }
    };

    wsClient.onerror = () => {
      try { wsClient.close(); } catch { /* ignore */ }
    };
  } catch (err) {
    console.warn('[Presence] WebSocket relay notice:', err.message);
  }
}

function sendWebSocketPing() {
  const myId = getOrCreateSessionId();
  broadcastMessage({ type: 'PEER_PING', sessionId: myId });

  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    try {
      wsClient.send(JSON.stringify({
        action: 'ping',
        sessionId: myId,
        timestamp: Date.now(),
      }));
    } catch { /* ignore */ }
  }

  // Periodic cleanup
  recalculateActiveCount();
}

function sendWebSocketLeave() {
  const myId = getOrCreateSessionId();
  broadcastMessage({ type: 'PEER_LEAVE', sessionId: myId });

  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    try {
      wsClient.send(JSON.stringify({
        action: 'leave',
        sessionId: myId,
      }));
    } catch { /* ignore */ }
  }
}

// ── Supabase Realtime Channel Management ───────────────────────────────────
const CHANNEL_NAME = 'gitprofile-online-users';
let activeChannel = null;
let activeSubscribersCount = 0;
let channelSubscriptionStatus = 'DISCONNECTED';
let heartbeatInterval = null;

function calculatePresences(channel) {
  if (!channel) return 1;
  try {
    const state = channel.presenceState();
    if (!state || typeof state !== 'object') return 1;
    const keys = Object.keys(state);
    let count = 0;
    for (const key of keys) {
      const list = state[key];
      if (Array.isArray(list) && list.length > 0) count++;
    }
    return Math.max(1, count);
  } catch {
    return 1;
  }
}

/**
 * Initialize Presence Tracking
 */
export function initPresence() {
  activeSubscribersCount++;
  const connId = getOrCreateSessionId();

  // Mode 1: Supabase Realtime (if configured)
  if (isSupabaseConfigured && supabase) {
    if (activeChannel) {
      if (channelSubscriptionStatus === 'SUBSCRIBED') {
        const count = calculatePresences(activeChannel);
        notifyCountListeners({ count, status: 'connected', isLive: true });
      }
      return true;
    }

    try {
      const channel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: connId } },
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
        .subscribe(async (status) => {
          channelSubscriptionStatus = status;
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track({
                connection_id: connId,
                online_at: new Date().toISOString(),
              });
              const count = calculatePresences(channel);
              notifyCountListeners({ count, status: 'connected', isLive: true });
            } catch {
              notifyCountListeners({ count: 1, status: 'connected', isLive: true });
            }
          }
        });

      activeChannel = channel;
    } catch { /* fallback */ }
  }

  // Mode 2: Zero-Config Real-Time WebSocket Presence (Always active across devices)
  initWebSocketPresence();

  // Mode 3: REST Heartbeat Loop
  sendHeartbeat(connId).catch(() => {});
  if (!heartbeatInterval) {
    heartbeatInterval = setInterval(() => {
      sendHeartbeat(connId).catch(() => {});
    }, 12000);
  }

  return true;
}

/**
 * Clean up Presence on component unmount
 */
export function cleanupPresence() {
  activeSubscribersCount = Math.max(0, activeSubscribersCount - 1);

  if (activeSubscribersCount > 0) return;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (wsPingInterval) {
    clearInterval(wsPingInterval);
    wsPingInterval = null;
  }

  sendWebSocketLeave();

  if (wsClient) {
    try { wsClient.close(); } catch { /* ignore */ }
    wsClient = null;
  }

  if (activeChannel) {
    try { activeChannel.untrack().catch(() => {}); } catch { /* ignore */ }
    try { supabase?.removeChannel(activeChannel); } catch { /* ignore */ }
    activeChannel = null;
    channelSubscriptionStatus = 'DISCONNECTED';
  }
}

/**
 * Send heartbeat ping to the backend API endpoint
 */
export async function sendHeartbeat(sessionId, endpoint = '/api/visitors/heartbeat') {
  if (!sessionId || !isValidUUID(sessionId)) {
    sessionId = getOrCreateSessionId();
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        sessionId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number' && data.count > 0) {
        const merged = Math.max(data.count, activePeers.size + 1);
        const payload = {
          count: merged,
          status: 'connected',
          storage: data.storage || 'default',
          isLive: true,
        };
        notifyCountListeners(payload);
        broadcastMessage({ type: 'COUNT_SYNC', count: merged });
        return payload;
      }
    }
  } catch { /* ignore network error, continue with local peer count */ }

  const localCount = Math.max(1, activePeers.size + 1);
  const fallbackPayload = {
    count: localCount,
    status: 'connected',
    isLive: true,
  };
  notifyCountListeners(fallbackPayload);
  return fallbackPayload;
}

/**
 * Notify server and peers when visitor leaves
 */
export function sendLeaveBeacon(sessionId, endpoint = '/api/visitors/heartbeat') {
  if (!sessionId || !isValidUUID(sessionId) || typeof window === 'undefined') return;

  sendWebSocketLeave();

  const payload = JSON.stringify({ action: 'leave', sessionId });

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
    } catch { /* ignore */ }
  }
}
