// 5 riddles per weekday, easy on Monday up to tricky on Friday.
// `a` lists every accepted answer. Answers are compared after lowercasing and
// dropping punctuation and leading "a / an / the", so "The Future" matches "future".
export const RIDDLES = {
  mon: {
    par: 60,
    riddles: [
      { q: "I have hands but I can't clap. What am I?", a: ['clock', 'watch', 'wall clock', 'alarm clock'] },
      { q: "I'm full of holes, yet I still hold water. What am I?", a: ['sponge'] },
      { q: 'What gets wetter the more it dries?', a: ['towel'] },
      { q: 'I have a neck but no head, and I wear a cap. What am I?', a: ['bottle', 'water bottle'] },
      { q: 'What has to be broken before you can use it?', a: ['egg'] },
    ],
  },
  tue: {
    par: 75,
    riddles: [
      { q: 'What goes up when the rain comes down?', a: ['umbrella', 'umbrellas'] },
      { q: 'I have cities but no houses, mountains but no trees, and water but no fish. What am I?', a: ['map', 'maps'] },
      { q: 'What can you catch, but never throw?', a: ['cold', 'a cold', 'common cold'] },
      { q: "I'm tall when I'm young and short when I'm old. What am I?", a: ['candle', 'candles'] },
      { q: 'What has one eye but cannot see?', a: ['needle', 'a needle', 'sewing needle'] },
    ],
  },
  wed: {
    par: 100,
    riddles: [
      { q: 'The more of me you take, the more you leave behind. What am I?', a: ['footsteps', 'footstep', 'steps', 'step', 'footprints', 'footprint'] },
      { q: 'What word becomes shorter when you add two letters to it?', a: ['short'] },
      { q: 'I speak without a mouth and hear without ears. I have no body, but I come alive with sound. What am I?', a: ['echo'] },
      { q: 'What has four wheels and flies?', a: ['garbage truck', 'trash truck', 'rubbish truck', 'garbage can', 'dump truck', 'dumpster', 'garbage'] },
      { q: 'What building has the most stories?', a: ['library', 'a library'] },
    ],
  },
  thu: {
    par: 130,
    riddles: [
      { q: 'A man pushes his car to a hotel and tells the owner he is bankrupt. What game is he playing?', a: ['monopoly'] },
      { q: 'What is so fragile that saying its name breaks it?', a: ['silence'] },
      { q: "I'm not alive, but I grow. I have no lungs, but I need air. I have no mouth, but water kills me. What am I?", a: ['fire', 'flame', 'a flame'] },
      { q: 'What comes once in a minute, twice in a moment, but never in a thousand years?', a: ['m', 'letter m', 'the letter m'] },
      { q: 'Two in a corner, one in a room, none in a house, but one in a shelter. What is it?', a: ['r', 'letter r', 'the letter r'] },
    ],
  },
  fri: {
    par: 170,
    riddles: [
      { q: "I'm always in front of you, but you can't see me. What am I?", a: ['future', 'the future', 'tomorrow'] },
      { q: 'A word I know, six letters it contains. Remove one letter, and twelve remains. What is it?', a: ['dozens'] },
      { q: 'What gets bigger when more is taken away?', a: ['hole', 'a hole'] },
      { q: 'What begins with T, ends with T, and has T in it?', a: ['teapot', 'tea pot', 'a teapot'] },
      { q: "I'm light as a feather, yet the strongest person can't hold me for more than a few minutes. What am I?", a: ['breath', 'your breath', 'my breath'] },
    ],
  },
};

const clean = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(a|an|the) /, '');
export const normalize = clean;
export const isCorrect = (riddle, guess) => {
  const g = clean(guess);
  if (!g) return false;
  return riddle.a.some((x) => clean(x) === g || (g.length > 3 && clean(x) + 's' === g));
};
