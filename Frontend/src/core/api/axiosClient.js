import axios from 'axios';
import { API_CONFIG } from '../../config/api.config';
import { handleApiError } from './errorHandler';

export const axiosClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: { 'Content-Type': 'application/json' }
});

axiosClient.interceptors.request.use((config) => {
  const token =
    sessionStorage.getItem('zenmeter_token') ||
    localStorage.getItem('zenmeter_token') ||
    localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    handleApiError(error);
    return Promise.reject(error);
  }
);
