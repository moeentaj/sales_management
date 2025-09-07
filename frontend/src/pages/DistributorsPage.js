// pages/DistributorsPage.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import DistributorManagement from '../components/admin/DistributorManagement';

const DistributorsPage = () => {
    const { user } = useAuth();

    // For sales staff, show limited view
    if (user?.role === 'sales_staff') {
        return (
            <div className="p-4">
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">My Distributors</h2>
                    <p className="text-gray-600 mb-4">View distributors assigned to you</p>
                    <DistributorManagement />
                </div>
            </div>
        );
    }

    // For admin, show full management interface
    return <DistributorManagement />;
};

export default DistributorsPage;