// components/admin/DistributorDetails.js
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

    useEffect(() => {
        loadDistributorDetails();
    }, [distributor.distributor_id]);

    const loadDistributorDetails = async () => {
        try {
            setLoading(true);
            
            const [detailsRes, invoicesRes, contactsRes, staffRes, statsRes] = await Promise.all([
                distributorService.getDistributor(distributor.distributor_id),
                distributorService.getDistributorInvoices(distributor.distributor_id, { limit: 10 }),
                distributorService.getDistributorContacts(distributor.distributor_id),
                distributorService.getDistributorStaff(distributor.distributor_id),
                distributorService.getDistributorStats(distributor.distributor_id)
            ]);

            setDistributorData(detailsRes.data);
            setInvoices(invoicesRes.data.invoices || []);
            setContacts(contactsRes.data || []);
            setAssignedStaff(staffRes.data || []);
            setStats(statsRes.data || {});

        } catch (error) {
            console.error('Error loading distributor details:', error);
        } finally {
            setLoading(false);
        }
    };

    const metrics = distributorService.utils.calculateMetrics(distributorData);
    const statusInfo = distributorService.utils.getStatusInfo(distributorData);

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const OverviewTab = () => (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-blue-600">Total Invoices</p>
                            <p className="text-2xl font-bold text-blue-900">{metrics.totalInvoices}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-600">Total Sales</p>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(metrics.totalAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <Clock className="h-8 w-8 text-yellow-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-yellow-600">Outstanding</p>
                            <p className="text-2xl font-bold text-yellow-900">{formatCurrency(metrics.balanceAmount)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div className="ml-3">
                            <p className="text-sm font-medium text-purple-600">Payment Rate</p>
                            <p className="text-2xl font-bold text-purple-900">{metrics.paymentPercentage}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Distributor Name</label>
                        <p className="mt-1 text-sm text-gray-900">{distributorData.distributor_name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                            <span className={`
                                px-2 py-1 text-xs font-medium rounded-full
                                ${statusInfo.color === 'green' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }
                            `}>
                                {statusInfo.label}
                            </span>
                        </div>
                    </div>

                    {distributorData.ntn_number && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">NTN Number</label>
                            <p className="mt-1 text-sm text-gray-900">{distributorData.ntn_number}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Created Date</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(distributorData.created_at)}</p>
                    </div>

                    {distributorData.address && (
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Address</label>
                            <p className="mt-1 text-sm text-gray-900">{distributorData.address}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location</label>
                        <p className="mt-1 text-sm text-gray-900">
                            {[distributorData.city, distributorData.state, distributorData.postal_code]
                                .filter(Boolean)
                                .join(', ') || 'Not specified'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Primary Contact */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Primary Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                        <p className="mt-1 text-sm text-gray-900">{distributorData.primary_contact_person}</p>
                    </div>

                    {distributorData.primary_whatsapp_number && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                            <div className="mt-1 flex items-center space-x-2">
                                <p className="text-sm text-gray-900">{distributorData.primary_whatsapp_number}</p>
                                <a
                                    href={`https://wa.me/${distributorData.primary_whatsapp_number.replace(/[^\d]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const InvoicesTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View All Invoices
                </button>
            </div>

            {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No invoices found</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice
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
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatDate(invoice.invoice_date)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {formatCurrency(invoice.total_amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900">
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    const ContactsTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    <span>Add Contact</span>
                </button>
            </div>

            {contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No additional contacts found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((contact, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{contact.contact_person_name}</h4>
                                    {contact.designation && (
                                        <p className="text-sm text-gray-600">{contact.designation}</p>
                                    )}
                                    {contact.is_primary && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                            Primary
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {contact.whatsapp_number && (
                                    <div className="flex items-center space-x-2 text-sm">
                                        <MessageCircle className="w-4 h-4 text-green-600" />
                                        <span>{contact.whatsapp_number}</span>
                                    </div>
                                )}
                                
                                {contact.phone_number && (
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                        <span>{contact.phone_number}</span>
                                    </div>
                                )}
                                
                                {contact.email && (
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Mail className="w-4 h-4 text-gray-600" />
                                        <span>{contact.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const StaffTab = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assigned Sales Staff</h3>
                <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    <Plus className="w-4 h-4" />
                    <span>Assign Staff</span>
                </button>
            </div>

            {assignedStaff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No staff assigned</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedStaff.map((staff) => (
                        <div key={staff.user_id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-medium">
                                        {staff.full_name.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {staff.full_name}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {staff.email}
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {distributorData.distributor_name}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Distributor Details
                        </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={onEdit}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
                <div className="border-b border-gray-200">
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
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-600">Loading...</span>
                        </div>
                    ) : (
                        tabs.find(tab => tab.id === activeTab)?.component
                    )}
                </div>
            </div>
        </div>
    );
};

export default DistributorDetails;