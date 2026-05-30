import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function readCookie(name) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = readCookie('csrf_token');
    if (csrf) config.headers['x-csrf-token'] = decodeURIComponent(csrf);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = error.response?.data?.error;
    if (apiError) {
      error.message = apiError.message;
      error.details = apiError.details;
      error.code = apiError.code;
    }
    return Promise.reject(error);
  }
);

export default api;

