import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';

export default function ResultPanel({ score, isNewBest, prevBest }) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-4">
      <div className="text-6xl font-black font-display text-accent">{score}</div>
      <div className="text-zinc-500 text-sm mt-1 mb-6">
        points earned{isNewBest ? " · 🎉 new personal best!" : ` · your best stays ${Math.max(prevBest || 0, score)}`}
      </div>
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
