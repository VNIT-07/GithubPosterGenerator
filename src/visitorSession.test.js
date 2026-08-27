import assert from 'node:assert';
import {
  generateUUID,
  isValidUUID,
  getOrCreateSessionId,
  sendHeartbeat,
} from './visitorSession.js';

// ── Test 1: UUID Generation and Validation ──────────────────────────────
console.log('Testing UUID generation...');
const uuid1 = generateUUID();
const uuid2 = generateUUID();

assert.strictEqual(typeof uuid1, 'string', 'UUID should be a string');
assert.strictEqual(uuid1.length, 36, 'UUID should be 36 characters');
assert.notStrictEqual(uuid1, uuid2, 'Consecutive UUIDs must be unique');
assert.strictEqual(isValidUUID(uuid1), true, 'Generated UUID must be valid according to isValidUUID');
assert.strictEqual(isValidUUID(uuid2), true, 'Generated UUID 2 must be valid');

// Test invalid UUIDs
assert.strictEqual(isValidUUID(''), false, 'Empty string is not a valid UUID');
assert.strictEqual(isValidUUID(null), false, 'null is not a valid UUID');
assert.strictEqual(isValidUUID('12345'), false, 'Short string is not a valid UUID');
assert.strictEqual(isValidUUID('zzzzzzzz-zzzz-4zzz-yzzz-zzzzzzzzzzzz'), false, 'Non-hex characters are invalid');
assert.strictEqual(isValidUUID('12345678-1234-5678-1234-123456789012'), false, 'Non-v4 UUID is invalid');

console.log('✓ UUID generation and validation passed');

// ── Test 2: Session Persistence Mock ──────────────────────────────────
console.log('Testing session persistence...');

// Mock window and localStorage
const storageMap = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

const sessionA = getOrCreateSessionId();
assert.strictEqual(isValidUUID(sessionA), true, 'getOrCreateSessionId returned valid UUID');

// Call again - must return the same session ID (simulating multi-tab sync)
const sessionB = getOrCreateSessionId();
assert.strictEqual(sessionA, sessionB, 'Multiple calls must reuse the same session ID from storage');

console.log('✓ Session persistence passed');

// ── Test 3: sendHeartbeat Network Resilience ─────────────────────────
console.log('Testing heartbeat network resilience...');

// Mock fetch success
globalThis.fetch = async (url, opts) => {
  assert.strictEqual(opts.method, 'POST');
  const body = JSON.parse(opts.body);
  assert.strictEqual(body.action, 'heartbeat');
  assert.strictEqual(body.sessionId, sessionA);

  return {
    ok: true,
    status: 200,
    json: async () => ({ count: 3, status: 'ok' }),
  };
};

const resultSuccess = await sendHeartbeat(sessionA, '/api/visitors/heartbeat');
assert.strictEqual(resultSuccess.isLive, true);
assert.strictEqual(resultSuccess.count, 3);
assert.strictEqual(resultSuccess.status, 'ok');

// Mock fetch error (e.g. server down or network failure)
globalThis.fetch = async () => {
  throw new Error('Network offline');
};

const resultFail = await sendHeartbeat(sessionA, '/api/visitors/heartbeat');
assert.strictEqual(resultFail.isLive, false);
assert.strictEqual(resultFail.count, null);
assert.strictEqual(resultFail.status, 'error');

console.log('✓ Heartbeat network resilience passed');
console.log('All visitorSession tests passed successfully!');
