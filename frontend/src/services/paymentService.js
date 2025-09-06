// services/paymentService.js
import api from './api';

export const paymentService = {
    // Get all payments with filtering and pagination
    getPayments: async (params = {}) => {
        const searchParams = new URLSearchParams();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                searchParams.append(key, params[key]);
            }
        });

        const response = await api.get(`/payments?${searchParams}`);
        return response.data;
    },

    // Get specific payment by ID
    getPayment: async (paymentId) => {
        const response = await api.get(`/payments/${paymentId}`);
        return response.data;
    },

    // Record new payment
    recordPayment: async (paymentData) => {
        const response = await api.post('/payments', paymentData);
        return response.data;
    },

    // Update payment
    updatePayment: async (paymentId, paymentData) => {
        const response = await api.put(`/payments/${paymentId}`, paymentData);
        return response.data;
    },

    // Cancel payment
    cancelPayment: async (paymentId) => {
        const response = await api.delete(`/payments/${paymentId}`);
        return response.data;
    },

    // Get pending invoices for payment collection
    getPendingInvoices: async (distributorId = null, limit = 50) => {
        const params = new URLSearchParams({ limit });
        if (distributorId) params.append('distributor_id', distributorId);
        
        const response = await api.get(`/payments/pending/invoices?${params}`);
        return response.data;
    },

    // Record multiple payments at once
    recordBulkPayments: async (payments) => {
        const response = await api.post('/payments/bulk', { payments });
        return response.data;
    },

    // Get payment statistics
    getPaymentStats: async () => {
        const response = await api.get('/payments/stats/summary');
        return response.data;
    },

    // Get payment method breakdown
    getPaymentMethodsSummary: async (period = 'month') => {
        const response = await api.get(`/payments/methods/summary?period=${period}`);
        return response.data;
    },

    // Get recent payment activity
    getRecentPayments: async (limit = 10) => {
        const response = await api.get(`/payments/recent?limit=${limit}`);
        return response.data;
    },

    // Upload check image
    uploadCheckImage: async (imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const response = await api.post('/payments/upload-check-image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    // Export payments to CSV
    exportPayments: async (params = {}) => {
        const searchParams = new URLSearchParams(params);
        const response = await api.get(`/payments/export?${searchParams}`, {
            responseType: 'blob'
        });
        return response.data;
    },

    // Get payments for specific invoice
    getInvoicePayments: async (invoiceId) => {
        const response = await api.get(`/payments/invoice/${invoiceId}`);
        return response.data;
    },

    // Validate payment amount for invoice
    validatePaymentAmount: async (invoiceId, amount) => {
        const response = await api.post('/payments/validate-amount', {
            invoice_id: invoiceId,
            amount: amount
        });
        return response.data;
    },

    // Search payments
    searchPayments: async (query, limit = 10) => {
        const response = await api.get(`/payments?search=${encodeURIComponent(query)}&limit=${limit}`);
        return response.data;
    },

    // Get payments by date range
    getPaymentsByDateRange: async (startDate, endDate, params = {}) => {
        const searchParams = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...params
        });

        const response = await api.get(`/payments?${searchParams}`);
        return response.data;
    },

    // Get payments by method
    getPaymentsByMethod: async (method, params = {}) => {
        const searchParams = new URLSearchParams({
            payment_method: method,
            ...params
        });

        const response = await api.get(`/payments?${searchParams}`);
        return response.data;
    },

    // Quick actions for mobile
    getQuickActions: async () => {
        try {
            const [stats, pending] = await Promise.all([
                paymentService.getPaymentStats(),
                paymentService.getPendingInvoices(null, 5)
            ]);

            const quickActions = [];

            // Add action for pending collections
            if (pending.data.length > 0) {
                const totalPending = pending.data.reduce((sum, invoice) => 
                    sum + parseFloat(invoice.balance_amount), 0);

                quickActions.push({
                    id: 'collect_pending',
                    title: `Collect ${pending.data.length} Pending Payments`,
                    description: `Total: $${totalPending.toLocaleString()}`,
                    icon: 'DollarSign',
                    color: 'green',
                    action: '/payments?tab=collect',
                    count: pending.data.length
                });
            }

            // Add action for overdue invoices
            const overdueInvoices = pending.data.filter(invoice => invoice.days_overdue > 0);
            if (overdueInvoices.length > 0) {
                quickActions.push({
                    id: 'follow_overdue',
                    title: `Follow Up ${overdueInvoices.length} Overdue Invoices`,
                    description: 'Priority collection required',
                    icon: 'AlertCircle',
                    color: 'red',
                    action: '/payments?tab=overdue',
                    count: overdueInvoices.length
                });
            }

            // Add action for today's collections
            if (stats.data.today_payment_count > 0) {
                quickActions.push({
                    id: 'today_collections',
                    title: `${stats.data.today_payment_count} Payments Collected Today`,
                    description: `Total: $${parseFloat(stats.data.today_collections).toLocaleString()}`,
                    icon: 'CheckCircle',
                    color: 'blue',
                    action: '/payments?date=' + new Date().toISOString().split('T')[0],
                    count: stats.data.today_payment_count
                });
            }

            return { data: quickActions };
        } catch (error) {
            console.error('Error getting quick actions:', error);
            return { data: [] };
        }
    },

    // Validation helpers
    validatePaymentData: (paymentData) => {
        const errors = [];

        if (!paymentData.invoice_id) {
            errors.push('Invoice is required');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.payment_method) {
            errors.push('Payment method is required');
        }

        if (paymentData.payment_method === 'check' && !paymentData.check_number) {
            errors.push('Check number is required for check payments');
        }

        if (paymentData.payment_method === 'bank_transfer' && !paymentData.bank_reference) {
            errors.push('Bank reference is required for bank transfers');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // Format payment data for API
    formatPaymentForAPI: (formData) => {
        return {
            invoice_id: parseInt(formData.invoice_id),
            amount: parseFloat(formData.amount),
            payment_method: formData.payment_method,
            payment_date: formData.payment_date || null,
            check_number: formData.check_number || null,
            check_image_url: formData.check_image_url || null,
            bank_reference: formData.bank_reference || null,
            notes: formData.notes || ''
        };
    },

    // Get default payment date (today)
    getDefaultPaymentDate: () => {
        return new Date().toISOString().split('T')[0];
    },

    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Get payment method icon
    getPaymentMethodIcon: (method) => {
        const icons = {
            cash: 'Banknote',
            check: 'FileText',
            bank_transfer: 'CreditCard',
            online: 'Smartphone'
        };
        return icons[method] || 'DollarSign';
    },

    // Get payment method color
    getPaymentMethodColor: (method) => {
        const colors = {
            cash: 'green',
            check: 'blue',
            bank_transfer: 'purple',
            online: 'indigo'
        };
        return colors[method] || 'gray';
    },

    // Calculate payment suggestions
    calculatePaymentSuggestions: (invoiceBalance) => {
        const balance = parseFloat(invoiceBalance);
        const suggestions = [];

        // Full payment
        suggestions.push({
            label: 'Full Payment',
            amount: balance,
            description: 'Pay complete balance'
        });

        // Half payment
        if (balance > 100) {
            suggestions.push({
                label: '50% Payment',
                amount: Math.round(balance * 0.5),
                description: 'Pay half of balance'
            });
        }

        // Round amounts
        if (balance > 50) {
            const roundedAmounts = [
                Math.floor(balance / 100) * 100,
                Math.floor(balance / 50) * 50,
                Math.floor(balance / 25) * 25
            ].filter(amount => amount > 0 && amount < balance);

            roundedAmounts.forEach(amount => {
                suggestions.push({
                    label: `$${amount}`,
                    amount: amount,
                    description: 'Round amount'
                });
            });
        }

        return suggestions.slice(0, 4); // Return max 4 suggestions
    },

    // Get payment actions based on status and permissions
    getAvailableActions: (payment, userRole) => {
        const actions = [];

        // View is always available
        actions.push({
            id: 'view',
            label: 'View Details',
            icon: 'Eye',
            color: 'blue'
        });

        // Edit payment (within 24 hours for sales staff, always for admin)
        const isRecent = new Date() - new Date(payment.created_at) < 24 * 60 * 60 * 1000;
        if (userRole === 'admin' || (userRole === 'sales_staff' && isRecent)) {
            actions.push({
                id: 'edit',
                label: 'Edit',
                icon: 'Edit',
                color: 'green'
            });
        }

        // View check image if available
        if (payment.check_image_url) {
            actions.push({
                id: 'view_check',
                label: 'View Check',
                icon: 'Image',
                color: 'purple'
            });
        }

        // Print receipt
        actions.push({
            id: 'print_receipt',
            label: 'Print Receipt',
            icon: 'Printer',
            color: 'gray'
        });

        // Cancel payment (only if recent and by collector or admin)
        if (isRecent && (userRole === 'admin' || payment.collected_by === userRole.user_id)) {
            actions.push({
                id: 'cancel',
                label: 'Cancel Payment',
                icon: 'Trash2',
                color: 'red'
            });
        }

        return actions;
    },

    // Mobile-specific helpers
    mobile: {
        // Get simplified payment methods for mobile
        getPaymentMethods: () => [
            { value: 'cash', label: 'Cash', icon: 'Banknote', description: 'Cash payment' },
            { value: 'check', label: 'Check', icon: 'FileText', description: 'Check payment' },
            { value: 'bank_transfer', label: 'Bank Transfer', icon: 'CreditCard', description: 'Bank transfer' },
            { value: 'online', label: 'Online', icon: 'Smartphone', description: 'Online payment' }
        ],

        // Quick payment recording for mobile
        quickRecordPayment: async (invoiceId, amount, method = 'cash', notes = '') => {
            const paymentData = {
                invoice_id: invoiceId,
                amount: amount,
                payment_method: method,
                payment_date: paymentService.getDefaultPaymentDate(),
                notes: notes
            };

            return await paymentService.recordPayment(paymentData);
        },

        // Get optimized pending invoices for mobile
        getMobilePendingInvoices: async (limit = 20) => {
            const response = await paymentService.getPendingInvoices(null, limit);
            
            // Sort by priority: overdue first, then by due date
            const sortedInvoices = response.data.sort((a, b) => {
                if (a.days_overdue > 0 && b.days_overdue === 0) return -1;
                if (a.days_overdue === 0 && b.days_overdue > 0) return 1;
                if (a.days_overdue > 0 && b.days_overdue > 0) {
                    return b.days_overdue - a.days_overdue; // Most overdue first
                }
                return new Date(a.due_date) - new Date(b.due_date); // Earliest due date first
            });

            return { ...response, data: sortedInvoices };
        },

        // Camera integration helpers
        handleCameraCapture: async (imageFile, paymentId = null) => {
            try {
                const uploadResult = await paymentService.uploadCheckImage(imageFile);
                
                if (paymentId) {
                    // Update existing payment with check image
                    await paymentService.updatePayment(paymentId, {
                        check_image_url: uploadResult.data.image_url
                    });
                }

                return uploadResult;
            } catch (error) {
                throw new Error('Failed to upload check image');
            }
        }
    },

    // Analytics helpers
    analytics: {
        // Get collection efficiency metrics
        getCollectionEfficiency: async (period = 'month') => {
            try {
                const [payments, invoices] = await Promise.all([
                    paymentService.getPaymentStats(),
                    api.get('/invoices/stats/summary')
                ]);

                const collectionRate = (payments.data.total_amount_collected / invoices.data.data.total_amount) * 100;
                const avgDaysToCollect = 15; // TODO: Calculate actual average

                return {
                    collection_rate: collectionRate,
                    avg_days_to_collect: avgDaysToCollect,
                    total_collected: payments.data.total_amount_collected,
                    outstanding_amount: invoices.data.data.total_outstanding
                };
            } catch (error) {
                console.error('Error calculating collection efficiency:', error);
                return null;
            }
        },

        // Get payment trends
        getPaymentTrends: async (days = 30) => {
            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);

                const response = await paymentService.getPaymentsByDateRange(
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );

                // Group by date
                const dailyTotals = {};
                response.data.payments.forEach(payment => {
                    const date = new Date(payment.payment_date).toISOString().split('T')[0];
                    dailyTotals[date] = (dailyTotals[date] || 0) + parseFloat(payment.amount);
                });

                return Object.entries(dailyTotals).map(([date, amount]) => ({
                    date,
                    amount
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
            } catch (error) {
                console.error('Error getting payment trends:', error);
                return [];
            }
        }
    }
};