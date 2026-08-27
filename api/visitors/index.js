/**
 * Vercel Serverless Function: GET /api/visitors
 * 
 * Returns the current active visitor count.
 */
import heartbeatHandler from './heartbeat.js';

export default async function handler(req, res) {
  return heartbeatHandler(req, res);
}
