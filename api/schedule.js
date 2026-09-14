// Vercel serverless function: /api/schedule
// GET  -> returns all admin-set overrides { overrides: { "<gameId>:<dateKey>": value } }
// POST -> requires header "x-admin-key". Body: { gameId, dateKey, value }
//         sets/overwrites the puzzle for that game on that specific day.

import { kv } from "@vercel/kv";

const KEY = "pulse-schedule";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const schedule = (await kv.get(KEY)) || { overrides: {} };
    return res.status(200).json(schedule);
  }

  if (req.method === "POST") {
    const adminKey = req.headers["x-admin-key"];
    if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Invalid admin key" });
    }

    const { gameId, dateKey, value } = req.body || {};
    if (!gameId || !dateKey || value === undefined) {
      return res.status(400).json({ error: "Missing gameId, dateKey, or value" });
    }

    const schedule = (await kv.get(KEY)) || { overrides: {} };
    schedule.overrides[`${gameId}:${dateKey}`] = value;
    await kv.set(KEY, schedule);
    return res.status(200).json(schedule);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
