import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit3, CheckCircle2, Menu, X } from 'lucide-react';
import { usePlayer } from './lib/usePlayer';

const LoginScreen = ({ onEnter }) => {
  const [name, setName] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setIsSuccess(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-dark text-white font-sans antialiased overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />

        <h1 className="text-5xl font-black mb-6 tracking-tighter text-center font-display">
          PULSE<span className="text-accent underline decoration-violet-500/30">GAMES</span>
        </h1>

        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white uppercase">Enter your name</h2>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Scores are shared with the whole team</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Name</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      placeholder="YOUR NAME"
                      className="w-full p-4 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none text-lg font-bold tracking-widest transition-all uppercase pl-12"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={24}
                    />
                    <Edit3 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-[9px] text-zinc-600 ml-1">Use the same name each week so your total score keeps adding up.</p>
                </div>

                <button
                  disabled={name.trim().length < 2}
                  className="w-full premium-gradient p-4 rounded-xl font-bold text-lg hover:shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Continue
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-correct/10 border border-correct/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-correct" />
              </div>

              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">You're in</h2>
              <p className="text-zinc-400 font-medium mb-8">
                Welcome to Pulse Games, <span className="text-accent font-black">{name.trim()}</span>.
              </p>

              <button
                onClick={() => onEnter(name.trim())}
                className="w-full premium-gradient p-5 rounded-xl font-black text-xl hover:shadow-glow transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                Enter the Arcade
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

function App() {
  const { player, setPlayer } = usePlayer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  if (!player) {
    return <LoginScreen onEnter={setPlayer} />;
  }

  const navLinkClass = ({ isActive }) =>
    `font-black text-xs sm:text-sm tracking-[0.2em] uppercase transition-all whitespace-nowrap ${isActive ? 'text-accent' : 'text-zinc-500 hover:text-zinc-300'}`;

  const mobileNavLinkClass = ({ isActive }) =>
    `text-4xl font-black tracking-tighter uppercase transition-all ${isActive ? 'text-accent' : 'text-white'}`;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 min-h-screen font-sans">
      <header className="flex justify-between items-center w-full mb-8 sm:mb-12 py-4 sm:py-6 border-b border-white/5 relative z-[100]">
        <h1 className="text-xl sm:text-2xl font-black tracking-tighter font-display cursor-pointer" onClick={() => { navigate('/'); setIsMenuOpen(false); }}>
          PULSE <span className="text-zinc-500 font-extralight text-lg sm:text-xl">GAMES</span>
        </h1>

        <div className="hidden sm:flex items-center gap-8">
          <NavLink to="/" end className={navLinkClass}>Games</NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>Leaderboard</NavLink>
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden p-2 text-white hover:text-accent transition-colors"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[90] bg-dark/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 sm:hidden"
            >
              <nav className="flex flex-col items-center gap-8 text-center">
                <NavLink to="/" end onClick={() => setIsMenuOpen(false)} className={mobileNavLinkClass}>Games</NavLink>
                <NavLink to="/leaderboard" onClick={() => setIsMenuOpen(false)} className={mobileNavLinkClass}>Leaderboard</NavLink>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
