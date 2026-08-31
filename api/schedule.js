// Vercel serverless function: /api/schedule
// GET  -> returns all admin-set overrides { overrides: { "<gameId>:<dateKey>": value } }
// POST -> requires header "x-admin-key" matching the ADMIN_KEY environment
//         variable. Body: { gameId, dateKey, value } sets/overwrites the
//         puzzle for that game on that specific day.
//
// This mirrors the "admin schedules a word per day, then it goes live"
// pattern from last semester's app (their WordleWord table + admin panel),
// adapted to run on Vercel KV instead of a Postgres database.
//
// Set ADMIN_KEY in your Vercel project's environment variables
// (Settings -> Environment Variables) before using the admin panel.

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
