import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const CELLS = [
  { r: 0, c: 0, letter: "C", num: 1 }, { r: 0, c: 1, letter: "R" }, { r: 0, c: 2, letter: "A" }, { r: 0, c: 3, letter: "N" }, { r: 0, c: 4, letter: "E", num: 2 },
  { r: 1, c: 0, letter: "H" }, { r: 1, c: 4, letter: "N" },
  { r: 2, c: 0, letter: "E" }, { r: 2, c: 4, letter: "S" },
  { r: 3, c: 0, letter: "S" }, { r: 3, c: 4, letter: "U" },
  { r: 4, c: 0, letter: "S", num: 3 }, { r: 4, c: 1, letter: "T" }, { r: 4, c: 2, letter: "O" }, { r: 4, c: 3, letter: "N" }, { r: 4, c: 4, letter: "E" },
];
const CLUES = [
  { label: "1 Across", text: "A tall wading bird — or the machine used to lift heavy materials on a construction site", answer: "CRANE" },
  { label: "3 Across", text: "A small piece of rock — or a UK unit of weight equal to 14 pounds", answer: "STONE" },
  { label: "1 Down", text: "A strategy board game played with kings, queens, bishops, and pawns", answer: "CHESS" },
  { label: "2 Down", text: "To happen as a result, or follow immediately afterward", answer: "ENSUE" },
];

export default function MiniCrosswordPage() {
  const { allowed, week } = useGameGuard('minicrossword');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [values, setValues] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const [timeLeft, setTimeLeft] = useState(90);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState('');
  const doneRef = useRef(false);
  const valuesRef = useRef({});
  valuesRef.current = values;

  const finishGame = (solved) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    let correctCount = 0;
    CELLS.forEach((cell) => {
      if ((valuesRef.current[`${cell.r},${cell.c}`] || '').toUpperCase() === cell.letter) correctCount++;
    });
    const base = Math.round((correctCount / CELLS.length) * 80);
    const bonus = solved ? 20 + Math.round(timeLeft / 3) : 0;
    setFeedback(solved ? 'Solved! 🎉' : `Time's up — ${correctCount} of ${CELLS.length} letters were correct.`);
    setTimeout(() => finish(base + bonus), 700);
  };

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => {
      setTimeLeft((s) => { if (s <= 1) { clearInterval(t); finishGame(false); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [allowed, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCell = (key, val) => {
    setValues((v) => ({ ...v, [key]: val.slice(-1).toUpperCase() }));
  };

  const check = () => {
    const sm = {};
    let correctCount = 0;
    CELLS.forEach((cell) => {
      const key = `${cell.r},${cell.c}`;
      const val = (values[key] || '').toUpperCase();
      if (val === cell.letter) { sm[key] = 'correct'; correctCount++; }
      else if (val) sm[key] = 'wrong';
    });
    setStatusMap(sm);
    setFeedback(`${correctCount} of ${CELLS.length} letters correct.`);
    if (correctCount === CELLS.length) finishGame(true);
  };

  if (!allowed) return null;

  const cellMap = {};
  CELLS.forEach((c) => { cellMap[`${c.r},${c.c}`] = c; });

  return (
    <GameShell emoji="⬛" title="Mini Crossword" tag="A tiny 5×5 crossword." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Fill the grid using the clues below. Click Check to see which letters are right so far.</p>
          <div className="text-2xl font-black font-display text-accent">{timeLeft}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 -mt-4">Seconds</div>

          <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(5, 40px)' }}>
            {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => {
              const key = `${r},${c}`;
              const cell = cellMap[key];
              if (!cell) return <div key={key} className="w-10 h-10 rounded-md bg-black/40 border border-white/5" />;
              const status = statusMap[key];
              return (
                <div key={key} className="relative w-10 h-10">
                  {cell.num && <div className="absolute top-0.5 left-1 text-[9px] font-black text-accent pointer-events-none">{cell.num}</div>}
                  <input
                    maxLength={1}
                    disabled={done}
                    value={values[key] || ''}
                    onChange={(e) => setCell(key, e.target.value)}
                    className={`w-10 h-10 text-center font-mono font-bold text-lg rounded-md border outline-none uppercase bg-zinc-950/50 ${
                      status === 'correct' ? 'border-correct text-correct' : status === 'wrong' ? 'border-red-500 text-red-500' : 'border-border'
                    }`}
                  />
                </div>
              );
            }))}
          </div>

          <div className="text-left w-full max-w-xs text-xs text-zinc-500 space-y-1.5">
            {CLUES.map((c) => <div key={c.label}><b className="text-zinc-300">{c.label}:</b> {c.text}</div>)}
          </div>

          <div className="flex gap-3">
            <button onClick={check} className="premium-gradient px-5 py-2.5 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98]">Check</button>
            <button onClick={() => finishGame(false)} className="px-5 py-2.5 rounded-xl font-bold border border-white/5 bg-zinc-900/50">I'm done</button>
          </div>
          {feedback && <p className="text-zinc-400 text-sm text-center">{feedback}</p>}
        </>
      )}
    </GameShell>
  );
}
