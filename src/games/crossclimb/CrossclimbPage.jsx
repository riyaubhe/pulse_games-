import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Lightbulb, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey, seededShuffle } from '../../lib/season';
import { getLeaderboard } from '../../api';
import { PUZZLES } from './puzzles';
import { isValidChain, initialOrder, expectedEnds } from './ladderLogic';

// Looks and plays like LinkedIn's Crossclimb:
//  1. A ladder of 7 rows. The 5 middle rows each have a clue -- pick a row,
//     read its clue, type the 4-letter answer.
//  2. Once all 5 are solved, drag the rows into order so every neighbouring
//     pair differs by exactly one letter.
//  3. That unlocks the top and bottom rows, which share one combined clue.
// Fastest time wins. A hint reveals the next letter and costs 10 seconds.
// Ranking (gamesData.js): most days solved, ties go to lowest total time.

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getPuzzle = () => PUZZLES[DAY_KEYS[new Date().getDay()]] || PUZZLES.mon;
const PARS = { mon: 120, tue: 150, wed: 180, thu: 210, fri: 240, sun: 120, sat: 120 };
const HINT_PENALTY = 10;
const MID = [1, 2, 3, 4, 5];

export function formatClock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// 100 points for beating the day's target time, then -1 per 10 extra seconds (floor 20).
export function crossclimbScore(time, par) {
  return Math.max(20, 100 - Math.floor(Math.max(0, time - par) / 10));
}

const storeKey = (player) => `pulse-crossclimb:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };
const dayScoreOf = (v) => (typeof v === 'number' ? v : v && typeof v.score === 'number' ? v.score : 0);

const EMPTY = { 1: '', 2: '', 3: '', 4: '', 5: '', top: '', bottom: '' };
const ZERO = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, top: 0, bottom: 0 };

export default function CrossclimbPage() {
  const { allowed, week } = useGameGuard('crossclimb');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const { player } = usePlayer();
  const navigate = useNavigate();
  const puzzle = useRef(getPuzzle()).current;
  const par = PARS[DAY_KEYS[new Date().getDay()]] || 120;
  const { ladder, clues, endClue } = puzzle;

  const [order, setOrder] = useState(() => initialOrder(ladder, `${todayKey()}:crossclimb`, seededShuffle));
  const [drafts, setDrafts] = useState(EMPTY);
  const [hints, setHints] = useState(ZERO);
  const [sel, setSel] = useState(1);
  const [ready, setReady] = useState(false);
  const [playedScore, setPlayedScore] = useState(null);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [msg, setMsg] = useState('');
  const startRef = useRef(null);
  const doneRef = useRef(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dragRef = useRef(null);

  // ---- load saved state / one attempt per day (also across devices) ----
  useEffect(() => {
    if (!allowed || !week) return;
    let cancelled = false;
    const s = load(player);
    if (s) {
      if (s.order) setOrder(s.order);
      setDrafts({ ...EMPTY, ...(s.drafts || {}) });
      setHints({ ...ZERO, ...(s.hints || {}) });
      startRef.current = s.startedAt;
      if (s.done) {
        doneRef.current = true;
        setDone(true);
        setPlayedScore(s.score);
        if (!s.submitted && s.meta) finish(s.score, s.meta);
      }
      setReady(true);
      return;
    }
    const begin = () => {
      startRef.current = Date.now();
      save(player, { order, drafts: EMPTY, hints: ZERO, startedAt: startRef.current });
      setReady(true);
    };
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

  // ---- derived state ----
  const midSolved = (i) => drafts[i] === ladder[i];
  const solvedCount = MID.filter(midSolved).length;
  const allSolved = solvedCount === 5;
  const chainOk = allSolved && isValidChain(order.map((i) => ladder[i]));
  const ends = expectedEnds(order, ladder);
  const endSolved = (k) => chainOk && drafts[k] === ends[k];
  const penalty = HINT_PENALTY * Object.values(hints).reduce((a, b) => a + b, 0);
  const elapsed = startRef.current ? (now - startRef.current) / 1000 : 0;
  const displayTime = elapsed + penalty;
  const canReorder = allSolved && !chainOk && !done;

  const targetOf = (k) => (k === 'top' || k === 'bottom' ? ends[k] : ladder[k]);
  const isSolved = (k) => (k === 'top' || k === 'bottom' ? endSolved(k) : midSolved(k));
  const isLocked = (k) => (k === 'top' || k === 'bottom') && !chainOk;

  const persist = (patch) => save(player, { ...(load(player) || {}), startedAt: startRef.current, ...patch });

  const flash = (m, ms = 2200) => { setMsg(m); setTimeout(() => setMsg(''), ms); };

  // ---- typing ----
  const setDraft = (k, raw) => {
    if (isLocked(k) || isSolved(k)) return;
    const target = targetOf(k);
    const prefix = target.slice(0, hints[k]);
    let v = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    if (!v.startsWith(prefix)) v = prefix + v.slice(prefix.length);
    if (v.length < prefix.length) v = prefix;
    const nd = { ...drafts, [k]: v };
    setDrafts(nd);
    persist({ drafts: nd });
    const isEnd = k === 'top' || k === 'bottom';
    if (v === target && !isEnd) {
      const nextMid = MID.find((i) => i !== k && nd[i] !== ladder[i]);
      if (nextMid) setSel(nextMid);
    } else if (v === target) {
      setSel(k === 'top' ? 'bottom' : 'top');
    } else if ((k === 'top' || k === 'bottom') && v.length === 4 && v === ends[k === 'top' ? 'bottom' : 'top']) {
      flash('That word belongs at the other end.');
    }
  };

  const addHint = () => {
    if (isLocked(sel) || isSolved(sel) || hints[sel] >= 3) return;
    const target = targetOf(sel);
    const level = hints[sel] + 1;
    const nh = { ...hints, [sel]: level };
    setHints(nh);
    const cur = drafts[sel] || '';
    const nd = { ...drafts, [sel]: target.slice(0, level) + cur.slice(level) };
    setDrafts(nd);
    persist({ hints: nh, drafts: nd });
  };

  // Physical keyboard (a hidden input handles the phone keyboard).
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || done) return;
      if (document.activeElement === inputRef.current) return;
      if (isLocked(sel)) return;
      if (e.key === 'Backspace') setDraft(sel, (drafts[sel] || '').slice(0, -1));
      else if (/^[a-zA-Z]$/.test(e.key)) setDraft(sel, (drafts[sel] || '') + e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const select = (k) => {
    if (isLocked(k) || done) return;
    setSel(k);
    if (!isSolved(k)) setTimeout(() => inputRef.current?.focus(), 0);
  };

  // chevrons in the clue banner jump between the 5 clues
  const stepClue = (dir) => {
    if (chainOk) return;
    const idx = MID.indexOf(typeof sel === 'number' ? sel : 1);
    setSel(MID[(idx + dir + 5) % 5]);
  };

  // After the chain is right, move on to the top/bottom words.
  useEffect(() => {
    if (chainOk && sel !== 'top' && sel !== 'bottom') {
      setMsg('Ladder locked in! Now solve the top and bottom.');
      setTimeout(() => setMsg(''), 2500);
      setSel(endSolved('top') ? 'bottom' : 'top');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainOk]);

  // ---- reordering (drag handle, plus arrow keys on the handle) ----
  const moveRow = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    const copy = [...order];
    const [x] = copy.splice(from, 1);
    copy.splice(to, 0, x);
    setOrder(copy);
    persist({ order: copy });
  };

  const onHandleDown = (e, pos) => {
    if (!canReorder) return;
    dragRef.current = { pos };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
  };
  const onHandleMove = (e) => {
    const d = dragRef.current;
    if (!d || !listRef.current) return;
    const rows = [...listRef.current.querySelectorAll('[data-mid-row]')];
    let target = d.pos;
    rows.forEach((r, i) => {
      const b = r.getBoundingClientRect();
      if (e.clientY >= b.top && e.clientY <= b.bottom) target = i;
    });
    if (target !== d.pos) {
      moveRow(d.pos, target);
      dragRef.current = { pos: target };
    }
  };
  const onHandleUp = () => { dragRef.current = null; };
  const onHandleKey = (e, pos) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveRow(pos, pos - 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveRow(pos, pos + 1); }
  };

  // ---- finishing ----
  useEffect(() => {
    if (!(endSolved('top') && endSolved('bottom')) || doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const time = Math.round(((Date.now() - startRef.current) / 1000 + penalty) * 10) / 10;
    const score = crossclimbScore(time, par);
    const meta = { time, hints: penalty / HINT_PENALTY };
    setSummary({ time });
    persist({ done: true, score, meta, submitted: false, drafts, hints, order });
    setTimeout(() => { persist({ submitted: true }); finish(score, meta); }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, chainOk]);

  if (!allowed) return null;
  const shell = { emoji: '🪜', title: 'Crossclimb', tag: 'Solve the clues, order the ladder, unlock the top and bottom.', week };
  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  if (playedScore !== null && !result) {
    return (
      <GameShell {...shell}>
        <div className="text-center py-4">
          <div className="text-5xl font-black font-display text-accent">{playedScore}</div>
          <p className="text-zinc-400 text-sm mt-2 mb-5">points from today's Crossclimb. One attempt per day. Come back tomorrow for a new ladder!</p>
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
              Climbed in <span className="text-white font-bold">{formatClock(summary.time)}</span>
            </div>
          )}
          <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
        </div>
      </GameShell>
    );
  }

  const selIsEnd = sel === 'top' || sel === 'bottom';
  const clueText = selIsEnd ? endClue : clues[sel - 1];
  const clueLabel = selIsEnd ? 'Top + bottom' : `Clue ${MID.indexOf(sel) + 1} of 5`;

  const rowsToRender = ['top', ...order, 'bottom'];

  const renderRow = (k, midPos) => {
    const locked = isLocked(k);
    const solved = isSolved(k);
    const selected = sel === k && !locked;
    const letters = solved ? targetOf(k) : (drafts[k] || '');
    const wrong = !solved && !locked && letters.length === 4;
    return (
      <div
        key={k}
        data-row={k}
        data-mid-row={midPos !== undefined ? '1' : undefined}
        data-state={locked ? 'locked' : solved ? 'solved' : 'open'}
        onClick={() => select(k)}
        className={`relative flex items-center gap-3 rounded-2xl p-2 border transition-colors ${
          selected ? 'border-accent bg-accent/10' : 'border-white/5 bg-zinc-900/40'
        } ${locked ? 'opacity-60' : 'cursor-pointer'}`}
      >
        <div className="flex-1 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => {
            const hinted = !solved && i < (hints[k] || 0);
            return (
              <span
                key={i}
                data-tile=""
                className={`aspect-square rounded-xl border-2 flex items-center justify-center text-2xl font-black font-display uppercase ${
                  solved
                    ? 'bg-correct/25 border-correct/50 text-white'
                    : wrong
                      ? 'border-red-500/70 text-red-400 bg-zinc-950/60'
                      : hinted
                        ? 'border-amber-400/60 text-amber-400 bg-zinc-950/60'
                        : selected && i === letters.length
                          ? 'border-accent bg-zinc-950/60'
                          : 'border-white/10 bg-zinc-950/60 text-white'
                }`}
              >
                {locked ? '' : letters[i] || ''}
              </span>
            );
          })}
        </div>
        <div className="w-8 flex items-center justify-center text-zinc-500">
          {locked ? (
            <Lock className="w-4 h-4" />
          ) : canReorder && midPos !== undefined ? (
            <button
              type="button"
              data-handle={midPos}
              aria-label="Drag to reorder"
              onPointerDown={(e) => onHandleDown(e, midPos)}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              onKeyDown={(e) => onHandleKey(e, midPos)}
              className="p-1 rounded-md hover:text-white cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const stage = !allSolved
    ? 'Tap a row, read its clue, and type the 4-letter answer.'
    : !chainOk
      ? 'Drag the rows into order. Each word should change exactly ONE letter from the one above.'
      : 'Solve the top and bottom words using the final clue.';

  return (
    <GameShell {...shell}>
      <div className="flex gap-8">
        <div className="text-center">
          <div className="text-3xl font-black font-display text-accent" data-testid="clock">{formatClock(displayTime)}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Time{penalty > 0 ? ` (+${penalty}s hints)` : ''}</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-black font-display text-correct" data-testid="solved">{solvedCount}/5</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Clues solved</div>
        </div>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/5 bg-zinc-900/60 p-3">
        <div className="flex items-center justify-between mb-1">
          <button type="button" data-action="prev" onClick={() => stepClue(-1)} disabled={chainOk} className="p-1 text-zinc-500 hover:text-white disabled:opacity-20">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-accent" data-testid="clue-label">{clueLabel}</span>
          <button type="button" data-action="next" onClick={() => stepClue(1)} disabled={chainOk} className="p-1 text-zinc-500 hover:text-white disabled:opacity-20">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-sm text-zinc-200 min-h-[2.5rem] flex items-center justify-center" data-testid="clue">
          {allSolved && !chainOk ? stage : clueText}
        </p>
        {!(allSolved && !chainOk) && !isSolved(sel) && (
          <div className="flex justify-center mt-1">
            <button
              type="button"
              data-action="hint"
              onClick={addHint}
              disabled={hints[sel] >= 3}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" /> Hint (+{HINT_PENALTY}s)
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm" ref={listRef}>
        {rowsToRender.map((k, idx) => (
          renderRow(k, k === 'top' || k === 'bottom' ? undefined : idx - 1)
        ))}
      </div>

      <input
        ref={inputRef}
        data-testid="kb"
        value={drafts[sel] || ''}
        onChange={(e) => setDraft(sel, e.target.value)}
        maxLength={4}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type your answer"
        className="absolute opacity-0 pointer-events-none w-px h-px"
        tabIndex={-1}
      />

      <p className="text-zinc-400 text-xs text-center max-w-sm min-h-[1rem]" data-testid="msg">{msg || (allSolved && !chainOk ? '' : stage)}</p>
      <p className="text-zinc-600 text-[11px] text-center max-w-sm">
        Fastest time wins. One attempt per day. Most days solved leads, ties go to lowest total time.
      </p>
    </GameShell>
  );
}
