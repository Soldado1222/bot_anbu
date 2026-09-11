import axios from 'axios';

// Configuration globale d'axios pour la production
const backendUrl = import.meta.env.VITE_API_URL || '';

const axiosInstance = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
});

export default axiosInstance;
