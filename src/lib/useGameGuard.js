import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveWeek, isWeekday } from './season';
import { gameForWeek } from '../gamesData';

// Every game page calls this with its own gameId. It redirects back to
// "/" unless this game is genuinely this week's game, it's a weekday,
// and the season is currently running -- so a game can't be reached by
// guessing/typing its URL out of turn, even though routes exist for all
// 14 games.
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
