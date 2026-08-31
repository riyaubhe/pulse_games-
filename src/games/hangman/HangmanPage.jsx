import React, { useEffect, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { pickDaily, todayKey } from '../../lib/season';
import { getSchedule } from '../../api';

const HANGMAN_WORDS = [
  { word: "ALGORITHM", clue: "A step-by-step procedure for solving a problem or calculation." },
  { word: "DERIVATIVE", clue: "In calculus, the rate at which a function is changing at a point." },
  { word: "GRADEBOOK", clue: "Where a teacher or tutor records everyone's scores and progress." },
  { word: "PLAGIARISM", clue: "Presenting someone else's work or ideas as your own without credit." },
  { word: "TRANSCRIPT", clue: "The official record of every course and grade a student has completed." },
  { word: "PREREQUISITE", clue: "A course you must complete before you're allowed to take a more advanced one." },
  { word: "SYLLABUS", clue: "The document that outlines a course's topics, deadlines, and grading." },
  { word: "CITATION", clue: "A formal reference crediting where information or a quote came from." },
  { word: "DEADLINE", clue: "The final date or time by which something must be submitted." },
  { word: "DISCIPLINE", clue: "The practice of training yourself to follow rules or a particular code of behavior." },
  { word: "PERSEVERANCE", clue: "Continued effort to do or achieve something despite difficulty." },
  { word: "RESOURCEFUL", clue: "Able to find quick, clever ways to solve problems or overcome difficulties." },
];

const MAX_WRONG = 6;

export default function HangmanPage() {
  const { allowed, week } = useGameGuard('hangman');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [entry, setEntry] = useState(null);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!allowed) return;
    getSchedule()
      .then((data) => {
        const o = data.overrides?.[`hangman:${todayKey()}`];
        setEntry(o ? { word: o.word.toUpperCase(), clue: o.clue || 'No clue available.' } : pickDaily(HANGMAN_WORDS, 'hangman'));
      })
      .catch(() => setEntry(pickDaily(HANGMAN_WORDS, 'hangman')));
  }, [allowed]);

  const guess = (l) => {
    if (done || !entry) return;
    const ng = new Set(guessed); ng.add(l); setGuessed(ng);
    const w = !entry.word.includes(l) ? wrong + 1 : wrong;
    if (!entry.word.includes(l)) setWrong(w);
    const won = entry.word.split('').every((c) => ng.has(c));
    const lost = w >= MAX_WRONG;
    if (won || lost) {
      setDone(true);
      setMessage(won ? 'Solved!' : `Out of tries — word was ${entry.word}.`);
      const score = won ? Math.max(15, 100 - w * 15) : 0;
      setTimeout(() => finish(score), 900);
    }
  };

  if (!allowed || !entry) return null;

  const display = entry.word.split('').map((c) => (guessed.has(c) ? c : '_')).join(' ');

  return (
    <GameShell emoji="🪢" title="Hangman" tag="Guess the academic word before you run out of tries." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Guess one letter at a time. {MAX_WRONG} wrong guesses before it's over.</p>
          <div className="text-3xl font-black font-display text-accent">{MAX_WRONG - wrong}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 -mt-4">Tries left</div>
          <div className="font-mono text-2xl tracking-[0.3em]">{display}</div>
          <div className="text-zinc-500 text-xs italic max-w-sm text-center">💡 {entry.clue}</div>
          <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map((l) => {
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
