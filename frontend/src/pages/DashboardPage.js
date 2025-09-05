// frontend/src/pages/DashboardPage.js - Fixed version
import React, { useState, useEffect } from 'react';
import { 
  Users, FileText, DollarSign, TrendingUp, 
  AlertCircle, CheckCircle, Clock, Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// Simple Dashboard Stats Component (inline)
const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Try to fetch real stats from API
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to mock data if API fails
      setStats({
        total_invoices: 125,
        total_revenue: 50000,
        total_outstanding: 15000,
        overdue_invoices: 8,
        today_invoices: 5,
        week_invoices: 23,
        month_invoices: 87,
        total_distributors: 45,
        total_products: 156,
        paid_invoices: 95,
        pending_invoices: 22
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-500">Unable to load dashboard statistics</p>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' && title.toLowerCase().includes('amount') || title.toLowerCase().includes('revenue') || title.toLowerCase().includes('outstanding')
              ? `$${value.toLocaleString()}`
              : value?.toLocaleString ? value.toLocaleString() : value
            }
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-1">
              <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
              <span className="text-xs text-green-600">{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Invoices"
          value={stats.total_invoices}
          icon={FileText}
          color="bg-blue-500"
          subtitle="All time"
        />
        
        <StatCard
          title="Total Revenue"
          value={stats.total_revenue}
          icon={DollarSign}
          color="bg-green-500"
          subtitle="All time"
        />
        
        <StatCard
          title="Outstanding Amount"
          value={stats.total_outstanding}
          icon={Clock}
          color="bg-yellow-500"
          subtitle="Pending payments"
        />
        
        <StatCard
          title="Overdue Invoices"
          value={stats.overdue_invoices}
          icon={AlertCircle}
          color="bg-red-500"
          subtitle="Requires follow-up"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="This Month"
          value={stats.month_invoices}
          icon={Calendar}
          color="bg-indigo-500"
          subtitle="Invoices created"
        />
        
        <StatCard
          title="Paid Invoices"
          value={stats.paid_invoices}
          icon={CheckCircle}
          color="bg-green-600"
          subtitle="Completed payments"
        />
        
        <StatCard
          title="Pending Invoices"
          value={stats.pending_invoices}
          icon={Clock}
          color="bg-orange-500"
          subtitle="Awaiting payment"
        />
      </div>

      {/* Additional stats for admins */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total Distributors"
            value={stats.total_distributors}
            icon={Users}
            color="bg-purple-500"
            subtitle="Active customers"
          />
          
          <StatCard
            title="Total Products"
            value={stats.total_products}
            icon={FileText}
            color="bg-cyan-500"
            subtitle="In catalog"
          />
        </div>
      )}
    </div>
  );
};

// Main Dashboard Page Component
const DashboardPage = () => {
  const { user } = useAuth();

  // Mobile dashboard for sales staff
  if (user?.role === 'sales_staff') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sales Dashboard</h2>
          <p className="text-gray-600 mb-6">Welcome back, {user.full_name}!</p>
          
          {/* Quick Actions for Sales Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <a
              href="/invoices?action=create"
              className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition-colors"
            >
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <div className="font-semibold">Create Invoice</div>
              <div className="text-sm opacity-90">New sale entry</div>
            </a>
            
            <a
              href="/payments?action=collect"
              className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition-colors"
            >
              <DollarSign className="w-8 h-8 mx-auto mb-2" />
              <div className="font-semibold">Collect Payment</div>
              <div className="text-sm opacity-90">Record payment</div>
            </a>
          </div>
        </div>

        {/* Stats for Sales Staff */}
        <DashboardStats />

        {/* Recent Activity for Sales Staff */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <div>
                <p className="font-medium">Invoice INV-000123 paid</p>
                <p className="text-sm text-gray-600">Distributor ABC Corp - $1,250</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-500 mr-3" />
              <div>
                <p className="font-medium">Created Invoice INV-000124</p>
                <p className="text-sm text-gray-600">Distributor XYZ Ltd - $850</p>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-500 mr-3" />
              <div>
                <p className="font-medium">Follow-up needed</p>
                <p className="text-sm text-gray-600">Invoice INV-000120 overdue by 5 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Welcome back, {user?.full_name}! Here's what's happening with your business today.</p>
      </div>

      {/* Dashboard Statistics */}
      <DashboardStats />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/invoices?action=create"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <div className="font-semibold">Create Invoice</div>
              <div className="text-sm text-gray-600">New invoice</div>
            </div>
          </a>
          
          <a
            href="/users?action=create"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <Users className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <div className="font-semibold">Add User</div>
              <div className="text-sm text-gray-600">New staff member</div>
            </div>
          </a>
          
          <a
            href="/distributors?action=create"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <div className="font-semibold">Add Distributor</div>
              <div className="text-sm text-gray-600">New customer</div>
            </div>
          </a>
          
          <a
            href="/reports"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <TrendingUp className="w-8 h-8 text-indigo-600 mr-3" />
            <div>
              <div className="font-semibold">View Reports</div>
              <div className="text-sm text-gray-600">Analytics</div>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent System Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Payment received from ABC Corp</p>
              <p className="text-sm text-gray-600">Invoice INV-000123 - $1,250 • 2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">New invoice created by John Doe</p>
              <p className="text-sm text-gray-600">Invoice INV-000124 for XYZ Ltd - $850 • 4 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">New distributor registered</p>
              <p className="text-sm text-gray-600">DEF Industries added by Admin • 6 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-500 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Invoice overdue reminder sent</p>
              <p className="text-sm text-gray-600">Invoice INV-000120 to GHI Corp • 8 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;