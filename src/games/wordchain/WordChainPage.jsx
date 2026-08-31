import React, { useEffect, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const CATEGORY = { name: "Study Snacks & Supplies", limit: 35, example: "coffee" };

export default function WordChainPage() {
  const { allowed, week } = useGameGuard('wordchain');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [words, setWords] = useState([]);
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(CATEGORY.limit);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setDone(true);
          finish(Math.min(words.length, 18) * 8);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [allowed, done, words.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    const w = input.trim().toLowerCase();
    setInput('');
    if (!w || words.includes(w)) return;
    setWords([...words, w]);
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🍫" title="Word Chain Sprint" tag="List study snacks & supplies before time runs out." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Category: <b className="text-zinc-200">{CATEGORY.name}</b> — type any word that fits (e.g. "{CATEGORY.example}"), one at a time, no repeats. First 18 count toward your score.
          </p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{timeLeft}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Seconds</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{words.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Words (max 18)</div>
            </div>
          </div>
          <input
            autoFocus
            disabled={done}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Type a word and hit Enter"
            className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center"
          />
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {words.map((w) => <span key={w} className="chip hit">{w}</span>)}
          </div>
        </>
      )}
    </GameShell>
  );
}
