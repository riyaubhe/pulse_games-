// One Crossclimb ladder per weekday. `ladder` is the full 7-word chain from
// top to bottom: ladder[0] and ladder[6] are the locked "bookend" words,
// ladder[1..5] are the five middle rungs the player solves from clues and
// then puts in order. Every neighbouring pair differs by exactly ONE letter.
//
// Each ladder was machine-checked: the five middle words have exactly one
// valid ordering (plus its mirror image), and each bookend only connects to
// its own neighbour -- so there is never an ambiguous "which way is up".
export const PUZZLES = {
  mon: {
    ladder: ['HOME', 'COME', 'CORE', 'CORD', 'CORK', 'PORK', 'WORK'],
    clues: [
      'Dog command that follows "sit" and "stay"',
      'The part of an apple you throw away, or the center of the Earth',
      'A phone charger\'s cable, or a stack of firewood measuring 4 × 4 × 8 feet',
      'Stopper for a wine bottle, or the largest county in Ireland',
      '"The other white meat," according to a famous ad slogan',
    ],
    endClue: 'Put together, these two words make what a tutor helps you finish after class.',
  },
  tue: {
    ladder: ['FIRE', 'FILE', 'FILL', 'FULL', 'FALL', 'MALL', 'WALL'],
    clues: [
      'A document on your computer, or a tool for smoothing your nails',
      'Quiz-question style: "___ in the blank"',
      'Opposite of empty, or how you feel after Thanksgiving dinner',
      'The season when the fall semester starts, also called autumn',
      'A shopping center, or the grassy National ___ in Washington, D.C.',
    ],
    endClue: 'Put together, these two words make the barrier that blocks unwanted traffic on a network.',
  },
  wed: {
    ladder: ['DATA', 'DATE', 'DARE', 'CARE', 'CASE', 'EASE', 'BASE'],
    clues: [
      'A day on the calendar, or a sweet fruit from a palm tree',
      '"Truth or ___"',
      'What a clothing label\'s washing instructions are about, or "handle with ___"',
      'A phone protector, or a lawsuit in court',
      'Freedom from difficulty, as in "at ___"',
    ],
    endClue: 'Put together, these two words make the organized collection of information that apps query.',
  },
  thu: {
    ladder: ['PASS', 'PAST', 'PART', 'CART', 'CARD', 'WARD', 'WORD'],
    clues: [
      'History, or the opposite of future',
      'A piece of a whole, or where a hairstyle splits',
      'A rolling basket you push through a grocery store',
      'Plastic you swipe to pay, or a Valentine\'s Day greeting',
      'A hospital section for patients, or a minor under a guardian\'s care',
    ],
    endClue: 'Put together, these two words make the secret you type to log in.',
  },
  fri: {
    ladder: ['TEXT', 'TEST', 'BEST', 'BEAT', 'BOAT', 'BOOT', 'BOOK'],
    clues: [
      'A trial run, or the exam that follows weeks of studying',
      'Superlative of "good"',
      'The pulse of a song, or to defeat someone',
      'A vessel that floats, as in "rock the ___"',
      'Footwear, or what you do to start up a computer ("___ up")',
    ],
    endClue: 'Put together, these two words make what you buy at the campus bookstore for a class.',
  },
};
