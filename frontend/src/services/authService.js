// frontend/src/services/authService.js - Updated for real API calls
import api from './api';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error) {
      // Handle specific error cases
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 400) {
        throw new Error('Please check your email and password');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Login failed. Please try again.');
      }
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout fails, we'll clear local storage
      console.error('Logout error:', error);
    }
  },

  refreshToken: async (refreshToken) => {
    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      return response.data;
    } catch (error) {
      throw new Error('Session expired. Please login again.');
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to change password');
      }
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get user information');
    }
  },

  // Mock fallback for development (remove in production)
  mockLogin: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock admin credentials
    if (email === 'admin@company.com' && password === 'admin123') {
      return {
        success: true,
        data: {
          user: { 
            user_id: 1, 
            email, 
            full_name: 'Admin User', 
            role: 'admin',
            username: 'admin',
            is_active: true
          },
          accessToken: 'mock-admin-token'
        }
      };
    }
    
    // Mock sales staff credentials
    if (email === 'sales@company.com' && password === 'sales123') {
      return {
        success: true,
        data: {
          user: { 
            user_id: 2, 
            email, 
            full_name: 'Sales Staff', 
            role: 'sales_staff',
            username: 'sales',
            is_active: true
          },
          accessToken: 'mock-sales-token'
        }
      };
    }
    
    throw new Error('Invalid credentials');
  }
};