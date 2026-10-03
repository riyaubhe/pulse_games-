import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Lock, Lightbulb } from 'lucide-react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { todayKey, seededShuffle } from '../../lib/season';
import { PUZZLES } from './puzzles';
import { isValidChain, initialOrder, expectedEnds } from './ladderLogic';

// How the game flows (same as LinkedIn's Crossclimb):
//  1. Five middle rungs, each with a trivia clue. Type each answer.
//  2. Put the five words in order so every neighbouring pair differs by
//     exactly one letter.
//  3. That unlocks the top and bottom rungs, which share one combined clue.
// Ranking: most days played, ties broken by lowest total time (set in
// gamesData.js with rankBy: "plays"). A hint costs 10 seconds.

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const HINT_PENALTY = 10;
const KEYS = [1, 2, 3, 4, 5, 'top', 'bottom'];

function getTodayPuzzle() {
  return PUZZLES[DAY_KEYS[new Date().getDay()]] || PUZZLES.mon;
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function Tiles({ word }) {
  return (
    <div className="flex gap-1">
      {word.split('').map((ch, i) => (
        <span
          key={i}
          className="w-9 h-9 rounded-md border flex items-center justify-center font-black font-display bg-correct/20 border-correct/40 text-white"
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

function EmptyTiles() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="w-9 h-9 rounded-md border border-white/5 bg-zinc-900/40" />
      ))}
    </div>
  );
}

// One answer slot: shows the typed-in box (with a hint button) until it is
// correct, then turns into green letter tiles.
function AnswerSlot({ word, value, solved, onChange, hintLevel, onHint }) {
  if (solved) return <Tiles word={word} />;
  const wrong = value.length === word.length && value !== word;
  const pattern = hintLevel > 0
    ? word.split('').map((ch, i) => (i < hintLevel ? ch : '_')).join(' ')
    : null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={word.length}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="????"
          className={`w-28 p-2 rounded-lg bg-zinc-950/50 border outline-none text-center uppercase font-black font-display tracking-[0.3em] ${
            wrong ? 'border-red-500 text-red-400' : 'border-border focus:border-accent'
          }`}
        />
        <button
          type="button"
          onClick={onHint}
          disabled={hintLevel >= word.length - 1}
          className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-amber-400 disabled:opacity-30 transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5" /> Hint (+{HINT_PENALTY}s)
        </button>
      </div>
      {pattern && <div className="font-mono text-xs text-amber-400 tracking-widest">{pattern}</div>}
    </div>
  );
}

export default function CrossclimbPage() {
  const { allowed, week } = useGameGuard('crossclimb');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const puzzle = useRef(getTodayPuzzle()).current;
  const { ladder, clues, endClue } = puzzle;

  const [order, setOrder] = useState(() => initialOrder(ladder, `${todayKey()}:crossclimb`, seededShuffle));
  const [drafts, setDrafts] = useState({ 1: '', 2: '', 3: '', 4: '', 5: '', top: '', bottom: '' });
  const [hints, setHints] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, top: 0, bottom: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  const doneRef = useRef(false);
  const startRef = useRef(Date.now());

  // ---- derived state ----
  const midSolved = (i) => drafts[i] === ladder[i];
  const allSolved = [1, 2, 3, 4, 5].every(midSolved);
  const solvedCount = [1, 2, 3, 4, 5].filter(midSolved).length;
  const chainOk = allSolved && isValidChain(order.map((i) => ladder[i]));
  const ends = expectedEnds(order, ladder);
  const topSolved = chainOk && drafts.top === ends.top;
  const bottomSolved = chainOk && drafts.bottom === ends.bottom;
  const penalty = HINT_PENALTY * KEYS.reduce((sum, k) => sum + hints[k], 0);
  const displayTime = elapsed + penalty;

  // Stopwatch for the player's own reference -- there is no time limit.
  useEffect(() => {
    if (!allowed || done) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [allowed, done]);

  const finishGame = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    const seconds = (Date.now() - startRef.current) / 1000 + penalty;
    const finalTime = Math.round(seconds * 10) / 10;
    const score = Math.max(60, Math.round(250 - finalTime * 0.7));
    setMessage(`Climbed in ${formatElapsed(Math.round(finalTime))}! 🎉`);
    setTimeout(() => finish(score, { time: finalTime }), 1200);
  };

  useEffect(() => {
    if (topSolved && bottomSolved) finishGame();
  }, [topSolved, bottomSolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const setDraft = (key, raw) => {
    const v = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    setDrafts((d) => ({ ...d, [key]: v }));
  };
  const addHint = (key) => setHints((h) => ({ ...h, [key]: h[key] + 1 }));

  const move = (pos, dir) => {
    const next = pos + dir;
    if (next < 0 || next >= order.length) return;
    const copy = [...order];
    [copy[pos], copy[next]] = [copy[next], copy[pos]];
    setOrder(copy);
    setMessage('');
  };

  const canReorder = allSolved && !chainOk && !done;
  const otherEnd = (slot) => (slot === 'top' ? ends.bottom : ends.top);
  const wrongSlot = (slot) => chainOk && drafts[slot].length === 4 && drafts[slot] === otherEnd(slot);

  if (!allowed) return null;

  const stageText = !allSolved
    ? 'Answer the 5 clues. Each answer is a 4-letter word.'
    : !chainOk
      ? 'Now put the words in order with the arrows so every neighbouring pair differs by exactly ONE letter.'
      : 'Ladder locked in! Use the final clue to fill the top and bottom words.';

  return (
    <GameShell emoji="🪜" title="Crossclimb" tag="Solve the clues, order the ladder, unlock the top and bottom." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">
            Five middle words each have a clue. Answer them, then arrange them into a word ladder where each word changes exactly one letter from the one before. That unlocks the top and bottom words. No time limit — play more days to climb the board, and ties go to your lowest total time.
          </p>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-black font-display text-accent">{formatElapsed(displayTime)}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Time{penalty > 0 ? ` (incl. +${penalty}s hints)` : ''}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black font-display text-correct">{solvedCount}/5</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Clues solved</div>
            </div>
          </div>

          <p className="text-sm text-center text-zinc-300 max-w-sm font-medium">{stageText}</p>

          {chainOk && (
            <div className="w-full max-w-sm rounded-xl border border-accent/40 bg-accent/10 p-3 text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">🔓 Final clue (top + bottom)</div>
              <div className="text-sm text-zinc-200">{endClue}</div>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full max-w-sm">
            {/* TOP bookend */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Top</div>
              {!chainOk ? (
                <div className="flex items-center gap-3">
                  <EmptyTiles />
                  <span className="flex items-center gap-1 text-xs text-zinc-600"><Lock className="w-3.5 h-3.5" /> Locked</span>
                </div>
              ) : (
                <>
                  <AnswerSlot
                    word={ends.top}
                    value={drafts.top}
                    solved={topSolved}
                    onChange={(v) => setDraft('top', v)}
                    hintLevel={hints.top}
                    onHint={() => addHint('top')}
                  />
                  {wrongSlot('top') && <p className="text-xs text-amber-400 mt-1">That word belongs at the other end.</p>}
                </>
              )}
            </div>

            {/* MIDDLE rungs, in the player's current order */}
            {order.map((id, pos) => (
              <div key={id} className="rounded-xl border border-white/5 bg-zinc-900/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <AnswerSlot
                    word={ladder[id]}
                    value={drafts[id]}
                    solved={midSolved(id)}
                    onChange={(v) => setDraft(id, v)}
                    hintLevel={hints[id]}
                    onHint={() => addHint(id)}
                  />
                  {canReorder && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => move(pos, -1)}
                        disabled={pos === 0}
                        aria-label="Move up"
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(pos, 1)}
                        disabled={pos === order.length - 1}
                        aria-label="Move down"
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-2">{clues[id - 1]}</p>
              </div>
            ))}

            {/* BOTTOM bookend */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Bottom</div>
              {!chainOk ? (
                <div className="flex items-center gap-3">
                  <EmptyTiles />
                  <span className="flex items-center gap-1 text-xs text-zinc-600"><Lock className="w-3.5 h-3.5" /> Locked</span>
                </div>
              ) : (
                <>
                  <AnswerSlot
                    word={ends.bottom}
                    value={drafts.bottom}
                    solved={bottomSolved}
                    onChange={(v) => setDraft('bottom', v)}
                    hintLevel={hints.bottom}
                    onHint={() => addHint('bottom')}
                  />
                  {wrongSlot('bottom') && <p className="text-xs text-amber-400 mt-1">That word belongs at the other end.</p>}
                </>
              )}
            </div>
          </div>

          {message && <p className="text-zinc-400 text-sm text-center">{message}</p>}
        </>
      )}
    </GameShell>
  );
}
