import { useState, useCallback } from 'react';

const KEY = 'pulse-player-name';

export function usePlayer() {
  const [player, setPlayerState] = useState(() => {
    try { return localStorage.getItem(KEY) || null; }
    catch { return null; }
  });

  const setPlayer = useCallback((name) => {
    try { localStorage.setItem(KEY, name); } catch { /* ignore */ }
    setPlayerState(name);
  }, []);

  const clearPlayer = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setPlayerState(null);
  }, []);

  return { player, setPlayer, clearPlayer };
}
