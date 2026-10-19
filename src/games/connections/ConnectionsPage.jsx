import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';

// One puzzle per weekday, a mix of topics like NYT Connections (with a few
// red herrings), and one study-themed group in most days. Colors go
// yellow -> green -> blue -> purple, easiest to trickiest.
const Y = 'bg-amber-500', G = 'bg-correct', B = 'bg-blue-500', P = 'bg-purple-500';
const PUZZLES = {
  mon: [
    { name: 'Study supplies', color: Y, words: ['BINDER', 'PLANNER', 'STAPLER', 'MARKER'] },
    { name: 'Pizza toppings', color: G, words: ['PEPPERONI', 'OLIVE', 'MUSHROOM', 'SAUSAGE'] },
    { name: 'Planets', color: B, words: ['MARS', 'VENUS', 'SATURN', 'MERCURY'] },
    { name: '___ball', color: P, words: ['BASKET', 'FOOT', 'SNOW', 'EYE'] },
  ],
  tue: [
    { name: 'Graded work', color: Y, words: ['QUIZ', 'ESSAY', 'MIDTERM', 'PROJECT'] },
    { name: 'Coffee drinks', color: G, words: ['LATTE', 'MOCHA', 'ESPRESSO', 'MACCHIATO'] },
    { name: 'Fast', color: B, words: ['RAPID', 'BRISK', 'QUICK', 'SWIFT'] },
    { name: 'Small birds', color: P, words: ['ROBIN', 'FINCH', 'WREN', 'LARK'] },
  ],
  wed: [
    { name: 'Ways to study', color: Y, words: ['CRAM', 'REVISE', 'MEMORIZE', 'SKIM'] },
    { name: 'Airlines', color: G, words: ['DELTA', 'SPIRIT', 'FRONTIER', 'ALASKA'] },
    { name: 'Greek letters', color: B, words: ['ALPHA', 'BETA', 'SIGMA', 'OMEGA'] },
    { name: '___board', color: P, words: ['CHALK', 'DASH', 'SKATE', 'KEY'] },
  ],
  thu: [
    { name: 'Parts of a textbook', color: Y, words: ['INDEX', 'GLOSSARY', 'CHAPTER', 'APPENDIX'] },
    { name: 'Currencies', color: G, words: ['YEN', 'EURO', 'PESO', 'RAND'] },
    { name: '___ bank', color: B, words: ['RIVER', 'BLOOD', 'PIGGY', 'SNOW'] },
    { name: 'Sound like letters', color: P, words: ['TEA', 'BEE', 'PEA', 'JAY'] },
  ],
  fri: [
    { name: 'Nonsense', color: Y, words: ['BUNK', 'HOGWASH', 'BALONEY', 'MALARKEY'] },
    { name: 'Poker moves', color: G, words: ['FLUSH', 'FOLD', 'RAISE', 'BLUFF'] },
    { name: '___ sheet', color: B, words: ['CHEAT', 'SPREAD', 'BED', 'TIME'] },
    { name: 'Hidden body parts', color: P, words: ['CHARM', 'SHINY', 'LEGEND', 'HIPSTER'] },
  ],
};
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const GROUPS = PUZZLES[DAY_KEYS[new Date().getDay()]] || PUZZLES.mon;
const MAX_MISTAKES = 4;

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const groupOf = (word) => GROUPS.find((g) => g.words.includes(word));
const storeKey = (player) => `pulse-connections:${player}:${todayKey()}`;
const load = (player) => {
  try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; }
};
const save = (player, data) => {
  try { localStorage.setItem(storeKey(player), JSON.stringify(data)); } catch { /* ignore */ }
};
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

export default function ConnectionsPage() {
  const { allowed, week } = useGameGuard('connections');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null); // set once today's attempt is over
  const [order, setOrder] = useState(() => shuffle(GROUPS.flatMap((g) => g.words)));
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]); // group names, in the order they were found
  const [mistakes, setMistakes] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const submittedRef = useRef(false);

  // One attempt per day: restore today's board (refresh-proof), or detect a finished attempt.
  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    const finishRestored = (score) => {
      setPlayedScore(score);
      if (!s.submitted) finish(score);
    };
    if (s) {
      setOrder(s.order);
      setSolved(s.solved);
      setMistakes(s.mistakes);
      setGuesses(s.guesses || []);
      if (s.done) finishRestored(s.score);
      setReady(true);
      return;
    }
    getLeaderboard()
      .then((data) => {
        if (cancelled) return;
        const v = data.weeks?.[week]?.[player]?.[todayKey()];
        if (v !== undefined) setPlayedScore(dayScoreOf(v));
        setReady(true);
      })
      .catch(() => !cancelled && setReady(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, week, player]);

  const persist = (patch) => {
    const cur = load(player) || {};
    save(player, { order, solved, mistakes, guesses, ...cur, ...patch });
  };

  const toggle = (w) => {
    if (done) return;
    if (selected.includes(w)) setSelected(selected.filter((x) => x !== w));
    else if (selected.length < 4) setSelected([...selected, w]);
  };

  const endGame = (score, patch) => {
    setDone(true);
    persist({ ...patch, done: true, score, submitted: false });
    setTimeout(() => {
      submittedRef.current = true;
      persist({ submitted: true });
      finish(score);
    }, 1400);
  };

  const submit = () => {
    if (selected.length !== 4 || done) return;
    const key = [...selected].sort().join('|');
    if (guesses.includes(key)) {
      setMessage('Already guessed!');
      return;
    }
    const ng = [...guesses, key];
    const g = groupOf(selected[0]);
    const hits = selected.filter((w) => g.words.includes(w)).length;
    if (hits === 4) {
      const ns = [...solved, g.name];
      const no = order.filter((w) => !g.words.includes(w));
      setSolved(ns);
      setOrder(no);
      setGuesses(ng);
      setSelected([]);
      setMessage('');
      if (ns.length === 4) {
        setMessage('All 4 groups found! 🎉');
        endGame(Math.max(20, 100 - mistakes * 20), { solved: ns, order: no, guesses: ng, mistakes });
      } else {
        persist({ solved: ns, order: no, guesses: ng });
      }
    } else {
      // "One away": 3 of the 4 picked words belong to the same group.
      const oneAway = GROUPS.some((gr) => !solved.includes(gr.name) && selected.filter((w) => gr.words.includes(w)).length === 3);
      const nm = mistakes + 1;
      setMistakes(nm);
      setGuesses(ng);
      setSelected([]);
      setMessage(oneAway ? 'One away…' : 'Not quite.');
      if (nm >= MAX_MISTAKES) {
        setMessage('Out of guesses.');
        endGame(solved.length * 20, { mistakes: nm, guesses: ng });
      } else {
        persist({ mistakes: nm, guesses: ng });
      }
    }
  };

  const doShuffle = () => {
    const no = shuffle(order);
    setOrder(no);
    persist({ order: no });
  };

  if (!allowed) return null;
  const shell = { emoji: '🟪', title: 'Study Connections', tag: 'Find 4 groups of 4 related words.', week };

  if (!ready) {
    return (
      <GameShell {...shell}>
        <p className="text-zinc-500 text-sm">Loading…</p>
      </GameShell>
    );
  }

  if (playedScore !== null && !result) {
    // Already played today (from a previous visit or another device).
    if (!done) {
      return (
        <GameShell {...shell}>
          <div className="text-center py-4">
            <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
            <p className="text-zinc-400 text-sm mt-2 mb-5">
              points from today's puzzle. One attempt per day — come back tomorrow for a new one!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => navigate('/leaderboard')} className="premium-gradient px-5 py-3 rounded-xl font-bold">Leaderboard</button>
              <button onClick={() => navigate('/')} className="px-5 py-3 rounded-xl font-bold border border-white/5 bg-zinc-900/50">Back to hub</button>
            </div>
          </div>
        </GameShell>
      );
    }
  }

  const solvedGroups = solved.map((n) => GROUPS.find((g) => g.name === n));

  return (
    <GameShell {...shell}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Pick 4 tiles that share something in common, then Submit. {MAX_MISTAKES} mistakes allowed. One attempt per day.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-md">
            {solvedGroups.map((g) => (
              <div key={g.name} className={`${g.color} rounded-xl p-3 text-center text-white`}>
                <div className="font-black text-sm">{g.name}</div>
                <div className="text-xs font-medium opacity-90">{g.words.join(', ')}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-black font-display text-accent">{MAX_MISTAKES - mistakes}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Mistakes left</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black font-display text-correct">{solved.length}/4</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Groups found</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 w-full max-w-md">
            {order.map((w) => (
              <button
                key={w}
                onClick={() => toggle(w)}
                disabled={done}
                className={`w-full h-14 rounded-lg border text-[11px] sm:text-xs font-bold px-0.5 transition-all ${
                  selected.includes(w) ? 'bg-zinc-800 border-accent' : 'bg-zinc-900/50 border-white/5'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={doShuffle}
              disabled={done}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent disabled:opacity-40"
            >
              Shuffle
            </button>
            <button
              onClick={() => setSelected([])}
              disabled={done || selected.length === 0}
              className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent disabled:opacity-40"
            >
              Deselect all
            </button>
            <button
              onClick={submit}
              disabled={selected.length !== 4 || done}
              className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98] disabled:opacity-40"
            >
              Submit
            </button>
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
