// components/admin/DistributorManagement.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
    Users, Plus, Search, Filter, MoreVertical, Edit, Trash2,
    MapPin, Phone, Mail, TrendingUp, DollarSign, FileText,
    Eye, UserPlus, Building2, ChevronDown, Download, Upload,
    RefreshCw, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { distributorService } from '../../services/distributorService';
import DistributorForm from './DistributorForm';
import DistributorDetails from './DistributorDetails';

const DistributorManagement = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [distributors, setDistributors] = useState([]);
    const [selectedDistributors, setSelectedDistributors] = useState([]);

    // Pagination and filters
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalDistributors, setTotalDistributors] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('distributor_name');
    const [sortOrder, setSortOrder] = useState('asc');

    // Modal states
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedDistributor, setSelectedDistributor] = useState(null);
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Data for filters
    const [cities, setCities] = useState([]);
    const [statsData, setStatsData] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        totalAmount: 0,
        pendingAmount: 0
    });

    useEffect(() => {
        loadDistributors();
    }, [currentPage, searchTerm, selectedCity, statusFilter, sortBy, sortOrder]);

    const createSearchFilters = (searchTerm, city, status) => {
        const filters = {};
        if (searchTerm?.trim()) filters.search = searchTerm.trim();
        if (city && city !== 'all') filters.city = city;
        if (status && status !== 'all') filters.is_active = status === 'active';
        return filters;
    };

    const getStatusInfo = (d) =>
        d?.is_active ? ({ label: 'Active', color: 'green' }) : ({ label: 'Inactive', color: 'red' });

    const calculateMetrics = (d) => {
        const invoices = Array.isArray(d?.invoices) ? d.invoices : [];
        const totalAmount = invoices.reduce((s, i) => s + (i.total_amount ?? i.total ?? 0), 0);
        const paidAmount = invoices.reduce((s, i) => s + (i.paid_amount ?? i.paid ?? 0), 0);
        return { totalInvoices: invoices.length, totalAmount, balanceAmount: Math.max(totalAmount - paidAmount, 0) };
    };

    const loadDistributors = async () => {
        try {
            setLoading(true);

            const filters = createSearchFilters(searchTerm, selectedCity, statusFilter);

            const response = await distributorService.getDistributors({
                page: currentPage,
                limit: 20,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            console.log('API Response:', response);

            // ✅ FIX: Based on your API response structure
            // API returns: { success: true, data: [...], pagination: {...} }
            if (response && response.success && response.data) {
                const distributorList = Array.isArray(response.data) ? response.data : [];
                const pagination = response.pagination || {};
                
                setDistributors(distributorList);
                setTotalPages(pagination.pages || 1);
                setTotalDistributors(pagination.total || distributorList.length);

                // Extract unique cities
                const uniqueCities = Array.from(
                    new Set(distributorList.map(d => d?.city).filter(Boolean))
                ).sort();
                setCities(uniqueCities);

                // Calculate stats
                calculateStats(distributorList);
            } else {
                console.error('Unexpected API response structure:', response);
                setDistributors([]);
                setTotalPages(1);
                setTotalDistributors(0);
                setStatsData({
                    total: 0,
                    active: 0,
                    inactive: 0,
                    totalAmount: 0,
                    pendingAmount: 0
                });
            }

        } catch (error) {
            console.error('Error loading distributors:', error);
            setDistributors([]);
            setTotalPages(1);
            setTotalDistributors(0);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (distributorList) => {
        const stats = {
            total: distributorList.length,
            active: 0,
            inactive: 0,
            totalAmount: 0,
            pendingAmount: 0
        };

        distributorList.forEach(distributor => {
            if (distributor.is_active) {
                stats.active++;
            } else {
                stats.inactive++;
            }

            const metrics = calculateMetrics(distributor);
            stats.totalAmount += metrics.totalAmount;
            stats.pendingAmount += metrics.balanceAmount;
        });

        console.log('Calculated stats:', stats);
        setStatsData(stats);
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (filterType, value) => {
        if (filterType === 'city') {
            setSelectedCity(value);
        } else if (filterType === 'status') {
            setStatusFilter(value);
        }
        setCurrentPage(1);
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleSelectDistributor = (distributorId) => {
        setSelectedDistributors(prev => {
            if (prev.includes(distributorId)) {
                return prev.filter(id => id !== distributorId);
            } else {
                return [...prev, distributorId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedDistributors.length === distributors.length) {
            setSelectedDistributors([]);
        } else {
            setSelectedDistributors(distributors.map(d => d.distributor_id));
        }
    };

    const handleCreateDistributor = async (distributorData) => {
        try {
            await distributorService.createDistributor(distributorData);
            setShowCreateForm(false);
            loadDistributors(); // Reload the list
        } catch (error) {
            console.error('Error creating distributor:', error);
            throw error;
        }
    };

    const handleEditDistributor = async (distributorData) => {
        try {
            await distributorService.updateDistributor(selectedDistributor.distributor_id, distributorData);
            setShowEditForm(false);
            setSelectedDistributor(null);
            loadDistributors(); // Reload the list
        } catch (error) {
            console.error('Error updating distributor:', error);
            throw error;
        }
    };

    const handleDeleteDistributor = async (distributorId) => {
        if (window.confirm('Are you sure you want to delete this distributor?')) {
            try {
                await distributorService.deleteDistributor(distributorId);
                loadDistributors(); // Reload the list
            } catch (error) {
                console.error('Error deleting distributor:', error);
                alert('Failed to delete distributor');
            }
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedDistributors.length === 0) return;

        try {
            switch (action) {
                case 'delete':
                    if (window.confirm(`Delete ${selectedDistributors.length} distributors?`)) {
                        // Note: Bulk operations might not be implemented in backend
                        for (const distributorId of selectedDistributors) {
                            await distributorService.deleteDistributor(distributorId);
                        }
                        setSelectedDistributors([]);
                        loadDistributors();
                    }
                    break;
                case 'activate':
                case 'deactivate':
                    // Note: Bulk status update might not be implemented in backend
                    alert('Bulk status update not yet implemented');
                    break;
            }
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('Failed to perform bulk action');
        }
    };

    const handleExport = async () => {
        try {
            // Note: Export functionality might not be implemented in backend
            alert('Export functionality not yet implemented');
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data');
        }
    };

    const DistributorCard = ({ distributor }) => {
        const statusInfo = getStatusInfo(distributor);
        const metrics = calculateMetrics(distributor);

        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                        <input
                            type="checkbox"
                            checked={selectedDistributors.includes(distributor.distributor_id)}
                            onChange={() => handleSelectDistributor(distributor.distributor_id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                    {distributor.distributor_name}
                                </h3>
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

                            <div className="space-y-1 text-sm text-gray-600">
                                {distributor.primary_contact_person && (
                                    <div className="flex items-center space-x-1">
                                        <Users className="w-4 h-4" />
                                        <span>{distributor.primary_contact_person}</span>
                                    </div>
                                )}
                                
                                {distributor.city && (
                                    <div className="flex items-center space-x-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{distributor.city}</span>
                                    </div>
                                )}
                                
                                {distributor.primary_whatsapp_number && (
                                    <div className="flex items-center space-x-1">
                                        <Phone className="w-4 h-4" />
                                        <span>{distributor.primary_whatsapp_number}</span>
                                    </div>
                                )}

                                <div className="text-xs text-gray-500">
                                    Created: {new Date(distributor.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-blue-600">
                                        {metrics.totalInvoices}
                                    </div>
                                    <div className="text-xs text-gray-500">Invoices</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-green-600">
                                        ${metrics.totalAmount.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">Total</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-orange-600">
                                        ${metrics.balanceAmount.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">Balance</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setSelectedDistributor(distributor);
                                setShowDetails(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="View Details"
                        >
                            <Eye className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => {
                                setSelectedDistributor(distributor);
                                setShowEditForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Edit Distributor"
                        >
                            <Edit className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => handleDeleteDistributor(distributor.distributor_id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete Distributor"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Distributor Management</h1>
                    <p className="text-gray-600">Manage your distributors and customer relationships</p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>

                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Distributor</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{statsData.total}</p>
                        </div>
                        <Building2 className="h-8 w-8 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600">{statsData.active}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Inactive</p>
                            <p className="text-2xl font-bold text-red-600">{statsData.inactive}</p>
                        </div>
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Total Sales</p>
                            <p className="text-2xl font-bold text-green-600">
                                ${statsData.totalAmount.toLocaleString()}
                            </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-orange-600">
                                ${statsData.pendingAmount.toLocaleString()}
                            </p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search distributors..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* City Filter */}
                    <div className="min-w-0 flex-shrink-0">
                        <select
                            value={selectedCity}
                            onChange={(e) => handleFilterChange('city', e.target.value)}
                            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Cities</option>
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="min-w-0 flex-shrink-0">
                        <select
                            value={statusFilter}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* Sort Options */}
                    <div className="min-w-0 flex-shrink-0">
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-');
                                setSortBy(field);
                                setSortOrder(order);
                            }}
                            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="distributor_name-asc">Name (A-Z)</option>
                            <option value="distributor_name-desc">Name (Z-A)</option>
                            <option value="city-asc">City (A-Z)</option>
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                        </select>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => loadDistributors()}
                        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Bulk Actions */}
                {selectedDistributors.length > 0 && (
                    <div className="mt-4 flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">
                            {selectedDistributors.length} selected
                        </span>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('deactivate')}
                                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                            >
                                Deactivate
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Loading distributors...</span>
                </div>
            )}

            {/* Distributors List */}
            {!loading && (
                <div className="space-y-4">
                    {distributors.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No distributors found</h3>
                            <p className="text-gray-500 mb-6">Get started by adding your first distributor</p>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                Add First Distributor
                            </button>
                        </div>
                    ) : (
                        <>
                            {distributors.map(distributor => (
                                <DistributorCard key={distributor.distributor_id} distributor={distributor} />
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                    <div className="flex flex-1 justify-between sm:hidden">
                                        <button
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                                                <span className="font-medium">{Math.min(currentPage * 20, totalDistributors)}</span> of{' '}
                                                <span className="font-medium">{totalDistributors}</span> results
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                                                <button
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                                    const pageNumber = i + 1;
                                                    return (
                                                        <button
                                                            key={pageNumber}
                                                            onClick={() => setCurrentPage(pageNumber)}
                                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                                                                currentPage === pageNumber
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {pageNumber}
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Modals */}
            {showCreateForm && (
                <DistributorForm
                    title="Add New Distributor"
                    onClose={() => setShowCreateForm(false)}
                    onSubmit={handleCreateDistributor}
                />
            )}

            {showEditForm && selectedDistributor && (
                <DistributorForm
                    distributor={selectedDistributor}
                    title="Edit Distributor"
                    onClose={() => {
                        setShowEditForm(false);
                        setSelectedDistributor(null);
                    }}
                    onSubmit={handleEditDistributor}
                />
            )}

            {showDetails && selectedDistributor && (
                <DistributorDetails
                    distributor={selectedDistributor}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedDistributor(null);
                    }}
                    onEdit={() => {
                        setShowDetails(false);
                        setShowEditForm(true);
                    }}
                />
            )}
        </div>
    );
};

export default DistributorManagement;