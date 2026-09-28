import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';

// Pinpoint (LinkedIn-style): five clues, revealed one at a time from
// hardest to easiest. Guess the category that ties them all together.
// Every wrong guess reveals the next clue. Fewer clues = more points.
//
// `accept` is a list of single words. A guess counts as correct if ANY
// word in it matches, so "things with teeth", "teeth" and "have teeth"
// all work. Add more words to a puzzle's list if players phrase it
// differently.
const PUZZLES = {
  mon: {
    category: 'Words that come before "flow"',
    clues: ['Over', 'Air', 'Data', 'Work', 'Cash'],
    accept: ['flow', 'flows'],
  },
  tue: {
    category: 'Types of funding',
    clues: ['Bridge', 'Angel', 'Equity', 'Seed', 'Venture'],
    accept: ['funding', 'fundraising', 'financing', 'investment', 'investments', 'investing'],
  },
  wed: {
    category: '___ tree',
    clues: ['Syntax', 'Binary', 'Decision', 'Family', 'Christmas'],
    accept: ['tree', 'trees'],
  },
  thu: {
    category: 'Things that can run',
    clues: ['Candidate', 'Stocking', 'Nose', 'Program', 'River'],
    accept: ['run', 'runs', 'running', 'ran'],
  },
  fri: {
    category: 'Things you can draw',
    clues: ['Conclusion', 'Blood', 'Curtain', 'Bath', 'Sword'],
    accept: ['draw', 'draws', 'drawn', 'drawing', 'drew'],
  },
};
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const POINTS_BY_CLUES = [100, 80, 60, 40, 20]; // solved on clue 1..5

function getTodayPuzzle() {
  return PUZZLES[DAY_KEYS[new Date().getDay()]] || PUZZLES.mon;
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}

export default function PinpointPage() {
  const { allowed, week } = useGameGuard('pinpoint');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useRef(getTodayPuzzle()).current;
  const [revealed, setRevealed] = useState(1);
  const [wrongGuesses, setWrongGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  // Stopwatch, purely for ranking: ties on days played are broken by the
  // lowest combined solve time across the week. No cutoff.
  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [allowed, done]);

  const submit = () => {
    const guess = input.trim();
    if (!guess || done) return;
    setInput('');

    if (wrongGuesses.includes(guess.toLowerCase())) {
      setMessage("You already tried that one.");
      return;
    }

    const solved = tokenize(guess).some((t) => puzzle.accept.includes(t));
    if (solved) {
      setDone(true);
      setRevealed(5);
      const solveTime = Math.round(((Date.now() - startRef.current) / 1000) * 10) / 10;
      setMessage(`Correct! "${puzzle.category}" — solved with ${revealed} clue${revealed === 1 ? '' : 's'}. 🎉`);
      setTimeout(() => finish(POINTS_BY_CLUES[revealed - 1], { time: solveTime }), 1400);
      return;
    }

    setWrongGuesses([...wrongGuesses, guess.toLowerCase()]);
    if (revealed >= 5) {
      setDone(true);
      setMessage(`Out of clues — the category was "${puzzle.category}".`);
      setTimeout(() => finish(0), 1800);
      return;
    }
    setRevealed(revealed + 1);
    setMessage('Not quite — here\'s another clue.');
  };

  if (!allowed) return null;

  return (
    <GameShell emoji="📍" title="Pinpoint" tag="Guess the category that connects all 5 clues." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Five words share one hidden category. You see one clue at a time, hardest first. Type your guess for the category — every wrong guess reveals the next clue. The fewer clues you need, the more points you earn. No time limit — the more days you play this week the higher you rank, and ties go to the lowest total time.
          </p>

          <div className="text-center">
            <div className="text-2xl font-black font-display text-accent">{formatElapsed(elapsed)}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Time</div>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            {puzzle.clues.map((clue, i) => {
              const shown = i < revealed;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    shown ? 'bg-zinc-800/80 border-accent/40' : 'bg-zinc-900/40 border-white/5'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 w-12">Clue {i + 1}</span>
                  <span className={`font-black font-display text-lg ${shown ? 'text-white' : 'text-zinc-700'}`}>
                    {shown ? clue : '• • • •'}
                  </span>
                </div>
              );
            })}
          </div>

          {wrongGuesses.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {wrongGuesses.map((g) => <span key={g} className="chip line-through opacity-60">{g}</span>)}
            </div>
          )}

          <div className="flex gap-2 w-full max-w-xs">
            <input
              autoFocus
              disabled={done}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="What's the category?"
              className="flex-1 p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
            />
            <button
              onClick={submit}
              disabled={done || !input.trim()}
              className="premium-gradient px-5 rounded-xl font-bold disabled:opacity-40"
            >
              Guess
            </button>
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
