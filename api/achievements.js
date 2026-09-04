import achievementsHandler from './achievements/index.js';

export default async function handler(req, res) {
  return achievementsHandler(req, res);
}
