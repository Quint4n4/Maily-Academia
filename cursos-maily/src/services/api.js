import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Persisten en sessionStorage para sobrevivir recargas de página
let accessToken = sessionStorage.getItem('accessToken');
let refreshToken = sessionStorage.getItem('refreshToken');

export const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
  if (access) sessionStorage.setItem('accessToken', access);
  if (refresh) sessionStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
};

export const getRefreshToken = () => refreshToken;
export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Promise compartida — evita que tryRestore y el interceptor renueven el token en paralelo
let refreshPromise = null;

/**
 * Renueva el access token usando el refresh token almacenado.
 * Si ya hay una renovación en curso, devuelve la misma promesa (sin hacer segunda petición).
 */
export const doRefresh = () => {
  if (!refreshPromise) {
    const currentRefresh = refreshToken;
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh/`, { refresh: currentRefresh })
      .then(({ data }) => {
        setTokens(data.access, data.refresh || currentRefresh);
        return data.access;
      })
      .catch((err) => {
        clearTokens();
        throw err;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// Auto-refresh on 401 — usa doRefresh() compartida para evitar doble renovación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && refreshToken) {
      originalRequest._retry = true;
      try {
        const newToken = await doRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (err) {
        window.location.href = '/';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
