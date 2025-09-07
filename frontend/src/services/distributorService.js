// services/distributorService.js
import api from './api';

export const distributorService = {
    // Get all distributors with filtering and pagination
    getDistributors: async (params = {}) => {
        const {
            page = 1,
            limit = 20,
            search = '',
            city = '',
            is_active = null,
            sort_by = 'distributor_name',
            sort_order = 'asc'
        } = params;

        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            city,
            sort_by,
            sort_order
        });

        if (is_active !== null) {
            queryParams.append('is_active', is_active.toString());
        }

        const response = await api.get(`/distributors?${queryParams}`);
        return response.data;
    },

    // Get single distributor by ID
    getDistributor: async (distributorId) => {
        const response = await api.get(`/distributors/${distributorId}`);
        return response.data;
    },

    // Create new distributor
    createDistributor: async (distributorData) => {
        const response = await api.post('/distributors', distributorData);
        return response.data;
    },

    // Update distributor
    updateDistributor: async (distributorId, distributorData) => {
        const response = await api.put(`/distributors/${distributorId}`, distributorData);
        return response.data;
    },

    // Delete distributor (soft delete)
    deleteDistributor: async (distributorId) => {
        const response = await api.delete(`/distributors/${distributorId}`);
        return response.data;
    },

    // Activate distributor
    activateDistributor: async (distributorId) => {
        const response = await api.post(`/distributors/${distributorId}/activate`);
        return response.data;
    },

    // Get distributor invoices
    getDistributorInvoices: async (distributorId, params = {}) => {
        const {
            page = 1,
            limit = 20,
            status = ''
        } = params;

        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });

        if (status) {
            queryParams.append('status', status);
        }

        const response = await api.get(`/distributors/${distributorId}/invoices?${queryParams}`);
        return response.data;
    },

    // Get distributor search suggestions
    getDistributorSuggestions: async (searchQuery) => {
        if (!searchQuery || searchQuery.length < 2) {
            return { data: [] };
        }

        const response = await api.get(`/distributors/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        return response.data;
    },

    // Get distributor contacts
    getDistributorContacts: async (distributorId) => {
        const response = await api.get(`/distributors/${distributorId}/contacts`);
        return response.data;
    },

    // Add distributor contact
    addDistributorContact: async (distributorId, contactData) => {
        const response = await api.post(`/distributors/${distributorId}/contacts`, contactData);
        return response.data;
    },

    // Update distributor contact
    updateDistributorContact: async (distributorId, contactId, contactData) => {
        const response = await api.put(`/distributors/${distributorId}/contacts/${contactId}`, contactData);
        return response.data;
    },

    // Delete distributor contact
    deleteDistributorContact: async (distributorId, contactId) => {
        const response = await api.delete(`/distributors/${distributorId}/contacts/${contactId}`);
        return response.data;
    },

    // Get assigned sales staff for distributor
    getDistributorStaff: async (distributorId) => {
        const response = await api.get(`/distributors/${distributorId}/staff`);
        return response.data;
    },

    // Assign staff to distributor
    assignStaffToDistributor: async (distributorId, staffIds) => {
        const response = await api.post(`/distributors/${distributorId}/staff`, { staff_ids: staffIds });
        return response.data;
    },

    // Remove staff assignment from distributor
    removeStaffFromDistributor: async (distributorId, staffId) => {
        const response = await api.delete(`/distributors/${distributorId}/staff/${staffId}`);
        return response.data;
    },

    // Get distributor statistics
    getDistributorStats: async (distributorId, params = {}) => {
        const {
            start_date = '',
            end_date = '',
            period = 'month' // day, week, month, year
        } = params;

        const queryParams = new URLSearchParams({ period });
        
        if (start_date) queryParams.append('start_date', start_date);
        if (end_date) queryParams.append('end_date', end_date);

        const response = await api.get(`/distributors/${distributorId}/stats?${queryParams}`);
        return response.data;
    },

    // Bulk operations
    bulkOperations: {
        // Bulk update distributors
        updateMultiple: async (distributorIds, updateData) => {
            const response = await api.patch('/distributors/bulk/update', {
                distributor_ids: distributorIds,
                update_data: updateData
            });
            return response.data;
        },

        // Bulk delete distributors
        deleteMultiple: async (distributorIds) => {
            const response = await api.delete('/distributors/bulk/delete', {
                data: { distributor_ids: distributorIds }
            });
            return response.data;
        },

        // Bulk assign staff
        assignStaff: async (distributorIds, staffIds) => {
            const response = await api.post('/distributors/bulk/assign-staff', {
                distributor_ids: distributorIds,
                staff_ids: staffIds
            });
            return response.data;
        }
    },

    // Export distributors
    exportDistributors: async (params = {}) => {
        const {
            format = 'csv', // csv, excel, pdf
            filters = {}
        } = params;

        const queryParams = new URLSearchParams({
            format,
            ...filters
        });

        const response = await api.get(`/distributors/export?${queryParams}`, {
            responseType: 'blob'
        });

        return response;
    },

    // Import distributors from file
    importDistributors: async (file, options = {}) => {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(options).forEach(key => {
            formData.append(key, options[key]);
        });

        const response = await api.post('/distributors/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    },

    // Utilities for frontend
    utils: {
        // Format distributor display name
        formatDisplayName: (distributor) => {
            if (!distributor) return '';
            
            let name = distributor.distributor_name;
            if (distributor.city) {
                name += ` (${distributor.city})`;
            }
            return name;
        },

        // Get distributor status badge info
        getStatusInfo: (distributor) => {
            if (!distributor) return { label: 'Unknown', color: 'gray' };
            
            if (distributor.is_active) {
                return { label: 'Active', color: 'green' };
            } else {
                return { label: 'Inactive', color: 'red' };
            }
        },

        // Calculate distributor metrics
        calculateMetrics: (distributor) => {
            if (!distributor) return {};

            const totalAmount = parseFloat(distributor.total_amount || 0);
            const paidAmount = parseFloat(distributor.paid_amount || 0);
            const balanceAmount = totalAmount - paidAmount;
            const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

            return {
                totalAmount,
                paidAmount,
                balanceAmount,
                paymentPercentage: Math.round(paymentPercentage),
                totalInvoices: parseInt(distributor.total_invoices || 0),
                pendingInvoices: parseInt(distributor.pending_invoices || 0)
            };
        },

        // Validate distributor data
        validateDistributorData: (data) => {
            const errors = [];

            if (!data.distributor_name || data.distributor_name.trim().length === 0) {
                errors.push('Distributor name is required');
            }

            if (!data.primary_contact_person || data.primary_contact_person.trim().length === 0) {
                errors.push('Primary contact person is required');
            }

            if (data.primary_whatsapp_number && !/^\+?[\d\s-()]+$/.test(data.primary_whatsapp_number)) {
                errors.push('Invalid WhatsApp number format');
            }

            if (data.ntn_number && data.ntn_number.length > 50) {
                errors.push('NTN number too long');
            }

            return {
                isValid: errors.length === 0,
                errors
            };
        },

        // Generate default form data
        getDefaultFormData: () => {
            return {
                distributor_name: '',
                address: '',
                city: '',
                state: '',
                postal_code: '',
                ntn_number: '',
                primary_contact_person: '',
                primary_whatsapp_number: '',
                contacts: [],
                assigned_staff: []
            };
        },

        // Search and filter helpers
        createSearchFilters: (searchTerm, selectedCity, activeStatus) => {
            const filters = {};
            
            if (searchTerm && searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }
            
            if (selectedCity && selectedCity !== 'all') {
                filters.city = selectedCity;
            }
            
            if (activeStatus !== null && activeStatus !== 'all') {
                filters.is_active = activeStatus === 'active';
            }
            
            return filters;
        },

        // Sort options for distributor lists
        getSortOptions: () => {
            return [
                { value: 'distributor_name', label: 'Name (A-Z)', order: 'asc' },
                { value: 'distributor_name', label: 'Name (Z-A)', order: 'desc' },
                { value: 'city', label: 'City (A-Z)', order: 'asc' },
                { value: 'created_at', label: 'Newest First', order: 'desc' },
                { value: 'created_at', label: 'Oldest First', order: 'asc' },
                { value: 'total_amount', label: 'Amount (High-Low)', order: 'desc' },
                { value: 'total_amount', label: 'Amount (Low-High)', order: 'asc' }
            ];
        }
    }
};

export default distributorService;