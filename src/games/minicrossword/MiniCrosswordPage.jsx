import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { CROSSWORDS } from './puzzles';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getPuzzle = () => CROSSWORDS[DAY_KEYS[new Date().getDay()]] || CROSSWORDS.mon;

const CHECK_PENALTY = 15; // seconds added each time you press Check
const REVEAL_PENALTY = 30; // seconds added for each revealed letter

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 100 points for solving within the day's par time, then -1 point per 6 seconds
// over it. Never below 20 for a full solve.
export function crosswordScore(finalTime, par) {
  return Math.max(20, 100 - Math.floor(Math.max(0, finalTime - par) / 6));
}

// Every cell that is part of a word: the 3 across rows (0, 2, 4) and the 3 down columns (0, 2, 4).
const isActive = (r, c) => r % 2 === 0 || c % 2 === 0;

const storeKey = (player) => `pulse-crossword:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

export default function MiniCrosswordPage() {
  const { allowed, week } = useGameGuard('minicrossword');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useMemo(getPuzzle, []);

  // solution[r][c] letter for active cells
  const solution = useMemo(() => {
    const g = {};
    puzzle.across.forEach((a) => a.answer.split('').forEach((ch, c) => { g[`${a.row},${c}`] = ch; }));
    puzzle.down.forEach((d) => d.answer.split('').forEach((ch, r) => { g[`${r},${d.col}`] = ch; }));
    return g;
  }, [puzzle]);
  const numbers = useMemo(() => {
    const n = {};
    puzzle.across.forEach((a) => { n[`${a.row},0`] = a.n; });
    puzzle.down.forEach((d) => { n[`0,${d.col}`] = d.n; });
    return n;
  }, [puzzle]);
  const total = Object.keys(solution).length;

  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null);
  const [values, setValues] = useState({});
  const [wrong, setWrong] = useState({});
  const [checks, setChecks] = useState(0);
  const [reveals, setReveals] = useState(0);
  const [revealed, setRevealed] = useState([]);
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [dir, setDir] = useState('across');
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(null);
  const inputRef = useRef(null);

  // Restore today's board, or find out if you already played today on another device.
  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    if (s) {
      setValues(s.values || {});
      setChecks(s.checks || 0);
      setReveals(s.reveals || 0);
      setRevealed(s.revealed || []);
      startRef.current = s.startedAt;
      if (s.done) {
        setPlayedScore(s.score);
        if (!s.submitted) finish(s.score, s.meta);
      }
      setReady(true);
      return;
    }
    getLeaderboard()
      .then((data) => {
        if (cancelled) return;
        const v = data.weeks?.[week]?.[player]?.[todayKey()];
        if (v !== undefined) setPlayedScore(dayScoreOf(v));
        else {
          startRef.current = Date.now();
          save(player, { values: {}, checks: 0, reveals: 0, revealed: [], startedAt: startRef.current });
        }
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        startRef.current = Date.now();
        save(player, { values: {}, checks: 0, reveals: 0, revealed: [], startedAt: startRef.current });
        setReady(true);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, week, player]);

  useEffect(() => {
    if (!ready || done || playedScore !== null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [ready, done, playedScore]);

  useEffect(() => {
    if (ready && !done && playedScore === null && inputRef.current) inputRef.current.focus();
  }, [ready, done, playedScore, sel, dir]);

  const penalty = checks * CHECK_PENALTY + reveals * REVEAL_PENALTY;
  const elapsed = startRef.current ? (now - startRef.current) / 1000 : 0;

  const persist = (patch) => {
    const cur = load(player) || {};
    save(player, { ...cur, values, checks, reveals, revealed, startedAt: startRef.current, ...patch });
  };

  const wordCells = (r, c, d) => {
    // cells of the word through (r,c) in direction d, or [] when none
    if (d === 'across' && r % 2 === 0) return [0, 1, 2, 3, 4].map((cc) => [r, cc]);
    if (d === 'down' && c % 2 === 0) return [0, 1, 2, 3, 4].map((rr) => [rr, c]);
    return [];
  };
  const effectiveDir = (r, c, d) => {
    if (wordCells(r, c, d).length) return d;
    return d === 'across' ? 'down' : 'across';
  };
  const curDir = effectiveDir(sel.r, sel.c, dir);
  const activeWord = wordCells(sel.r, sel.c, curDir);
  const inWord = (r, c) => activeWord.some(([a, b]) => a === r && b === c);

  const select = (r, c) => {
    if (done) return;
    if (sel.r === r && sel.c === c) {
      const other = curDir === 'across' ? 'down' : 'across';
      if (wordCells(r, c, other).length) setDir(other);
    } else {
      setSel({ r, c });
      if (!wordCells(r, c, dir).length) setDir(dir === 'across' ? 'down' : 'across');
    }
  };

  const finishGame = (vals, solved, meta2) => {
    setDone(true);
    let score;
    let meta;
    if (solved) {
      const real = (Date.now() - startRef.current) / 1000;
      const pen = (meta2?.checks ?? checks) * CHECK_PENALTY + (meta2?.reveals ?? reveals) * REVEAL_PENALTY;
      const finalTime = Math.round((real + pen) * 10) / 10;
      score = crosswordScore(finalTime, puzzle.par);
      meta = { time: finalTime, checks: meta2?.checks ?? checks, reveals: meta2?.reveals ?? reveals };
      setSummary({ real: Math.round(real), pen, finalTime, solved: true });
    } else {
      const correct = Object.keys(solution).filter((k) => vals[k] === solution[k]).length;
      score = Math.round((correct / total) * 40);
      meta = { gaveUp: true, correct };
      setSummary({ solved: false, correct });
    }
    persist({ values: vals, done: true, score, meta, submitted: false });
    setTimeout(() => {
      persist({ submitted: true });
      finish(score, meta);
    }, 900);
  };

  const advance = (r, c, step) => {
    // move within the active word by `step` (1 or -1), staying put at the ends
    const cells = wordCells(r, c, curDir);
    const idx = cells.findIndex(([a, b]) => a === r && b === c);
    const nx = cells[idx + step];
    if (nx) setSel({ r: nx[0], c: nx[1] });
  };

  const typeLetter = (ch) => {
    if (done) return;
    const key = `${sel.r},${sel.c}`;
    if (!isActive(sel.r, sel.c) || revealed.includes(key)) return advance(sel.r, sel.c, 1);
    const nv = { ...values, [key]: ch.toUpperCase() };
    setValues(nv);
    setWrong((w) => { const x = { ...w }; delete x[key]; return x; });
    persist({ values: nv });
    if (Object.keys(solution).every((k) => nv[k] === solution[k])) {
      finishGame(nv, true);
      return;
    }
    advance(sel.r, sel.c, 1);
  };

  const backspace = () => {
    if (done) return;
    const key = `${sel.r},${sel.c}`;
    if (values[key] && !revealed.includes(key)) {
      const nv = { ...values };
      delete nv[key];
      setValues(nv);
      persist({ values: nv });
    } else {
      // empty square: step back and clear the previous one (unless it was revealed)
      const cells = wordCells(sel.r, sel.c, curDir);
      const idx = cells.findIndex(([a, b]) => a === sel.r && b === sel.c);
      const prev = cells[idx - 1];
      if (!prev) return;
      const pk = `${prev[0]},${prev[1]}`;
      setSel({ r: prev[0], c: prev[1] });
      if (values[pk] && !revealed.includes(pk)) {
        const nv = { ...values };
        delete nv[pk];
        setValues(nv);
        persist({ values: nv });
      }
    }
  };

  const move = (dr, dc) => {
    let r = sel.r + dr, c = sel.c + dc;
    while (r >= 0 && r < 5 && c >= 0 && c < 5) {
      if (isActive(r, c)) { setSel({ r, c }); return; }
      r += dr; c += dc;
    }
  };

  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); typeLetter(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1); }
    else if (e.key === 'Tab' || e.key === ' ') {
      e.preventDefault();
      const other = curDir === 'across' ? 'down' : 'across';
      if (wordCells(sel.r, sel.c, other).length) setDir(other);
    }
  };
  // Phones sometimes send "Unidentified" keys, so also accept letters from the input's value.
  const onChange = (e) => {
    const v = e.target.value;
    e.target.value = '';
    const ch = v.slice(-1);
    if (/^[a-zA-Z]$/.test(ch)) typeLetter(ch);
  };

  const check = () => {
    if (done) return;
    const w = {};
    Object.keys(values).forEach((k) => { if (values[k] && values[k] !== solution[k]) w[k] = true; });
    const nc = checks + 1;
    setWrong(w);
    setChecks(nc);
    persist({ checks: nc });
  };

  const reveal = () => {
    if (done) return;
    const key = `${sel.r},${sel.c}`;
    if (!isActive(sel.r, sel.c) || revealed.includes(key) || values[key] === solution[key]) return;
    const nv = { ...values, [key]: solution[key] };
    const nr = [...revealed, key];
    const nrv = reveals + 1;
    setValues(nv);
    setRevealed(nr);
    setReveals(nrv);
    setWrong((w) => { const x = { ...w }; delete x[key]; return x; });
    persist({ values: nv, revealed: nr, reveals: nrv });
    if (Object.keys(solution).every((k) => nv[k] === solution[k])) finishGame(nv, true, { checks, reveals: nrv });
  };

  const giveUp = () => {
    if (done) return;
    finishGame(values, false);
  };

  if (!allowed) return null;
  const shell = { emoji: '⬛', title: 'Mini Crossword', tag: 'A new 5×5 crossword every day. Fastest solve wins.', week };

  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  if (playedScore !== null && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">
            points from today's crossword. One attempt per day. Come back tomorrow for a new one!
          </p>
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
          {summary?.solved ? (
            <div className="text-center text-zinc-400 text-sm mb-2">
              Solved in <span className="text-white font-bold">{formatClock(summary.real)}</span>
              {summary.pen > 0 && <> + {summary.pen}s penalties = <span className="text-white font-bold">{formatClock(summary.finalTime)}</span></>}
            </div>
          ) : summary ? (
            <div className="text-center text-zinc-400 text-sm mb-2">{summary.correct} of {total} letters were right.</div>
          ) : null}
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      </GameShell>
    );
  }

  const activeClue = [...puzzle.across.map((a) => ({ ...a, dir: 'across' })), ...puzzle.down.map((d) => ({ ...d, dir: 'down' }))]
    .find((cl) => cl.dir === curDir && (cl.dir === 'across' ? cl.row === sel.r : cl.col === sel.c));

  const clueButton = (cl, d) => {
    const active = activeClue && activeClue.n === cl.n && activeClue.dir === d;
    return (
      <button
        key={`${d}${cl.n}`}
        type="button"
        data-clue={`${cl.n}${d === 'across' ? 'A' : 'D'}`}
        onClick={() => {
          if (done) return;
          setDir(d);
          setSel(d === 'across' ? { r: cl.row, c: 0 } : { r: 0, c: cl.col });
        }}
        className={`text-left w-full rounded-lg px-2 py-1.5 text-xs transition-colors ${active ? 'bg-accent/20 text-white' : 'text-zinc-400 hover:bg-white/5'}`}
      >
        <b className="text-zinc-200">{cl.n}</b> {cl.clue}
      </button>
    );
  };

  return (
    <GameShell {...shell}>
      <div className="flex items-center gap-3">
        <div className="text-3xl font-black font-display tabular-nums" data-testid="clock">{formatClock(elapsed + penalty)}</div>
        {penalty > 0 && <span className="text-xs text-amber-400 font-bold">incl. +{penalty}s penalties</span>}
      </div>

      <div className="w-full max-w-xs text-center text-xs text-zinc-300 min-h-[2.5rem]" data-testid="active-clue">
        {activeClue && <><b>{activeClue.n} {activeClue.dir === 'across' ? 'Across' : 'Down'}:</b> {activeClue.clue}</>}
      </div>

      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 52px))', width: 'min(100%, 280px)' }} role="grid" aria-label="Crossword grid">
        {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 5 }).map((_, c) => {
          const key = `${r},${c}`;
          if (!isActive(r, c)) return <div key={key} className="aspect-square rounded-md bg-black/60 border border-white/5" />;
          const isSel = sel.r === r && sel.c === c;
          const val = values[key] || '';
          const bad = !!wrong[key];
          const rev = revealed.includes(key);
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              data-cell={key}
              data-wrong={bad ? '1' : '0'}
              onClick={() => select(r, c)}
              className={`relative aspect-square rounded-md border flex items-center justify-center font-black font-display text-xl uppercase transition-colors ${
                isSel ? 'bg-accent/40 border-accent' : inWord(r, c) ? 'bg-accent/15 border-accent/30' : 'bg-zinc-900/60 border-white/10'
              } ${bad ? 'text-red-400' : rev ? 'text-amber-400' : 'text-white'}`}
            >
              {numbers[key] && <span className="absolute top-0.5 left-1 text-[9px] font-black text-accent pointer-events-none">{numbers[key]}</span>}
              {val}
            </button>
          );
        }))}
      </div>

      {/* Hidden input: brings up the keyboard on phones and catches typing on desktop */}
      <input
        ref={inputRef}
        data-testid="xw-input"
        aria-label="Type a letter"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onKeyDown={onKeyDown}
        onChange={onChange}
        className="absolute opacity-0 w-px h-px pointer-events-none"
      />

      <div className="flex gap-2 flex-wrap justify-center">
        <button data-action="check" onClick={check} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent">Check (+{CHECK_PENALTY}s)</button>
        <button data-action="reveal" onClick={reveal} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-amber-400">Reveal letter (+{REVEAL_PENALTY}s)</button>
        <button data-action="giveup" onClick={giveUp} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-red-500">Give up</button>
      </div>

      <div className="w-full max-w-sm grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Across</div>
          {puzzle.across.map((cl) => clueButton(cl, 'across'))}
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Down</div>
          {puzzle.down.map((cl) => clueButton(cl, 'down'))}
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-center max-w-sm">
        Tap a square and type. Tap it again (or press Tab) to switch between across and down. The clock keeps running if you leave the page, and you get one attempt per day.
      </p>
    </GameShell>
  );
}
