import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const AdminContext = createContext(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(
    localStorage.getItem('classcost_admin_token')
  );
  const [isAuthenticated, setIsAuthenticated] = useState(!!adminToken);
  const inactivityTimer = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem('classcost_admin_token');
    setAdminToken(null);
    setIsAuthenticated(false);
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
  }, []);

  // Auto-logout on inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (isAuthenticated) {
      inactivityTimer.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));
    resetInactivityTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

  const login = useCallback(async (username, password) => {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Invalid credentials');
    }

    const { token } = await response.json();
    localStorage.setItem('classcost_admin_token', token);
    setAdminToken(token);
    setIsAuthenticated(true);
    return true;
  }, []);

  const adminFetch = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    return response;
  }, [adminToken, logout]);

  return (
    <AdminContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      adminFetch,
      adminToken,
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
