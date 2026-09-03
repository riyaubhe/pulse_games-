import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './usePlayer';
import { getLeaderboard, submitScore } from '../api';
import { todayKey } from './season';

// Scores are summed across every day a player plays that week's game --
// so playing all 5 days beats playing once, even with a lower single-day
// score. `prevBest` here means "your best score TODAY specifically" (so
// replaying the same day's puzzle shows whether you beat your own earlier
// attempt), while `result.weekTotal` is the running sum for the whole week.
export function useScoreSubmit(week) {
  const { player } = usePlayer();
  const [prevBest, setPrevBest] = useState(null);
  const [result, setResult] = useState(null); // { score, isNewBest, weekTotal }
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getLeaderboard()
      .then((data) => {
        const days = data.weeks?.[week]?.[player];
        const todayBest = days?.[todayKey()];
        setPrevBest(typeof todayBest === 'number' ? todayBest : null);
      })
      .catch(() => setPrevBest(null));
  }, [week, player]);

  const finish = async (rawScore) => {
    const score = Math.max(0, Math.round(rawScore));
    const dateKey = todayKey();
    let weekTotal = score;
    try {
      const data = await submitScore(week, player, score, dateKey);
      const days = data.weeks?.[week]?.[player] || {};
      weekTotal = Object.values(days).reduce((sum, v) => sum + v, 0);
    } catch (e) {
      console.error('submit failed', e);
    }
    const isNewBest = prevBest === null || score > prevBest;
    setResult({ score, isNewBest, weekTotal });
  };

  return { finish, result, prevBest };
}
