// Vercel serverless function: /api/leaderboard
// GET    -> returns the current leaderboard { weeks, totals }
// POST   -> body { week, player, score, dateKey, meta } submits a score
//           for a specific day, keeping only the best score per player
//           per DAY, then summing all days into the week's total.
// DELETE -> requires header "x-admin-key". Body: { week, player, dateKey? }.
//           If dateKey is given, removes just that one day's entry;
//           otherwise removes the player's entire entry for that week.
//
// Requires the Vercel KV integration (Storage tab -> Create Database -> KV).

import { kv } from "@vercel/kv";

const KEY = "pulse-leaderboard";
const EMPTY = { weeks: {}, totals: {} };

function migrateWeeks(weeks) {
  const migrated = {};
  Object.entries(weeks || {}).forEach(([week, players]) => {
    migrated[week] = {};
    Object.entries(players || {}).forEach(([name, value]) => {
      migrated[week][name] = typeof value === "number" ? { legacy: value } : value;
    });
  });
  return migrated;
}

function dayScore(v) {
  if (typeof v === "number") return v;
  if (v && typeof v.score === "number") return v.score;
  return 0;
}

function weekTotal(playerDays) {
  return Object.values(playerDays || {}).reduce((sum, v) => sum + dayScore(v), 0);
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
    const { week, player, score, dateKey, meta } = req.body || {};
    if (!week || !player || typeof score !== "number" || !dateKey) {
      return res.status(400).json({ error: "Missing week, player, score, or dateKey" });
    }

    const raw = (await kv.get(KEY)) || { weeks: {}, totals: {} };
    const lb = { weeks: migrateWeeks(raw.weeks), totals: raw.totals || {} };

    if (!lb.weeks[week]) lb.weeks[week] = {};
    if (!lb.weeks[week][player]) lb.weeks[week][player] = {};

    const prevDayBest = dayScore(lb.weeks[week][player][dateKey]);
    if (score > prevDayBest) {
      lb.weeks[week][player][dateKey] = meta && typeof meta === "object" ? { score, ...meta } : score;
    }

    lb.totals = recomputeSeasonTotals(lb.weeks);

    await kv.set(KEY, lb);
    return res.status(200).json(lb);
  }

  if (req.method === "DELETE") {
    const adminKey = req.headers["x-admin-key"];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Invalid admin key" });
    }

    const { week, player, dateKey } = req.body || {};
    if (!week || !player) {
      return res.status(400).json({ error: "Missing week or player" });
    }

    const raw = (await kv.get(KEY)) || { weeks: {}, totals: {} };
    const lb = { weeks: migrateWeeks(raw.weeks), totals: raw.totals || {} };

    if (lb.weeks[week] && lb.weeks[week][player]) {
      if (dateKey) {
        delete lb.weeks[week][player][dateKey];
        if (Object.keys(lb.weeks[week][player]).length === 0) {
          delete lb.weeks[week][player];
        }
      } else {
        delete lb.weeks[week][player];
      }
    }

    lb.totals = recomputeSeasonTotals(lb.weeks);

    await kv.set(KEY, lb);
    return res.status(200).json(lb);
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).end("Method Not Allowed");
}
