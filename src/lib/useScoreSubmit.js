import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './usePlayer';
import { getLeaderboard, submitScore } from '../api';
import { todayKey } from './season';

function dayScore(v) {
  if (typeof v === 'number') return v;
  if (v && typeof v.score === 'number') return v.score;
  return 0;
}

export function useScoreSubmit(week) {
  const { player } = usePlayer();
  const [prevBest, setPrevBest] = useState(null);
  const [result, setResult] = useState(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getLeaderboard()
      .then((data) => {
        const days = data.weeks?.[week]?.[player];
        const todayVal = days?.[todayKey()];
        setPrevBest(todayVal !== undefined ? dayScore(todayVal) : null);
      })
      .catch(() => setPrevBest(null));
  }, [week, player]);

  const finish = async (rawScore, meta) => {
    const score = Math.max(0, Math.round(rawScore));
    const dateKey = todayKey();
    let weekTotal = score;
    try {
      const data = await submitScore(week, player, score, dateKey, meta);
      const days = data.weeks?.[week]?.[player] || {};
      weekTotal = Object.values(days).reduce((sum, v) => sum + dayScore(v), 0);
    } catch (e) {
      console.error('submit failed', e);
    }
    const isNewBest = prevBest === null || score > prevBest;
    setResult({ score, isNewBest, weekTotal });
  };

  return { finish, result, prevBest };
}
