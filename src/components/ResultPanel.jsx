import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function ResultPanel({ score, isNewBest, prevBest, weekTotal }) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-4">
      <div className="text-6xl font-black font-display text-accent">{score}</div>
      <div className="text-zinc-500 text-sm mt-1 mb-4">
        points earned today{isNewBest ? " · 🎉 new best for today!" : ` · today's best stays ${Math.max(prevBest || 0, score)}`}
      </div>

      {typeof weekTotal === 'number' && (
        <div className="inline-block mb-6 px-4 py-2 rounded-xl bg-correct/10 border border-correct/20">
          <span className="text-correct font-black text-lg">{weekTotal}</span>
          <span className="text-zinc-400 text-sm ml-1.5">points this week (all days combined)</span>
        </div>
      )}

      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => navigate('/leaderboard')}
          className="premium-gradient px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-glow transition-all active:scale-[0.98]"
        >
          <Trophy className="w-4 h-4" /> Leaderboard
        </button>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-3 rounded-xl font-bold border border-white/5 bg-zinc-900/50 hover:border-accent transition-all active:scale-[0.98]"
        >
          Back to hub
        </button>
      </div>
    </div>
  );
}
