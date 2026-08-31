import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './usePlayer';
import { getLeaderboard, submitScore } from '../api';

export function useScoreSubmit(week) {
  const { player } = usePlayer();
  const [prevBest, setPrevBest] = useState(null);
  const [result, setResult] = useState(null); // { score, isNewBest }
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    getLeaderboard()
      .then((data) => {
        const best = data.weeks?.[week]?.[player];
        setPrevBest(typeof best === 'number' ? best : null);
      })
      .catch(() => setPrevBest(null));
  }, [week, player]);

  const finish = async (rawScore) => {
    const score = Math.max(0, Math.round(rawScore));
    try {
      await submitScore(week, player, score);
    } catch (e) {
      console.error('submit failed', e);
    }
    const isNewBest = prevBest === null || score > prevBest;
    setResult({ score, isNewBest });
  };

  return { finish, result, prevBest };
}
