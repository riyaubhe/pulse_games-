import React, { useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const RIDDLES = [
  { emoji: "🦉📖🌙", a: ["night owl", "nightowl"] },
  { emoji: "📈🧠", a: ["learning curve", "learningcurve"] },
  { emoji: "🔄💭", a: ["second guessing", "second-guessing", "secondguessing"] },
  { emoji: "⏰🎯", a: ["deadline"] },
  { emoji: "🌟💡🧠", a: ["brainwave", "brain wave"] },
];

export default function EmojiRiddlesPage() {
  const { allowed, week } = useGameGuard('emoji');
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
    }, 900);
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="😄" title="Emoji Riddles" tag="Decode 5 emoji clues." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Type your guess for what the emoji pair spells out. Riddle {idx + 1} of {RIDDLES.length}.</p>
          <div className="text-5xl">{RIDDLES[idx].emoji}</div>
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
