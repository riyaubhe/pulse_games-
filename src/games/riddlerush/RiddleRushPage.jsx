import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { RIDDLES, isCorrect } from './riddles';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getToday = () => RIDDLES[DAY_KEYS[new Date().getDay()]] || RIDDLES.mon;

const WRONG_PENALTY = 10; // seconds added per wrong guess
const HINT_PENALTY = 15; // seconds added for a first-letter hint
const SKIP_PENALTY = 45; // seconds added for skipping a riddle (and it scores nothing)

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 16 points per riddle solved (max 80), plus up to 20 speed points: all 20 if your
// total time (with penalties) is within the day's par, then -1 per 10 seconds over.
// Speed points only count when you solved all five.
export function riddleScore(solved, total, par, finalTime) {
  const base = solved * 16;
  const speed = solved === total ? Math.max(0, 20 - Math.floor(Math.max(0, finalTime - par) / 10)) : 0;
  return base + speed;
}

const storeKey = (player) => `pulse-riddles:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

export default function RiddleRushPage() {
  const { allowed, week } = useGameGuard('riddlerush');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const today = useMemo(getToday, []);
  const list = today.riddles;

  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null);
  const [idx, setIdx] = useState(0);
  const [solved, setSolved] = useState(0);
  const [wrongs, setWrongs] = useState(0);
  const [hints, setHints] = useState(0);
  const [skips, setSkips] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(null);
  const lockRef = useRef(false);

  const fresh = () => ({ idx: 0, solved: 0, wrongs: 0, hints: 0, skips: 0, hintShown: false, startedAt: startRef.current });

  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    if (s) {
      setIdx(s.idx || 0); setSolved(s.solved || 0); setWrongs(s.wrongs || 0);
      setHints(s.hints || 0); setSkips(s.skips || 0); setHintShown(!!s.hintShown);
      startRef.current = s.startedAt;
      if (s.done) {
        setPlayedScore(s.score);
        if (!s.submitted) finish(s.score, s.meta);
      }
      setReady(true);
      return;
    }
    const begin = () => { startRef.current = Date.now(); save(player, fresh()); setReady(true); };
    getLeaderboard()
      .then((data) => {
        if (cancelled) return;
        const v = data.weeks?.[week]?.[player]?.[todayKey()];
        if (v !== undefined) { setPlayedScore(dayScoreOf(v)); setReady(true); } else begin();
      })
      .catch(() => !cancelled && begin());
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, week, player]);

  useEffect(() => {
    if (!ready || done || playedScore !== null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [ready, done, playedScore]);

  const penalty = wrongs * WRONG_PENALTY + hints * HINT_PENALTY + skips * SKIP_PENALTY;
  const elapsed = startRef.current ? (now - startRef.current) / 1000 : 0;
  const persist = (patch) => save(player, { ...(load(player) || {}), startedAt: startRef.current, ...patch });

  const endGame = (nSolved, nWrongs, nHints, nSkips) => {
    setDone(true);
    const real = (Date.now() - startRef.current) / 1000;
    const pen = nWrongs * WRONG_PENALTY + nHints * HINT_PENALTY + nSkips * SKIP_PENALTY;
    const finalTime = Math.round((real + pen) * 10) / 10;
    const score = riddleScore(nSolved, list.length, today.par, finalTime);
    const meta = { time: finalTime, solved: nSolved, wrong: nWrongs, hints: nHints, skips: nSkips };
    setSummary({ real: Math.round(real), pen, finalTime, solved: nSolved });
    persist({ done: true, score, meta, submitted: false });
    setTimeout(() => { persist({ submitted: true }); finish(score, meta); }, 900);
  };

  const nextRiddle = (nSolved, nWrongs, nHints, nSkips) => {
    if (idx + 1 >= list.length) { endGame(nSolved, nWrongs, nHints, nSkips); return; }
    const ni = idx + 1;
    setIdx(ni); setInput(''); setFeedback(''); setHintShown(false);
    persist({ idx: ni, solved: nSolved, wrongs: nWrongs, hints: nHints, skips: nSkips, hintShown: false });
  };

  const submit = () => {
    if (done || lockRef.current || !input.trim()) return;
    if (isCorrect(list[idx], input)) {
      lockRef.current = true;
      const ns = solved + 1;
      setSolved(ns);
      setFeedback('✅ Correct!');
      setTimeout(() => { lockRef.current = false; nextRiddle(ns, wrongs, hints, skips); }, 600);
    } else {
      const nw = wrongs + 1;
      setWrongs(nw);
      setInput('');
      setFeedback(`Not quite. +${WRONG_PENALTY}s`);
      persist({ wrongs: nw });
    }
  };

  const hint = () => {
    if (done || hintShown || lockRef.current) return;
    setHints(hints + 1);
    setHintShown(true);
    persist({ hints: hints + 1, hintShown: true });
  };

  const skip = () => {
    if (done || lockRef.current) return;
    lockRef.current = true;
    const nk = skips + 1;
    setSkips(nk);
    setFeedback(`Skipped. The answer was: ${list[idx].a[0]}`);
    setTimeout(() => { lockRef.current = false; nextRiddle(solved, wrongs, hints, nk); }, 1400);
  };

  if (!allowed) return null;
  const shell = { emoji: '🧩', title: 'Riddle Rush', tag: '5 new riddles every day. Fastest time wins.', week };
  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  if (playedScore !== null && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">points from today's riddles. One attempt per day. Come back tomorrow for new ones!</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('/leaderboard')} className="premium-gradient px-5 py-3 rounded-xl font-bold">Leaderboard</button>
            <button onClick={() => navigate('/')} className="px-5 py-3 rounded-xl font-bold border border-white/5 bg-zinc-900/50">Back to hub</button>
          </div>
        </div>
      </GameShell>
    );
  }

  if (result) {
    return (
      <GameShell {...shell}>
        <div className="w-full">
          {summary && (
            <div className="text-center text-zinc-400 text-sm mb-2">
              {summary.solved} of {list.length} solved in <span className="text-white font-bold">{formatClock(summary.real)}</span>
              {summary.pen > 0 && <> + {summary.pen}s penalties = <span className="text-white font-bold">{formatClock(summary.finalTime)}</span></>}
            </div>
          )}
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      </GameShell>
    );
  }

  const answer0 = list[idx].a[0];
  return (
    <GameShell {...shell}>
      <div className="flex items-center gap-3">
        <div className="text-3xl font-black font-display tabular-nums" data-testid="clock">{formatClock(elapsed + penalty)}</div>
        {penalty > 0 && <span className="text-xs text-amber-400 font-bold">incl. +{penalty}s penalties</span>}
      </div>
      <p className="text-zinc-500 text-xs text-center">Riddle {idx + 1} of {list.length}</p>
      <p className="text-lg font-medium text-center max-w-sm italic" data-testid="riddle">"{list[idx].q}"</p>
      {hintShown && (
        <p className="text-amber-400 text-sm font-bold" data-testid="hint">
          Starts with "{answer0[0].toUpperCase()}" · {answer0.length} letters
        </p>
      )}
      <input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Your answer"
        data-testid="answer"
        className="w-full max-w-xs p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center"
      />
      <div className="flex gap-2 flex-wrap justify-center">
        <button data-action="submit" onClick={submit} className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow active:scale-[0.98]">Submit</button>
        <button data-action="hint" onClick={hint} disabled={hintShown} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-amber-400 disabled:opacity-40">Hint (+{HINT_PENALTY}s)</button>
        <button data-action="skip" onClick={skip} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-red-500">Skip (+{SKIP_PENALTY}s)</button>
      </div>
      <div className="h-5 text-sm text-zinc-300" data-testid="feedback">{feedback}</div>
      <p className="text-xs text-zinc-500 text-center max-w-sm">
        Wrong guesses cost +{WRONG_PENALTY}s. The clock keeps running if you leave the page, and you get one attempt per day.
      </p>
    </GameShell>
  );
}
