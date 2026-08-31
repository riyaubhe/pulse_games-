// Season schedule + daily seeded randomness, ported from the vanilla-JS
// build. Same behavior: one game unlocks per week, Monday-Friday only,
// and "answer" games (Wordle, Hangman, etc.) get a puzzle seeded from
// the calendar date so everyone sees the same one on a given day.

// Set this to the date Week 1 opens (local midnight). Update this one
// line whenever the season restarts.
export const SEASON_START = new Date("2026-08-31T00:00:00");

export function getActiveWeek() {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = Date.now() - SEASON_START.getTime();
  if (diff < 0) return 0; // season hasn't started
  return Math.floor(diff / msPerWeek) + 1; // 1-14 while active, >14 once season ends
}

export function isWeekday() {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function makeSeededRng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function pickDaily(list, gameId) {
  const rng = makeSeededRng(todayKey() + ":" + gameId);
  return list[Math.floor(rng() * list.length)];
}

export function seededShuffle(arr, seedStr) {
  const rng = makeSeededRng(seedStr);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
