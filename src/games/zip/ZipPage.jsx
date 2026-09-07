import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

// One verified, fully-solvable puzzle per weekday. Each is a complete
// Hamiltonian path through every cell of the grid (hand-verified), with
// 6 of its cells picked out and numbered as checkpoints. The player
// doesn't need to reconstruct this exact path -- any path that visits
// every cell once, moves only up/down/left/right, and hits the numbered
// checkpoints in order counts as solved.
const ZIP_PUZZLES = {
  mon: { size: 5, checkpoints: [{r:0,c:0,num:1},{r:1,c:4,num:2},{r:2,c:0,num:3},{r:2,c:4,num:4},{r:3,c:0,num:5},{r:4,c:4,num:6}] },
  tue: { size: 5, checkpoints: [{r:0,c:0,num:1},{r:4,c:1,num:2},{r:0,c:2,num:3},{r:4,c:2,num:4},{r:0,c:3,num:5},{r:4,c:4,num:6}] },
  wed: { size: 5, checkpoints: [{r:0,c:0,num:1},{r:1,c:4,num:2},{r:4,c:2,num:3},{r:2,c:0,num:4},{r:2,c:3,num:5},{r:2,c:2,num:6}] },
  thu: { size: 5, checkpoints: [{r:4,c:0,num:1},{r:3,c:4,num:2},{r:2,c:0,num:3},{r:2,c:4,num:4},{r:1,c:0,num:5},{r:0,c:4,num:6}] },
  fri: { size: 5, checkpoints: [{r:0,c:4,num:1},{r:4,c:3,num:2},{r:0,c:2,num:3},{r:4,c:2,num:4},{r:0,c:1,num:5},{r:4,c:0,num:6}] },
};
const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];

function getTodayPuzzle() {
  const key = DAY_KEYS[new Date().getDay()];
  return ZIP_PUZZLES[key] || ZIP_PUZZLES.mon;
}

export default function ZipPage() {
  const { allowed, week } = useGameGuard('zip');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useMemo(() => getTodayPuzzle(), []);
  const { size, checkpoints } = puzzle;

  const checkpointMap = useMemo(() => {
    const m = {};
    checkpoints.forEach((cp) => { m[`${cp.r},${cp.c}`] = cp.num; });
    return m;
  }, [checkpoints]);
  const totalCells = size * size;
  const maxNum = checkpoints.length;

  const [path, setPath] = useState([]); // array of "r,c" strings, in order
  const [nextNeeded, setNextNeeded] = useState(1);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const startRef = useRef(null);

  const pathSet = useMemo(() => new Set(path), [path]);

  const reset = () => {
    setPath([]);
    setNextNeeded(1);
    setMessage('');
  };

  const finishGame = (solved) => {
    setDone(true);
    const elapsed = startRef.current ? (Date.now() - startRef.current) / 1000 : 60;
    const score = solved ? Math.max(40, Math.round(150 - elapsed * 1.5)) : 0;
    setMessage(solved ? `Solved in ${Math.round(elapsed)}s! 🎉` : 'Out of moves — try again next time.');
    setTimeout(() => finish(score, solved ? { time: Math.round(elapsed * 10) / 10 } : undefined), 900);
  };

  const clickCell = (r, c) => {
    if (done) return;
    const key = `${r},${c}`;
    if (startRef.current === null) startRef.current = Date.now();

    if (path.length === 0) {
      // must start on checkpoint 1
      if (checkpointMap[key] !== 1) { setMessage('Start on the number 1.'); return; }
      setPath([key]);
      setNextNeeded(2);
      setMessage('');
      return;
    }

    const last = path[path.length - 1];
    const [lr, lc] = last.split(',').map(Number);
    const isAdjacent = Math.abs(lr - r) + Math.abs(lc - c) === 1;

    // clicking the second-to-last cell retracts the path by one step
    if (path.length >= 2 && path[path.length - 2] === key) {
      const removedKey = path[path.length - 1];
      const removedNum = checkpointMap[removedKey];
      setPath(path.slice(0, -1));
      if (removedNum) setNextNeeded(removedNum);
      setMessage('');
      return;
    }

    if (!isAdjacent) { setMessage('You can only move to a cell next to your last one.'); return; }
    if (pathSet.has(key)) { setMessage("You've already visited that cell."); return; }

    const cellNum = checkpointMap[key];
    if (cellNum && cellNum !== nextNeeded) {
      setMessage(`That's checkpoint ${cellNum}, but you need ${nextNeeded} next.`);
      return;
    }

    const newPath = [...path, key];
    setPath(newPath);
    setMessage('');
    const effectiveNext = cellNum ? cellNum + 1 : nextNeeded;
    if (cellNum) setNextNeeded(effectiveNext);

    if (newPath.length === totalCells) {
      finishGame(effectiveNext > maxNum);
    }
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🔗" title="Zip" tag="Draw one path through every cell, hitting the numbers in order." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Click cell 1 to start, then click adjacent cells to draw a single path that fills the whole grid and passes through 2, 3, 4... in order. Click your previous cell to undo a step.
          </p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-black font-display text-accent">{path.length}/{totalCells}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Cells filled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black font-display text-correct">{nextNeeded > maxNum ? maxNum : nextNeeded}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Next number</div>
            </div>
          </div>

          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${size}, 44px)` }}
          >
            {Array.from({ length: size }).map((_, r) =>
              Array.from({ length: size }).map((_, c) => {
                const key = `${r},${c}`;
                const inPath = pathSet.has(key);
                const num = checkpointMap[key];
                const isLast = path[path.length - 1] === key;
                return (
                  <button
                    key={key}
                    onClick={() => clickCell(r, c)}
                    disabled={done}
                    className={`w-11 h-11 rounded-md border flex items-center justify-center font-black font-display text-sm transition-all ${
                      inPath
                        ? isLast
                          ? 'bg-accent border-accent text-white shadow-glow'
                          : 'bg-accent/50 border-accent/60 text-white'
                        : 'bg-zinc-900/50 border-white/5 text-zinc-400'
                    }`}
                  >
                    {num || ''}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={reset} disabled={done} className="px-5 py-2.5 rounded-xl font-bold border border-white/5 bg-zinc-900/50 disabled:opacity-40">
              Reset
            </button>
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
