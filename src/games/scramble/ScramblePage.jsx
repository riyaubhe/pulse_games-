import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const SCRAMBLE_WORDS = ["TUTORING","SCHEDULE","FEEDBACK","CALCULUS","CHEMISTRY","DEADLINE","SEMESTER","MENTOR","PATIENCE","WHITEBOARD","CURRICULUM","STATISTICS"];

function scramble(w) {
  let s = w;
  while (s === w) s = w.split('').sort(() => Math.random() - 0.5).join('');
  return s;
}

export default function ScramblePage() {
  const { allowed, week } = useGameGuard('scramble');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [display, setDisplay] = useState('');
  const [input, setInput] = useState('');
  const [solved, setSolved] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);
  const poolRef = useRef([]);
  const wordRef = useRef('');
  const inputRef = useRef(null);

  const next = () => {
    if (poolRef.current.length === 0) poolRef.current = [...SCRAMBLE_WORDS].sort(() => Math.random() - 0.5);
    const w = poolRef.current.pop();
    wordRef.current = w;
    setDisplay(scramble(w));
    setInput('');
  };

  useEffect(() => {
    if (!allowed) return;
    next();
  }, [allowed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setDone(true);
          finish(solved * 15);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [allowed, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (input.trim().toUpperCase() === wordRef.current) setSolved((s) => s + 1);
    next();
    inputRef.current?.focus();
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🔤" title="Word Scramble" tag="Unscramble as many words as you can in 60s." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            The scrambled letters spell a tutoring-related word. Type your guess and press Enter — a new word loads automatically either way.
          </p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{timeLeft}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{solved}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Solved</div>
            </div>
          </div>
          <div className="text-3xl font-black font-display tracking-[0.2em] uppercase">{display}</div>
          <input
            ref={inputRef}
            autoFocus
            disabled={done}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type the unscrambled word"
            className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center uppercase tracking-widest font-bold"
          />
        </>
      )}
    </GameShell>
  );
}
