import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, PlayCircle } from 'lucide-react';
import { getActiveWeek, isWeekday, SEASON_START } from '../lib/season';
import { gameForWeek } from '../gamesData';
import { usePlayer } from '../lib/usePlayer';
import { getLeaderboard } from '../api';

export default function HomePage() {
  const navigate = useNavigate();
  const { player } = usePlayer();
  const [week, setWeek] = useState(null);
  const [weekTotal, setWeekTotal] = useState(null);
  const [daysPlayed, setDaysPlayed] = useState(0);

  useEffect(() => {
    setWeek(getActiveWeek());
  }, []);

  useEffect(() => {
    if (week === null || week < 1 || week > 14) return;
    getLeaderboard()
      .then((data) => {
        const days = data.weeks?.[week]?.[player];
        if (days && typeof days === 'object') {
          const values = Object.values(days);
          const scores = values.map((v) => (typeof v === 'number' ? v : (v && typeof v.score === 'number' ? v.score : 0)));
          setWeekTotal(values.length ? scores.reduce((sum, v) => sum + v, 0) : null);
          setDaysPlayed(values.length);
        } else {
          setWeekTotal(null);
          setDaysPlayed(0);
        }
      })
      .catch(() => { setWeekTotal(null); setDaysPlayed(0); });
  }, [week, player]);

  if (week === null) return null;

  if (week <= 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel text-center">
        <h2 className="text-2xl font-black font-display mb-2">Season starts soon</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          This week's game unlocks once the season begins. Check back on{" "}
          {SEASON_START.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.
        </p>
      </motion.div>
    );
  }

  if (week > 14) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel text-center">
        <h2 className="text-2xl font-black font-display mb-2">Season complete</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
          All 14 weeks are done — thanks for playing. Check the leaderboard to see how the season finished.
        </p>
        <button
          onClick={() => navigate('/leaderboard')}
          className="premium-gradient px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]"
        >
          <Trophy className="w-4 h-4" /> Final leaderboard
        </button>
      </motion.div>
    );
  }

  if (!isWeekday()) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel text-center">
        <h2 className="text-2xl font-black font-display mb-2">No game today</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
          New puzzles run Monday through Friday. Enjoy the weekend — see you Monday for Week {String(week).padStart(2, "0")}.
        </p>
        <button
          onClick={() => navigate('/leaderboard')}
          className="premium-gradient px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]"
        >
          <Trophy className="w-4 h-4" /> Leaderboard
        </button>
      </motion.div>
    );
  }

  const game = gameForWeek(week);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.18em] mb-3">
        This week — Week {String(week).padStart(2, "0")} of 14
      </div>
      <div className="glass-panel relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
        {weekTotal !== null && (
          <div className="inline-block mb-3 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-correct/15 text-correct border border-correct/20">
            ✓ played {daysPlayed} day{daysPlayed === 1 ? '' : 's'} · {weekTotal} pts this week
          </div>
        )}
        <div className="text-4xl mb-2">{game.emoji}</div>
        <h2 className="text-3xl font-black font-display mb-1">{game.title}</h2>
        <p className="text-zinc-500 text-sm mb-6">{game.tag}</p>
        <button
          onClick={() => navigate(`/games/${game.slug}`)}
          className="premium-gradient px-6 py-4 rounded-xl font-black text-lg inline-flex items-center gap-2 hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-wide"
        >
          <PlayCircle className="w-5 h-5" /> {weekTotal !== null ? "Play again" : "Play this week's game"}
        </button>
      </div>
    </motion.div>
  );
}
