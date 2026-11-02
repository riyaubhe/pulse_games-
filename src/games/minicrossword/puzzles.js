// One 5x5 mini crossword per weekday, ramping from easy (Mon) to very hard (Fri).
// Layout is the same every day: three 5-letter ACROSS words (rows 1, 3, 5 of the
// grid) and three 5-letter DOWN words (columns 1, 3, 5); the blank squares in
// between are blocked. Difficulty comes from rarer words and trickier clues.
//
// Clue numbers: 1 = top-left, 2 = top-middle, 3 = top-right, 4 = middle-left, 5 = bottom-left.
//   Across: 1 (row 1), 4 (row 3), 5 (row 5)      Down: 1 (col 1), 2 (col 3), 3 (col 5)
// `par` = seconds a good solver needs; slower than that costs points.
export const CROSSWORDS = {
  mon: {
    par: 120,
    across: [
      { n: 1, row: 0, answer: 'DREAM', clue: 'What you see while you sleep' },
      { n: 4, row: 2, answer: 'AFTER', clue: 'Following; the opposite of before' },
      { n: 5, row: 4, answer: 'NORTH', clue: 'Compass direction that is up on most maps' },
    ],
    down: [
      { n: 1, col: 0, answer: 'DRAWN', clue: 'Sketched with a pencil' },
      { n: 2, col: 2, answer: 'ENTER', clue: 'Come in, or the key you hit to submit' },
      { n: 3, col: 4, answer: 'MARCH', clue: 'The third month, or what a band does in a parade' },
    ],
  },
  tue: {
    par: 180,
    across: [
      { n: 1, row: 0, answer: 'CROWD', clue: 'Big group gathered at a concert' },
      { n: 4, row: 2, answer: 'EXTRA', clue: 'More than needed, or a background actor in a film' },
      { n: 5, row: 4, answer: 'MARCH', clue: 'Walk in step, like soldiers' },
    ],
    down: [
      { n: 1, col: 0, answer: 'CREAM', clue: 'Coffee add-in, or the best of the best' },
      { n: 2, col: 2, answer: 'OUTER', clue: 'Farthest from the center' },
      { n: 3, col: 4, answer: 'DEATH', clue: "The Grim Reaper's business" },
    ],
  },
  wed: {
    par: 240,
    across: [
      { n: 1, row: 0, answer: 'SPARE', clue: 'Extra tire, or what a bowler gets for clearing all ten pins in two rolls' },
      { n: 4, row: 2, answer: 'ALONG', clue: 'Together with, as in "bring ___ a friend"' },
      { n: 5, row: 4, answer: 'DODGE', clue: 'Sidestep, or a playground game with a rubber ball' },
    ],
    down: [
      { n: 1, col: 0, answer: 'STAND', clue: 'Put up with, or a lemonade seller\'s setup' },
      { n: 2, col: 2, answer: 'AVOID', clue: 'Steer clear of' },
      { n: 3, col: 4, answer: 'EAGLE', clue: 'Two strokes under par in golf' },
    ],
  },
  thu: {
    par: 300,
    across: [
      { n: 1, row: 0, answer: 'SMALL', clue: 'Not big, like the first size on a T-shirt tag' },
      { n: 4, row: 2, answer: 'OWING', clue: 'Still due, like an unpaid debt' },
      { n: 5, row: 4, answer: 'CUMIN', clue: 'Earthy spice in chili and curry' },
    ],
    down: [
      { n: 1, col: 0, answer: 'STOIC', clue: 'Showing no emotion in the face of hardship' },
      { n: 2, col: 2, answer: 'AXIOM', clue: 'A self-evident truth taken as a starting point in math' },
      { n: 3, col: 4, answer: 'LOGIN', clue: 'Username-and-password step' },
    ],
  },
  fri: {
    par: 360,
    across: [
      { n: 1, row: 0, answer: 'HEAVE', clue: 'Pull partner in a sailor\'s "ho" chant, or to hurl with effort' },
      { n: 4, row: 2, answer: 'AMOUR', clue: 'Romantic affair, en français' },
      { n: 5, row: 4, answer: 'HEFTY', clue: 'Substantial, like a bill or a bag of rocks' },
    ],
    down: [
      { n: 1, col: 0, answer: 'HEATH', clue: 'Windswept moor, and the first half of a Brontë antihero\'s name' },
      { n: 2, col: 2, answer: 'ALOOF', clue: 'Cool and distant, emotionally' },
      { n: 3, col: 4, answer: 'EARLY', clue: 'Ahead of schedule, like the proverbial bird' },
    ],
  },
};
