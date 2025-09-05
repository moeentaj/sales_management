import React from 'react';
import DashboardStats from '../components/admin/DashboardStats';
import { useAuth } from '../hooks/useAuth';

const DashboardPage = () => {
  const { user } = useAuth();

  if (user.role === 'sales_staff') {
    // Mobile dashboard for sales staff
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Sales Dashboard</h2>
        {/* Mobile-specific dashboard content */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <DashboardStats />
    </div>
  );
};

export default DashboardPage;