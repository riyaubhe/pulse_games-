// Pure helpers for Crossclimb -- no React, no imports, so they can be tested
// on their own.

// True when two words are the same length and differ in exactly one position.
export function isStep(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  return diff === 1;
}

// True when every neighbouring pair in `words` is a one-letter step.
export function isValidChain(words) {
  for (let i = 0; i < words.length - 1; i++) {
    if (!isStep(words[i], words[i + 1])) return false;
  }
  return true;
}

// Starting order for the five middle rungs (as indices 1..5 into the ladder).
// Uses the supplied shuffle function and keeps trying until the order is NOT
// already a valid chain, so the board never starts out solved.
export function initialOrder(ladder, seedBase, shuffle) {
  for (let n = 0; n < 200; n++) {
    const order = shuffle([1, 2, 3, 4, 5], `${seedBase}:${n}`);
    if (!isValidChain(order.map((i) => ladder[i]))) return order;
  }
  return [3, 1, 5, 2, 4]; // practically unreachable fallback
}

// Once the middle chain is valid, which bookend word belongs on top?
// The ladder can be read either direction, so it depends on which way the
// player ordered the middle.
export function expectedEnds(order, ladder) {
  const forward = order[0] === 1;
  return forward
    ? { top: ladder[0], bottom: ladder[6] }
    : { top: ladder[6], bottom: ladder[0] };
}
