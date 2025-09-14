// API Configuration
export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  MODELS: {
    GET_ALL: '/models',
    GET_TRAINING_HISTORY: '/models/training-history',
    TRAIN: '/models/train',
    DELETE: (id: string) => `/models/${id}`,
  },
  DATASETS: {
    UPLOAD: '/datasets/upload',
    GET_ALL: '/datasets',
    DELETE: (id: string) => `/datasets/${id}`,
  },
  PREDICTIONS: {
    CREATE: '/predictions',
    GET_ALL: '/predictions',
    GET_BY_ID: (id: string) => `/predictions/${id}`,
  },
} as const;