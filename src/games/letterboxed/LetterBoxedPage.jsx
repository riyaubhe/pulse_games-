import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { BOXES } from './boxes';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getBox = () => BOXES[DAY_KEYS[new Date().getDay()]] || BOXES.mon;

const WORD_PENALTY = 20; // seconds added to your time for every word you use

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Full 100 points at or under the day's par word count, then -20 per extra word.
export function boxScore(wordCount, par) {
  return Math.max(20, 100 - 20 * Math.max(0, wordCount - par));
}

// Positions on a 100x100 board (box edges at 15 and 85). Sides go top, right, bottom, left.
const POS = [
  [[30, 15], [50, 15], [70, 15]],
  [[85, 30], [85, 50], [85, 70]],
  [[30, 85], [50, 85], [70, 85]],
  [[15, 30], [15, 50], [15, 70]],
];

const storeKey = (player) => `pulse-boxed:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

export default function LetterBoxedPage() {
  const { allowed, week } = useGameGuard('letterboxed');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const box = useMemo(getBox, []);
  const wordSet = useMemo(() => new Set(box.words.split(' ')), [box]);
  const sideOf = useMemo(() => {
    const m = {};
    box.sides.forEach((s, i) => s.split('').forEach((c, j) => { m[c] = { side: i, pos: POS[i][j] }; }));
    return m;
  }, [box]);
  const allLetters = Object.keys(sideOf);

  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null);
  const [words, setWords] = useState([]);
  const [cur, setCur] = useState(''); // letters typed so far, including the carried-over first letter
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(null);
  const msgTimer = useRef(null);

  const lastWord = words[words.length - 1];
  const carry = lastWord ? lastWord[lastWord.length - 1] : '';
  const typed = cur || carry; // what is shown in the word bar

  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    if (s) {
      setWords(s.words || []);
      startRef.current = s.startedAt;
      if (s.done) {
        setPlayedScore(s.score);
        if (!s.submitted && s.meta) finish(s.score, s.meta);
      }
      setReady(true);
      return;
    }
    const begin = () => { startRef.current = Date.now(); save(player, { words: [], startedAt: startRef.current }); setReady(true); };
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

  const elapsed = startRef.current ? (now - startRef.current) / 1000 : 0;
  const penalty = words.length * WORD_PENALTY;
  const persist = (patch) => save(player, { ...(load(player) || {}), startedAt: startRef.current, ...patch });

  const flash = (m) => {
    setMsg(m);
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(''), 1800);
  };

  const usedLetters = useMemo(() => new Set(words.join('').split('')), [words]);
  const left = allLetters.filter((c) => !usedLetters.has(c) && !typed.includes(c));

  const addLetter = (c) => {
    if (done) return;
    const base = cur || carry;
    if (base) {
      const prev = base[base.length - 1];
      if (sideOf[prev].side === sideOf[c].side) { flash('Pick a letter from a different side'); return; }
    }
    setCur(base + c);
  };

  const del = () => {
    if (done) return;
    if (!cur) return;
    // the carried-over first letter can't be deleted
    if (carry && cur.length <= 1) { setCur(''); return; }
    setCur(cur.slice(0, -1));
  };

  const finishGame = (list, solved) => {
    setDone(true);
    const real = (Date.now() - startRef.current) / 1000;
    if (solved) {
      const finalTime = Math.round((real + list.length * WORD_PENALTY) * 10) / 10;
      const score = boxScore(list.length, box.par);
      const meta = { time: finalTime, words: list.length };
      setSummary({ real: Math.round(real), finalTime, n: list.length, solved: true, list });
      persist({ words: list, done: true, score, meta, submitted: false });
      setTimeout(() => { persist({ submitted: true }); finish(score, meta); }, 900);
    } else {
      setSummary({ solved: false });
      persist({ words: list, done: true, score: 0, meta: null, submitted: true });
      setTimeout(() => finish(0), 900);
    }
  };

  const submit = () => {
    if (done) return;
    const w = cur || carry;
    if (!cur || w.length < 3) { flash('Too short'); return; }
    if (!wordSet.has(w)) { flash('Not in word list'); setCur(carry); return; }
    if (words.includes(w)) { flash('Already used'); setCur(carry); return; }
    const nl = [...words, w];
    setWords(nl);
    setCur('');
    persist({ words: nl });
    const covered = new Set(nl.join('').split(''));
    if (allLetters.every((c) => covered.has(c))) finishGame(nl, true);
    else flash(`${allLetters.filter((c) => !covered.has(c)).length} letters left`);
  };

  const undoWord = () => {
    if (done || !words.length) return;
    const nl = words.slice(0, -1);
    setWords(nl);
    setCur('');
    persist({ words: nl });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') del();
      else if (/^[a-zA-Z]$/.test(e.key)) {
        const c = e.key.toLowerCase();
        if (sideOf[c]) addLetter(c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!allowed) return null;
  const shell = { emoji: '🔤', title: 'Letter Boxed', tag: 'Use all 12 letters in as few words as you can. Fewest words and fastest time win.', week };
  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  if (playedScore !== null && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">points from today's box. One attempt per day. Come back tomorrow for a new one!</p>
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
          {summary?.solved && (
            <div className="text-center text-zinc-400 text-sm mb-2">
              <div className="uppercase font-bold tracking-wide text-zinc-200">{summary.list.join(' → ')}</div>
              <div className="mt-1">
                {summary.n} words in <span className="text-white font-bold">{formatClock(summary.real)}</span> + {summary.n * WORD_PENALTY}s for words = <span className="text-white font-bold">{formatClock(summary.finalTime)}</span>
              </div>
            </div>
          )}
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      </GameShell>
    );
  }

  const pathPts = typed.split('').map((c) => sideOf[c]?.pos).filter(Boolean);
  const lastTyped = typed[typed.length - 1];

  return (
    <GameShell {...shell}>
      <div className="flex items-center gap-3">
        <div className="text-3xl font-black font-display tabular-nums" data-testid="clock">{formatClock(elapsed + penalty)}</div>
        <span className="text-xs text-zinc-500">{words.length} word{words.length === 1 ? '' : 's'} · +{WORD_PENALTY}s each</span>
      </div>

      <div className="h-9 flex items-center justify-center text-2xl font-black font-display tracking-widest uppercase" data-testid="current">
        {[...typed].map((c, i) => (
          <span key={i} className={i === 0 && carry && !cur.length ? 'text-amber-400' : i === 0 && carry ? 'text-amber-400' : ''}>{c}</span>
        ))}
        <span className="w-0.5 h-6 bg-accent ml-0.5 animate-pulse" />
      </div>
      <div className="h-5 text-sm font-bold text-zinc-300" data-testid="msg">{msg}</div>

      <div className="relative" style={{ width: 'min(100%, 300px)', aspectRatio: '1' }}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <rect x="15" y="15" width="70" height="70" rx="2" fill="none" stroke="#52525b" strokeWidth="1.2" />
          {pathPts.length > 1 && (
            <polyline points={pathPts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        {allLetters.map((c) => {
          const { pos, side } = sideOf[c];
          const used = usedLetters.has(c);
          const blocked = lastTyped && sideOf[lastTyped].side === side;
          return (
            <button
              key={c}
              type="button"
              data-letter={c}
              data-used={used ? '1' : '0'}
              onClick={() => addLetter(c)}
              className={`absolute rounded-full font-black font-display text-xl uppercase flex items-center justify-center border-2 transition-colors ${
                used ? 'bg-accent/30 border-accent text-white' : 'bg-zinc-900 border-zinc-500 text-white hover:border-accent'
              } ${blocked ? 'opacity-40' : ''}`}
              style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, width: '14%', height: '14%', transform: 'translate(-50%, -50%)' }}
            >
              {c}
            </button>
          );
        })}
        <div className="absolute inset-[22%] flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="text-3xl font-black font-display text-accent" data-testid="left">{left.length}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">letters left</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button data-action="delete" onClick={del} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent">Delete</button>
        <button data-action="enter" onClick={submit} className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow active:scale-[0.98]">Enter</button>
        <button data-action="undo" onClick={undoWord} disabled={!words.length} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent disabled:opacity-40">Undo word</button>
      </div>

      <div className="w-full max-w-sm text-center" data-testid="chain">
        {words.length > 0 && <div className="uppercase text-sm font-bold text-zinc-200 tracking-wide">{words.join(' → ')}</div>}
      </div>

      <button data-action="giveup" onClick={() => finishGame(words, false)} className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-red-400">Give up</button>
      <p className="text-xs text-zinc-500 text-center max-w-sm">
        Tap letters (or type) to build words of 3+ letters. Consecutive letters must be on different sides, and each word starts with the last letter of the one before. The clock keeps running if you leave, and you get one attempt per day.
      </p>
    </GameShell>
  );
}
