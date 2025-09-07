// components/admin/DistributorManagement.js
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

            // const filters = distributorService.utils.createSearchFilters(
            //     searchTerm, selectedCity, statusFilter
            // );

            const filters = createSearchFilters(searchTerm, selectedCity, statusFilter);

            const response = await distributorService.getDistributors({
                page: currentPage,
                limit: 20,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            const payload = response?.data ?? {};
            const list = payload.distributors ?? payload.data ?? [];
            const pagination = payload.pagination ?? null;
            // Fallbacks if pagination missing
            const total = pagination?.total ?? list.length;
            const pages = pagination?.pages ?? Math.max(1, Math.ceil(total / 20));

            setDistributors(list);
            setTotalPages(pages);
            setTotalDistributors(total);

            // Extract unique cities
            // const uniqueCities = [...new Set(
            //     response.data.distributors
            //         .map(d => d.city)
            //         .filter(Boolean)
            // )].sort();

            const uniqueCities = Array.from(
                new Set(list.map(d => d?.city).filter(Boolean))
            ).sort();

            setCities(uniqueCities);

            // Calculate stats
            calculateStats(list);

        } catch (error) {
            console.error('Error loading distributors:', error);
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

            const metrics = distributorService.utils.calculateMetrics(distributor);
            stats.totalAmount += metrics.totalAmount;
            stats.pendingAmount += metrics.balanceAmount;
        });

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
            loadDistributors();
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
            loadDistributors();
        } catch (error) {
            console.error('Error updating distributor:', error);
            throw error;
        }
    };

    const handleDeleteDistributor = async (distributorId) => {
        if (window.confirm('Are you sure you want to delete this distributor?')) {
            try {
                await distributorService.deleteDistributor(distributorId);
                loadDistributors();
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
                        await distributorService.bulkOperations.deleteMultiple(selectedDistributors);
                        setSelectedDistributors([]);
                        loadDistributors();
                    }
                    break;
                case 'activate':
                    await distributorService.bulkOperations.updateMultiple(selectedDistributors, { is_active: true });
                    setSelectedDistributors([]);
                    loadDistributors();
                    break;
                case 'deactivate':
                    await distributorService.bulkOperations.updateMultiple(selectedDistributors, { is_active: false });
                    setSelectedDistributors([]);
                    loadDistributors();
                    break;
            }
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('Failed to perform bulk action');
        }
    };

    const handleExport = async () => {
        try {
            const response = await distributorService.exportDistributors({
                format: 'csv',
                //filters: distributorService.utils.createSearchFilters(searchTerm, selectedCity, statusFilter)
                filters: createSearchFilters(searchTerm, selectedCity, statusFilter)
            });

            // Create download link
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `distributors-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export data');
        }
    };

    const DistributorCard = ({ distributor }) => {
        //const statusInfo = distributorService.utils.getStatusInfo(distributor);
        const statusInfo = getStatusInfo(distributor);
        //const metrics = distributorService.utils.calculateMetrics(distributor);
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
                                <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{distributor.primary_contact_person}</span>
                                </div>

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
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
                                <div className="text-center">
                                    <div className="text-lg font-semibold text-gray-900">
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

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setSelectedDistributor(distributor);
                                setShowDetails(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        >
                            <Eye className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => {
                                setSelectedDistributor(distributor);
                                setShowEditForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                        >
                            <Edit className="w-4 h-4" />
                        </button>

                        <button
                            onClick={() => handleDeleteDistributor(distributor.distributor_id)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
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
                    <div className="flex-1"></div>
                </div>
            </div>
        </div>
    );
};

export default DistributorManagement;