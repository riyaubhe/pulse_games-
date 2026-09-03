import React, { useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const EMOJIS = ["📘", "✏️", "🧮", "🔬", "🎓", "💡", "📐", "🧪"];

function buildDeck() {
  return [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((e, i) => ({ id: i, e, flipped: false, matched: false }));
}

export default function MemoryPage() {
  const { allowed, week } = useGameGuard('memory');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [deck, setDeck] = useState(() => buildDeck());
  const [firstPick, setFirstPick] = useState(null);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [lock, setLock] = useState(false);

  const pick = (card) => {
    if (lock || card.flipped || card.matched) return;
    const next = deck.map((c) => (c.id === card.id ? { ...c, flipped: true } : c));
    setDeck(next);

    if (!firstPick) { setFirstPick(card); return; }

    setMoves((m) => m + 1);
    setLock(true);

    if (firstPick.e === card.e) {
      const matchedDeck = next.map((c) => (c.id === card.id || c.id === firstPick.id ? { ...c, matched: true } : c));
      setDeck(matchedDeck);
      const newMatched = matched + 1;
      setMatched(newMatched);
      setFirstPick(null);
      setLock(false);
      if (newMatched === EMOJIS.length) {
        const score = Math.max(20, 180 - (moves + 1) * 6);
        setTimeout(() => finish(score), 500);
      }
    } else {
      setTimeout(() => {
        setDeck((d) => d.map((c) => (c.id === card.id || c.id === firstPick.id ? { ...c, flipped: false } : c)));
        setFirstPick(null);
        setLock(false);
      }, 700);
    }
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🧠" title="Memory Match" tag="Flip cards and find all 8 pairs." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Flip two cards at a time. Find all 8 pairs in as few moves as possible.</p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{moves}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Moves</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{matched}/{EMOJIS.length}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Pairs</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {deck.map((card) => (
              <button
                key={card.id}
                onClick={() => pick(card)}
                className={`w-16 h-16 rounded-xl border flex items-center justify-center text-2xl transition-all ${
                  card.matched ? 'bg-correct/20 border-correct/40' : card.flipped ? 'bg-zinc-800 border-accent' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                {card.flipped || card.matched ? card.e : '❔'}
              </button>
            ))}
          </div>
        </>
      )}
    </GameShell>
  );
}
