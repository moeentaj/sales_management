import api from './api';

export const authService = {
  login: async (email, password) => {
    // Mock implementation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (email === 'admin@company.com' && password === 'admin123') {
      return {
        success: true,
        data: {
          user: { user_id: 1, email, full_name: 'Admin User', role: 'admin' },
          accessToken: 'mock-token'
        }
      };
    }
    throw new Error('Invalid credentials');
  },

  logout: async () => {
    return api.post('/auth/logout');
  },

  refreshToken: async (refreshToken) => {
    return api.post('/auth/refresh', { refreshToken });
  }
};