import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Trash2 } from 'lucide-react';
import { getSchedule, setSchedule, deleteScore } from '../api';
import { dateKeyFromInput, todayInputValue } from '../lib/adminUtils';

const ADMIN_GAMES = [
  { id: 'wordle', label: 'Wordle (Week 1)', fields: ['word'] },
  { id: 'hangman', label: 'Hangman (Week 6)', fields: ['word', 'clue'] },
  { id: 'numguess', label: 'Number Hunt (Week 7)', fields: ['target'] },
  { id: 'typing', label: 'Typing Speed (Week 13)', fields: ['sentence'] },
  { id: 'finalewordle', label: 'Championship Wordle (Week 14)', fields: ['word'] },
];

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [gameId, setGameId] = useState(ADMIN_GAMES[0].id);
  const [date, setDate] = useState(todayInputValue());
  const [word, setWord] = useState('');
  const [clue, setClue] = useState('');
  const [target, setTarget] = useState('');
  const [sentence, setSentence] = useState('');
  const [overrides, setOverrides] = useState({});
  const [status, setStatus] = useState(null);
  const [delWeek, setDelWeek] = useState('');
  const [delPlayer, setDelPlayer] = useState('');
  const [delDate, setDelDate] = useState('');
  const [delStatus, setDelStatus] = useState(null);

  useEffect(() => {
    if (!authed) return;
    getSchedule().then((data) => setOverrides(data.overrides || {})).catch(() => {});
  }, [authed]);

  const activeGame = ADMIN_GAMES.find((g) => g.id === gameId);

  const handleSave = async () => {
    let value = null;
    if (activeGame.fields.includes('word') && !activeGame.fields.includes('clue')) {
      if (!word.trim()) return setStatus({ msg: 'Enter a word.', error: true });
      value = { word: word.trim() };
    } else if (activeGame.fields.includes('clue')) {
      if (!word.trim()) return setStatus({ msg: 'Enter a word.', error: true });
      value = { word: word.trim(), clue: clue.trim() };
    } else if (activeGame.fields.includes('target')) {
      const n = parseInt(target, 10);
      if (!n || n < 1 || n > 200) return setStatus({ msg: 'Enter a number 1–200.', error: true });
      value = { target: n };
    } else if (activeGame.fields.includes('sentence')) {
      if (!sentence.trim()) return setStatus({ msg: 'Enter a sentence.', error: true });
      value = { sentence: sentence.trim() };
    }

    try {
      const dateKey = dateKeyFromInput(date);
      const data = await setSchedule(gameId, dateKey, value, adminKey);
      setOverrides(data.overrides || {});
      setStatus({ msg: 'Saved!', error: false });
    } catch (e) {
      if (e.response?.status === 401) {
        setStatus({ msg: 'Invalid admin key.', error: true });
        setAuthed(false);
      } else {
        setStatus({ msg: 'Something went wrong — try again.', error: true });
      }
    }
  };

  const handleDelete = async () => {
    if (!delWeek || !delPlayer.trim()) {
      setDelStatus({ msg: 'Enter a week number and a player name.', error: true });
      return;
    }
    const dateKey = delDate ? dateKeyFromInput(delDate) : undefined;
    const scope = dateKey ? `their score for ${delDate}` : `ALL of their scores for the whole week`;
    const confirmed = window.confirm(`Remove ${scope} — "${delPlayer.trim()}", Week ${delWeek}? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteScore(delWeek, delPlayer.trim(), adminKey, dateKey);
      setDelStatus({ msg: 'Removed.', error: false });
      setDelPlayer('');
      setDelDate('');
    } catch (e) {
      if (e.response?.status === 401) {
        setDelStatus({ msg: 'Invalid admin key.', error: true });
        setAuthed(false);
      } else {
        setDelStatus({ msg: 'Something went wrong — try again.', error: true });
      }
    }
  };

  if (!authed) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel max-w-md mx-auto text-center">
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 w-fit mx-auto mb-4">
          <Shield className="w-6 h-6 text-accent" />
        </div>
        <h2 className="text-xl font-black font-display mb-1">Admin panel</h2>
        <p className="text-zinc-500 text-sm mb-6">Enter the admin key to schedule upcoming daily puzzles.</p>
        <input
          type="password"
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adminKey && setAuthed(true)}
          className="w-full p-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-center mb-4"
        />
        <button
          onClick={() => adminKey && setAuthed(true)}
          className="w-full premium-gradient p-4 rounded-xl font-bold hover:shadow-glow transition-all active:scale-[0.98]"
        >
          Enter
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel max-w-lg mx-auto">
      <h2 className="text-xl font-black font-display mb-1">🔑 Schedule a puzzle</h2>
      <p className="text-zinc-500 text-sm mb-6">Pick a game, a day, and the answer — it overrides the automatic daily pick for that day only.</p>

      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-white/5 backdrop-blur-sm flex-wrap mb-4">
        {ADMIN_GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => setGameId(g.id)}
            className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all ${
              gameId === g.id ? 'bg-zinc-800 text-accent shadow-glow' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
        />

        {activeGame.fields.includes('word') && (
          <input
            placeholder="Word"
            value={word}
            onChange={(e) => setWord(e.target.value.toUpperCase())}
            maxLength={12}
            className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none uppercase tracking-widest text-center font-bold"
          />
        )}
        {activeGame.fields.includes('clue') && (
          <textarea
            placeholder="Hint / clue for this word"
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none h-20"
          />
        )}
        {activeGame.fields.includes('target') && (
          <input
            type="number"
            min="1"
            max="200"
            placeholder="Secret number 1–200"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
          />
        )}
        {activeGame.fields.includes('sentence') && (
          <textarea
            placeholder="Sentence to type"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none h-20"
          />
        )}

        <button
          onClick={handleSave}
          className="premium-gradient p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]"
        >
          <CheckCircle2 className="w-4 h-4" /> Save for this day
        </button>
        {status && <p className={`text-sm text-center ${status.error ? 'text-red-400' : 'text-correct'}`}>{status.msg}</p>}
      </div>

      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.18em] mt-8 mb-3">Remove a score</div>
      <p className="text-zinc-500 text-xs mb-3">Leave the date blank to remove ALL of that player's scores for the week. Set a date to remove just that one day instead.</p>
      <div className="flex flex-col gap-3">
        <input
          type="number"
          min="1"
          max="14"
          placeholder="Week number (e.g. 2)"
          value={delWeek}
          onChange={(e) => setDelWeek(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
        />
        <input
          placeholder="Player name (exact match)"
          value={delPlayer}
          onChange={(e) => setDelPlayer(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
        />
        <input
          type="date"
          placeholder="Specific day (optional)"
          value={delDate}
          onChange={(e) => setDelDate(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none"
        />
        <button
          onClick={handleDelete}
          className="p-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" /> {delDate ? "Remove just that day's score" : "Remove all of this player's scores for that week"}
        </button>
        {delStatus && <p className={`text-sm text-center ${delStatus.error ? 'text-red-400' : 'text-correct'}`}>{delStatus.msg}</p>}
      </div>

      {Object.keys(overrides).length > 0 && (
        <>
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.18em] mt-8 mb-3">Recently scheduled</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500 uppercase tracking-widest text-left border-b border-white/5">
                <th className="py-2">Game</th>
                <th className="py-2">Day</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(overrides).slice(0, 12).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([k, v]) => {
                const [gid, dk] = k.split(':');
                const g = ADMIN_GAMES.find((x) => x.id === gid);
                return (
                  <tr key={k} className="border-b border-white/5">
                    <td className="py-2">{g ? g.label : gid}</td>
                    <td className="py-2">{dk}</td>
                    <td className="py-2 truncate max-w-[160px]">{JSON.stringify(v)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </motion.div>
  );
}
