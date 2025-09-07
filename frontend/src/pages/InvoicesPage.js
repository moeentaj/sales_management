import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Eye, Edit, Trash2, Send, Copy, 
    Download, Calendar, DollarSign, Clock, AlertCircle,
    CheckCircle, FileText, Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const InvoicesPage = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [distributorFilter, setDistributorFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [stats, setStats] = useState(null);

    // Fetch invoices
    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                search: searchTerm,
                status: statusFilter,
                distributor_id: distributorFilter,
                start_date: dateFilter
            });

            const response = await api.get(`/invoices?${params}`);
            setInvoices(response.data.data.invoices);
            setTotalPages(response.data.data.pagination.pages);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch invoice statistics
    const fetchStats = async () => {
        try {
            const response = await api.get('/invoices/stats/summary');
            setStats(response.data.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchStats();
    }, [currentPage, searchTerm, statusFilter, distributorFilter, dateFilter]);

    // Status badge component
    const StatusBadge = ({ status }) => {
        const statusConfig = {
            draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
            sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
            partial_paid: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
            paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
            cancelled: { color: 'bg-gray-100 text-gray-500', icon: Trash2 }
        };

        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    // Handle invoice actions
    const handleSendInvoice = async (invoiceId) => {
        try {
            await api.post(`/invoices/${invoiceId}/send`);
            fetchInvoices();
            alert('Invoice sent successfully!');
        } catch (error) {
            alert('Error sending invoice');
        }
    };

    const handleDuplicateInvoice = async (invoiceId) => {
        try {
            await api.post(`/invoices/${invoiceId}/duplicate`);
            fetchInvoices();
            alert('Invoice duplicated successfully!');
        } catch (error) {
            alert('Error duplicating invoice');
        }
    };

    const handleDeleteInvoice = async (invoiceId) => {
        if (window.confirm('Are you sure you want to cancel this invoice?')) {
            try {
                await api.delete(`/invoices/${invoiceId}`);
                fetchInvoices();
                alert('Invoice cancelled successfully!');
            } catch (error) {
                alert('Error cancelling invoice');
            }
        }
    };

    if (loading && invoices.length === 0) {
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
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-600">Manage and track your invoices</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Invoice
                </button>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.total_invoices}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(stats.total_amount).toLocaleString()}
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
                                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${parseFloat(stats.total_outstanding).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Overdue</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.overdue_invoices}</p>
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
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="partial_paid">Partial Paid</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
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
                            setStatusFilter('');
                            setDistributorFilter('');
                            setDateFilter('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Invoice
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Distributor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.map((invoice) => (
                                <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </div>
                                            {invoice.days_overdue > 0 && (
                                                <div className="text-xs text-red-600">
                                                    {invoice.days_overdue} days overdue
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.distributor_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {invoice.city}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {new Date(invoice.invoice_date).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                ${parseFloat(invoice.total_amount).toLocaleString()}
                                            </div>
                                            {invoice.paid_amount > 0 && (
                                                <div className="text-xs text-green-600">
                                                    Paid: ${parseFloat(invoice.paid_amount).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={invoice.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setSelectedInvoice(invoice)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="View"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            
                                            {invoice.status === 'draft' && (
                                                <>
                                                    <button
                                                        onClick={() => {/* Open edit modal */}}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendInvoice(invoice.invoice_id)}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Send"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                onClick={() => handleDuplicateInvoice(invoice.invoice_id)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => {/* Generate PDF */}}
                                                className="text-gray-600 hover:text-gray-900"
                                                title="Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>

                                            {(invoice.status === 'draft' || invoice.status === 'sent') && invoice.paid_amount === 0 && (
                                                <button
                                                    onClick={() => handleDeleteInvoice(invoice.invoice_id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Cancel"
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

            {/* Invoice Detail Modal */}
            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <CreateInvoiceModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchInvoices();
                    }}
                />
            )}
        </div>
    );
};

// Invoice Detail Modal Component
const InvoiceDetailModal = ({ invoice, onClose }) => {
    const [fullInvoice, setFullInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoiceDetails = async () => {
            try {
                const response = await api.get(`/invoices/${invoice.invoice_id}`);
                setFullInvoice(response.data.data);
            } catch (error) {
                console.error('Error fetching invoice details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoiceDetails();
    }, [invoice.invoice_id]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Invoice {fullInvoice?.invoice_number}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ×
                        </button>
                    </div>

                    {fullInvoice && (
                        <div className="space-y-6">
                            {/* Invoice Header */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Distributor Details</h3>
                                    <div className="space-y-1">
                                        <p className="font-medium">{fullInvoice.distributor_name}</p>
                                        <p className="text-gray-600">{fullInvoice.address}</p>
                                        <p className="text-gray-600">{fullInvoice.city}, {fullInvoice.state}</p>
                                        <p className="text-gray-600">Contact: {fullInvoice.primary_contact_person}</p>
                                        <p className="text-gray-600">WhatsApp: {fullInvoice.primary_whatsapp_number}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Invoice Information</h3>
                                    <div className="space-y-1">
                                        <p><span className="font-medium">Date:</span> {new Date(fullInvoice.invoice_date).toLocaleDateString()}</p>
                                        <p><span className="font-medium">Due Date:</span> {new Date(fullInvoice.due_date).toLocaleDateString()}</p>
                                        <p><span className="font-medium">Sales Staff:</span> {fullInvoice.sales_staff_name}</p>
                                        <p><span className="font-medium">Status:</span> <StatusBadge status={fullInvoice.status} /></p>
                                        {fullInvoice.days_overdue > 0 && (
                                            <p className="text-red-600">
                                                <span className="font-medium">Overdue:</span> {fullInvoice.days_overdue} days
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Items */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Items</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {fullInvoice.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2">
                                                        <div>
                                                            <p className="font-medium">{item.product_name}</p>
                                                            <p className="text-sm text-gray-500">{item.product_code}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2">{item.quantity} {item.unit_of_measure}</td>
                                                    <td className="px-4 py-2">${parseFloat(item.unit_price).toFixed(2)}</td>
                                                    <td className="px-4 py-2">{item.discount_percentage}%</td>
                                                    <td className="px-4 py-2">{item.tax_rate}%</td>
                                                    <td className="px-4 py-2 font-medium">${parseFloat(item.line_total).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Invoice Totals */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-end">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Subtotal:</span>
                                            <span>${parseFloat(fullInvoice.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Tax:</span>
                                            <span>${parseFloat(fullInvoice.tax_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Discount:</span>
                                            <span>-${parseFloat(fullInvoice.discount_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                                            <span>Total:</span>
                                            <span>${parseFloat(fullInvoice.total_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-green-600">
                                            <span>Paid:</span>
                                            <span>${parseFloat(fullInvoice.paid_amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-red-600 font-medium">
                                            <span>Balance:</span>
                                            <span>${parseFloat(fullInvoice.balance_amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History */}
                            {fullInvoice.payments && fullInvoice.payments.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Payment History</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Collected By</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {fullInvoice.payments.map((payment, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-2 font-medium">${parseFloat(payment.amount).toFixed(2)}</td>
                                                        <td className="px-4 py-2 capitalize">{payment.payment_method.replace('_', ' ')}</td>
                                                        <td className="px-4 py-2">{payment.collected_by_name}</td>
                                                        <td className="px-4 py-2">{payment.notes}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {fullInvoice.notes && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Notes</h3>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded">{fullInvoice.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Create Invoice Modal Component
const CreateInvoiceModal = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        distributor_id: '',
        due_date: '',
        discount_amount: 0,
        notes: '',
        items: [{ product_id: '', quantity: 1, unit_price: '', discount_percentage: 0 }]
    });
    const [distributors, setDistributors] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchProduct, setSearchProduct] = useState('');

    // Fetch distributors and products
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [distributorsRes, productsRes] = await Promise.all([
                    api.get('/distributors?limit=100'),
                    api.get('/products?limit=100')
                ]);
                // setDistributors(distributorsRes.data.data.distributors);
                // setProducts(productsRes.data.data.products);
                setDistributors(distributorsRes?.data?.data?.distributors ?? []);
                setProducts(productsRes?.data?.data?.products ?? []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Add item
    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { product_id: '', quantity: 1, unit_price: '', discount_percentage: 0 }]
        }));
    };

    // Remove item
    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    // Update item
    const updateItem = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => 
                i === index ? { ...item, [field]: value } : item
            )
        }));

        // Auto-fill price when product is selected
        if (field === 'product_id' && value) {
            const product = products.find(p => p.product_id == value);
            if (product) {
                updateItem(index, 'unit_price', product.unit_price);
            }
        }
    };

    // Calculate totals
    const calculateTotals = () => {
        const safeProducts = Array.isArray(products) ? products : [];
        let subtotal = 0;
        let totalTax = 0;

        // formData.items.forEach(item => {
        (formData.items ?? []).forEach(item => {
            if (item.product_id && item.quantity && item.unit_price) {
                //const product = products.find(p => p.product_id == item.product_id);
                const product = safeProducts.find(p => p.product_id == item.product_id);
                const linePrice = parseFloat(item.unit_price) * parseFloat(item.quantity);
                const discount = (linePrice * parseFloat(item.discount_percentage || 0)) / 100;
                const lineSubtotal = linePrice - discount;
                const taxRate = product?.tax_rate || 0;
                const lineTax = (lineSubtotal * taxRate) / 100;
                
                subtotal += lineSubtotal;
                totalTax += lineTax;
            }
        });

        const discountAmount = parseFloat(formData.discount_amount || 0);
        const total = subtotal + totalTax - discountAmount;

        return { subtotal, totalTax, total };
    };

    const { subtotal, totalTax, total } = calculateTotals();

    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/invoices', formData);
            onSuccess();
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Error creating invoice');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Create New Invoice</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Distributor *
                                </label>
                                <select
                                    value={formData.distributor_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, distributor_id: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Distributor</option>
                                    {/* {distributors.map(distributor => ( */}
                                    {(distributors ?? []).map(distributor => (
                                        <option key={distributor.distributor_id} value={distributor.distributor_id}>
                                            {distributor.distributor_name} - {distributor.city}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Items */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Items</h3>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                >
                                    Add Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* {formData.items.map((item, index) => ( */}
                                {(formData.items ?? []).map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border rounded">
                                        <div className="md:col-span-2">
                                            <select
                                                value={item.product_id}
                                                onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                                required
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="">Select Product</option>
                                                {/* {products.map(product => ( */}
                                                {(products ?? []).map(product => (
                                                    <option key={product.product_id} value={product.product_id}>
                                                        {product.product_name} - ${product.unit_price}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                required
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Price"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                required
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Discount %"
                                                value={item.discount_percentage}
                                                onChange={(e) => updateItem(index, 'discount_percentage', e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center">
                                            {formData.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="bg-gray-50 p-4 rounded">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>${totalTax.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <span>Discount:</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.discount_amount}
                                                onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: e.target.value }))}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                                        <span>Total:</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Additional notes or terms..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Invoice'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InvoicesPage;