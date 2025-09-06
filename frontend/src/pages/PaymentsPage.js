import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Eye, Edit, Trash2, Download, 
    DollarSign, CreditCard, Banknote, FileText, Smartphone,
    Calendar, CheckCircle, Clock, AlertCircle, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { paymentService } from '../services/paymentService';
import MobilePaymentCollection from '../components/sales/PaymentCollection';

const PaymentsPage = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('payments'); // payments, collect, analytics

    // Fetch payments
    const fetchPayments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                search: searchTerm,
                payment_method: methodFilter,
                start_date: dateFilter
            });

            const response = await paymentService.getPayments(Object.fromEntries(params));
            setPayments(response.data.payments);
            setTotalPages(response.data.pagination.pages);
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch payment statistics
    const fetchStats = async () => {
        try {
            const response = await paymentService.getPaymentStats();
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchPayments();
        fetchStats();
    }, [currentPage, searchTerm, methodFilter, dateFilter]);

    // Payment method icon component
    const PaymentMethodIcon = ({ method }) => {
        const icons = {
            cash: Banknote,
            check: FileText,
            bank_transfer: CreditCard,
            online: Smartphone
        };
        const Icon = icons[method] || DollarSign;
        return <Icon className="w-4 h-4" />;
    };

    // Payment method badge component
    const PaymentMethodBadge = ({ method }) => {
        const config = {
            cash: { color: 'bg-green-100 text-green-800', label: 'Cash' },
            check: { color: 'bg-blue-100 text-blue-800', label: 'Check' },
            bank_transfer: { color: 'bg-purple-100 text-purple-800', label: 'Bank Transfer' },
            online: { color: 'bg-indigo-100 text-indigo-800', label: 'Online' }
        };

        const methodConfig = config[method] || config.cash;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${methodConfig.color}`}>
                <PaymentMethodIcon method={method} />
                <span className="ml-1">{methodConfig.label}</span>
            </span>
        );
    };

    // Handle payment actions
    const handleCancelPayment = async (paymentId) => {
        if (window.confirm('Are you sure you want to cancel this payment?')) {
            try {
                await paymentService.cancelPayment(paymentId);
                fetchPayments();
                fetchStats();
                alert('Payment cancelled successfully!');
            } catch (error) {
                alert('Error cancelling payment');
            }
        }
    };

    const handleExportPayments = async () => {
        try {
            const blob = await paymentService.exportPayments({
                search: searchTerm,
                payment_method: methodFilter,
                start_date: dateFilter
            });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error exporting payments');
        }
    };

    // Mobile interface for sales staff
    if (user?.role === 'sales_staff') {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Payment Collection</h1>
                        <p className="text-gray-600">Collect payments from customers</p>
                    </div>
                    <button
                        onClick={() => setShowCollectModal(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Collect Payment
                    </button>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Today's Collections</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        ${parseFloat(stats.today_collections || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <CheckCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Payments</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.total_payments}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">This Month</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        ${parseFloat(stats.month_collections || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Payments */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Recent Collections</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payments.map((payment) => (
                                    <tr key={payment.payment_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(payment.payment_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{payment.invoice_number}</div>
                                                <div className="text-sm text-gray-500">{payment.distributor_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${parseFloat(payment.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <PaymentMethodBadge method={payment.payment_method} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Collect Payment Modal */}
                {showCollectModal && (
                    <MobilePaymentCollection
                        onClose={() => setShowCollectModal(false)}
                        onSuccess={(message) => {
                            setShowCollectModal(false);
                            fetchPayments();
                            fetchStats();
                            alert(message);
                        }}
                    />
                )}
            </div>
        );
    }

    // Admin interface
    if (loading && payments.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-gray-600">Track and manage all payment collections</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleExportPayments}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setShowCollectModal(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Collected</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(stats.total_amount_collected).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_payments}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">This Month</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(stats.month_collections).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Average Payment</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(stats.average_payment_amount).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search payments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="online">Online</option>
                    </select>

                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setMethodFilter('');
                            setDateFilter('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Invoice
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Distributor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Method
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Collected By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.map((payment) => (
                                <tr key={payment.payment_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                Payment #{payment.payment_id}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(payment.payment_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.invoice_number}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Total: ${parseFloat(payment.total_amount).toLocaleString()}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.distributor_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.city}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            ${parseFloat(payment.amount).toLocaleString()}
                                        </div>
                                        {payment.remaining_balance > 0 && (
                                            <div className="text-xs text-red-600">
                                                Balance: ${parseFloat(payment.remaining_balance).toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <PaymentMethodBadge method={payment.payment_method} />
                                        {payment.check_number && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Check: {payment.check_number}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {payment.collected_by_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            
                                            {payment.check_image_url && (
                                                <button
                                                    onClick={() => window.open(payment.check_image_url, '_blank')}
                                                    className="text-purple-600 hover:text-purple-900"
                                                    title="View Check Image"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Only allow deletion within 24 hours */}
                                            {new Date() - new Date(payment.created_at) < 24 * 60 * 60 * 1000 && (
                                                <button
                                                    onClick={() => handleCancelPayment(payment.payment_id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Cancel Payment"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Page <span className="font-medium">{currentPage}</span> of{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const page = i + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                    currentPage === page
                                                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Detail Modal */}
            {selectedPayment && (
                <PaymentDetailModal
                    payment={selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                />
            )}

            {/* Record Payment Modal */}
            {showCollectModal && (
                <MobilePaymentCollection
                    onClose={() => setShowCollectModal(false)}
                    onSuccess={(message) => {
                        setShowCollectModal(false);
                        fetchPayments();
                        fetchStats();
                        alert(message);
                    }}
                />
            )}
        </div>
    );
};

// Payment Detail Modal Component
const PaymentDetailModal = ({ payment, onClose }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Payment Details #{payment.payment_id}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Payment Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Amount:</span>
                                        <span className="font-medium">${parseFloat(payment.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Method:</span>
                                        <PaymentMethodBadge method={payment.payment_method} />
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date:</span>
                                        <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Collected By:</span>
                                        <span className="font-medium">{payment.collected_by_name}</span>
                                    </div>
                                    {payment.check_number && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Check Number:</span>
                                            <span className="font-medium">{payment.check_number}</span>
                                        </div>
                                    )}
                                    {payment.bank_reference && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Bank Reference:</span>
                                            <span className="font-medium">{payment.bank_reference}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-3">Invoice Information</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Invoice:</span>
                                        <span className="font-medium">{payment.invoice_number}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Distributor:</span>
                                        <span className="font-medium">{payment.distributor_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Invoice Total:</span>
                                        <span className="font-medium">${parseFloat(payment.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Paid:</span>
                                        <span className="font-medium text-green-600">${parseFloat(payment.paid_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Remaining Balance:</span>
                                        <span className="font-medium text-red-600">${parseFloat(payment.remaining_balance).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Check Image */}
                        {payment.check_image_url && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Check Image</h3>
                                <div className="border rounded-lg overflow-hidden">
                                    <img 
                                        src={payment.check_image_url} 
                                        alt="Check" 
                                        className="w-full h-auto max-h-96 object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {payment.notes && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded">{payment.notes}</p>
                            </div>
                        )}

                        {/* Timestamps */}
                        <div className="border-t pt-4">
                            <div className="text-sm text-gray-500">
                                <p>Created: {new Date(payment.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;