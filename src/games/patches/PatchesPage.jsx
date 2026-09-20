import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { makeSeededRng, todayKey } from '../../lib/season';

const SIZE = 8;
const PALETTE = [
  'bg-accent/50 border-accent',
  'bg-correct/50 border-correct',
  'bg-amber-500/50 border-amber-500',
  'bg-red-500/50 border-red-500',
  'bg-sky-500/50 border-sky-500',
  'bg-pink-500/50 border-pink-500',
  'bg-lime-500/50 border-lime-500',
  'bg-orange-500/50 border-orange-500',
];

// A Shikaku-style rectangle partition, generated fresh every calendar
// day: recursively guillotine-cuts the grid into rectangles, which by
// construction always tiles the whole grid perfectly with no gaps or
// overlaps -- no reliability risk the way word placement has. Each
// rectangle gets one numbered clue cell showing its exact cell count.
// Cuts are biased toward the middle of each split (averaging two random
// samples) to avoid thin 1-cell slivers, which are trivial and not a
// real puzzle -- this keeps patches meaningfully sized and harder to
// reason about instead of padding the count with throwaway single cells.
function generatePuzzle() {
  const rng = makeSeededRng(todayKey() + ':patches');
  const midBiased = () => (rng() + rng()) / 2;
  const rects = [];
  function split(r0, c0, r1, c1, depth) {
    const h = r1 - r0 + 1, w = c1 - c0 + 1, area = h * w;
    const stopChance = depth >= 3 ? 0.55 : 0.2;
    if (area <= 3 || (area <= 8 && rng() < stopChance) || depth >= 4) { rects.push({ r0, c0, r1, c1 }); return; }
    const splitHorizontal = h > w ? true : w > h ? false : rng() < 0.5;
    if (splitHorizontal && h >= 2) {
      const cut = r0 + 1 + Math.floor(midBiased() * (h - 1));
      split(r0, c0, cut - 1, c1, depth + 1); split(cut, c0, r1, c1, depth + 1);
    } else if (!splitHorizontal && w >= 2) {
      const cut = c0 + 1 + Math.floor(midBiased() * (w - 1));
      split(r0, c0, r1, cut - 1, depth + 1); split(r0, cut, r1, c1, depth + 1);
    } else {
      rects.push({ r0, c0, r1, c1 });
    }
  }
  split(0, 0, SIZE - 1, SIZE - 1, 0);

  const clues = {};
  rects.forEach(({ r0, c0, r1, c1 }) => {
    const h = r1 - r0 + 1, w = c1 - c0 + 1;
    const cr = r0 + Math.floor(rng() * h);
    const cc = c0 + Math.floor(rng() * w);
    clues[`${cr},${cc}`] = h * w;
  });
  return clues;
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function PatchesPage() {
  const { allowed, week } = useGameGuard('patches');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const clues = useMemo(() => generatePuzzle(), []);
  const totalCells = SIZE * SIZE;

  const [covered, setCovered] = useState({}); // cellKey -> patchId
  const [patches, setPatches] = useState([]); // [{id, cells:[key,...]}]
  const [pending, setPending] = useState(null); // "r,c" of first-clicked corner
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const doneRef = useRef(false);
  const startRef = useRef(null);
  const nextIdRef = useRef(1);

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [allowed, done]);

  const finishGame = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const finalElapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : elapsed;
    const score = Math.max(50, Math.round(220 - finalElapsed * 1.2));
    setMessage(`Solved in ${Math.round(finalElapsed)}s! 🎉`);
    setTimeout(() => finish(score, { time: Math.round(finalElapsed * 10) / 10 }), 900);
  };

  const clickCell = (r, c) => {
    if (done) return;
    if (startRef.current === null) startRef.current = Date.now();
    const key = `${r},${c}`;

    // Clicking a cell that's already part of a placed patch removes that
    // whole patch, so a mistake can be undone.
    if (covered[key] !== undefined) {
      const patchId = covered[key];
      const nc = { ...covered };
      Object.keys(nc).forEach((k) => { if (nc[k] === patchId) delete nc[k]; });
      setCovered(nc);
      setPatches(patches.filter((p) => p.id !== patchId));
      setMessage('');
      return;
    }

    if (pending === null) { setPending(key); setMessage(''); return; }
    if (pending === key) { setPending(null); setMessage(''); return; }

    const [r0, c0] = pending.split(',').map(Number);
    const rMin = Math.min(r0, r), rMax = Math.max(r0, r);
    const cMin = Math.min(c0, c), cMax = Math.max(c0, c);

    const cellsInRect = [];
    let overlap = false;
    for (let rr = rMin; rr <= rMax; rr++) {
      for (let cc = cMin; cc <= cMax; cc++) {
        const k = `${rr},${cc}`;
        if (covered[k] !== undefined) overlap = true;
        cellsInRect.push(k);
      }
    }
    if (overlap) { setMessage('That rectangle overlaps a patch you already placed.'); setPending(null); return; }

    const cluesInRect = cellsInRect.filter((k) => clues[k] !== undefined);
    if (cluesInRect.length !== 1) {
      setMessage(cluesInRect.length === 0 ? 'That rectangle needs to contain exactly one number.' : 'That rectangle contains more than one number.');
      setPending(null);
      return;
    }
    const clueNum = clues[cluesInRect[0]];
    if (clueNum !== cellsInRect.length) {
      setMessage(`That rectangle has ${cellsInRect.length} cells, but the clue needs ${clueNum}.`);
      setPending(null);
      return;
    }

    const id = nextIdRef.current++;
    const nc = { ...covered };
    cellsInRect.forEach((k) => { nc[k] = id; });
    setCovered(nc);
    setPatches([...patches, { id, cells: cellsInRect }]);
    setPending(null);
    setMessage('');

    if (Object.keys(nc).length === totalCells) finishGame();
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🧩" title="Patches" tag="Divide the grid into rectangles — one number per patch." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Click one corner of a rectangle, then click the opposite corner. Each rectangle must contain exactly one number, and its cell count must match that number. Cover the whole grid to win. Click any cell in a placed patch to undo it. No time limit — fastest solve wins the week.
          </p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{formatElapsed(elapsed)}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{Object.keys(covered).length}/{totalCells}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Cells filled</div>
            </div>
          </div>

          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${SIZE}, 38px)` }}>
            {Array.from({ length: SIZE }).map((_, r) =>
              Array.from({ length: SIZE }).map((_, c) => {
                const key = `${r},${c}`;
                const clue = clues[key];
                const patchId = covered[key];
                const colorClass = patchId !== undefined ? PALETTE[(patchId - 1) % PALETTE.length] : 'bg-zinc-900/50 border-white/5';
                const isPending = pending === key;
                return (
                  <button
                    key={key}
                    onClick={() => clickCell(r, c)}
                    disabled={done}
                    className={`w-[38px] h-[38px] rounded-md border flex items-center justify-center font-black font-display text-sm transition-all ${colorClass} ${isPending ? 'ring-2 ring-white' : ''}`}
                  >
                    {clue !== undefined ? clue : ''}
                  </button>
                );
              })
            )}
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
