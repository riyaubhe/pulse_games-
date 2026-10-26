import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import GameShell from '../../components/GameShell';
import { useGameGuard } from '../../lib/useGameGuard';
import { usePlayer } from '../../lib/usePlayer';
import { todayKey } from '../../lib/season';
import { submitScore } from '../../api';
import { HIVES } from './hives';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const getHive = () => HIVES[DAY_KEYS[new Date().getDay()]] || HIVES.mon;

// NYT-style scoring: 4-letter words = 1 point, longer words = their length,
// a pangram (uses all 7 letters) earns +7.
export function wordPoints(word, letters) {
  const base = word.length === 4 ? 1 : word.length;
  const isPangram = [...letters].every((c) => word.includes(c));
  return base + (isPangram ? 7 : 0);
}

// Reaching "Genius" (70% of all possible points) earns the full 100 leaderboard
// points for the day; below that it scales up smoothly.
export const GENIUS_SHARE = 0.7;
export function dayScore(points, total) {
  return Math.min(100, Math.round((points / (total * GENIUS_SHARE)) * 100));
}

const RANKS = [
  [0, 'Beginner'], [0.02, 'Good Start'], [0.05, 'Moving Up'], [0.08, 'Good'], [0.15, 'Solid'],
  [0.25, 'Nice'], [0.4, 'Great'], [0.5, 'Amazing'], [0.7, 'Genius'], [1, 'Queen Bee'],
];
export function rankFor(points, total) {
  let name = RANKS[0][1];
  RANKS.forEach(([share, n]) => { if (points >= Math.round(total * share) && (share === 0 || points > 0)) name = n; });
  return name;
}

const storeKey = (player) => `pulse-hive:${player}:${todayKey()}`;
const load = (player) => { try { return JSON.parse(localStorage.getItem(storeKey(player)) || 'null'); } catch { return null; } };
const save = (player, d) => { try { localStorage.setItem(storeKey(player), JSON.stringify(d)); } catch { /* ignore */ } };

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Hex positions around the center (percent of the box).
const SLOTS = [
  { x: 50, y: 17 }, { x: 78, y: 33 }, { x: 78, y: 67 },
  { x: 50, y: 83 }, { x: 22, y: 67 }, { x: 22, y: 33 },
];
const HEX = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';

export default function WordHivePage() {
  const { allowed, week } = useGameGuard('wordhive');
  const { player } = usePlayer();
  const navigate = useNavigate();
  const hive = useMemo(getHive, []);
  const words = useMemo(() => new Set(hive.words), [hive]);
  const total = useMemo(() => hive.words.reduce((s, w) => s + wordPoints(w, hive.letters), 0), [hive]);
  const [outer, setOuter] = useState(() => shuffle(hive.letters.split('').filter((c) => c !== hive.center)));
  const [found, setFound] = useState([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState('');
  const [ready, setReady] = useState(false);
  const msgTimer = useRef(null);

  const points = found.reduce((s, w) => s + wordPoints(w, hive.letters), 0);

  useEffect(() => {
    if (!allowed) return;
    const s = load(player);
    if (s) {
      setFound(s.found || []);
      if (s.outer?.length === 6) setOuter(s.outer);
      // make sure the best score reached the leaderboard even if an earlier post failed
      if (s.found?.length) post(s.found);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, player]);

  function post(list) {
    const pts = list.reduce((s, w) => s + wordPoints(w, hive.letters), 0);
    const sc = dayScore(pts, total);
    if (sc > 0) submitScore(week, player, sc, todayKey(), { words: list.length }).catch(() => {});
  }

  const flash = (m, ms = 1600) => {
    setMsg(m);
    clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(''), ms);
  };

  const type = (c) => setInput((s) => (s.length < 20 ? s + c : s));
  const del = () => setInput((s) => s.slice(0, -1));

  const submit = () => {
    const w = input.toLowerCase();
    setInput('');
    if (w.length < 4) return flash('Too short');
    if (![...w].every((c) => hive.letters.includes(c))) return flash('Bad letters');
    if (!w.includes(hive.center)) return flash('Missing center letter');
    if (found.includes(w)) return flash('Already found');
    if (!words.has(w)) return flash('Not in word list');
    const nf = [w, ...found];
    setFound(nf);
    save(player, { found: nf, outer });
    const pang = [...hive.letters].every((c) => w.includes(c));
    flash(pang ? `Pangram! +${wordPoints(w, hive.letters)} 🎉` : `+${wordPoints(w, hive.letters)}`);
    post(nf);
  };

  const doShuffle = () => {
    const no = shuffle(outer);
    setOuter(no);
    save(player, { found, outer: no });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') del();
      else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!allowed) return null;
  const shell = {
    emoji: '🐝',
    title: 'Word Hive',
    tag: 'Make words from 7 letters. Every word needs the center letter.',
    week,
  };
  if (!ready) return <GameShell {...shell}><p className="text-zinc-500 text-sm">Loading…</p></GameShell>;

  const rank = rankFor(points, total);
  const score = dayScore(points, total);
  const pct = Math.min(100, (points / (total * GENIUS_SHARE)) * 100);

  return (
    <GameShell {...shell}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-black uppercase tracking-widest text-accent" data-testid="rank">{rank}</span>
          <span className="text-zinc-400"><span data-testid="points" className="text-white font-bold">{points}</span> pts · today: <span data-testid="daily" className="text-correct font-bold">{score}</span>/100</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full premium-gradient transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
          Reach Genius for the full 100 points. {hive.words.length} words are hidden. Play as long as you like today.
        </p>
      </div>

      <div className="h-10 flex items-center justify-center text-3xl font-black font-display tracking-widest uppercase" data-testid="input">
        {[...input].map((c, i) => (
          <span key={i} className={c === hive.center ? 'text-amber-400' : hive.letters.includes(c) ? '' : 'text-zinc-600'}>{c}</span>
        ))}
        <span className="w-0.5 h-8 bg-accent ml-0.5 animate-pulse" />
      </div>
      <div className="h-5 text-sm font-bold text-zinc-300" data-testid="msg">{msg}</div>

      <div className="relative" style={{ width: 'min(100%, 300px)', aspectRatio: '1' }}>
        {[...outer.map((c, i) => ({ c, ...SLOTS[i] })), { c: hive.center, x: 50, y: 50, center: true }].map((h) => (
          <button
            key={h.c}
            type="button"
            data-letter={h.c}
            onClick={() => type(h.c)}
            className={`absolute font-black font-display text-3xl uppercase flex items-center justify-center transition-transform active:scale-90 ${
              h.center ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: '32%', height: '32%', transform: 'translate(-50%, -50%)', clipPath: HEX }}
          >
            {h.c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={del} data-action="delete" className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent">Delete</button>
        <button onClick={doShuffle} data-action="shuffle" className="px-5 py-2.5 rounded-xl text-sm font-bold border border-white/5 bg-zinc-900/50 hover:border-accent">Shuffle</button>
        <button onClick={submit} data-action="enter" className="premium-gradient px-6 py-2.5 rounded-xl font-bold hover:shadow-glow active:scale-[0.98]">Enter</button>
      </div>

      <div className="w-full max-w-sm">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
          You found {found.length} word{found.length === 1 ? '' : 's'}
        </div>
        <div className="flex flex-wrap gap-1.5" data-testid="found">
          {found.map((w) => (
            <span key={w} className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${[...hive.letters].every((c) => w.includes(c)) ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-800 text-zinc-200'}`}>{w}</span>
          ))}
        </div>
      </div>

      <button onClick={() => navigate('/leaderboard')} className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-accent">
        <Trophy className="w-4 h-4" /> Leaderboard
      </button>
    </GameShell>
  );
}
