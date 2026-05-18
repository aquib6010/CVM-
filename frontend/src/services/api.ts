/**
 * REST API Client
 * Centralized HTTP client for all backend API calls.
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vlab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vlab_token');
      // Optionally redirect to login
    }
    return Promise.reject(err);
  }
);

// ─── Auth API ────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { email: string; password: string; displayName: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  google: (data: { credential: string }) =>
    api.post('/auth/google', data),

  getMe: () => api.get('/auth/me'),
};

// ─── Experiments API ─────────────────────────────────────────────
export const experimentsAPI = {
  list: () => api.get('/experiments'),

  listPublic: () => api.get('/experiments/public'),

  getById: (id: string) => api.get(`/experiments/${id}`),

  create: (data: any) => api.post('/experiments', data),

  update: (id: string, data: any) => api.put(`/experiments/${id}`, data),

  delete: (id: string) => api.delete(`/experiments/${id}`),
};

export default api;
