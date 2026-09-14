import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { makeSeededRng, todayKey } from '../../lib/season';

// A completely different 6-word set each weekday.
const WORD_SETS = {
  mon: ["RUBRIC", "THESIS", "SYLLABUS", "CITATION", "ANALYSIS", "FEEDBACK"],
  tue: ["LECTURE", "MENTOR", "DEADLINE", "DISCIPLINE", "SEMESTER", "GRADEBOOK"],
  wed: ["PROCTOR", "REVISION", "FORMULA", "TRANSCRIPT", "PLAGIARISM", "CURRICULUM"],
  thu: ["SCHOLARS", "PROBLEMS", "RESEARCH", "ACADEMIC", "LEARNING", "EQUATION"],
  fri: ["HYPOTHESIS", "SYNTHESIS", "PARADIGM", "PEDAGOGY", "ANALYTICAL", "ANNOTATION"],
};
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function getTodayWords() {
  const key = DAY_KEYS[new Date().getDay()];
  return WORD_SETS[key] || WORD_SETS.mon;
}

const SIZE = 11;
// Orthogonal only -- up/down/left/right, no diagonals. Matches how
// LinkedIn's "Wend" word puzzle works: tap a letter, then tap the next
// letter one step at a time in any of the 4 directions.
const DIRS = [[0,1],[0,-1],[1,0],[-1,0]];

function fits(r0, c0, dr, dc, len) {
  const r1 = r0 + dr * (len - 1), c1 = c0 + dc * (len - 1);
  return r1 >= 0 && r1 < SIZE && c1 >= 0 && c1 < SIZE;
}

function buildGrid(words) {
  const rng = makeSeededRng(todayKey() + ':wordsearch');
  const cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const ordered = [...words].sort((a, b) => b.length - a.length);
  ordered.forEach((word) => {
    let placed = false, attempts = 0;
    while (!placed && attempts < 2000) {
      attempts++;
      const [dr, dc] = DIRS[Math.floor(rng() * DIRS.length)];
      const r0 = Math.floor(rng() * SIZE), c0 = Math.floor(rng() * SIZE);
      if (!fits(r0, c0, dr, dc, word.length)) continue;
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const rr = r0 + dr * i, cc = c0 + dc * i;
        if (cells[rr][cc] && cells[rr][cc] !== word[i]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let i = 0; i < word.length; i++) { const rr = r0 + dr * i, cc = c0 + dc * i; cells[rr][cc] = word[i]; }
      placed = true;
    }
  });
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!cells[r][c]) cells[r][c] = String.fromCharCode(65 + Math.floor(rng() * 26));
  }
  return cells;
}

export default function WordSearchPage() {
  const { allowed, week } = useGameGuard('wordsearch');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const WORDS = useRef(getTodayWords()).current;
  const [cells] = useState(() => buildGrid(WORDS));
  const [found, setFound] = useState(new Set());
  const [foundCells, setFoundCells] = useState(new Set());
  const [path, setPath] = useState([]); // array of "r,c" strings, in click order
  const [timeLeft, setTimeLeft] = useState(90);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const doneRef = useRef(false);
  const startRef = useRef(null);
  const pathSet = new Set(path);

  const finishGame = (allFound) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const score = found.size * 18 + (allFound ? 12 : 0);
    if (allFound) {
      const elapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : 90;
      setMessage(`All 6 found in ${Math.round(elapsed)}s! 🎉`);
      setTimeout(() => finish(score, { time: Math.round(elapsed * 10) / 10 }), 900);
    } else {
      setMessage(`Time's up — found ${found.size} of ${WORDS.length}.`);
      setTimeout(() => finish(score), 900);
    }
  };

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); finishGame(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [allowed, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkMatch = (currentPath) => {
    const word = currentPath.map((k) => {
      const [r, c] = k.split(',').map(Number);
      return cells[r][c];
    }).join('');
    const rev = word.split('').reverse().join('');
    return WORDS.find((w) => (w === word || w === rev) && !found.has(w));
  };

  const clickCell = (r, c) => {
    if (done) return;
    if (startRef.current === null) startRef.current = Date.now();
    const key = `${r},${c}`;

    // Nothing selected yet -- this click starts a new word.
    if (path.length === 0) {
      setPath([key]);
      setMessage('');
      return;
    }

    const last = path[path.length - 1];

    // Clicking the current last letter again cancels the selection.
    if (last === key) {
      setPath([]);
      setMessage('');
      return;
    }

    // Clicking the second-to-last letter undoes one step.
    if (path.length >= 2 && path[path.length - 2] === key) {
      setPath(path.slice(0, -1));
      setMessage('');
      return;
    }

    const [lr, lc] = last.split(',').map(Number);
    const isAdjacent = Math.abs(lr - r) + Math.abs(lc - c) === 1;

    if (!isAdjacent) {
      // Not next to your last letter -- start a fresh word here instead.
      setPath([key]);
      setMessage('');
      return;
    }

    if (pathSet.has(key)) { setMessage("You've already used that letter in this word."); return; }

    const newPath = [...path, key];
    const match = checkMatch(newPath);
    if (match) {
      const nf = new Set(found); nf.add(match); setFound(nf);
      const nfc = new Set(foundCells);
      newPath.forEach((k) => nfc.add(k));
      setFoundCells(nfc);
      setPath([]);
      setMessage(`Found "${match}"! 🎉`);
      if (nf.size === WORDS.length) { finishGame(true); }
      return;
    }

    setPath(newPath);
    setMessage('');
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🔍" title="Word Search" tag="Find all 6 hidden words — new words and grid every day." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Click a letter to start a word. Click the next letter — directly up, down, left, or right, never diagonal — to add it, one step at a time. Reach one of the 6 words below to lock it in. Click your last letter again to cancel, or the one before it to undo a step.
          </p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{timeLeft}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{found.size}/{WORDS.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Found</div>
            </div>
          </div>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${SIZE}, 30px)` }}>
            {cells.map((row, r) => row.map((letter, c) => {
              const key = `${r},${c}`;
              const isFound = foundCells.has(key);
              const isInPath = pathSet.has(key);
              const isLast = path[path.length - 1] === key;
              return (
                <button
                  key={key}
                  onClick={() => clickCell(r, c)}
                  disabled={done}
                  style={{ width: 30, height: 30, fontSize: 12 }}
                  className={`grid-cell ${isFound ? 'found' : ''} ${isInPath && !isFound ? 'selected' : ''} ${isLast ? 'ring-2 ring-accent' : ''}`}
                >
                  {letter}
                </button>
              );
            }))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-xs">
            {WORDS.map((w) => <span key={w} className={`chip ${found.has(w) ? 'hit' : ''}`}>{w}</span>)}
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
