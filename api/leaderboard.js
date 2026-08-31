// Vercel serverless function: /api/leaderboard
// GET  -> returns the current leaderboard { weeks, totals }
// POST -> body { week, player, score } submits/updates a score,
//         keeping only each player's best score per week, then
//         returns the updated leaderboard.
//
// Requires the Vercel KV integration to be added to this project
// (Storage tab in the Vercel dashboard -> Create Database -> KV).
// Vercel automatically sets the KV_* environment variables once
// the integration is connected -- no manual config needed.

import { kv } from "@vercel/kv";

const KEY = "pulse-leaderboard";
const EMPTY = { weeks: {}, totals: {} };

export default async function handler(req, res) {
  if (req.method === "GET") {
    const lb = (await kv.get(KEY)) || EMPTY;
    return res.status(200).json(lb);
  }

  if (req.method === "POST") {
    const { week, player, score } = req.body || {};
    if (!week || !player || typeof score !== "number") {
      return res.status(400).json({ error: "Missing week, player, or score" });
    }

    const lb = (await kv.get(KEY)) || { weeks: {}, totals: {} };
    if (!lb.weeks[week]) lb.weeks[week] = {};

    const prevBest = lb.weeks[week][player] || 0;
    if (score > prevBest) lb.weeks[week][player] = score;

    // Recompute totals as the sum of each player's best score per week
    const totals = {};
    Object.values(lb.weeks).forEach((wk) => {
      Object.entries(wk).forEach(([name, val]) => {
        totals[name] = (totals[name] || 0) + val;
      });
    });
    lb.totals = totals;

    await kv.set(KEY, lb);
    return res.status(200).json(lb);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
