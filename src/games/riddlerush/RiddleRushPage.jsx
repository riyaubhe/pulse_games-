import React, { useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const RIDDLES = [
  { clue: "What has keys but no locks, space but no room, and you can enter but never go inside?", a: ["a keyboard", "keyboard"] },
  { clue: "The person who makes it sells it. The person who buys it never uses it. The person who uses it never sees it. What is it?", a: ["a coffin", "coffin"] },
  { clue: "What can travel around the entire world while staying in exactly one corner?", a: ["a stamp", "stamp"] },
  { clue: "What has a heart that doesn't beat?", a: ["an artichoke", "artichoke"] },
  { clue: "Forward I am heavy, backward I am not. What am I?", a: ["ton"] },
];

export default function RiddleRushPage() {
  const { allowed, week } = useGameGuard('riddlerush');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [locked, setLocked] = useState(false);

  const submit = () => {
    if (locked) return;
    const r = RIDDLES[idx];
    const ok = r.a.includes(input.trim().toLowerCase());
    setFeedback(ok ? '✅ Correct!' : `Answer: ${r.a[0]}`);
    if (ok) setScore((s) => s + 20);
    setLocked(true);
    setTimeout(() => {
      if (idx + 1 < RIDDLES.length) {
        setIdx(idx + 1);
        setInput('');
        setFeedback('');
        setLocked(false);
      } else {
        finish(score + (ok ? 20 : 0));
      }
    }, 1100);
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🧩" title="Riddle Rush" tag="Solve 5 classic riddles as fast as you can." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Riddle {idx + 1} of {RIDDLES.length}.</p>
          <p className="text-lg font-medium text-center max-w-sm italic">"{RIDDLES[idx].clue}"</p>
          <input
            autoFocus
            disabled={locked}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your guess"
            className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center"
          />
          {feedback && <p className="text-zinc-400 text-sm">{feedback}</p>}
        </>
      )}
    </GameShell>
  );
}
