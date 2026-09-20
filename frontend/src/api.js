import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/verify')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!path.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const batchApi = {
  list: (params) => api.get('/batches', { params }),
  search: (q) => api.get('/batches/search', { params: { q } }),
  get: (batchId) => api.get(`/batches/${batchId}`),
  history: (batchId) => api.get(`/batches/${batchId}/history`),
  events: (batchId) => api.get(`/batches/${batchId}/events`),
  create: (data) => api.post('/batches', data),
  addEvent: (batchId, data) => api.post(`/batches/${batchId}/events`, data),
  verify: (batchId) => api.get(`/batches/${batchId}/verify`),
  integrity: (batchId) => api.get(`/batches/${batchId}/integrity`),
  contaminate: (batchId, data) => api.post(`/batches/${batchId}/contaminate`, data),
  recall: (batchId) => api.get(`/batches/${batchId}/recall`),
};

export const recallApi = {
  list: () => api.get('/recalls'),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export const publicApi = {
  verify: (batchId) => api.get(`/public/verify/${batchId}`),
};

export default api;
