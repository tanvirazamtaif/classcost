import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, DollarSign, GraduationCap,
  LogOut, Search, ChevronLeft, ChevronRight,
  Activity, RefreshCw, BookOpen, Landmark,
  Crown, Calendar, ExternalLink,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import AdminUserDetailPage from './AdminUserDetailPage';

export const AdminDashboardPage = () => {
  const { adminFetch, logout } = useAdmin();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/dashboard');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [adminFetch]);

  // Fetch users
  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/users?page=${page}&limit=15&search=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [adminFetch]);

  // If user selected, show detail page
  if (selectedUserId) {
    return (
      <AdminUserDetailPage
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchUsers(pagination.page, search)]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getEducationLevel = (user) => {
    if (user.profile && typeof user.profile === 'object' && user.profile.educationLevel) {
      return user.profile.educationLevel;
    }
    return user.eduType || null;
  };

  const getInstitution = (user) => {
    if (user.profile && typeof user.profile === 'object' && user.profile.institutionName) {
      return user.profile.institutionName;
    }
    return user.institution || null;
  };

  const isPremium = (user) => {
    return user.premiumUntil && new Date(user.premiumUntil) > new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatRelative = (dateStr) => {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  };

  const StatCard = ({ icon: Icon, label, value, subValue, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-900 rounded-2xl p-5 border border-surface-800"
    >
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {subValue !== undefined && (
          <span className="text-xs font-medium text-surface-400 bg-surface-800 px-2 py-1 rounded-lg">
            {subValue}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mt-3">{value?.toLocaleString() ?? '--'}</p>
      <p className="text-surface-400 text-sm mt-1">{label}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="bg-surface-900 border-b border-surface-800 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">ClassCost Admin</h1>
              <p className="text-surface-400 text-xs sm:text-sm">Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-surface-400 hover:text-white transition"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats?.totalUsers}
            color="bg-blue-600"
          />
          <StatCard
            icon={TrendingUp}
            label="New This Week"
            value={stats?.newUsersWeek}
            subValue={`${stats?.newUsersToday ?? 0} today`}
            color="bg-green-600"
          />
          <StatCard
            icon={Activity}
            label="Active (7 days)"
            value={stats?.activeUsersWeek}
            color="bg-purple-600"
          />
          <StatCard
            icon={DollarSign}
            label="Total Expenses"
            value={stats?.totalExpenses}
            color="bg-orange-600"
          />
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            icon={Calendar}
            label="New This Month"
            value={stats?.newUsersMonth}
            color="bg-cyan-600"
          />
          <StatCard
            icon={BookOpen}
            label="Total Semesters"
            value={stats?.totalSemesters}
            color="bg-indigo-600"
          />
          <StatCard
            icon={Landmark}
            label="Total Loans"
            value={stats?.totalLoans}
            color="bg-rose-600"
          />
          <StatCard
            icon={Crown}
            label="Premium Users"
            value={stats?.premiumCount}
            color="bg-amber-600"
          />
        </div>

        {/* Users Table */}
        <div className="bg-surface-900 rounded-2xl border border-surface-800 overflow-hidden">
          {/* Table Header */}
          <div className="p-4 sm:p-6 border-b border-surface-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-white">Users</h2>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3 hidden md:table-cell">
                    Education
                  </th>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3 hidden lg:table-cell">
                    Institution
                  </th>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3 hidden sm:table-cell">
                    Joined
                  </th>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3">
                    Activity
                  </th>
                  <th className="text-left text-xs font-medium text-surface-400 uppercase tracking-wider px-4 sm:px-6 py-3">

                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-surface-400">
                      <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-surface-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-800/30 transition">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm shrink-0">
                            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-white font-medium text-sm truncate">{user.name || 'Unnamed'}</p>
                              {isPremium(user) && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-surface-400 text-xs truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                        {getEducationLevel(user) ? (
                          <span className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded-lg text-xs">
                            {getEducationLevel(user)}
                          </span>
                        ) : (
                          <span className="text-surface-500 text-xs">--</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-surface-300 text-sm hidden lg:table-cell">
                        {getInstitution(user) || <span className="text-surface-500">--</span>}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-surface-400 text-xs hidden sm:table-cell">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-xs">
                          <p className="text-surface-300">{user._count?.expenses || 0} exp</p>
                          <p className="text-surface-500">{formatRelative(user.lastLoginAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <button
                          onClick={() => setSelectedUserId(user.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg transition text-xs font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 0 && (
            <div className="p-4 border-t border-surface-800 flex items-center justify-between">
              <p className="text-surface-400 text-xs sm:text-sm">
                Page {pagination.page} of {pagination.totalPages}
                <span className="hidden sm:inline"> ({pagination.total} users)</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchUsers(pagination.page - 1, search)}
                  disabled={pagination.page <= 1}
                  className="p-2 text-surface-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fetchUsers(pagination.page + 1, search)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 text-surface-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default AdminDashboardPage;
