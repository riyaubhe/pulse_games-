import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveWeek, isWeekday } from './season';
import { gameForWeek } from '../gamesData';

export function useGameGuard(gameId) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [week, setWeek] = useState(null);

  useEffect(() => {
    const activeWeek = getActiveWeek();
    const current = gameForWeek(activeWeek);
    const ok = activeWeek >= 1 && activeWeek <= 14 && isWeekday() && current && current.id === gameId;
    if (!ok) {
      navigate('/', { replace: true });
      return;
    }
    setWeek(activeWeek);
    setAllowed(true);
  }, [gameId, navigate]);

  return { allowed, week };
}
