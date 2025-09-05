// frontend/src/components/common/Layout.js - Fixed version
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

// Simple placeholder components until we create the actual ones
const Header = ({ onMenuClick, user }) => (
  <header className="bg-white shadow-sm border-b border-gray-200">
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center space-x-3">
        {user?.role === 'admin' && (
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
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.full_name?.charAt(0) || 'U'}
          </span>
        </div>
      </div>
    </div>
  </header>
);

const Sidebar = ({ open, setOpen }) => (
  <>
    {/* Overlay for mobile */}
    {open && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={() => setOpen(false)}
      />
    )}
    
    {/* Sidebar */}
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <a href="/dashboard" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </a>
            
            <a href="/invoices" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Invoices
            </a>
            
            <a href="/payments" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Payments
            </a>
            
            <a href="/distributors" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Distributors
            </a>
            
            <a href="/products" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products
            </a>
            
            <a href="/users" className="flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Users
            </a>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button className="w-full flex items-center px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  </>
);

// Mobile bottom navigation for sales staff
const MobileNavigation = () => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
    <div className="flex justify-around">
      <a href="/dashboard" className="flex flex-col items-center py-2 text-gray-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
        <span className="text-xs mt-1">Dashboard</span>
      </a>
      
      <a href="/invoices" className="flex flex-col items-center py-2 text-gray-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs mt-1">Invoices</span>
      </a>
      
      <a href="/payments" className="flex flex-col items-center py-2 text-gray-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
        <span className="text-xs mt-1">Payments</span>
      </a>
      
      <a href="/distributors" className="flex flex-col items-center py-2 text-gray-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-xs mt-1">Distributors</span>
      </a>
    </div>
  </div>
);

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Mobile layout for sales staff
  if (user?.role === 'sales_staff') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <main className="pb-20 p-4">
          {children}
        </main>
        <MobileNavigation />
      </div>
    );
  }

  // Desktop layout for admin
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} user={user} />
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;