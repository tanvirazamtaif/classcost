import React from 'react';
import { AdminProvider, useAdmin } from '../../contexts/AdminContext';
import AdminLoginPage from './AdminLoginPage';
import AdminDashboardPage from './AdminDashboardPage';

const AdminContent = () => {
  const { isAuthenticated } = useAdmin();

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return <AdminDashboardPage />;
};

export const AdminApp = () => {
  return (
    <AdminProvider>
      <AdminContent />
    </AdminProvider>
  );
};

export default AdminApp;
