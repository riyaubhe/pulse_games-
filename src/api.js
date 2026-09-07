import axios from 'axios';

// No Firebase in this build -- the real app's api.js attaches a
// Firebase ID token to every request here. We don't have real
// Firebase credentials for this project, so requests are unauthenticated
// except the admin schedule endpoint, which checks a shared admin key
// header instead (see setSchedule below).

export const api = axios.create({
  baseURL: '/api',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = "Network error -- check your connection.";
    }
    return Promise.reject(error);
  }
);

export const getLeaderboard = async () => {
  const response = await api.get('/leaderboard');
  return response.data; // { weeks: {...}, totals: {...} }
};

export const submitScore = async (week, player, score, dateKey, meta) => {
  const body = { week, player, score, dateKey };
  if (meta) body.meta = meta;
  const response = await api.post('/leaderboard', body);
  return response.data;
};

export const getSchedule = async () => {
  const response = await api.get('/schedule');
  return response.data; // { overrides: {...} }
};

export const setSchedule = async (gameId, dateKey, value, adminKey) => {
  const response = await api.post(
    '/schedule',
    { gameId, dateKey, value },
    { headers: { 'x-admin-key': adminKey } }
  );
  return response.data;
};
