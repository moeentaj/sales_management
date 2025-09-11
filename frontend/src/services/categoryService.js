// frontend/src/services/categoryService.js - Complete Category Management Service
import api from './api';

export const categoryService = {
    // Get all categories with filtering and pagination
    getCategories: async (params = {}) => {
        const searchParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });

        const response = await api.get(`/categories?${searchParams}`);
        return response.data;
    },

    // Get specific category by ID
    getCategory: async (categoryId) => {
        const response = await api.get(`/categories/${categoryId}`);
        return response.data;
    },

    // Create new category
    createCategory: async (categoryData) => {
        const response = await api.post('/categories', categoryData);
        return response.data;
    },

    // Update category
    updateCategory: async (categoryId, categoryData) => {
        const response = await api.put(`/categories/${categoryId}`, categoryData);
        return response.data;
    },

    // Delete category
    deleteCategory: async (categoryId) => {
        const response = await api.delete(`/categories/${categoryId}`);
        return response.data;
    },

    // Toggle category active status
    toggleCategoryStatus: async (categoryId) => {
        const response = await api.patch(`/categories/${categoryId}/toggle-status`);
        return response.data;
    },

    // Reorder categories
    reorderCategories: async (categoryOrders) => {
        const response = await api.put('/categories/reorder', { categoryOrders });
        return response.data;
    },

    // Get category statistics
    getCategoryStats: async () => {
        const response = await api.get('/categories/stats/summary');
        return response.data;
    },

    // Get active categories for dropdowns (simple list)
    getActiveCategoriesSimple: async () => {
        const response = await categoryService.getCategories({ 
            is_active: 'true', 
            limit: 100 
        });
        
        if (response.success) {
            return {
                success: true,
                data: response.data.categories.map(cat => ({
                    value: cat.category_name,
                    label: cat.category_name,
                    id: cat.category_id
                }))
            };
        }
        
        return response;
    },

    // Utility functions
    utils: {
        // Get default category data for forms
        getDefaultCategoryData: () => ({
            category_name: '',
            description: '',
            display_order: null,
            is_active: true
        }),

        // Validate category data
        validateCategory: (categoryData, isEdit = false) => {
            const errors = {};

            // Category name validation
            if (!categoryData.category_name || !categoryData.category_name.trim()) {
                errors.category_name = 'Category name is required';
            } else if (categoryData.category_name.length < 2) {
                errors.category_name = 'Category name must be at least 2 characters';
            } else if (categoryData.category_name.length > 100) {
                errors.category_name = 'Category name cannot exceed 100 characters';
            }

            // Description validation
            if (categoryData.description && categoryData.description.length > 500) {
                errors.description = 'Description cannot exceed 500 characters';
            }

            // Display order validation
            if (categoryData.display_order !== null && categoryData.display_order !== undefined) {
                const order = parseInt(categoryData.display_order);
                if (isNaN(order) || order < 0) {
                    errors.display_order = 'Display order must be a positive number';
                }
            }

            return errors;
        },

        // Format category for display
        formatCategoryData: (category) => {
            return {
                ...category,
                status: category.is_active ? 'Active' : 'Inactive',
                statusColor: category.is_active ? 'green' : 'red',
                productCountText: category.total_products_count ? 
                    `${category.total_products_count} products` : 'No products',
                activeProductCountText: category.active_products_count ? 
                    `${category.active_products_count} active` : 'No active products',
                avgPriceText: category.avg_product_price ? 
                    `PKR ${parseFloat(category.avg_product_price).toLocaleString()}` : 'N/A',
                createdAtFormatted: new Date(category.created_at).toLocaleDateString(),
                updatedAtFormatted: new Date(category.updated_at).toLocaleDateString()
            };
        },

        // Sort categories by various criteria
        sortCategories: (categories, sortBy, sortOrder = 'asc') => {
            return [...categories].sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                // Handle different data types
                if (sortBy === 'display_order' || sortBy === 'total_products_count') {
                    aVal = parseInt(aVal) || 0;
                    bVal = parseInt(bVal) || 0;
                } else if (sortBy === 'avg_product_price') {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else if (sortBy === 'created_at' || sortBy === 'updated_at') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                } else {
                    aVal = String(aVal || '').toLowerCase();
                    bVal = String(bVal || '').toLowerCase();
                }

                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        },

        // Create search filters for API calls
        createSearchFilters: (searchTerm, status) => {
            const filters = {};

            if (searchTerm && searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }

            if (status && status !== 'all') {
                filters.is_active = status === 'active' ? 'true' : 'false';
            }

            return filters;
        },

        // Get status badge configuration
        getStatusBadge: (isActive) => ({
            label: isActive ? 'Active' : 'Inactive',
            color: isActive ? 'green' : 'red',
            bgColor: isActive ? 'bg-green-100' : 'bg-red-100',
            textColor: isActive ? 'text-green-800' : 'text-red-800'
        }),

        // Generate suggested display order
        generateDisplayOrder: (existingCategories) => {
            if (!existingCategories || existingCategories.length === 0) {
                return 1;
            }

            const maxOrder = Math.max(...existingCategories.map(cat => cat.display_order || 0));
            return maxOrder + 1;
        },

        // Check if category name is valid and unique
        validateCategoryName: (name, existingCategories, currentCategoryId = null) => {
            if (!name || !name.trim()) {
                return { valid: false, message: 'Category name is required' };
            }

            const trimmedName = name.trim().toLowerCase();
            
            if (trimmedName.length < 2) {
                return { valid: false, message: 'Category name must be at least 2 characters' };
            }

            if (trimmedName.length > 100) {
                return { valid: false, message: 'Category name cannot exceed 100 characters' };
            }

            // Check for duplicates
            const duplicate = existingCategories.find(cat => 
                cat.category_name.toLowerCase() === trimmedName && 
                cat.category_id !== currentCategoryId
            );

            if (duplicate) {
                return { valid: false, message: 'Category name already exists' };
            }

            return { valid: true, message: 'Category name is valid' };
        },

        // Calculate category metrics
        calculateCategoryMetrics: (category) => {
            const totalProducts = category.total_products_count || 0;
            const activeProducts = category.active_products_count || 0;
            const avgPrice = parseFloat(category.avg_product_price) || 0;
            const totalRevenue = parseFloat(category.total_revenue) || 0;

            return {
                totalProducts,
                activeProducts,
                inactiveProducts: totalProducts - activeProducts,
                avgPrice,
                totalRevenue,
                productUtilization: totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0,
                revenuePerProduct: totalProducts > 0 ? totalRevenue / totalProducts : 0
            };
        },

        // Format numbers for display
        formatNumber: (number, type = 'number') => {
            if (!number || isNaN(number)) return '0';

            switch (type) {
                case 'currency':
                    return `PKR ${parseFloat(number).toLocaleString()}`;
                case 'percentage':
                    return `${parseFloat(number).toFixed(1)}%`;
                default:
                    return parseFloat(number).toLocaleString();
            }
        }
    }
};