import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Eraser, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { PUZZLES } from './puzzles';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SIZE = 6;
const HINT_PENALTY = 30; // seconds added to your time per hint

const getToday = () => PUZZLES[DAY_KEYS[new Date().getDay()]] || PUZZLES.mon;

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 100 points for a finish within 3 minutes, then -1 per 5 seconds,
// -8 per hint is already baked into the time (30s each). Floor of 10.
export function sudokuScore(finalTime) {
  return Math.max(10, 100 - Math.floor(Math.max(0, finalTime - 180) / 5));
}

// Which cells break a rule (same digit twice in a row, column or 2x3 box)?
export function findConflicts(vals) {
  const bad = new Set();
  const groups = [];
  for (let r = 0; r < SIZE; r++) groups.push(Array.from({ length: SIZE }, (_, c) => r * SIZE + c));
  for (let c = 0; c < SIZE; c++) groups.push(Array.from({ length: SIZE }, (_, r) => r * SIZE + c));
  for (let br = 0; br < SIZE; br += 2)
    for (let bc = 0; bc < SIZE; bc += 3) {
      const g = [];
      for (let a = 0; a < 2; a++) for (let b = 0; b < 3; b++) g.push((br + a) * SIZE + bc + b);
      groups.push(g);
    }
  groups.forEach((g) => {
    const seen = {};
    g.forEach((i) => {
      const v = vals[i];
      if (!v) return;
      (seen[v] = seen[v] || []).push(i);
    });
    Object.values(seen).forEach((arr) => arr.length > 1 && arr.forEach((i) => bad.add(i)));
  });
  return bad;
}

const storeKey = (player) => `pulse-sudoku:${player}:${todayKey()}`;
function loadSaved(player) {
  try {
    return JSON.parse(localStorage.getItem(storeKey(player)) || 'null');
  } catch {
    return null;
  }
}
function save(player, data) {
  try {
    localStorage.setItem(storeKey(player), JSON.stringify(data));
  } catch {
    /* storage unavailable -- game still works */
  }
}

export default function SudokuPage() {
  const { allowed, week } = useGameGuard('minisudoku');
  const { player } = usePlayer();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useMemo(getToday, []);
  const givens = useMemo(() => puzzle.puzzle.split('').map(Number), [puzzle]);
  const solution = useMemo(() => puzzle.solution.split('').map(Number), [puzzle]);

  const [checked, setChecked] = useState(false); // have we looked up "already solved today?"
  const [alreadySolved, setAlreadySolved] = useState(null); // { time } | null
  const [vals, setVals] = useState(givens);
  const [notes, setNotes] = useState(() => Array.from({ length: 36 }, () => []));
  const [hinted, setHinted] = useState([]); // indexes revealed by hints
  const [sel, setSel] = useState(null);
  const [noteMode, setNoteMode] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [final, setFinal] = useState(null);
  const startRef = useRef(null);

  // One solve per day: if the leaderboard already has a timed result for you today, show it.
  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    getLeaderboard()
      .then((data) => {
        if (cancelled) return;
        const v = data.weeks?.[week]?.[player]?.[todayKey()];
        if (v && typeof v === 'object' && typeof v.time === 'number') setAlreadySolved({ time: v.time });
        setChecked(true);
      })
      .catch(() => !cancelled && setChecked(true));
    return () => {
      cancelled = true;
    };
  }, [allowed, week, player]);

  // Restore an in-progress board (refreshing the page doesn't reset the clock).
  useEffect(() => {
    if (!allowed || !checked || alreadySolved) return;
    const s = loadSaved(player);
    if (s && s.vals?.length === 36 && s.startedAt) {
      setVals(s.vals);
      setNotes(s.notes || Array.from({ length: 36 }, () => []));
      setHinted(s.hinted || []);
      startRef.current = s.startedAt;
    } else {
      startRef.current = Date.now();
      save(player, { vals: givens, notes: [], hinted: [], startedAt: startRef.current });
    }
    setNow(Date.now());
  }, [allowed, checked, alreadySolved, player, givens]);

  useEffect(() => {
    if (!startRef.current || done || alreadySolved) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [checked, done, alreadySolved]);

  const persist = (v, n, h) => save(player, { vals: v, notes: n, hinted: h, startedAt: startRef.current });

  const conflicts = useMemo(() => findConflicts(vals), [vals]);
  const elapsed = startRef.current ? (now - startRef.current) / 1000 : 0;
  const penalty = hinted.length * HINT_PENALTY;

  const checkWin = (v, h) => {
    if (!v.every((x, i) => x === solution[i])) return;
    const real = (Date.now() - startRef.current) / 1000;
    const finalTime = Math.round((real + h.length * HINT_PENALTY) * 10) / 10;
    setDone(true);
    setFinal({ real: Math.round(real), finalTime, hints: h.length });
    setTimeout(() => finish(sudokuScore(finalTime), { time: finalTime, hints: h.length }), 800);
  };

  const place = useCallback(
    (digit) => {
      if (done || sel === null || givens[sel] || hinted.includes(sel)) return;
      if (noteMode && digit !== 0) {
        if (vals[sel]) return;
        const n = notes.map((a) => a.slice());
        n[sel] = n[sel].includes(digit) ? n[sel].filter((d) => d !== digit) : [...n[sel], digit].sort();
        setNotes(n);
        persist(vals, n, hinted);
        return;
      }
      const v = vals.slice();
      v[sel] = digit;
      // placing a digit clears this cell's notes and removes that digit from peer notes
      const n = notes.map((a) => a.slice());
      n[sel] = [];
      if (digit) {
        const r = Math.floor(sel / SIZE), c = sel % SIZE;
        n.forEach((arr, i) => {
          const ir = Math.floor(i / SIZE), ic = i % SIZE;
          const sameBox = Math.floor(ir / 2) === Math.floor(r / 2) && Math.floor(ic / 3) === Math.floor(c / 3);
          if (ir === r || ic === c || sameBox) n[i] = arr.filter((d) => d !== digit);
        });
      }
      setVals(v);
      setNotes(n);
      persist(v, n, hinted);
      checkWin(v, hinted);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [done, sel, givens, hinted, noteMode, vals, notes, solution]
  );

  const useHint = () => {
    if (done || sel === null || givens[sel] || hinted.includes(sel) || vals[sel] === solution[sel]) return;
    const v = vals.slice();
    v[sel] = solution[sel];
    const n = notes.map((a) => a.slice());
    n[sel] = [];
    const h = [...hinted, sel];
    setVals(v);
    setNotes(n);
    setHinted(h);
    persist(v, n, h);
    checkWin(v, h);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-6]$/.test(e.key)) place(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0);
      else if (e.key === 'n' || e.key === 'N') setNoteMode((m) => !m);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        setSel((s) => {
          const cur = s === null ? 0 : s;
          const r = Math.floor(cur / SIZE), c = cur % SIZE;
          if (e.key === 'ArrowUp') return Math.max(0, r - 1) * SIZE + c;
          if (e.key === 'ArrowDown') return Math.min(SIZE - 1, r + 1) * SIZE + c;
          if (e.key === 'ArrowLeft') return r * SIZE + Math.max(0, c - 1);
          return r * SIZE + Math.min(SIZE - 1, c + 1);
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [place]);

  if (!allowed) return null;

  const shell = { emoji: '🔢', title: 'Mini Sudoku', tag: 'Fill the grid so every row, column and box has 1–6. Fastest wins.', week };

  if (!checked) {
    return (
      <GameShell {...shell}>
        <p className="text-zinc-500 text-sm">Loading…</p>
      </GameShell>
    );
  }

  if (alreadySolved && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{formatClock(alreadySolved.time)}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">
            You already solved today's puzzle. One attempt per day — come back tomorrow for a new one!
          </p>
          <AlreadyButtons />
        </div>
      </GameShell>
    );
  }

  const selVal = sel !== null ? vals[sel] : 0;
  const selRow = sel !== null ? Math.floor(sel / SIZE) : -1;
  const selCol = sel !== null ? sel % SIZE : -1;
  const selBox = sel !== null ? `${Math.floor(selRow / 2)}-${Math.floor(selCol / 3)}` : '';

  return (
    <GameShell {...shell}>
      {result ? (
        <div className="w-full">
          <div className="text-center text-zinc-400 text-sm mb-2">
            Solved in <span className="text-white font-bold">{formatClock(final.real)}</span>
            {final.hints > 0 && (
              <>
                {' '}+ {final.hints * HINT_PENALTY}s hint penalty = <span className="text-white font-bold">{formatClock(final.finalTime)}</span>
              </>
            )}
          </div>
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-3xl font-black font-display tabular-nums" data-testid="clock">
              {formatClock(elapsed + penalty)}
            </div>
            {penalty > 0 && <span className="text-xs text-amber-400 font-bold">incl. +{penalty}s hints</span>}
          </div>

          <div
            className="grid grid-cols-6 border-2 border-zinc-500 rounded-lg overflow-hidden bg-zinc-900/60 select-none"
            style={{ width: 'min(100%, 372px)' }}
            role="grid"
            aria-label="Sudoku grid"
          >
            {vals.map((v, i) => {
              const r = Math.floor(i / SIZE), c = i % SIZE;
              const isGiven = givens[i] !== 0;
              const isHint = hinted.includes(i);
              const isSel = sel === i;
              const related = sel !== null && !isSel && (r === selRow || c === selCol || `${Math.floor(r / 2)}-${Math.floor(c / 3)}` === selBox);
              const sameDigit = selVal && v === selVal && !isSel;
              const bad = conflicts.has(i);
              const cls = [
                'relative aspect-square flex items-center justify-center border-zinc-700/60 border-r border-b transition-colors',
                c === 2 ? '!border-r-2 !border-r-zinc-500' : '',
                c === 5 ? '!border-r-0' : '',
                r % 2 === 1 && r !== 5 ? '!border-b-2 !border-b-zinc-500' : '',
                r === 5 ? '!border-b-0' : '',
                isSel ? 'bg-accent/30' : sameDigit ? 'bg-accent/20' : related ? 'bg-white/5' : '',
              ].join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  data-cell={i}
                  data-given={isGiven ? '1' : '0'}
                  data-conflict={bad ? '1' : '0'}
                  aria-label={`row ${r + 1} column ${c + 1}${v ? ` value ${v}` : ' empty'}`}
                  onClick={() => setSel(i)}
                  className={cls}
                >
                  {v ? (
                    <span
                      className={`text-2xl sm:text-3xl font-black font-display ${
                        bad ? 'text-red-400' : isGiven ? 'text-zinc-100' : isHint ? 'text-amber-400' : 'text-accent'
                      }`}
                    >
                      {v}
                    </span>
                  ) : notes[i].length ? (
                    <span className="grid grid-cols-3 w-full h-full p-0.5 text-[9px] sm:text-[10px] leading-none text-zinc-400 font-bold">
                      {[1, 2, 3, 4, 5, 6].map((d) => (
                        <span key={d} className="flex items-center justify-center">
                          {notes[i].includes(d) ? d : ''}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-6 gap-2 w-full" style={{ maxWidth: 372 }}>
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                type="button"
                data-pad={d}
                onClick={() => place(d)}
                className={`h-12 rounded-xl font-black text-xl border transition-all active:scale-95 ${
                  noteMode ? 'border-accent/40 bg-zinc-900/50 text-zinc-300 text-base' : 'border-white/5 bg-zinc-900/50 hover:border-accent'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              data-action="notes"
              onClick={() => setNoteMode((m) => !m)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border flex items-center gap-1.5 transition-all ${
                noteMode ? 'border-accent bg-accent/20 text-accent' : 'border-white/5 bg-zinc-900/50 hover:border-accent'
              }`}
            >
              <PencilLine className="w-4 h-4" /> Notes {noteMode ? 'on' : 'off'}
            </button>
            <button
              type="button"
              data-action="erase"
              onClick={() => place(0)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent flex items-center gap-1.5 transition-all"
            >
              <Eraser className="w-4 h-4" /> Erase
            </button>
            <button
              type="button"
              data-action="hint"
              onClick={useHint}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-amber-400 flex items-center gap-1.5 transition-all"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" /> Hint (+{HINT_PENALTY}s)
            </button>
          </div>
          <p className="text-xs text-zinc-500 text-center max-w-sm">
            Tap a cell, then a number. Boxes are 2 rows × 3 columns. The clock keeps running if you leave the page — one attempt per day.
          </p>
        </>
      )}
    </GameShell>
  );
}

function AlreadyButtons() {
  const navigate = useNavigate();
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      <button onClick={() => navigate('/leaderboard')} className="premium-gradient px-5 py-3 rounded-xl font-bold">Leaderboard</button>
      <button onClick={() => navigate('/')} className="px-5 py-3 rounded-xl font-bold border border-white/5 bg-zinc-900/50">Back to hub</button>
    </div>
  );
}
