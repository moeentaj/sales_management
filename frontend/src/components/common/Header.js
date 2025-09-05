// frontend/src/components/common/Header.js
import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          {user?.role === 'admin' && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-semibold text-gray-900">Sales Management</h1>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Welcome, {user?.full_name}</span>
          <button
            onClick={logout}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;