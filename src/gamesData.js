// The 14-week game lineup. `slug` is the route path under /games/<slug>.
// Only the game matching the currently active week is ever linked to
// from the UI -- but each game page also self-checks the active week
// on mount and bounces back home if visited directly out of turn.

export const GAMES = [
  { week: 1, id: "wordle", slug: "wordle", emoji: "🟩", title: "Wordle", tag: "Guess the 5-letter word in 6 tries." },
  { week: 2, id: "zip", slug: "zip", emoji: "🔗", title: "Zip", tag: "Draw one path through every cell, hitting the numbers in order." },
  { week: 3, id: "wordsearch", slug: "wordsearch", emoji: "🔍", title: "Word Search", tag: "Find all 6 hidden study words in the letter grid." },
  { week: 4, id: "mathsprint", slug: "mathsprint", emoji: "➗", title: "Math Sprint", tag: "Solve as many problems as you can in 60s." },
  { week: 5, id: "memory", slug: "memory", emoji: "🧠", title: "Memory Match", tag: "Flip cards and find all 8 pairs." },
  { week: 6, id: "hangman", slug: "hangman", emoji: "🪢", title: "Hangman", tag: "Guess the academic word before you run out of tries." },
  { week: 7, id: "numguess", slug: "number-hunt", emoji: "🎯", title: "Number Hunt", tag: "Find the secret number 1–200 in 8 guesses." },
  { week: 8, id: "connections", slug: "connections", emoji: "🟪", title: "Study Connections", tag: "Find 4 groups of 4 related words." },
  { week: 9, id: "emoji", slug: "emoji-riddles", emoji: "😄", title: "Emoji Riddles", tag: "Decode 5 emoji clues." },
  { week: 10, id: "minicrossword", slug: "mini-crossword", emoji: "⬛", title: "Mini Crossword", tag: "A tiny 5×5 crossword — 4 clues, across and down." },
  { week: 11, id: "riddlerush", slug: "riddle-rush", emoji: "🧩", title: "Riddle Rush", tag: "Solve 5 classic riddles as fast as you can." },
  { week: 12, id: "wordchain", slug: "word-chain", emoji: "🍫", title: "Word Chain Sprint", tag: "List study snacks & supplies in 35s." },
  { week: 13, id: "typing", slug: "typing", emoji: "⌨️", title: "Typing Speed", tag: "Type the sentence as fast & accurately as you can." },
  { week: 14, id: "finalewordle", slug: "championship-wordle", emoji: "🏆", title: "Championship Wordle", tag: "Season finale — double points! Guess the harder word in 6 tries." },
];

export const gameForWeek = (week) => GAMES.find((g) => g.week === week) || null;
export const gameBySlug = (slug) => GAMES.find((g) => g.slug === slug) || null;
