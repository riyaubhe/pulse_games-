import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { STRANDS } from './puzzles';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getPuzzle = () => STRANDS[DAY_KEYS[new Date().getDay()]] || STRANDS.mon;

const ROWS = 8;
const COLS = 6;
const WORDS_PER_HINT = 3; // find 3 real non-theme words to earn a hint

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 100 points when you finish within the day's par time, then -1 per 10 seconds over it.
export function strandsScore(time, par) {
  return Math.max(20, 100 - Math.floor(Math.max(0, time - par) / 10));
}

const adjacent = (a, b) => (a !== b) && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1;

const storeKey = (player) => `pulse-strands:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

export default function StrandsPage() {
  const { allowed, week } = useGameGuard('strands');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useMemo(getPuzzle, []);
  const letters = useMemo(() => puzzle.grid.join('').split(''), [puzzle]);
  const extras = useMemo(() => new Set(puzzle.extras.split(' ')), [puzzle]);
  const themeWords = puzzle.words; // [{word, path:[[r,c]], spangram}]
  const cellsOf = (w) => w.path.map(([r, c]) => r * COLS + c);

  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null);
  const [found, setFound] = useState([]); // theme words found (uppercase)
  const [extraFound, setExtraFound] = useState([]); // non-theme words found (lowercase)
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintWord, setHintWord] = useState(null);
  const [path, setPath] = useState([]); // selected cell indexes
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const startRef = useRef(null);
  const msgTimer = useRef(null);
  const dragRef = useRef({ down: false, moved: false });
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    if (s) {
      setFound(s.found || []);
      setExtraFound(s.extraFound || []);
      setHintsUsed(s.hintsUsed || 0);
      setHintWord(s.hintWord || null);
      startRef.current = s.startedAt;
      if (s.done) {
        setPlayedScore(s.score);
        if (!s.submitted && s.meta) finish(s.score, s.meta);
      }
      setReady(true);
      return;
    }
    const begin = () => { startRef.current = Date.now(); save(player, { found: [], extraFound: [], hintsUsed: 0, startedAt: startRef.current }); setReady(true); };
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
  const persist = (patch) => save(player, { ...(load(player) || {}), startedAt: startRef.current, ...patch });
  const flash = (m) => {
    setMsg(m);
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(''), 1800);
  };

  // cell -> how it should look
  const cellKind = useMemo(() => {
    const k = {};
    themeWords.forEach((w) => {
      if (found.includes(w.word)) cellsOf(w).forEach((c) => { k[c] = w.spangram ? 'span' : 'theme'; });
    });
    return k;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, themeWords]);
  const hinted = useMemo(() => {
    const w = themeWords.find((x) => x.word === hintWord && !found.includes(x.word));
    return w ? new Set(cellsOf(w)) : new Set();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintWord, found, themeWords]);

  const hintsEarned = Math.floor(extraFound.length / WORDS_PER_HINT);
  const hintsAvailable = hintsEarned - hintsUsed;
  const progress = extraFound.length % WORDS_PER_HINT;

  const finishGame = (solved, nFound) => {
    setDone(true);
    const real = (Date.now() - startRef.current) / 1000;
    if (solved) {
      const time = Math.round(real * 10) / 10;
      const score = strandsScore(time, puzzle.par);
      const meta = { time, hints: hintsUsed };
      setSummary({ solved: true, time: Math.round(real) });
      persist({ found: nFound, done: true, score, meta, submitted: false });
      setTimeout(() => { persist({ submitted: true }); finish(score, meta); }, 900);
    } else {
      setSummary({ solved: false });
      persist({ done: true, score: 0, meta: null, submitted: true });
      setTimeout(() => finish(0), 900);
    }
  };

  const submitPath = (p) => {
    if (done) return;
    const word = p.map((i) => letters[i]).join('');
    setPath([]);
    if (word.length < 4) { flash('Too short'); return; }
    const theme = themeWords.find((w) => w.word === word);
    if (theme) {
      if (found.includes(theme.word)) { flash('Already found'); return; }
      const nf = [...found, theme.word];
      setFound(nf);
      const patch = { found: nf };
      if (hintWord === theme.word) { setHintWord(null); patch.hintWord = null; }
      persist(patch);
      if (nf.length === themeWords.length) { flash('All found! 🎉'); finishGame(true, nf); }
      else flash(theme.spangram ? 'Spangram! 🎉' : 'Theme word!');
      return;
    }
    const lw = word.toLowerCase();
    if (extras.has(lw)) {
      if (extraFound.includes(lw)) { flash('Already found'); return; }
      const ne = [...extraFound, lw];
      setExtraFound(ne);
      persist({ extraFound: ne });
      const prog = ne.length % WORDS_PER_HINT;
      flash(prog === 0 ? 'Hint earned! 💡' : `Nice! ${prog}/${WORDS_PER_HINT} toward a hint`);
      return;
    }
    flash('Not in word list');
  };

  const tap = (i) => {
    if (done) return;
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (path.length === 0) { setPath([i]); return; }
    const last = path[path.length - 1];
    if (i === last) { submitPath(path); return; } // tap the last letter again to submit
    const at = path.indexOf(i);
    if (at >= 0) { setPath(path.slice(0, at + 1)); return; } // tap an earlier letter to shorten
    if (adjacent(last, i)) setPath([...path, i]);
    else setPath([i]); // not touching: start a new word
  };

  const useHint = () => {
    if (done || hintsAvailable <= 0) return;
    const remaining = themeWords.filter((w) => !found.includes(w.word));
    if (!remaining.length) return;
    const pick = remaining.find((w) => !w.spangram) || remaining[0];
    setHintWord(pick.word);
    setHintsUsed(hintsUsed + 1);
    persist({ hintWord: pick.word, hintsUsed: hintsUsed + 1 });
  };

  // Drag support (finger or mouse): press a letter and slide across touching letters.
  const cellFromPoint = (x, y) => {
    if (typeof document.elementFromPoint !== 'function') return null;
    const el = document.elementFromPoint(x, y);
    const b = el && el.closest ? el.closest('[data-cell]') : null;
    return b ? Number(b.dataset.cell) : null;
  };
  const onPointerDown = (e, i) => {
    if (done) return;
    dragRef.current = { down: true, moved: false, start: i };
    if (e.target.releasePointerCapture && e.pointerId !== undefined) {
      try { e.target.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.down || done) return;
    const i = cellFromPoint(e.clientX, e.clientY);
    if (i === null) return;
    setPath((cur) => {
      const base = d.moved ? cur : [d.start];
      const last = base[base.length - 1];
      if (i === last) return base;
      const at = base.indexOf(i);
      if (at >= 0) { d.moved = true; return base.slice(0, at + 1); }
      if (adjacent(last, i)) { d.moved = true; return [...base, i]; }
      return base;
    });
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    if (!d.down) return;
    dragRef.current = { down: false, moved: false };
    if (d.moved) {
      suppressClick.current = true;
      setPath((cur) => { setTimeout(() => submitPath(cur), 0); return cur; });
    }
  };

  if (!allowed) return null;
  const shell = { emoji: '🧵', title: 'Strands', tag: 'Find the hidden theme words. Fastest time wins.', week };
  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  if (playedScore !== null && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">points from today's Strands. One attempt per day. Come back tomorrow for a new theme!</p>
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
              Found every word in <span className="text-white font-bold">{formatClock(summary.time)}</span>
            </div>
          )}
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      </GameShell>
    );
  }

  const word = path.map((i) => letters[i]).join('');
  const centers = (i) => [(i % COLS) + 0.5, Math.floor(i / COLS) + 0.5];

  return (
    <GameShell {...shell}>
      <div className="w-full max-w-xs text-center">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Today's theme</div>
        <div className="text-lg font-black font-display" data-testid="clue">{puzzle.clue}</div>
        <div className="text-xs text-zinc-400 mt-0.5">
          <span data-testid="found-count" className="text-white font-bold">{found.length}</span> of {themeWords.length} theme words found
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-3xl font-black font-display tabular-nums" data-testid="clock">{formatClock(elapsed)}</div>
        <button
          type="button"
          data-action="hint"
          onClick={useHint}
          disabled={hintsAvailable <= 0}
          className="px-3 py-2 rounded-xl text-xs font-bold border border-white/5 bg-zinc-900/50 hover:border-amber-400 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
          {hintsAvailable > 0 ? `Hint ready (${hintsAvailable})` : `Hint: ${progress}/${WORDS_PER_HINT}`}
        </button>
      </div>

      <div className="h-8 flex items-center justify-center text-2xl font-black font-display tracking-widest uppercase" data-testid="current">{word}</div>
      <div className="h-5 text-sm font-bold text-zinc-300" data-testid="msg">{msg}</div>

      <div
        className="relative select-none"
        style={{ width: 'min(100%, 300px)', aspectRatio: `${COLS} / ${ROWS}`, touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg viewBox={`0 0 ${COLS} ${ROWS}`} className="absolute inset-0 w-full h-full pointer-events-none">
          {themeWords.filter((w) => found.includes(w.word)).map((w) => (
            <polyline
              key={w.word}
              points={cellsOf(w).map((c) => centers(c).join(',')).join(' ')}
              fill="none"
              stroke={w.spangram ? '#fbbf24' : '#38bdf8'}
              strokeWidth="0.18"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          ))}
          {path.length > 1 && (
            <polyline points={path.map((c) => centers(c).join(',')).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="0.2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
          {letters.map((c, i) => {
            const kind = cellKind[i];
            const inPath = path.includes(i);
            return (
              <button
                key={i}
                type="button"
                data-cell={i}
                data-kind={kind || ''}
                data-hint={hinted.has(i) ? '1' : '0'}
                onClick={() => tap(i)}
                onPointerDown={(e) => onPointerDown(e, i)}
                className="flex items-center justify-center p-[3px]"
              >
                <span
                  className={`w-full h-full max-w-[40px] max-h-[40px] rounded-full flex items-center justify-center font-black font-display text-lg transition-colors ${
                    inPath ? 'bg-accent text-white scale-105'
                    : kind === 'span' ? 'bg-amber-400 text-zinc-900'
                    : kind === 'theme' ? 'bg-sky-500/70 text-white'
                    : 'text-zinc-100 hover:bg-white/10'
                  } ${hinted.has(i) && !kind ? 'ring-2 ring-dashed ring-amber-400' : ''}`}
                >
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button data-action="submit" onClick={() => path.length && submitPath(path)} className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow active:scale-[0.98]">Submit</button>
        <button data-action="clear" onClick={() => setPath([])} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent">Clear</button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Found</div>
        <div className="flex flex-wrap gap-1.5" data-testid="found">
          {themeWords.filter((w) => found.includes(w.word)).map((w) => (
            <span key={w.word} className={`px-2 py-1 rounded-lg text-xs font-bold ${w.spangram ? 'bg-amber-400 text-zinc-900' : 'bg-sky-500/70 text-white'}`}>{w.word}</span>
          ))}
          {extraFound.map((w) => (
            <span key={w} className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-zinc-800 text-zinc-400">{w}</span>
          ))}
        </div>
      </div>

      <button data-action="giveup" onClick={() => finishGame(false, found)} className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-red-400">Give up</button>
      <p className="text-xs text-zinc-500 text-center max-w-sm">
        Tap letters that touch (even diagonally), then tap the last letter again to submit, or drag across them. Every letter is part of a theme word, and one word, the spangram, touches the top and bottom. Find 3 other real words to earn a hint. The clock keeps running if you leave, and you get one attempt per day.
      </p>
    </GameShell>
  );
}
