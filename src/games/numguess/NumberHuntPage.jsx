import React, { useEffect, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { makeSeededRng, todayKey } from '../../lib/season';
import { getSchedule } from '../../api';

const MAX_TRIES = 8;

export default function NumberHuntPage() {
  const { allowed, week } = useGameGuard('numguess');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [target, setTarget] = useState(null);
  const [tries, setTries] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('Make your first guess!');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    getSchedule()
      .then((data) => {
        const o = data.overrides?.[`numguess:${todayKey()}`];
        setTarget(o ? parseInt(o.target, 10) : Math.floor(makeSeededRng(todayKey() + ':numguess')() * 200) + 1);
      })
      .catch(() => setTarget(Math.floor(makeSeededRng(todayKey() + ':numguess')() * 200) + 1));
  }, [allowed]);

  const submit = () => {
    const v = parseInt(input, 10);
    if (isNaN(v) || done) return;
    const t = tries + 1;
    setTries(t);
    if (v === target) {
      setFeedback(`🎉 Correct! It was ${target}.`);
      setDone(true);
      const score = Math.max(10, (MAX_TRIES - t + 1) * 15);
      setTimeout(() => finish(score), 900);
    } else if (t >= MAX_TRIES) {
      setFeedback(`Out of guesses — it was ${target}.`);
      setDone(true);
      setTimeout(() => finish(0), 900);
    } else {
      setFeedback(v < target ? '📈 Higher!' : '📉 Lower!');
      setInput('');
    }
  };

  if (!allowed || target === null) return null;

  return (
    <GameShell emoji="🎯" title="Number Hunt" tag="Find the secret number 1–200 in 8 guesses." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Type a guess and press Enter — you'll get a higher/lower hint. Fewer guesses means a higher score.</p>
          <div className="text-3xl font-black font-display text-accent">{tries}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 -mt-4">Guesses used</div>
          <input
            autoFocus
            disabled={done}
            inputMode="numeric"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Guess 1–200"
            className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center font-bold text-lg"
          />
          <p className="text-lg">{feedback}</p>
        </>
      )}
    </GameShell>
  );
}
