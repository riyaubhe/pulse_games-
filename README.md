# Pulse Games

A 14-week rotation of mini-games for the tutoring team, built as a
real React + Vite app matching last semester's project structure
(same build tooling, same Tailwind v4 setup, same folder conventions),
with the 14-week game lineup and shared leaderboard from the current
season.

## What's different from last semester's app

- **Auth:** last semester used Firebase Google Sign-In + an email
  whitelist. This build uses a simple name-entry gate instead, because
  wiring up real Firebase auth needs a real Firebase project and
  credentials I don't have. If you want real Google Sign-In, create a
  Firebase project, give me the config values, and I can wire it in —
  `src/firebase.js` isn't included in this build for that reason.
- **Backend:** last semester ran a FastAPI + Postgres backend. This
  build uses two small Vercel serverless functions (`api/leaderboard.js`,
  `api/schedule.js`) backed by Vercel KV instead — no server to host,
  no database to manage, deploys as part of the same Vercel project as
  the frontend.
- **Games:** this season's 14-week lineup (see below), not last
  semester's Wordle/Tutor Trivia/Logic Sprint/ASU Trivia set.

## Local development

```
npm install
npm run dev
```

The dev server proxies `/api/*` requests to `http://localhost:3000` —
run `vercel dev` in a separate terminal (after `npm i -g vercel`) if
you want the leaderboard/admin panel to actually work locally. Without
that, the game pages still work, just without persistence.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. Import it into Vercel (vercel.com → Add New → Project). It auto-
   detects Vite — no build config needed.
3. **Storage tab → Create Database → KV** to add the leaderboard's
   backing store. Vercel wires up the environment variables
   automatically.
4. **Settings → Environment Variables → add `ADMIN_KEY`** — any
   password you choose, used to log into `/admin`.
5. Redeploy after adding both. That's it.

## Setting the season start date

Open `src/lib/season.js`:

```js
export const SEASON_START = new Date("2026-08-31T00:00:00");
```

This one line controls everything: the site automatically advances to
the next week every 7 days from this date, and only runs Monday–Friday.
Update it once per season and redeploy — nothing else needs touching.

## The 14-week lineup

| Week | Game |
|---|---|
| 1 | Wordle |
| 2 | Zip (LinkedIn Zip-style path puzzle) |
| 3 | Word Search |
| 4 | Math Sprint |
| 5 | Memory Match |
| 6 | Hangman |
| 7 | Number Hunt |
| 8 | Study Connections |
| 9 | Emoji Riddles |
| 10 | Mini Crossword |
| 11 | Riddle Rush |
| 12 | Word Chain Sprint |
| 13 | Typing Speed |
| 14 | Championship Wordle (double points) |

Wordle, Hangman, Number Hunt, Typing Speed, and Championship Wordle
get a new puzzle every weekday, seeded from the calendar date so
everyone sees the same one on a given day. You can also manually
schedule any of those five through `/admin` (enter your `ADMIN_KEY`)
if you want to hand-pick a specific day's word instead of relying on
the automatic pick.

## A note on testing

I validated every file's syntax and confirmed the whole app bundles
and resolves cleanly with esbuild, but I don't have a real Node/React
environment here to run `npm install` and `npm run dev` end-to-end.
Please run it locally and let me know about any runtime errors that
show up — I'll fix them.
