// services/invoiceService.js
import api from './api';

export const invoiceService = {
    // Get all invoices with filtering and pagination
    getInvoices: async (params = {}) => {
        const searchParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });

        const response = await api.get(`/invoices?${searchParams}`);
        return response.data;
    },

    // Get specific invoice by ID
    getInvoice: async (invoiceId) => {
        const response = await api.get(`/invoices/${invoiceId}`);
        return response.data;
    },

    // Create new invoice
    createInvoice: async (invoiceData) => {
        const response = await api.post('/invoices', invoiceData);
        return response.data;
    },

    // Update invoice (draft only)
    updateInvoice: async (invoiceId, invoiceData) => {
        const response = await api.put(`/invoices/${invoiceId}`, invoiceData);
        return response.data;
    },

    // Cancel invoice
    cancelInvoice: async (invoiceId) => {
        const response = await api.delete(`/invoices/${invoiceId}`);
        return response.data;
    },

    // Send invoice to distributor
    sendInvoice: async (invoiceId) => {
        const response = await api.post(`/invoices/${invoiceId}/send`);
        return response.data;
    },

    // Generate PDF invoice
    generatePDF: async (invoiceId) => {
        const response = await api.get(`/invoices/${invoiceId}/pdf`);
        return response.data;
    },

    // Duplicate invoice
    duplicateInvoice: async (invoiceId) => {
        const response = await api.post(`/invoices/${invoiceId}/duplicate`);
        return response.data;
    },

    // Get next invoice number
    getNextInvoiceNumber: async () => {
        const response = await api.get('/invoices/number/next');
        return response.data;
    },

    // Get invoice statistics
    getInvoiceStats: async () => {
        const response = await api.get('/invoices/stats/summary');
        return response.data;
    },

    // Get overdue invoices
    getOverdueInvoices: async (limit = 50) => {
        const response = await api.get(`/invoices/overdue/list?limit=${limit}`);
        return response.data;
    },

    // Search invoices
    searchInvoices: async (query) => {
        const response = await api.get(`/invoices?search=${encodeURIComponent(query)}&limit=10`);
        return response.data;
    },

    // Get invoices by distributor
    getInvoicesByDistributor: async (distributorId, params = {}) => {
        const searchParams = new URLSearchParams({
            distributor_id: distributorId,
            ...params
        });

        const response = await api.get(`/invoices?${searchParams}`);
        return response.data;
    },

    // Get invoices by date range
    getInvoicesByDateRange: async (startDate, endDate, params = {}) => {
        const searchParams = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...params
        });

        const response = await api.get(`/invoices?${searchParams}`);
        return response.data;
    },

    // Get invoices by status
    getInvoicesByStatus: async (status, params = {}) => {
        const searchParams = new URLSearchParams({
            status: status,
            ...params
        });

        const response = await api.get(`/invoices?${searchParams}`);
        return response.data;
    },

    // Bulk operations
    bulkSendInvoices: async (invoiceIds) => {
        const promises = invoiceIds.map(id => api.post(`/invoices/${id}/send`));
        const responses = await Promise.allSettled(promises);
        
        return {
            successful: responses.filter(r => r.status === 'fulfilled').length,
            failed: responses.filter(r => r.status === 'rejected').length,
            errors: responses
                .filter(r => r.status === 'rejected')
                .map(r => r.reason?.response?.data?.message || 'Unknown error')
        };
    },

    bulkCancelInvoices: async (invoiceIds) => {
        const promises = invoiceIds.map(id => api.delete(`/invoices/${id}`));
        const responses = await Promise.allSettled(promises);
        
        return {
            successful: responses.filter(r => r.status === 'fulfilled').length,
            failed: responses.filter(r => r.status === 'rejected').length,
            errors: responses
                .filter(r => r.status === 'rejected')
                .map(r => r.reason?.response?.data?.message || 'Unknown error')
        };
    },

    // Invoice templates
    createFromTemplate: async (templateData) => {
        // This could be used for creating invoices from saved templates
        const response = await api.post('/invoices', templateData);
        return response.data;
    },

    // Export functions
    exportInvoices: async (params = {}, format = 'csv') => {
        const searchParams = new URLSearchParams(params);
        const response = await api.get(`/invoices/export?${searchParams}&format=${format}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Quick actions for mobile
    getQuickActions: async () => {
        try {
            const [stats, overdue] = await Promise.all([
                invoiceService.getInvoiceStats(),
                invoiceService.getOverdueInvoices(5)
            ]);

            const quickActions = [];

            // Add action for draft invoices
            if (stats.data.draft_invoices > 0) {
                quickActions.push({
                    id: 'review_drafts',
                    title: `Review ${stats.data.draft_invoices} Draft Invoices`,
                    description: 'Complete and send pending draft invoices',
                    icon: 'FileText',
                    color: 'blue',
                    action: '/invoices?status=draft'
                });
            }

            // Add action for overdue invoices
            if (overdue.data.length > 0) {
                quickActions.push({
                    id: 'follow_overdue',
                    title: `Follow Up ${overdue.data.length} Overdue Invoices`,
                    description: 'Contact distributors for overdue payments',
                    icon: 'AlertCircle',
                    color: 'red',
                    action: '/invoices?status=overdue'
                });
            }

            // Add action for today's invoices
            if (stats.data.today_invoices > 0) {
                quickActions.push({
                    id: 'today_invoices',
                    title: `${stats.data.today_invoices} Invoices Created Today`,
                    description: `Total value: $${parseFloat(stats.data.today_amount).toLocaleString()}`,
                    icon: 'Calendar',
                    color: 'green',
                    action: '/invoices?date=' + new Date().toISOString().split('T')[0]
                });
            }

            return { data: quickActions };
        } catch (error) {
            console.error('Error getting quick actions:', error);
            return { data: [] };
        }
    },

    // Validation helpers
    validateInvoiceData: (invoiceData) => {
        const errors = [];

        if (!invoiceData.distributor_id) {
            errors.push('Distributor is required');
        }

        if (!invoiceData.items || invoiceData.items.length === 0) {
            errors.push('At least one item is required');
        }

        invoiceData.items?.forEach((item, index) => {
            if (!item.product_id) {
                errors.push(`Product is required for item ${index + 1}`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Valid quantity is required for item ${index + 1}`);
            }
            if (!item.unit_price || item.unit_price < 0) {
                errors.push(`Valid unit price is required for item ${index + 1}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Calculate invoice totals
    calculateTotals: (items, discountAmount = 0, products = []) => {
        let subtotal = 0;
        let totalTaxAmount = 0;

        items.forEach(item => {
            if (item.product_id && item.quantity && item.unit_price) {
                const product = products.find(p => p.product_id == item.product_id);
                const linePrice = parseFloat(item.unit_price) * parseFloat(item.quantity);
                const discount = (linePrice * parseFloat(item.discount_percentage || 0)) / 100;
                const lineSubtotal = linePrice - discount;
                const taxRate = product?.tax_rate || 0;
                const lineTax = (lineSubtotal * taxRate) / 100;
                
                subtotal += lineSubtotal;
                totalTaxAmount += lineTax;
            }
        });

        const finalDiscountAmount = parseFloat(discountAmount || 0);
        const total = subtotal + totalTaxAmount - finalDiscountAmount;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxAmount: Math.round(totalTaxAmount * 100) / 100,
            discountAmount: finalDiscountAmount,
            total: Math.round(total * 100) / 100
        };
    },

    // Format invoice data for API
    formatInvoiceForAPI: (formData) => {
        return {
            distributor_id: parseInt(formData.distributor_id),
            due_date: formData.due_date || null,
            discount_amount: parseFloat(formData.discount_amount || 0),
            notes: formData.notes || '',
            items: formData.items.map(item => ({
                product_id: parseInt(item.product_id),
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                discount_percentage: parseFloat(item.discount_percentage || 0)
            }))
        };
    },

    // Get default due date (30 days from now)
    getDefaultDueDate: () => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
    },

    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Get status color
    getStatusColor: (status) => {
        const colors = {
            draft: 'gray',
            sent: 'blue',
            partial_paid: 'yellow',
            paid: 'green',
            overdue: 'red',
            cancelled: 'gray'
        };
        return colors[status] || 'gray';
    },

    // Get invoice actions based on status and permissions
    getAvailableActions: (invoice, userRole) => {
        const actions = [];

        // View is always available
        actions.push({
            id: 'view',
            label: 'View',
            icon: 'Eye',
            color: 'blue'
        });

        // Edit only for draft invoices
        if (invoice.status === 'draft') {
            actions.push({
                id: 'edit',
                label: 'Edit',
                icon: 'Edit',
                color: 'green'
            });

            actions.push({
                id: 'send',
                label: 'Send',
                icon: 'Send',
                color: 'purple'
            });
        }

        // Duplicate is always available
        actions.push({
            id: 'duplicate',
            label: 'Duplicate',
            icon: 'Copy',
            color: 'indigo'
        });

        // PDF download
        actions.push({
            id: 'download',
            label: 'Download PDF',
            icon: 'Download',
            color: 'gray'
        });

        // Cancel only for draft/sent invoices with no payments
        if ((invoice.status === 'draft' || invoice.status === 'sent') && 
            parseFloat(invoice.paid_amount || 0) === 0) {
            actions.push({
                id: 'cancel',
                label: 'Cancel',
                icon: 'Trash2',
                color: 'red'
            });
        }

        // Collect payment for unpaid invoices
        if (invoice.status !== 'paid' && invoice.status !== 'cancelled' && 
            parseFloat(invoice.balance_amount || 0) > 0) {
            actions.push({
                id: 'collect_payment',
                label: 'Collect Payment',
                icon: 'DollarSign',
                color: 'green'
            });
        }

        return actions;
    }
};