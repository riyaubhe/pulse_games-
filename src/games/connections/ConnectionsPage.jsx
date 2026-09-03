import React, { useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

const GROUPS = [
  { name: "Study Tools", color: "bg-amber-500", words: ["PENCIL", "ERASER", "BINDER", "MARKER"] },
  { name: "Study Techniques", color: "bg-correct", words: ["RECALL", "REVIEW", "REPEAT", "DRILL"] },
  { name: "Campus Places", color: "bg-red-500", words: ["LIBRARY", "LECTURE", "CLASSROOM", "HALL"] },
  { name: "___ + Study", color: "bg-accent", words: ["GROUP", "BUDDY", "GUIDE", "ABROAD"] },
];
const MAX_MISTAKES = 4;

function shuffledTiles() {
  const tiles = GROUPS.flatMap((g) => g.words.map((w) => ({ word: w, group: g })));
  return tiles.sort(() => Math.random() - 0.5);
}

export default function ConnectionsPage() {
  const { allowed, week } = useGameGuard('connections');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [tiles, setTiles] = useState(() => shuffledTiles());
  const [selected, setSelected] = useState([]);
  const [solvedGroups, setSolvedGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  const toggle = (t) => {
    if (done) return;
    if (selected.includes(t)) setSelected(selected.filter((x) => x !== t));
    else if (selected.length < 4) setSelected([...selected, t]);
  };

  const submit = () => {
    if (selected.length !== 4 || done) return;
    const g = selected[0].group;
    const allSame = selected.every((t) => t.group === g);
    if (allSame) {
      const ns = [...solvedGroups, g];
      setSolvedGroups(ns);
      setTiles(tiles.filter((t) => t.group !== g));
      setSelected([]);
      if (ns.length === 4) {
        setDone(true);
        setMessage('All 4 groups found!');
        const score = Math.max(20, 100 - mistakes * 20);
        setTimeout(() => finish(score), 1400);
      }
    } else {
      const nm = mistakes + 1;
      setMistakes(nm);
      setSelected([]);
      if (nm >= MAX_MISTAKES) {
        setDone(true);
        setMessage('Out of guesses.');
        setTimeout(() => finish(solvedGroups.length * 20), 1400);
      }
    }
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="🟪" title="Study Connections" tag="Find 4 groups of 4 related words." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Click up to 4 tiles that share something in common, then Submit. {MAX_MISTAKES} mistakes allowed.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-md">
            {solvedGroups.map((g) => (
              <div key={g.name} className={`${g.color} rounded-xl p-3 text-center text-white`}>
                <div className="font-black text-sm">{g.name}</div>
                <div className="text-xs font-medium opacity-90">{g.words.join(", ")}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-black font-display text-accent">{MAX_MISTAKES - mistakes}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Mistakes left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black font-display text-correct">{solvedGroups.length}/4</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Groups found</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {tiles.map((t) => (
              <button
                key={t.word}
                onClick={() => toggle(t)}
                disabled={done}
                className={`w-20 h-14 rounded-lg border text-xs font-bold p-1 transition-all ${
                  selected.includes(t) ? 'bg-zinc-800 border-accent' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                {t.word}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={selected.length !== 4 || done}
            className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Submit
          </button>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
