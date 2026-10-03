import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { todayKey } from '../../lib/season';
import { getSchedule } from '../../api';

// One word per weekday, ramping up in difficulty through the week.
// Hangman difficulty comes from SHORT words with awkward letters and few
// normal vowels -- long words full of common letters (DERIVATIVE,
// PREREQUISITE) give themselves away almost immediately. Measured by
// simulating a sensible player (always guessing the letter found in the
// most words that could still fit), the typical wrong guesses per word are:
//   PARADIGM ~2, SYLLABUS ~3, BUZZWORD ~3, SYMPHONY ~4, RHYTHM ~5 (a loss).
// The admin panel can still override any day's word + clue.
const WORDS = {
  mon: { word: 'PARADIGM', clue: 'A typical model or pattern — a "shift" in one changes how a whole field thinks.' },
  tue: { word: 'SYLLABUS', clue: 'The course outline your professor hands out on day one.' },
  wed: { word: 'BUZZWORD', clue: 'Trendy jargon that sounds important, like "synergy" or "disrupt".' },
  thu: { word: 'SYMPHONY', clue: 'A long orchestral work, like Beethoven\'s Ninth.' },
  fri: { word: 'RHYTHM', clue: 'The pattern of beats and accents in music.' },
};
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const MAX_WRONG = 5;
const CLUE_TIME_PENALTY = 10; // seconds added to your time for peeking at the clue
const CLUE_POINT_PENALTY = 20;

function getTodayEntry() {
  return WORDS[DAY_KEYS[new Date().getDay()]] || WORDS.mon;
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function HangmanPage() {
  const { allowed, week } = useGameGuard('hangman');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [entry, setEntry] = useState(null);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const [clueShown, setClueShown] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!allowed) return;
    getSchedule()
      .then((data) => {
        const o = data.overrides?.[`hangman:${todayKey()}`];
        setEntry(o ? { word: o.word.toUpperCase(), clue: o.clue || 'No clue available.' } : getTodayEntry());
      })
      .catch(() => setEntry(getTodayEntry()));
  }, [allowed]);

  // The clock starts when the word actually appears, so a slow network
  // doesn't cost anyone time. Stopwatch only -- there is no time limit.
  useEffect(() => {
    if (entry) startRef.current = Date.now();
  }, [entry]);

  useEffect(() => {
    if (!entry || done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [entry, done]);

  const guess = (l) => {
    if (done || !entry || guessed.has(l)) return;
    const ng = new Set(guessed);
    ng.add(l);
    setGuessed(ng);

    const miss = !entry.word.includes(l);
    const w = miss ? wrong + 1 : wrong;
    if (miss) setWrong(w);

    const won = entry.word.split('').every((c) => ng.has(c));
    const lost = w >= MAX_WRONG;
    if (!won && !lost) return;

    setDone(true);
    if (won) {
      const seconds = (Date.now() - startRef.current) / 1000 + (clueShown ? CLUE_TIME_PENALTY : 0);
      const finalTime = Math.round(seconds * 10) / 10;
      const score = Math.max(10, 100 - 15 * w - (clueShown ? CLUE_POINT_PENALTY : 0));
      setMessage(`Solved in ${formatElapsed(Math.round(finalTime))}! 🎉`);
      setTimeout(() => finish(score, { time: finalTime }), 900);
    } else {
      setMessage(`Out of guesses — the word was ${entry.word}.`);
      setTimeout(() => finish(0), 1500);
    }
  };

  if (!allowed || !entry) return null;

  const display = entry.word.split('').map((c) => (guessed.has(c) ? c : '_')).join(' ');
  const displayTime = elapsed + (clueShown ? CLUE_TIME_PENALTY : 0);

  return (
    <GameShell emoji="🪢" title="Hangman" tag="Guess the word before you run out of tries." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Guess one letter at a time — {MAX_WRONG} wrong guesses and you're out. The clue is hidden; reveal it if you're stuck (+{CLUE_TIME_PENALTY}s and −{CLUE_POINT_PENALTY} points). No time limit — play more days to climb the board, and ties go to your lowest total time.
          </p>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{MAX_WRONG - wrong}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Tries left</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{formatElapsed(displayTime)}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Time{clueShown ? ` (incl. +${CLUE_TIME_PENALTY}s clue)` : ''}</div>
            </div>
          </div>

          <div className="font-mono text-2xl tracking-[0.3em]">{display}</div>

          {clueShown ? (
            <div className="text-zinc-400 text-sm italic max-w-sm text-center">💡 {entry.clue}</div>
          ) : (
            <button
              type="button"
              onClick={() => setClueShown(true)}
              disabled={done}
              className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
            >
              <Lightbulb className="w-4 h-4" /> Show clue (+{CLUE_TIME_PENALTY}s, −{CLUE_POINT_PENALTY} pts)
            </button>
          )}

          <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => {
              const g = guessed.has(l);
              const hit = g && entry.word.includes(l);
              return (
                <button
                  key={l}
                  onClick={() => guess(l)}
                  disabled={g || done}
                  className={`chip ${hit ? 'hit' : ''} ${g && !hit ? 'opacity-30' : ''}`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
