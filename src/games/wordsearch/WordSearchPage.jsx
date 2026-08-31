import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { makeSeededRng, todayKey } from '../../lib/season';

const WORDS = ["RUBRIC", "THESIS", "SYLLABUS", "CITATION", "ANALYSIS", "FEEDBACK"];
const SIZE = 10;
const DIRS = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];

function fits(r0, c0, dr, dc, len) {
  const r1 = r0 + dr * (len - 1), c1 = c0 + dc * (len - 1);
  return r1 >= 0 && r1 < SIZE && c1 >= 0 && c1 < SIZE;
}

function buildGrid() {
  const rng = makeSeededRng(todayKey() + ':wordsearch');
  const cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  WORDS.forEach((word) => {
    let placed = false, attempts = 0;
    while (!placed && attempts < 300) {
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
  const [cells] = useState(() => buildGrid());
  const [found, setFound] = useState(new Set());
  const [foundCells, setFoundCells] = useState(new Set());
  const [selStart, setSelStart] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);

  const finishGame = (allFound) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const score = found.size * 18 + (allFound ? 12 : 0);
    finish(score);
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

  const onCellClick = (r, c) => {
    if (done) return;
    if (!selStart) { setSelStart([r, c]); return; }
    const [r0, c0] = selStart;
    if (r0 === r && c0 === c) { setSelStart(null); return; }
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0);
    const lenR = Math.abs(r - r0), lenC = Math.abs(c - c0);
    const isLine = dr === 0 || dc === 0 || lenR === lenC;
    if (!isLine) { setSelStart([r, c]); return; }
    const len = Math.max(lenR, lenC) + 1;
    let path = [], word = '';
    for (let i = 0; i < len; i++) { const rr = r0 + dr * i, cc = c0 + dc * i; path.push([rr, cc]); word += cells[rr][cc]; }
    const rev = word.split('').reverse().join('');
    const match = WORDS.find((w) => (w === word || w === rev) && !found.has(w));
    if (match) {
      const nf = new Set(found); nf.add(match); setFound(nf);
      const nfc = new Set(foundCells); path.forEach(([rr, cc]) => nfc.add(`${rr},${cc}`)); setFoundCells(nfc);
      if (nf.size === WORDS.length) { finishGame(true); }
    }
    setSelStart(null);
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🔍" title="Word Search" tag="Find all 6 hidden study words." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Click a letter, then click another in a straight line (any of the 8 directions, forwards or backwards) to select a word.
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
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${SIZE}, 34px)` }}>
            {cells.map((row, r) => row.map((letter, c) => {
              const key = `${r},${c}`;
              const isFound = foundCells.has(key);
              const isSel = selStart && selStart[0] === r && selStart[1] === c;
              return (
                <button
                  key={key}
                  onClick={() => onCellClick(r, c)}
                  disabled={done}
                  className={`grid-cell ${isFound ? 'found' : ''} ${isSel && !isFound ? 'selected' : ''}`}
                >
                  {letter}
                </button>
              );
            }))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-xs">
            {WORDS.map((w) => <span key={w} className={`chip ${found.has(w) ? 'hit' : ''}`}>{w}</span>)}
          </div>
        </>
      )}
    </GameShell>
  );
}
