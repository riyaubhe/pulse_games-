import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { pickDaily, todayKey } from '../../lib/season';
import { getSchedule } from '../../api';

const FINALE_WORDS = ["SEMESTER","RESEARCH","ACADEMIC","ANALYSIS","EQUATION","FEEDBACK","LEARNING","SCHOLARS","PROBLEMS","HYPOTHESIS","METHODOLOGY","SYNTHESIS"];
const ROWS = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["ENTER","Z","X","C","V","B","N","M","⌫"]];

function evaluate(guess, answer) {
  const marks = new Array(answer.length).fill('absent');
  const ansArr = answer.split(''); const gArr = guess.split('');
  for (let i = 0; i < answer.length; i++) if (gArr[i] === ansArr[i]) { marks[i] = 'correct'; ansArr[i] = null; gArr[i] = null; }
  for (let i = 0; i < answer.length; i++) {
    if (gArr[i] === null) continue;
    const idx = ansArr.indexOf(gArr[i]);
    if (idx !== -1) { marks[i] = 'present'; ansArr[idx] = null; }
  }
  return marks;
}

export default function FinaleWordlePage() {
  const { allowed, week } = useGameGuard('finalewordle');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [answer, setAnswer] = useState(null);
  const answerRef = useRef(null);
  const [guesses, setGuesses] = useState([]);
  const [current, setCurrent] = useState('');
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!allowed) return;
    getSchedule()
      .then((data) => {
        const o = data.overrides?.[`finalewordle:${todayKey()}`];
        const word = o ? o.word.toUpperCase() : pickDaily(FINALE_WORDS, 'finalewordle');
        setAnswer(word); answerRef.current = word;
      })
      .catch(() => {
        const word = pickDaily(FINALE_WORDS, 'finalewordle');
        setAnswer(word); answerRef.current = word;
      });
  }, [allowed]);

  const keyState = useMemo(() => {
    const state = {}; const rank = { absent: 0, present: 1, correct: 2 };
    guesses.forEach(({ word, marks }) => {
      word.split('').forEach((ch, i) => { if (!state[ch] || rank[marks[i]] > rank[state[ch]]) state[ch] = marks[i]; });
    });
    return state;
  }, [guesses]);

  const submitGuess = () => {
    if (!answerRef.current || current.length !== answerRef.current.length || done) return;
    const marks = evaluate(current, answerRef.current);
    const ng = [...guesses, { word: current, marks }];
    setGuesses(ng);
    const won = marks.every((m) => m === 'correct');
    const over = won || ng.length === 6;
    setCurrent('');
    if (over) {
      setDone(true);
      const scores = [100, 80, 60, 45, 30, 15];
      const score = (won ? scores[ng.length - 1] : 0) * 2;
      setMessage(won ? `Champion! Solved in ${ng.length} tries.` : `Out of tries — the word was ${answerRef.current}.`);
      setTimeout(() => finish(score), 900);
    }
  };

  useEffect(() => {
    if (!allowed || !answer) return;
    const handler = (e) => {
      if (done) return;
      if (e.key === 'Enter') submitGuess();
      else if (e.key === 'Backspace') setCurrent((c) => c.slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key) && current.length < answerRef.current.length) setCurrent((c) => c + e.key.toUpperCase());
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [allowed, answer, current, done, guesses]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allowed || !answer) return null;

  return (
    <GameShell emoji="🏆" title="Championship Wordle" tag="Season finale — double points!" week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Same rules as Wordle, longer word, double points. 6 tries.</p>
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, r) => {
              const g = guesses[r];
              const word = g ? g.word : r === guesses.length ? current : '';
              const marks = g ? g.marks : null;
              return (
                <div key={r} className="flex gap-1">
                  {Array.from({ length: answer.length }).map((_, c) => (
                    <div key={c} className={`cell !w-8 !h-8 sm:!w-9 sm:!h-9 !text-base ${marks ? marks[c] : ''}`}>{word[c] || ''}</div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {ROWS.map((row, ri) => (
              <div key={ri} className="flex gap-1 justify-center">
                {row.map((k) => (
                  <button
                    key={k}
                    className={`key ${k.length > 1 ? 'large' : ''} ${keyState[k] || ''}`}
                    onClick={() => {
                      if (done) return;
                      if (k === 'ENTER') submitGuess();
                      else if (k === '⌫') setCurrent((c) => c.slice(0, -1));
                      else if (current.length < answer.length) setCurrent((c) => c + k);
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
