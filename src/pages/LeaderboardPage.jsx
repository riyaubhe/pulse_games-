import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getLeaderboard } from '../api';
import { getActiveWeek } from '../lib/season';
import { GAMES } from '../gamesData';
import { usePlayer } from '../lib/usePlayer';

function medal(i) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
}

export default function LeaderboardPage() {
  const { player } = usePlayer();
  const [lb, setLb] = useState({ weeks: {}, totals: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setLb)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  const totalsArr = Object.entries(lb.totals || {}).sort((a, b) => b[1] - a[1]);
  const activeWeek = getActiveWeek();
  const visibleWeeks = activeWeek <= 0 ? [] : GAMES.filter((g) => g.week <= Math.min(activeWeek, 14));
  const weekBoards = visibleWeeks
    .map((g) => {
      const players = lb.weeks?.[g.week] || {};
      const entries = Object.entries(players)
        .map(([name, days]) => {
          const values = Object.values(days || {});
          const total = values.reduce((sum, v) => sum + v, 0);
          return [name, total, values.length];
        })
        .sort((a, b) => b[1] - a[1]);
      return { ...g, entries };
    })
    .sort((a, b) => b.week - a.week);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-black font-display">Team Leaderboard</h2>
      </div>
      <p className="text-zinc-500 text-sm mb-6">Season total (daily scores combined across the whole week, summed across all 14 weeks)</p>

      {totalsArr.length === 0 ? (
        <div className="text-zinc-600 text-sm text-center py-8">No scores yet — be the first to play a game!</div>
      ) : (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-zinc-500 text-[10px] uppercase tracking-widest text-left border-b border-white/5">
              <th className="py-2 w-10"></th>
              <th className="py-2">Tutor</th>
              <th className="py-2 text-right">Total points</th>
            </tr>
          </thead>
          <tbody>
            {totalsArr.map(([name, score], i) => (
              <tr key={name} className={`border-b border-white/5 ${name === player ? 'bg-accent/5' : ''}`}>
                <td className="py-2.5 font-mono text-accent">{medal(i)}</td>
                <td className="py-2.5">{name}</td>
                <td className="py-2.5 text-right font-mono text-correct">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {weekBoards.length > 0 && (
        <>
          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.18em] mt-8 mb-3">Scores by week</div>
          {weekBoards.map((w) => (
            <div key={w.week} className="mb-6">
              <div className="font-bold text-sm mb-2">{w.emoji} Week {String(w.week).padStart(2, "0")} — {w.title}</div>
              {w.entries.length === 0 ? (
                <div className="text-zinc-600 text-xs py-3">No one has played this week yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase tracking-widest text-left border-b border-white/5">
                      <th className="py-2 w-10"></th>
                      <th className="py-2">Tutor</th>
                      <th className="py-2 text-right">Days</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.entries.map(([name, total, days]) => {
                      const i = w.entries.findIndex((e) => e[0] === name);
                      return (
                        <tr key={name} className={`border-b border-white/5 ${name === player ? 'bg-accent/5' : ''}`}>
                          <td className="py-2 font-mono text-accent">{medal(i)}</td>
                          <td className="py-2">{name}</td>
                          <td className="py-2 text-right font-mono text-zinc-500">{days}</td>
                          <td className="py-2 text-right font-mono text-correct">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </>
      )}
    </motion.div>
  );
}
