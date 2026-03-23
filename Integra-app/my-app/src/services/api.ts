import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.32.148:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(async (config) => {
  const { value: token } = await Preferences.get({ key: 'auth_token' });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para lidar com erros de autenticação (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await Preferences.remove({ key: 'auth_token' });
      // Aqui poderíamos redirecionar para o login se tivéssemos acesso ao router,
      // mas deixaremos para as views lidarem com isso ou usaremos um evento.
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
