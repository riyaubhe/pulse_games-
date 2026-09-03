import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

function genProblem() {
  const ops = ['+', '-', '×', '÷'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;
  if (op === '×') { a = Math.floor(Math.random() * 11) + 5; b = Math.floor(Math.random() * 11) + 5; answer = a * b; }
  else if (op === '÷') { b = Math.floor(Math.random() * 13) + 4; answer = Math.floor(Math.random() * 13) + 4; a = b * answer; }
  else { a = Math.floor(Math.random() * 250) + 50; b = Math.floor(Math.random() * 150) + 20; answer = op === '+' ? a + b : a - b; }
  return { a, b, op, answer };
}

export default function MathSprintPage() {
  const { allowed, week } = useGameGuard('mathsprint');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [problem, setProblem] = useState(() => genProblem());
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); setDone(true); finish(correct * 8); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [allowed, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (parseInt(input, 10) === problem.answer) setCorrect((c) => c + 1);
    setProblem(genProblem());
    setInput('');
    inputRef.current?.focus();
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="➗" title="Math Sprint" tag="Solve as many problems as you can in 60s." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Solve the equation and press Enter. A new one appears immediately either way.</p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{timeLeft}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{correct}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Correct</div>
            </div>
          </div>
          <div className="text-4xl font-black font-display">{problem.a} {problem.op} {problem.b} =</div>
          <input
            ref={inputRef}
            autoFocus
            disabled={done}
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your answer"
            className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center font-bold text-lg"
          />
        </>
      )}
    </GameShell>
  );
}
