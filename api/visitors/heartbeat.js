/**
 * Vercel Serverless Function: Active Visitors Heartbeat
 * 
 * Tracks real-time active visitors across every device using Upstash Redis Sorted Sets (ZSET) with TTL.
 * Lightweight, zero-dependency REST API execution with in-memory fallback.
 */

const REDIS_KEY = 'github_poster_active_visitors';
const TTL_SECONDS = 30; // 30-second sliding window for snappy multi-device response
const TTL_MS = TTL_SECONDS * 1000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// In-memory fallback state for local development or disconnected mode
const memorySessions = new Map();
const rateLimitMap = new Map();

function cleanMemorySessions(now) {
  const cutoff = now - TTL_MS;
  for (const [id, timestamp] of memorySessions.entries()) {
    if (timestamp < cutoff) {
      memorySessions.delete(id);
    }
  }
}

function checkRateLimit(sessionId, now) {
  const lastTime = rateLimitMap.get(sessionId) || 0;
  // Allow at most 1 request per 800ms per session ID
  if (now - lastTime < 800) {
    return false;
  }
  rateLimitMap.set(sessionId, now);

  // Clean rate limit map periodically
  if (rateLimitMap.size > 2000) {
    const cutoff = now - 60000;
    for (const [id, time] of rateLimitMap.entries()) {
      if (time < cutoff) rateLimitMap.delete(id);
    }
  }
  return true;
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

async function executeRedisPipeline(config, commands) {
  const response = await fetch(`${config.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis HTTP error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Main Handler
 */
export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();
  const threshold = now - TTL_MS;
  const redisConfig = getRedisConfig();

  // Helper to parse body safely
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    body = {};
  }

  const action = body.action || (req.method === 'GET' ? 'read' : 'heartbeat');
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : null;

  // Validate session ID for heartbeat / leave actions
  if (action !== 'read') {
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return res.status(400).json({
        error: 'Invalid or missing sessionId. Must be a valid UUID v4.',
        status: 'error',
      });
    }

    if (!checkRateLimit(sessionId, now)) {
      cleanMemorySessions(now);
      return res.status(200).json({
        count: Math.max(1, memorySessions.size),
        status: 'throttled',
        ttl: TTL_SECONDS,
      });
    }
  }

  // ── 1. Redis Mode (Production across all devices) ──────────────────────────
  if (redisConfig) {
    try {
      let pipelineCommands = [];

      if (action === 'leave') {
        pipelineCommands = [
          ['ZREM', REDIS_KEY, sessionId],
          ['ZREMRANGEBYSCORE', REDIS_KEY, 0, threshold],
          ['ZCARD', REDIS_KEY],
        ];
      } else if (action === 'read') {
        pipelineCommands = [
          ['ZREMRANGEBYSCORE', REDIS_KEY, 0, threshold],
          ['ZCARD', REDIS_KEY],
        ];
      } else {
        // Default: Heartbeat
        pipelineCommands = [
          ['ZADD', REDIS_KEY, now, sessionId],
          ['ZREMRANGEBYSCORE', REDIS_KEY, 0, threshold],
          ['ZCARD', REDIS_KEY],
          ['EXPIRE', REDIS_KEY, 86400],
        ];
      }

      const results = await executeRedisPipeline(redisConfig, pipelineCommands);

      let count = 1;
      const cardResult = results.find((r, idx) => {
        const cmd = pipelineCommands[idx][0];
        return cmd === 'ZCARD';
      });

      if (cardResult && typeof cardResult.result === 'number') {
        count = cardResult.result;
      }

      return res.status(200).json({
        count: Math.max(1, count),
        status: 'ok',
        ttl: TTL_SECONDS,
        storage: 'redis',
        timestamp: now,
      });
    } catch (redisError) {
      console.warn('Redis presence tracking encountered an error, using fallback:', redisError.message);
    }
  }

  // ── 2. Fallback Mode (In-Memory / Local Dev) ───────────────────────────────
  cleanMemorySessions(now);

  if (action === 'leave' && sessionId) {
    memorySessions.delete(sessionId);
  } else if (sessionId) {
    memorySessions.set(sessionId, now);
  }

  const memoryCount = Math.max(1, memorySessions.size);

  return res.status(200).json({
    count: memoryCount,
    status: redisConfig ? 'fallback' : 'local_dev',
    ttl: TTL_SECONDS,
    storage: 'memory',
    timestamp: now,
  });
}
