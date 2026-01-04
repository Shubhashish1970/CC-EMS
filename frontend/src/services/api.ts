// API Service Layer - Replaces mock ApiService

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Create a fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit, timeout: number = 8000, abortSignal?: AbortSignal): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  // Combine abort signals if provided
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

// API request wrapper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
  abortSignal?: AbortSignal
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetchWithTimeout(url, config, 8000, abortSignal); // 8 second timeout

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      throw new Error(error.error?.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Failed to connect to server. Please check if the backend is running.');
    }
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'))) {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiRequest<{ success: boolean; data: { token: string; user: any } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    if (response.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: async () => {
    return apiRequest<{ success: boolean; data: { user: any } }>('/auth/me');
  },
};

// Tasks API
export const tasksAPI = {
  fetchActiveTask: async (abortSignal?: AbortSignal) => {
    const response = await apiRequest<{ success: boolean; data: { taskId?: string; task?: null; farmer?: any; activity?: any; status?: string; scheduledDate?: string; message?: string } }>('/tasks/active', {}, abortSignal);
    return response;
  },

  submitInteraction: async (taskId: string, log: any) => {
    return apiRequest(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
  },

  getPendingTasks: async (filters?: { agentId?: string; territory?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.agentId) params.append('agentId', filters.agentId);
    if (filters?.territory) params.append('territory', filters.territory);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const query = params.toString();
    return apiRequest(`/tasks/pending${query ? `?${query}` : ''}`);
  },

  getTeamTasks: async (filters?: { status?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const query = params.toString();
    return apiRequest(`/tasks/team${query ? `?${query}` : ''}`);
  },

  reassignTask: async (taskId: string, agentId: string) => {
    return apiRequest(`/tasks/${taskId}/reassign`, {
      method: 'PUT',
      body: JSON.stringify({ agentId }),
    });
  },

  getTaskById: async (taskId: string) => {
    return apiRequest(`/tasks/${taskId}`);
  },

  updateTaskStatus: async (taskId: string, status: string, notes?: string) => {
    return apiRequest(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  bulkReassignTasks: async (taskIds: string[], agentId: string) => {
    return apiRequest('/tasks/bulk/reassign', {
      method: 'PUT',
      body: JSON.stringify({ taskIds, agentId }),
    });
  },

  bulkUpdateStatus: async (taskIds: string[], status: string, notes?: string) => {
    return apiRequest('/tasks/bulk/status', {
      method: 'PUT',
      body: JSON.stringify({ taskIds, status, notes }),
    });
  },
};

// Users API (for MIS Admin)
export const usersAPI = {
  getUsers: async (filters?: { role?: string; isActive?: boolean; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const query = params.toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  },

  createUser: async (userData: any) => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (userId: string, userData: any) => {
    return apiRequest(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId: string) => {
    return apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

export const masterDataAPI = {
  getCrops: async () => {
    return apiRequest<{
      success: boolean;
      data: { crops: Array<{ name: string; isActive: boolean }> };
    }>('/master-data/crops', { method: 'GET' });
  },
  getProducts: async () => {
    return apiRequest<{
      success: boolean;
      data: { products: Array<{ name: string; isActive: boolean }> };
    }>('/master-data/products', { method: 'GET' });
  },
};
