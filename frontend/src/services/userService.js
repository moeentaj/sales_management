// frontend/src/services/userService.js - Complete User/Staff Management Service
import api from './api';

export const userService = {
    // Get all users with filtering and pagination
    getUsers: async (params = {}) => {
        const searchParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });

        const response = await api.get(`/users?${searchParams}`);
        return response.data;
    },

    // Get specific user by ID
    getUser: async (userId) => {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    },

    // Create new user
    createUser: async (userData) => {
        const response = await api.post('/users', userData);
        return response.data;
    },

    // Update user
    updateUser: async (userId, userData) => {
        const response = await api.put(`/users/${userId}`, userData);
        return response.data;
    },

    // Delete user
    deleteUser: async (userId) => {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    },

    // Activate/Deactivate user
    toggleUserStatus: async (userId, isActive) => {
        const endpoint = isActive ? 'activate' : 'deactivate';
        const response = await api.patch(`/users/${userId}/${endpoint}`);
        return response.data;
    },

    // Reset user password
    resetPassword: async (userId, newPassword) => {
        const response = await api.post(`/users/${userId}/reset-password`, { 
            new_password: newPassword 
        });
        return response.data;
    },

    // Get user performance statistics
    getUserStats: async (userId, period = 'month') => {
        const response = await api.get(`/users/${userId}/stats?period=${period}`);
        return response.data;
    },

    // Get all sales staff
    getSalesStaff: async (params = {}) => {
        const response = await userService.getUsers({ ...params, role: 'sales_staff' });
        return response;
    },

    // Get user assignments (distributors assigned to sales staff)
    getUserAssignments: async (userId) => {
        const response = await api.get(`/users/${userId}/assignments`);
        return response.data;
    },

    // Update user assignments
    updateUserAssignments: async (userId, distributorIds) => {
        const response = await api.put(`/users/${userId}/assignments`, { 
            distributor_ids: distributorIds 
        });
        return response.data;
    },

    // Get user analytics summary
    getUserAnalytics: async () => {
        const response = await api.get('/users/analytics/summary');
        return response.data;
    },

    // Upload user documents
    uploadUserDocuments: async (userId, files, documentType = 'general') => {
        const formData = new FormData();
        files.forEach(file => formData.append('documents', file));
        formData.append('user_id', userId);
        formData.append('document_type', documentType);

        const response = await api.post('/upload/staff-documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // Get user documents
    getUserDocuments: async (userId) => {
        const response = await api.get(`/users/${userId}/documents`);
        return response.data;
    },

    // Utility functions
    utils: {
        // Get default user form data
        getDefaultUserData: () => ({
            username: '',
            email: '',
            password: '',
            role: 'sales_staff',
            full_name: '',
            phone_number: '',
            address: '',
            id_card_number: '',
            date_of_birth: '',
            hire_date: new Date().toISOString().split('T')[0],
            salary: '',
            commission_rate: '',
            is_active: true
        }),

        // Validate user data
        validateUser: (userData, isUpdate = false) => {
            const errors = {};

            if (!userData.full_name || userData.full_name.trim().length < 2) {
                errors.full_name = 'Full name must be at least 2 characters';
            }

            if (!userData.username || userData.username.trim().length < 3) {
                errors.username = 'Username must be at least 3 characters';
            }

            if (!userData.email || !userService.utils.isValidEmail(userData.email)) {
                errors.email = 'Valid email address is required';
            }

            if (!isUpdate && (!userData.password || userData.password.length < 6)) {
                errors.password = 'Password must be at least 6 characters';
            }

            if (!['admin', 'sales_staff'].includes(userData.role)) {
                errors.role = 'Valid role is required';
            }

            if (userData.phone_number && !userService.utils.isValidPhone(userData.phone_number)) {
                errors.phone_number = 'Valid phone number is required';
            }

            if (userData.commission_rate && (userData.commission_rate < 0 || userData.commission_rate > 100)) {
                errors.commission_rate = 'Commission rate must be between 0 and 100';
            }

            if (userData.salary && userData.salary < 0) {
                errors.salary = 'Salary must be a positive number';
            }

            return {
                isValid: Object.keys(errors).length === 0,
                errors
            };
        },

        // Validate email format
        isValidEmail: (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Validate phone number
        isValidPhone: (phone) => {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
        },

        // Format user for display
        formatUserForDisplay: (user) => ({
            ...user,
            role_label: userService.utils.getRoleLabel(user.role),
            status_label: user.is_active ? 'Active' : 'Inactive',
            status_color: user.is_active ? 'green' : 'red',
            formatted_salary: user.salary ? userService.utils.formatCurrency(user.salary) : '',
            formatted_commission: user.commission_rate ? `${user.commission_rate}%` : '',
            years_of_service: user.hire_date ? userService.utils.calculateYearsOfService(user.hire_date) : null
        }),

        // Get role label
        getRoleLabel: (role) => {
            const roleLabels = {
                'admin': 'Administrator',
                'sales_staff': 'Sales Staff'
            };
            return roleLabels[role] || role;
        },

        // Get user status badge info
        getStatusBadge: (isActive) => ({
            label: isActive ? 'Active' : 'Inactive',
            color: isActive ? 'green' : 'red',
            bgColor: isActive ? 'bg-green-100' : 'bg-red-100',
            textColor: isActive ? 'text-green-800' : 'text-red-800'
        }),

        // Get role badge info
        getRoleBadge: (role) => {
            const badges = {
                'admin': {
                    label: 'Administrator',
                    color: 'purple',
                    bgColor: 'bg-purple-100',
                    textColor: 'text-purple-800'
                },
                'sales_staff': {
                    label: 'Sales Staff',
                    color: 'blue',
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800'
                }
            };
            return badges[role] || {
                label: role,
                color: 'gray',
                bgColor: 'bg-gray-100',
                textColor: 'text-gray-800'
            };
        },

        // Format currency
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
        },

        // Calculate years of service
        calculateYearsOfService: (hireDate) => {
            const hire = new Date(hireDate);
            const now = new Date();
            const years = (now - hire) / (365.25 * 24 * 60 * 60 * 1000);
            return Math.floor(years * 10) / 10; // Round to 1 decimal place
        },

        // Create search filters for API calls
        createSearchFilters: (searchTerm, role, status) => {
            const filters = {};

            if (searchTerm && searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }

            if (role && role !== 'all') {
                filters.role = role;
            }

            if (status && status !== 'all') {
                filters.is_active = status === 'active' ? 'true' : 'false';
            }

            return filters;
        },

        // Generate username suggestion from full name
        generateUsername: (fullName) => {
            if (!fullName) return '';
            
            const nameParts = fullName.toLowerCase().split(' ').filter(part => part.length > 0);
            if (nameParts.length === 1) {
                return nameParts[0];
            } else if (nameParts.length >= 2) {
                return nameParts[0] + '.' + nameParts[nameParts.length - 1];
            }
            return '';
        },

        // Generate temporary password
        generateTempPassword: () => {
            const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            let result = '';
            for (let i = 0; i < 8; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        },

        // Calculate user performance metrics
        calculateUserMetrics: (user) => {
            return {
                assignedDistributors: user.assigned_distributors_count || 0,
                totalInvoices: user.total_invoices || 0,
                totalRevenue: user.total_revenue || 0,
                averageInvoiceValue: user.total_invoices > 0 
                    ? (user.total_revenue || 0) / user.total_invoices 
                    : 0,
                collectionsThisMonth: user.collections_this_month || 0,
                performanceRating: userService.utils.calculatePerformanceRating(user)
            };
        },

        // Calculate performance rating (simple algorithm)
        calculatePerformanceRating: (user) => {
            let score = 0;
            
            // Revenue contribution (40%)
            const revenue = user.total_revenue || 0;
            if (revenue > 100000) score += 40;
            else if (revenue > 50000) score += 30;
            else if (revenue > 25000) score += 20;
            else if (revenue > 10000) score += 10;
            
            // Number of distributors managed (30%)
            const distributors = user.assigned_distributors_count || 0;
            if (distributors > 20) score += 30;
            else if (distributors > 15) score += 25;
            else if (distributors > 10) score += 20;
            else if (distributors > 5) score += 15;
            else if (distributors > 0) score += 10;
            
            // Activity level (30%)
            const invoices = user.total_invoices || 0;
            if (invoices > 100) score += 30;
            else if (invoices > 50) score += 25;
            else if (invoices > 25) score += 20;
            else if (invoices > 10) score += 15;
            else if (invoices > 0) score += 10;
            
            if (score >= 80) return 'Excellent';
            if (score >= 60) return 'Good';
            if (score >= 40) return 'Average';
            if (score >= 20) return 'Below Average';
            return 'Poor';
        },

        // Sort users by various criteria
        sortUsers: (users, sortBy, sortOrder = 'asc') => {
            return [...users].sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                // Handle different data types
                if (sortBy === 'salary' || sortBy === 'commission_rate') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else if (sortBy === 'hire_date' || sortBy === 'created_at') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else if (sortBy === 'assigned_distributors_count' || sortBy === 'total_invoices') {
                    aVal = parseInt(aVal) || 0;
                    bVal = parseInt(bVal) || 0;
                } else {
                    aVal = String(aVal || '').toLowerCase();
                    bVal = String(bVal || '').toLowerCase();
                }

                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },

        // Common document types for staff
        getDocumentTypes: () => [
            { value: 'id_card', label: 'ID Card' },
            { value: 'contract', label: 'Employment Contract' },
            { value: 'bank_details', label: 'Bank Details' },
            { value: 'photo', label: 'Profile Photo' },
            { value: 'resume', label: 'Resume/CV' },
            { value: 'certificates', label: 'Certificates' },
            { value: 'other', label: 'Other Documents' }
        ],

        // Validate password strength
        validatePasswordStrength: (password) => {
            if (!password) return { score: 0, feedback: 'Password is required' };
            
            let score = 0;
            const feedback = [];
            
            if (password.length >= 8) score += 2;
            else feedback.push('At least 8 characters');
            
            if (/[a-z]/.test(password)) score += 1;
            else feedback.push('Include lowercase letters');
            
            if (/[A-Z]/.test(password)) score += 1;
            else feedback.push('Include uppercase letters');
            
            if (/\d/.test(password)) score += 1;
            else feedback.push('Include numbers');
            
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
            else feedback.push('Include special characters');
            
            let strength = 'Very Weak';
            if (score >= 5) strength = 'Strong';
            else if (score >= 4) strength = 'Good';
            else if (score >= 3) strength = 'Fair';
            else if (score >= 2) strength = 'Weak';
            
            return {
                score,
                strength,
                feedback: feedback.length > 0 ? feedback.join(', ') : 'Password meets requirements'
            };
        }
    },

    // Admin-specific functions
    admin: {
        // Get system user statistics
        getSystemStats: async () => {
            const response = await userService.getUserAnalytics();
            return response;
        },

        // Bulk user operations
        bulkUpdateUsers: async (userIds, updateData) => {
            const promises = userIds.map(userId => 
                userService.updateUser(userId, updateData)
            );
            return Promise.all(promises);
        },

        // Export user data
        exportUsers: async (format = 'csv') => {
            const response = await api.get(`/users/export?format=${format}`, {
                responseType: 'blob'
            });
            return response.data;
        },

        // Import users from file
        importUsers: async (file, options = {}) => {
            const formData = new FormData();
            formData.append('file', file);
            Object.keys(options).forEach(key => {
                formData.append(key, options[key]);
            });

            const response = await api.post('/users/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        },

        // Generate user reports
        generateUserReport: async (reportType, filters = {}) => {
            const response = await api.post('/users/reports/generate', {
                report_type: reportType,
                filters
            });
            return response.data;
        }
    },

    // Profile management for current user
    profile: {
        // Get current user profile
        getCurrentProfile: async () => {
            const response = await api.get('/auth/profile');
            return response.data;
        },

        // Update current user profile
        updateProfile: async (profileData) => {
            const response = await api.put('/auth/profile', profileData);
            return response.data;
        },

        // Change password for current user
        changePassword: async (currentPassword, newPassword) => {
            const response = await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return response.data;
        },

        // Upload profile image
        uploadProfileImage: async (imageFile) => {
            const formData = new FormData();
            formData.append('profile_image', imageFile);

            const response = await api.post('/upload/profile-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        }
    }
};