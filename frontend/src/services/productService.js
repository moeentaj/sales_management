// frontend/src/services/productService.js - Complete Product Management Service
import api from './api';

export const productService = {
    // Get all products with filtering and pagination
    getProducts: async (params = {}) => {
        const searchParams = new URLSearchParams();

        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });

        const response = await api.get(`/products?${searchParams}`);
        return response.data;
    },

    // Get specific product by ID
    getProduct: async (productId) => {
        const response = await api.get(`/products/${productId}`);
        return response.data;
    },

    // Create new product
    createProduct: async (productData) => {
        const response = await api.post('/products', productData);
        return response.data;
    },

    // Update product
    updateProduct: async (productId, productData) => {
        const response = await api.put(`/products/${productId}`, productData);
        return response.data;
    },

    // Delete product
    deleteProduct: async (productId) => {
        const response = await api.delete(`/products/${productId}`);
        return response.data;
    },

    // Activate/Deactivate product
    toggleProductStatus: async (productId, isActive) => {
        const endpoint = isActive ? 'activate' : 'deactivate';
        const response = await api.patch(`/products/${productId}/${endpoint}`);
        return response.data;
    },

    // Get product categories
    getCategories: async () => {
        const response = await api.get('/products/categories/list');
        return response.data;
    },

    // Get product suggestions for search/autocomplete
    getProductSuggestions: async (searchTerm) => {
        const response = await api.get(`/products/search/suggestions?q=${encodeURIComponent(searchTerm)}`);
        return response.data;
    },

    // Bulk import products
    bulkImportProducts: async (products) => {
        const response = await api.post('/products/bulk-import', { products });
        return response.data;
    },

    // Get product analytics
    getProductAnalytics: async () => {
        const response = await api.get('/products/analytics/summary');
        return response.data;
    },

    // Utility functions
    utils: {
        // Get default product form data
        getDefaultProductData: () => ({
            product_name: '',
            product_code: '',
            description: '',
            unit_price: '',
            unit_of_measure: 'piece',
            category: '',
            tax_rate: 0,
            is_active: true
        }),

        // Validate product data
        validateProduct: (productData) => {
            const errors = {};

            if (!productData.product_name || productData.product_name.trim().length < 2) {
                errors.product_name = 'Product name must be at least 2 characters';
            }

            if (productData.product_code && productData.product_code.length > 50) {
                errors.product_code = 'Product code cannot exceed 50 characters';
            }

            if (!productData.unit_price || parseFloat(productData.unit_price) < 0) {
                errors.unit_price = 'Valid unit price is required (must be >= 0)';
            }

            if (productData.tax_rate && (productData.tax_rate < 0 || productData.tax_rate > 100)) {
                errors.tax_rate = 'Tax rate must be between 0 and 100';
            }

            if (productData.description && productData.description.length > 1000) {
                errors.description = 'Description cannot exceed 1000 characters';
            }

            return {
                isValid: Object.keys(errors).length === 0,
                errors
            };
        },

        // Format currency for display
        formatCurrency: (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
        },

        // Format product for display
        formatProductForDisplay: (product) => ({
            ...product,
            formatted_price: productService.utils.formatCurrency(product.unit_price),
            status_label: product.is_active ? 'Active' : 'Inactive',
            status_color: product.is_active ? 'green' : 'red'
        }),

        // Get product status badge info
        getStatusBadge: (isActive) => ({
            label: isActive ? 'Active' : 'Inactive',
            color: isActive ? 'green' : 'red',
            bgColor: isActive ? 'bg-green-100' : 'bg-red-100',
            textColor: isActive ? 'text-green-800' : 'text-red-800'
        }),

        // Create search filters for API calls
        createSearchFilters: (searchTerm, category, status) => {
            const filters = {};

            if (searchTerm && searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }

            if (category && category !== 'all') {
                filters.category = category;
            }

            if (status && status !== 'all') {
                filters.is_active = status === 'active' ? 'true' : 'false';
            }

            return filters;
        },

        // Generate product code suggestion
        generateProductCode: (productName, category = '') => {
            const namePrefix = productName.substring(0, 3).toUpperCase();
            const categoryPrefix = category ? category.substring(0, 2).toUpperCase() : '';
            const timestamp = Date.now().toString().slice(-4);

            return `${categoryPrefix}${namePrefix}${timestamp}`;
        },

        // Calculate performance metrics
        calculateProductMetrics: (product) => {
            const timesSold = product.times_sold || 0;
            const quantitySold = product.total_quantity_sold || 0;
            const revenue = product.total_revenue || 0;

            return {
                timesSold,
                quantitySold,
                revenue,
                averageOrderSize: timesSold > 0 ? quantitySold / timesSold : 0,
                averageRevenue: timesSold > 0 ? revenue / timesSold : 0,
                revenuePerUnit: quantitySold > 0 ? revenue / quantitySold : 0
            };
        },

        // Get category badge configuration
        getCategoryBadge: (category) => {
            if (!category) {
                return {
                    label: 'No Category',
                    color: 'gray',
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-800'
                };
            }

            // Generate a color based on category name for consistency
            const colors = [
                { bg: 'bg-blue-100', text: 'text-blue-800', color: 'blue' },
                { bg: 'bg-green-100', text: 'text-green-800', color: 'green' },
                { bg: 'bg-purple-100', text: 'text-purple-800', color: 'purple' },
                { bg: 'bg-orange-100', text: 'text-orange-800', color: 'orange' },
                { bg: 'bg-pink-100', text: 'text-pink-800', color: 'pink' },
                { bg: 'bg-indigo-100', text: 'text-indigo-800', color: 'indigo' },
                { bg: 'bg-yellow-100', text: 'text-yellow-800', color: 'yellow' },
                { bg: 'bg-red-100', text: 'text-red-800', color: 'red' }
            ];

            // Use string hash to consistently assign colors
            const hash = category.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);

            const colorIndex = Math.abs(hash) % colors.length;
            const selectedColor = colors[colorIndex];

            return {
                label: category,
                color: selectedColor.color,
                bgColor: selectedColor.bg,
                textColor: selectedColor.text
            };
        },


        // Get product availability status
        getAvailabilityStatus: (product) => {
            if (!product.is_active) {
                return { status: 'inactive', label: 'Inactive', color: 'red' };
            }

            // Could add inventory checks here in the future
            return { status: 'available', label: 'Available', color: 'green' };
        },

        // Sort products by various criteria
        sortProducts: (products, sortBy, sortOrder = 'asc') => {
            return [...products].sort((a, b) => {
                let aVal = a[sortBy];
                let bVal = b[sortBy];

                // Handle different data types
                if (sortBy === 'unit_price' || sortBy === 'tax_rate') {
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

        // Common product categories
        getCommonCategories: () => [
            'Electronics',
            'Clothing',
            'Food & Beverages',
            'Health & Beauty',
            'Home & Garden',
            'Sports & Outdoors',
            'Books & Media',
            'Automotive',
            'Industrial',
            'Other'
        ],

        // Common units of measure
        getCommonUnits: () => [
            'piece',
            'kg',
            'gram',
            'liter',
            'meter',
            'box',
            'dozen',
            'pack',
            'bottle',
            'bag'
        ]
    },

    // Mobile-specific helpers
    mobile: {
        // Get products optimized for mobile selection
        getProductsForSelection: async (searchTerm = '', limit = 20) => {
            const params = {
                search: searchTerm,
                is_active: 'true',
                limit: limit,
                sort_by: 'product_name',
                sort_order: 'asc'
            };

            const response = await productService.getProducts(params);

            return {
                ...response,
                data: {
                    ...response.data,
                    products: response.data.products.map(product => ({
                        ...product,
                        formatted_price: productService.utils.formatCurrency(product.unit_price),
                        display_name: `${product.product_name} - ${product.unit_of_measure}`
                    }))
                }
            };
        },

        // Quick product search for invoice creation
        quickSearch: async (searchTerm) => {
            if (!searchTerm || searchTerm.length < 2) {
                return { success: true, data: [] };
            }

            const response = await productService.getProductSuggestions(searchTerm);

            return {
                ...response,
                data: response.data.map(product => ({
                    ...product,
                    formatted_price: productService.utils.formatCurrency(product.unit_price),
                    display_text: `${product.product_name} (${product.product_code}) - ${productService.utils.formatCurrency(product.unit_price)}`
                }))
            };
        }
    }
};