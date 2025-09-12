// components/admin/DistributorDetails.js - SAFE VERSION
import React, { useState, useEffect } from 'react';
import {
    X, Edit, Phone, Mail, MapPin, Building2, Hash, Users,
    TrendingUp, DollarSign, FileText, Calendar, User,
    CheckCircle, XCircle, AlertTriangle, Clock, Download,
    Eye, MessageCircle, Plus, Loader, RefreshCw
} from 'lucide-react';
import { distributorService } from '../../services/distributorService';

const DistributorDetails = ({ distributor, onClose, onEdit }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [distributorData, setDistributorData] = useState(distributor);
    const [invoices, setInvoices] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [assignedStaff, setAssignedStaff] = useState([]);
    const [stats, setStats] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadDistributorDetails();
    }, [distributor.distributor_id]);

    const loadDistributorDetails = async () => {
        try {
            setLoading(true);
            setErrors({});
            
            // Load basic distributor info (this endpoint should work)
            try {
                const detailsRes = await distributorService.getDistributor(distributor.distributor_id);
                console.log('Distributor details response:', detailsRes);
                
                if (detailsRes && detailsRes.success && detailsRes.data) {
                    setDistributorData(detailsRes.data);
                } else {
                    console.warn('Unexpected distributor details response format:', detailsRes);
                    setDistributorData(distributor); // fallback to original data
                }
            } catch (error) {
                console.error('Error loading distributor details:', error);
                setErrors(prev => ({ ...prev, details: 'Failed to load distributor details' }));
                setDistributorData(distributor); // fallback to original data
            }

            // Try to load invoices - handle all response formats safely
            try {
                const invoicesRes = await distributorService.getDistributorInvoices(distributor.distributor_id, { limit: 10 });
                console.log('Invoices response:', invoicesRes);
                
                if (invoicesRes && invoicesRes.success) {
                    // Handle different response structures safely
                    let invoiceList = [];
                    
                    if (invoicesRes.data) {
                        if (Array.isArray(invoicesRes.data)) {
                            // Direct array
                            invoiceList = invoicesRes.data;
                        } else if (invoicesRes.data.invoices && Array.isArray(invoicesRes.data.invoices)) {
                            // Nested in data.invoices
                            invoiceList = invoicesRes.data.invoices;
                        } else if (typeof invoicesRes.data === 'object') {
                            // Single object, wrap in array
                            invoiceList = [invoicesRes.data];
                        }
                    }
                    
                    setInvoices(invoiceList);
                } else {
                    console.warn('Unexpected invoices response format:', invoicesRes);
                    setInvoices([]);
                }
            } catch (error) {
                console.error('Error loading distributor invoices:', error);
                setErrors(prev => ({ ...prev, invoices: 'Invoice data not available' }));
                setInvoices([]);
            }

            // Try to load contacts - handle all response formats safely
            try {
                const contactsRes = await distributorService.getDistributorContacts(distributor.distributor_id);
                console.log('Contacts response:', contactsRes);
                
                if (contactsRes && contactsRes.success) {
                    // Handle different response structures safely
                    let contactList = [];
                    
                    if (contactsRes.data) {
                        if (Array.isArray(contactsRes.data)) {
                            contactList = contactsRes.data;
                        } else if (typeof contactsRes.data === 'object') {
                            // Single object, wrap in array
                            contactList = [contactsRes.data];
                        }
                    }
                    
                    setContacts(contactList);
                } else {
                    console.warn('Unexpected contacts response format:', contactsRes);
                    setContacts([]);
                }
            } catch (error) {
                console.error('Error loading distributor contacts:', error);
                setErrors(prev => ({ ...prev, contacts: 'Contacts feature not yet implemented' }));
                setContacts([]);
            }

            // Try to load assigned staff - handle all response formats safely
            try {
                const staffRes = await distributorService.getDistributorStaff(distributor.distributor_id);
                console.log('Staff response:', staffRes);
                
                if (staffRes && staffRes.success) {
                    // Handle different response structures safely
                    let staffList = [];
                    
                    if (staffRes.data) {
                        if (Array.isArray(staffRes.data)) {
                            staffList = staffRes.data;
                        } else if (typeof staffRes.data === 'object') {
                            // Single object, wrap in array
                            staffList = [staffRes.data];
                        }
                    }
                    
                    setAssignedStaff(staffList);
                } else {
                    console.warn('Unexpected staff response format:', staffRes);
                    setAssignedStaff([]);
                }
            } catch (error) {
                console.error('Error loading distributor staff:', error);
                setErrors(prev => ({ ...prev, staff: 'Staff assignment feature not yet implemented' }));
                setAssignedStaff([]);
            }

            // Try to load stats - handle all response formats safely
            try {
                const statsRes = await distributorService.getDistributorStats(distributor.distributor_id);
                console.log('Stats response:', statsRes);
                
                if (statsRes && statsRes.success && statsRes.data) {
                    // Safely extract stats with fallbacks
                    const statsData = statsRes.data;
                    const safeStats = {
                        totalInvoices: statsData.invoices?.total || 0,
                        totalAmount: statsData.invoices?.total_amount || 0,
                        paidAmount: statsData.invoices?.paid_amount || 0,
                        balanceAmount: statsData.invoices?.balance_amount || 0,
                        period: statsData.period || 'month',
                        recentInvoices: statsData.recent_activity?.invoices || [],
                        recentPayments: statsData.recent_activity?.payments || []
                    };
                    
                    setStats(safeStats);
                } else {
                    console.warn('Unexpected stats response format:', statsRes);
                    setStats({});
                }
            } catch (error) {
                console.error('Error loading distributor stats:', error);
                setErrors(prev => ({ ...prev, stats: 'Statistics feature not yet implemented' }));
                setStats({});
            }

        } catch (error) {
            console.error('Error loading distributor details:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '$0';
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount);
        } catch (error) {
            return '$0';
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
            sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
            paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
            partial_paid: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
            overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' },
            cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' }
        };
        
        const config = statusConfig[status] || statusConfig.draft;
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    // Overview Tab Component
    const OverviewTab = () => (
        <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Distributor Name</label>
                        <p className="text-gray-900 font-medium">{distributorData.distributor_name || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-500">NTN Number</label>
                        <p className="text-gray-900">{distributorData.ntn_number || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-500">Primary Contact</label>
                        <p className="text-gray-900">{distributorData.primary_contact_person || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-500">WhatsApp Number</label>
                        <p className="text-gray-900">{distributorData.primary_whatsapp_number || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-500">Status</label>
                        <div className="mt-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                distributorData.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {distributorData.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-sm font-medium text-gray-500">Created Date</label>
                        <p className="text-gray-900">{formatDate(distributorData.created_at)}</p>
                    </div>
                </div>
            </div>

            {/* Address Information */}
            {(distributorData.address || distributorData.city || distributorData.state) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2" />
                        Address Information
                    </h3>
                    
                    <div className="space-y-3">
                        {distributorData.address && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Address</label>
                                <p className="text-gray-900">{distributorData.address}</p>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {distributorData.city && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">City</label>
                                    <p className="text-gray-900">{distributorData.city}</p>
                                </div>
                            )}
                            
                            {distributorData.state && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">State</label>
                                    <p className="text-gray-900">{distributorData.state}</p>
                                </div>
                            )}
                            
                            {distributorData.postal_code && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Postal Code</label>
                                    <p className="text-gray-900">{distributorData.postal_code}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Statistics
                </h3>
                
                {errors.stats ? (
                    <div className="text-center py-8">
                        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{errors.stats}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {stats.totalInvoices || 0}
                            </div>
                            <div className="text-sm text-gray-600">Total Invoices</div>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(stats.totalAmount || 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total Amount</div>
                        </div>
                        
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                                {formatCurrency(stats.paidAmount || 0)}
                            </div>
                            <div className="text-sm text-gray-600">Paid Amount</div>
                        </div>
                        
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(stats.balanceAmount || 0)}
                            </div>
                            <div className="text-sm text-gray-600">Balance</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Invoices Tab Component
    const InvoicesTab = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All
                </button>
            </div>
            
            {errors.invoices ? (
                <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{errors.invoices}</p>
                    <p className="text-xs text-gray-400 mt-1">Check server logs for invoice endpoint errors</p>
                </div>
            ) : !Array.isArray(invoices) || invoices.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No invoices found</p>
                </div>
            ) : (
                <div className="overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoices.map((invoice, index) => (
                                <tr key={invoice.invoice_id || index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {invoice.invoice_number || `INV-${invoice.invoice_id || index}`}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {formatDate(invoice.invoice_date)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {formatCurrency(invoice.total_amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button className="text-blue-600 hover:text-blue-700 text-sm">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // Contacts Tab Component
    const ContactsTab = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Add Contact
                </button>
            </div>
            
            {errors.contacts ? (
                <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{errors.contacts}</p>
                </div>
            ) : !Array.isArray(contacts) || contacts.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No additional contacts found</p>
                    <p className="text-xs text-gray-400 mt-1">Primary contact info is shown in the overview</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {contacts.map((contact, index) => (
                        <div key={contact.contact_id || index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-gray-900">{contact.contact_person_name || 'Unnamed Contact'}</h4>
                                    <p className="text-sm text-gray-600">{contact.designation || 'N/A'}</p>
                                    <div className="mt-2 space-y-1">
                                        {contact.phone_number && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Phone className="w-4 h-4 mr-2" />
                                                {contact.phone_number}
                                            </div>
                                        )}
                                        {contact.email && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="w-4 h-4 mr-2" />
                                                {contact.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // Staff Tab Component
    const StaffTab = () => (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Assign Staff
                </button>
            </div>
            
            {errors.staff ? (
                <div className="text-center py-8">
                    <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">{errors.staff}</p>
                </div>
            ) : !Array.isArray(assignedStaff) || assignedStaff.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No staff assigned</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedStaff.map((staff, index) => (
                        <div key={staff.user_id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium">
                                        {(staff.full_name && staff.full_name.charAt(0)) || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {staff.full_name || 'Unknown Staff'}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {staff.email || 'No email'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Assigned: {formatDate(staff.assigned_date)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', component: <OverviewTab /> },
        { id: 'invoices', label: 'Invoices', component: <InvoicesTab /> },
        { id: 'contacts', label: 'Contacts', component: <ContactsTab /> },
        { id: 'staff', label: 'Staff', component: <StaffTab /> }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {distributorData.distributor_name || 'Distributor Details'}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Distributor Details
                        </p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onEdit}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50">
                    <nav className="flex space-x-8 px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {/* Show error indicator if there's an error for this tab */}
                                {((tab.id === 'invoices' && errors.invoices) ||
                                  (tab.id === 'contacts' && errors.contacts) ||
                                  (tab.id === 'staff' && errors.staff)) && (
                                    <span className="ml-1 text-red-500">⚠</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-gray-600">Loading details...</span>
                        </div>
                    ) : (
                        <div className="p-6">
                            {tabs.find(tab => tab.id === activeTab)?.component}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributorDetails;