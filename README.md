# Pulse Games

A 14-week rotation of mini-games for the tutoring team, built as a
React + Vite app with a shared, database-backed leaderboard.

## Local development

```
npm install
npm run dev
```

Run `vercel dev` in a second terminal (after `npm i -g vercel`) if you
want the leaderboard/admin panel to work locally too.

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. Import it into Vercel (vercel.com -> Add New -> Project). Auto-detects
   Vite, no config needed.
3. **Storage tab -> Create Database -> KV** -- this is what makes the
   shared leaderboard actually work.
4. **Settings -> Environment Variables -> add `ADMIN_KEY`** -- your
   own password, used to log into `/admin`.
5. Redeploy after adding both.

## Setting the season start date

Open `src/lib/season.js`:

```js
export const SEASON_START = new Date("2026-08-31T00:00:00");
```

Everything else runs itself from this one date -- weeks advance
automatically every 7 days, Monday-Friday only.

## The 14-week lineup

| Week | Game |
|---|---|
| 1 | Wordle |
| 2 | Zip (path-drawing puzzle, fastest time wins) |
| 3 | Word Search (new words + grid every day, fastest full solve wins) |
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

Scores are summed across every day a player plays that week -- so
playing all 5 weekdays beats playing once with a higher single score.
Weeks with a "Fastest wins" badge (Zip, Word Search) rank by best
completion time instead of points.
