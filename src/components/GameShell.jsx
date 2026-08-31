import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function GameShell({ emoji, title, tag, week, children }) {
  const navigate = useNavigate();
  return (
    <div className="glass-panel w-full">
      <div className="flex justify-between items-start gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl font-black font-display flex items-center gap-2">
            <span>{emoji}</span> {title}
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Week {week} · {tag}</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
      <div className="flex flex-col items-center gap-5 min-h-[220px] justify-center">
        {children}
      </div>
    </div>
  );
}
