// frontend/src/pages/UsersPage.js - Complete Staff Management Interface
import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Eye, Edit, Trash2, Users, Shield,
    TrendingUp, DollarSign, Download, Upload, CheckCircle, XCircle,
    UserCheck, Calendar, Grid, List, MoreVertical, Settings, Key
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';

const UsersPage = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [viewMode, setViewMode] = useState('list'); // grid or list
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [stats, setStats] = useState(null);

    // Load data on component mount and when filters change
    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [currentPage, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const filters = userService.utils.createSearchFilters(searchTerm, roleFilter, statusFilter);
            
            const response = await userService.getUsers({
                page: currentPage,
                limit: 20,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            if (response.success) {
                setUsers(response.data.users || []);
                setTotalPages(response.data.pagination?.pages || 1);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await userService.getUserAnalytics();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
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

    const handleUserAction = async (action, selectedUser) => {
        try {
            switch (action) {
                case 'edit':
                    setSelectedUser(selectedUser);
                    setShowUserModal(true);
                    break;
                case 'toggle':
                    await userService.toggleUserStatus(selectedUser.user_id, !selectedUser.is_active);
                    fetchUsers();
                    break;
                case 'reset-password':
                    const newPassword = userService.utils.generateTempPassword();
                    if (window.confirm(`Reset password for ${selectedUser.full_name}?\nNew password: ${newPassword}`)) {
                        await userService.resetPassword(selectedUser.user_id, newPassword);
                        alert(`Password reset successfully!\nNew password: ${newPassword}`);
                    }
                    break;
                case 'delete':
                    if (window.confirm(`Are you sure you want to delete ${selectedUser.full_name}?`)) {
                        await userService.deleteUser(selectedUser.user_id);
                        fetchUsers();
                    }
                    break;
                case 'view':
                    setSelectedUser(selectedUser);
                    // Could open a detailed view modal
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(`Error ${action} user:`, error);
            alert(`Failed to ${action} user. Please try again.`);
        }
    };

    const handleBulkAction = async (action) => {
        if (selectedUsers.length === 0) {
            alert('Please select users first');
            return;
        }

        try {
            const promises = selectedUsers.map(userId => {
                if (action === 'activate') {
                    return userService.toggleUserStatus(userId, true);
                } else if (action === 'deactivate') {
                    return userService.toggleUserStatus(userId, false);
                }
                return null;
            });

            await Promise.all(promises.filter(Boolean));
            setSelectedUsers([]);
            fetchUsers();
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('Failed to perform bulk action');
        }
    };

    // Statistics cards component
    const StatsCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </div>
            </div>
        </div>
    );

    // User card component (grid view)
    const UserCard = ({ user: userData }) => {
        const statusBadge = userService.utils.getStatusBadge(userData.is_active);
        const roleBadge = userService.utils.getRoleBadge(userData.role);
        const metrics = userService.utils.calculateUserMetrics(userData);

        return (
            <div className="bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                {userData.profile_image_url ? (
                                    <img 
                                        src={userData.profile_image_url} 
                                        alt={userData.full_name}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-gray-600 font-medium">
                                        {userData.full_name.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{userData.full_name}</h3>
                                <p className="text-sm text-gray-600">@{userData.username}</p>
                            </div>
                        </div>
                        <div className="relative">
                            <button className="p-1 hover:bg-gray-100 rounded">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Role:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleBadge.bgColor} ${roleBadge.textColor}`}>
                                {roleBadge.label}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                                {statusBadge.label}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="text-sm">{userData.email}</span>
                        </div>
                        {userData.role === 'sales_staff' && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Distributors:</span>
                                    <span className="text-sm">{metrics.assignedDistributors}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Performance:</span>
                                    <span className="text-sm">{metrics.performanceRating}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleUserAction('edit', userData)}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleUserAction('toggle', userData)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                userData.is_active 
                                    ? 'bg-red-600 text-white hover:bg-red-700' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                        >
                            {userData.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // User row component (list view)
    const UserRow = ({ user: userData }) => {
        const statusBadge = userService.utils.getStatusBadge(userData.is_active);
        const roleBadge = userService.utils.getRoleBadge(userData.role);
        const metrics = userService.utils.calculateUserMetrics(userData);

        return (
            <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={selectedUsers.includes(userData.user_id)}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, userData.user_id]);
                            } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== userData.user_id));
                            }
                        }}
                        className="rounded border-gray-300"
                    />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            {userData.profile_image_url ? (
                                <img 
                                    src={userData.profile_image_url} 
                                    alt={userData.full_name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-gray-600 font-medium text-sm">
                                    {userData.full_name.charAt(0)}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">{userData.full_name}</div>
                            <div className="text-sm text-gray-500">@{userData.username}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{userData.email}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleBadge.bgColor} ${roleBadge.textColor}`}>
                        {roleBadge.label}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusBadge.bgColor} ${statusBadge.textColor}`}>
                        {statusBadge.label}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userData.role === 'sales_staff' ? (
                        <div>
                            <div>{metrics.assignedDistributors} distributors</div>
                            <div className="text-gray-500">{metrics.performanceRating}</div>
                        </div>
                    ) : (
                        <span className="text-gray-500">N/A</span>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(userData.hire_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handleUserAction('edit', userData)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleUserAction('reset-password', userData)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Reset Password"
                        >
                            <Key className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleUserAction('toggle', userData)}
                            className={userData.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                            title={userData.is_active ? 'Deactivate' : 'Activate'}
                        >
                            {userData.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => handleUserAction('delete', userData)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600">User management is available to administrators only.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                    <p className="text-gray-600">Manage users and sales staff accounts</p>
                </div>
                <div className="flex space-x-3">
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={() => {
                            setSelectedUser(null);
                            setShowUserModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Users"
                        value={stats.total_users || 0}
                        icon={Users}
                        color="bg-blue-500"
                        subtitle={`${stats.active_users || 0} active`}
                    />
                    <StatsCard
                        title="Sales Staff"
                        value={stats.sales_staff || 0}
                        icon={UserCheck}
                        color="bg-green-500"
                        subtitle="Field representatives"
                    />
                    <StatsCard
                        title="Administrators"
                        value={stats.admins || 0}
                        icon={Shield}
                        color="bg-purple-500"
                        subtitle="System administrators"
                    />
                    <StatsCard
                        title="Avg Performance"
                        value={stats.avg_performance || 'N/A'}
                        icon={TrendingUp}
                        color="bg-orange-500"
                        subtitle="Sales staff rating"
                    />
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="min-w-[150px]">
                        <select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="sales_staff">Sales Staff</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="min-w-[150px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedUsers.length > 0 && (
                    <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-800">
                            {selectedUsers.length} user(s) selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleBulkAction('activate')}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('deactivate')}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Users Display */}
            <div className="bg-white rounded-lg shadow">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Users className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                                ? 'Try adjusting your filters' 
                                : 'Get started by adding your first user'
                            }
                        </p>
                        <button
                            onClick={() => {
                                setSelectedUser(null);
                                setShowUserModal(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Add User
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.map((userData) => (
                                <UserCard key={userData.user_id} user={userData} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.length === users.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUsers(users.map(u => u.user_id));
                                                } else {
                                                    setSelectedUsers([]);
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                    </th>
                                    <th 
                                        onClick={() => handleSort('full_name')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        User
                                        {sortBy === 'full_name' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th 
                                        onClick={() => handleSort('email')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Email
                                        {sortBy === 'email' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th 
                                        onClick={() => handleSort('role')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Role
                                        {sortBy === 'role' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Performance
                                    </th>
                                    <th 
                                        onClick={() => handleSort('hire_date')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                                    >
                                        Hire Date
                                        {sortBy === 'hire_date' && (
                                            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((userData) => (
                                    <UserRow key={userData.user_id} user={userData} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
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
                                Showing page <span className="font-medium">{currentPage}</span> of{' '}
                                <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal (placeholder - would need actual UserForm component) */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {selectedUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                User form component would go here. This would include fields for full name, 
                                username, email, role, phone, address, salary, commission rate, etc.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowUserModal(false)}
                                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;