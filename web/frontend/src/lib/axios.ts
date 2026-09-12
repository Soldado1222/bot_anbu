import axios from 'axios';

const backendUrl = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

// Injecter le JWT dans chaque requête
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si 401, supprimer le token et rediriger vers login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
