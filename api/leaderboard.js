// Vercel serverless function: /api/leaderboard
// GET  -> returns the current leaderboard { weeks, totals }
//         where weeks[week][player] is an object of { dateKey: score },
//         one entry per day that player played that week's game.
// POST -> body { week, player, score, dateKey } submits a score for
//         a specific day. Keeps only the best score per player per
//         DAY (so replaying the same day's puzzle doesn't inflate
//         things), then the week's total for that player is the SUM
//         of their best score from every day they played that week --
//         so someone who plays all 5 days beats someone who only
//         played once, even with a lower single-day score.
//
// Backward compatible: earlier versions of this file stored a single
// number per player per week (not per-day). Any data in that old shape
// is automatically migrated in place -- old_score becomes
// { legacy: old_score } -- so nothing already saved gets lost, it just
// counts as one "day" going forward.
//
// Requires the Vercel KV integration to be added to this project
// (Storage tab in the Vercel dashboard -> Create Database -> KV).
// Vercel automatically sets the KV_* environment variables once
// the integration is connected -- no manual config needed.

import { kv } from "@vercel/kv";

const KEY = "pulse-leaderboard";
const EMPTY = { weeks: {}, totals: {} };

function migrateWeeks(weeks) {
  const migrated = {};
  Object.entries(weeks || {}).forEach(([week, players]) => {
    migrated[week] = {};
    Object.entries(players || {}).forEach(([name, value]) => {
      // Old format: value was a plain number. New format: an object of
      // { dateKey: score }. Wrap any old-format number so it survives.
      migrated[week][name] = typeof value === "number" ? { legacy: value } : value;
    });
  });
  return migrated;
}

function weekTotal(playerDays) {
  // playerDays is { dateKey: score, ... } -- sum every day's best score
  return Object.values(playerDays || {}).reduce((sum, v) => sum + v, 0);
}

function recomputeSeasonTotals(weeks) {
  const totals = {};
  Object.values(weeks).forEach((wk) => {
    Object.entries(wk).forEach(([name, days]) => {
      totals[name] = (totals[name] || 0) + weekTotal(days);
    });
  });
  return totals;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const raw = (await kv.get(KEY)) || EMPTY;
    const lb = { weeks: migrateWeeks(raw.weeks), totals: raw.totals || {} };
    lb.totals = recomputeSeasonTotals(lb.weeks);
    return res.status(200).json(lb);
  }

  if (req.method === "POST") {
    const { week, player, score, dateKey } = req.body || {};
    if (!week || !player || typeof score !== "number" || !dateKey) {
      return res.status(400).json({ error: "Missing week, player, score, or dateKey" });
    }

    const raw = (await kv.get(KEY)) || { weeks: {}, totals: {} };
    const lb = { weeks: migrateWeeks(raw.weeks), totals: raw.totals || {} };

    if (!lb.weeks[week]) lb.weeks[week] = {};
    if (!lb.weeks[week][player]) lb.weeks[week][player] = {};

    const prevDayBest = lb.weeks[week][player][dateKey] || 0;
    if (score > prevDayBest) lb.weeks[week][player][dateKey] = score;

    lb.totals = recomputeSeasonTotals(lb.weeks);

    await kv.set(KEY, lb);
    return res.status(200).json(lb);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
