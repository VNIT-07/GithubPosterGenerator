import assert from 'node:assert';

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
globalThis.navigator = {
  sendBeacon: () => {
    beaconSent = true;
    return true;
  },
};

import {
  generateUUID,
  isValidUUID,
  getOrCreateSessionId,
  sendHeartbeat,
  sendLeaveBeacon,
  subscribeToVisitorCount,
} from './visitorSession.js';

async function runTests() {
  console.log('Testing UUID generation...');
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();

  assert.strictEqual(typeof uuid1, 'string');
  assert.strictEqual(uuid1.length, 36);
  assert.notStrictEqual(uuid1, uuid2);
  assert.strictEqual(isValidUUID(uuid1), true);
  assert.strictEqual(isValidUUID(uuid2), true);

  assert.strictEqual(isValidUUID(''), false);
  assert.strictEqual(isValidUUID(null), false);
  assert.strictEqual(isValidUUID('12345'), false);
  console.log('✓ UUID generation and validation passed');

  console.log('Testing session persistence...');
  const sessionA = getOrCreateSessionId();
  assert.strictEqual(isValidUUID(sessionA), true);
  const sessionB = getOrCreateSessionId();
  assert.strictEqual(sessionA, sessionB);
  console.log('✓ Session persistence passed');

  console.log('Testing heartbeat and subscriber...');
  let subscriberCalled = false;
  let receivedCount = null;
  const unsubscribe = subscribeToVisitorCount((payload) => {
    subscriberCalled = true;
    receivedCount = payload.count;
  });

  const res = await sendHeartbeat(sessionA);
  assert.strictEqual(res.isLive, true);
  assert.strictEqual(res.count, 5);
  assert.strictEqual(subscriberCalled, true);
  assert.strictEqual(receivedCount, 5);
  unsubscribe();
  console.log('✓ Heartbeat and subscriber passed');

  console.log('Testing leave beacon...');
  sendLeaveBeacon(sessionA);
  assert.strictEqual(beaconSent, true);
  console.log('✓ Leave beacon passed');

  console.log('All visitorSession tests passed successfully!');
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
