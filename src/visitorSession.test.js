import { describe, it, expect, beforeEach } from 'vitest';

// Mock browser globals first
const storageMap = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

globalThis.fetch = async (url, opts) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({ count: 5, status: 'ok' }),
  };
};

let beaconSent = false;
Object.defineProperty(globalThis, 'navigator', {
  value: {
    sendBeacon: () => {
      beaconSent = true;
      return true;
    },
  },
  configurable: true,
  writable: true,
});

import {
  generateUUID,
  isValidUUID,
  getOrCreateSessionId,
  sendHeartbeat,
  sendLeaveBeacon,
  subscribeToVisitorCount,
} from './visitorSession.js';

describe('visitorSession', () => {
  beforeEach(() => {
    storageMap.clear();
    beaconSent = false;
  });

  it('generates and validates valid UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    expect(typeof uuid1).toBe('string');
    expect(uuid1.length).toBe(36);
    expect(uuid1).not.toBe(uuid2);
    expect(isValidUUID(uuid1)).toBe(true);
    expect(isValidUUID(uuid2)).toBe(true);

    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null)).toBe(false);
    expect(isValidUUID('12345')).toBe(false);
  });

  it('persists session ID across calls', () => {
    const sessionA = getOrCreateSessionId();
    expect(isValidUUID(sessionA)).toBe(true);
    const sessionB = getOrCreateSessionId();
    expect(sessionA).toBe(sessionB);
  });

  it('sends heartbeat and notifies subscriber', async () => {
    const sessionA = getOrCreateSessionId();
    let subscriberCalled = false;
    let receivedCount = null;
    const unsubscribe = subscribeToVisitorCount((payload) => {
      subscriberCalled = true;
      receivedCount = payload.count;
    });

    const res = await sendHeartbeat(sessionA);
    expect(res.isLive).toBe(true);
    expect(res.count).toBe(5);
    expect(subscriberCalled).toBe(true);
    expect(receivedCount).toBe(5);
    unsubscribe();
  });

  it('sends leave beacon', () => {
    const sessionA = getOrCreateSessionId();
    sendLeaveBeacon(sessionA);
    expect(beaconSent).toBe(true);
  });
});
