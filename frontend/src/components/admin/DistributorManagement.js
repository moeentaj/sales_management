// components/admin/DistributorManagement.js
// Passes isAdmin down to the form so only admins see "Sales Staff" in the form.

import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Filter, MoreVertical, Edit, Trash2,
  MapPin, Building2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { distributorService } from '../../services/distributorService';
import DistributorForm from './DistributorForm';
import DistributorDetails from './DistributorDetails';

const DistributorManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  // Modals
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
    pendingAmount: 0,
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
        ...filters,
      });

      if (response && response.success && response.data) {
        const distributorList = Array.isArray(response.data) ? response.data : [];
        const pagination = response.pagination || {};

        setDistributors(distributorList);
        setTotalPages(pagination.pages || 1);
        setTotalDistributors(pagination.total || distributorList.length);

        const uniqueCities = Array.from(new Set(distributorList.map(d => d?.city).filter(Boolean))).sort();
        setCities(uniqueCities);

        calculateStats(distributorList);
      } else {
        setDistributors([]);
        setTotalPages(1);
        setTotalDistributors(0);
        setStatsData({ total: 0, active: 0, inactive: 0, totalAmount: 0, pendingAmount: 0 });
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
      pendingAmount: 0,
    };

    distributorList.forEach(distributor => {
      if (distributor.is_active) stats.active++;
      else stats.inactive++;

      const metrics = calculateMetrics(distributor);
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
    if (filterType === 'city') setSelectedCity(value);
    else if (filterType === 'status') setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleSelectDistributor = (distributorId) => {
    setSelectedDistributors(prev =>
      prev.includes(distributorId) ? prev.filter(id => id !== distributorId) : [...prev, distributorId]
    );
  };

  // SIMPLIFIED HANDLERS - Form handles API calls; we just refresh
  const handleCreateDistributor = () => loadDistributors();
  const handleEditDistributor = () => loadDistributors();

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
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusInfo.color === 'green'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                {distributor.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{distributor.city}</span>
                  </div>
                )}
                {metrics && (
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>Invoices: {metrics.totalInvoices}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDistributor(distributor);
                setShowDetails(true);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              View
            </button>
            <button
              onClick={() => {
                setSelectedDistributor(distributor);
                setShowEditForm(true);
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Distributors</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Distributor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search distributors…"
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <select
          value={selectedCity}
          onChange={(e) => handleFilterChange('city', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Cities</option>
          {cities.map(city => <option key={city} value={city}>{city}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field);
            setSortOrder(order);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="distributor_name-asc">Name (A–Z)</option>
          <option value="distributor_name-desc">Name (Z–A)</option>
          <option value="created_at-desc">Newest</option>
          <option value="created_at-asc">Oldest</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading distributors…</span>
        </div>
      )}

      {/* List */}
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
              {distributors.map(d => (
                <DistributorCard key={d.distributor_id} distributor={d} />
              ))}
              {totalPages > 1 && (
                <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateForm && (
        <DistributorForm
          title="Add New Distributor"
          isAdmin={isAdmin}   // ✅ pass admin flag
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateDistributor}
        />
      )}

      {showEditForm && selectedDistributor && (
        <DistributorForm
          distributor={selectedDistributor}
          title="Edit Distributor"
          isAdmin={isAdmin}   // ✅ pass admin flag
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