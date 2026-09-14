import axios from 'axios';

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
  return response.data;
};

export const submitScore = async (week, player, score, dateKey, meta) => {
  const body = { week, player, score, dateKey };
  if (meta) body.meta = meta;
  const response = await api.post('/leaderboard', body);
  return response.data;
};

export const deleteScore = async (week, player, adminKey, dateKey) => {
  const body = { week, player };
  if (dateKey) body.dateKey = dateKey;
  const response = await api.delete('/leaderboard', {
    data: body,
    headers: { 'x-admin-key': adminKey },
  });
  return response.data;
};

export const getSchedule = async () => {
  const response = await api.get('/schedule');
  return response.data;
};

export const setSchedule = async (gameId, dateKey, value, adminKey) => {
  const response = await api.post(
    '/schedule',
    { gameId, dateKey, value },
    { headers: { 'x-admin-key': adminKey } }
  );
  return response.data;
};
