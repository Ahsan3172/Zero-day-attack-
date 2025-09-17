// API Configuration and Service Layer
const API_BASE_URL = 'http://localhost:5000/api';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface Dataset {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  rows_count: number | null;
  columns_count: number | null;
  upload_date: string;
  status: string;
}

export interface Model {
  id: number;
  name: string;
  description: string;
  algorithm: string;
  accuracy: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  status: 'training' | 'ready' | 'failed';
  created_at: string;
  created_by: string;
}

export interface ModelResult {
  id: number;
  model_name: string;
  dataset_name: string;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: any;
  execution_time: number;
  created_at: string;
}

// Token management
export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
  
  setToken: (token: string): void => {
    localStorage.setItem('auth_token', token);
  },
  
  removeToken: (): void => {
    localStorage.removeItem('auth_token');
  },
  
  getAuthHeaders: (): Record<string, string> => {
    const token = tokenManager.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// HTTP Client with error handling
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...tokenManager.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like rate limit messages)
        const text = await response.text();
        data = {
          success: false,
          message: text || `HTTP error! status: ${response.status}`
        };
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('dataset', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        ...tokenManager.getAuthHeaders(),
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      body: formData,
    });
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL);

// Authentication API
export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<User>> => {
    return apiClient.post<User>('/auth/register', userData);
  },

  logout: async (): Promise<ApiResponse> => {
    return apiClient.post('/auth/logout');
  },

  refreshToken: async (): Promise<ApiResponse<LoginResponse>> => {
    return apiClient.post<LoginResponse>('/auth/refresh');
  },
};

// User API
export const userApi = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get<User>('/users/profile');
  },

  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    return apiClient.put<User>('/users/profile', userData);
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    return apiClient.put('/users/password', { currentPassword, newPassword });
  },

  getActivity: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/users/activity');
  },
};

// Dataset API
export const datasetApi = {
  upload: async (file: File): Promise<ApiResponse<Dataset>> => {
    return apiClient.uploadFile<Dataset>('/datasets/upload', file);
  },

  getAll: async (): Promise<ApiResponse<{ datasets: Dataset[], pagination: any }>> => {
    return apiClient.get('/datasets');
  },

  getById: async (id: number): Promise<ApiResponse<Dataset>> => {
    return apiClient.get(`/datasets/${id}`);
  },

  delete: async (id: number): Promise<ApiResponse> => {
    return apiClient.delete(`/datasets/${id}`);
  },

  download: async (id: number): Promise<void> => {
    const token = tokenManager.getToken();
    const url = `${API_BASE_URL}/datasets/${id}/download`;
    
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition 
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : 'dataset.csv';
    
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

// Model API
export const modelApi = {
  getAll: async (): Promise<ApiResponse<{ models: Model[], pagination: any }>> => {
    return apiClient.get('/models');
  },

  getById: async (id: number): Promise<ApiResponse<{ model: Model, recentResults: any[], trainingLogs: any[] }>> => {
    return apiClient.get(`/models/${id}`);
  },

  predict: async (modelId: number, datasetId: number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/models/${modelId}/predict`, { datasetId });
  },

  getResult: async (resultId: number): Promise<ApiResponse<ModelResult>> => {
    return apiClient.get(`/models/results/${resultId}`);
  },

  getResults: async (): Promise<ApiResponse<{ results: ModelResult[], pagination: any }>> => {
    return apiClient.get('/models/results');
  },

  deleteResult: async (resultId: number): Promise<ApiResponse> => {
    return apiClient.delete(`/models/results/${resultId}`);
  },

  // Training API
  startTraining: async (trainingData: {
    model_types: string[];
    test_size?: number;
    random_state?: number;
    dataset_path?: string | null;
  }): Promise<ApiResponse<{ task_id: string; status: string; model_types: string[]; dataset_path: string }>> => {
    return apiClient.post('/models/train', trainingData);
  },

  getTrainingStatus: async (taskId: string): Promise<ApiResponse<{
    task_id: string;
    status: string;
    progress: number;
    message: string;
    current_model?: string;
    models_completed: string[];
    error_details?: string;
  }>> => {
    return apiClient.get(`/models/train/status/${taskId}`);
  },

  cancelTraining: async (taskId: string): Promise<ApiResponse> => {
    return apiClient.delete(`/models/train/cancel/${taskId}`);
  },
};

// Dashboard API
export const dashboardApi = {
  getOverview: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/dashboard/overview');
  },

  getAccuracyTrend: async (days: number = 30): Promise<ApiResponse<any>> => {
    return apiClient.get(`/dashboard/charts/accuracy-trend?days=${days}`);
  },

  getModelPerformance: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/dashboard/charts/model-performance');
  },

  getAttackDistribution: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/dashboard/charts/attack-distribution');
  },

  getRecentActivity: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/dashboard/recent-activity');
  },
};

// Admin API
export const adminApi = {
  getPendingUsers: async (): Promise<ApiResponse<User[]>> => {
    return apiClient.get('/admin/users/pending');
  },

  approveUser: async (userId: number): Promise<ApiResponse<User>> => {
    return apiClient.put(`/admin/users/${userId}/approve`);
  },

  rejectUser: async (userId: number): Promise<ApiResponse<User>> => {
    return apiClient.put(`/admin/users/${userId}/reject`);
  },

  getAllUsers: async (page: number = 1, limit: number = 10): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
  },

  deleteUser: async (userId: number): Promise<ApiResponse> => {
    return apiClient.delete(`/admin/users/${userId}`);
  },

  inviteUser: async (userData: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<ApiResponse<User>> => {
    return apiClient.post('/admin/users/invite', userData);
  },

  updateUserRole: async (userId: number, role: 'admin' | 'user'): Promise<ApiResponse<{ userId: number; newRole: string }>> => {
    return apiClient.put(`/users/role/${userId}`, { role });
  },

  trainModel: async (modelData: {
    name: string;
    description: string;
    algorithm: string;
    datasetId: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.post('/admin/models/train', modelData);
  },

  getSystemStats: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/system/stats');
  },

  getAuditLogs: async (page: number = 1, limit: number = 20): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/logs?page=${page}&limit=${limit}`);
  },
};

// Helper function for authenticated requests
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = tokenManager.getToken();
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      tokenManager.removeToken();
      window.location.href = '/login';
      throw new Error('Authentication failed');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export default apiClient;
