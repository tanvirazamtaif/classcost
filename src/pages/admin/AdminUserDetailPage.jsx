import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Mail, Calendar, Clock, AtSign,
  GraduationCap, Building, BookOpen, CreditCard, Receipt,
  Wallet, AlertCircle, CheckCircle,
  Edit, RefreshCw, Crown,
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { LoadingOverlay } from '../../components/ui';

export const AdminUserDetailPage = ({ userId, onBack }) => {
  const { adminFetch } = useAdmin();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}/full`);
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  if (loading) {
    return <LoadingOverlay message="Loading user..." />;
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg mb-1">Failed to load user</p>
          <p className="text-surface-400 text-sm mb-4">{error}</p>
          <button onClick={onBack} className="text-primary-400 hover:underline text-sm">
            Back to users
          </button>
        </div>
      </div>
    );
  }

  const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
  const currency = profile.currency || user.currency || 'BDT';
  const isPremium = user.premiumUntil && new Date(user.premiumUntil) > new Date();

  const formatDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatDateTime = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  const InfoCard = ({ icon: Icon, label, value }) => (
    <div className="bg-surface-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-surface-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-surface-400 text-xs uppercase tracking-wide">{label}</p>
          <p className="text-white font-medium truncate">{value || '--'}</p>
        </div>
      </div>
    </div>
  );

  const tabs = ['profile', 'activity', 'expenses', 'semesters', 'loans'];

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Header */}
      <header className="bg-surface-900 border-b border-surface-800 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white">User Details</h1>
            <p className="text-surface-400 text-xs truncate">ID: {user.id}</p>
          </div>
          <button
            onClick={fetchUserDetails}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* User Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-900 rounded-2xl p-5 sm:p-6 mb-6 border border-surface-800"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-surface-900 ${
                user.isActive ? 'bg-green-500' : 'bg-surface-500'
              }`} />
            </div>

            {/* Basic Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{user.name || 'Unnamed User'}</h2>
                {isPremium && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              <p className="text-surface-400 text-sm mb-3">{user.email}</p>

              <div className="flex flex-wrap gap-2">
                {profile.educationLevel && (
                  <span className="px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-full text-xs">
                    {profile.educationLevel}
                  </span>
                )}
                {(profile.institutionName || user.institution) && (
                  <span className="px-2.5 py-1 bg-purple-500/15 text-purple-400 rounded-full text-xs">
                    {profile.institutionName || user.institution}
                  </span>
                )}
                <span className="px-2.5 py-1 bg-green-500/15 text-green-400 rounded-full text-xs">
                  {currency}
                </span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-5 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{user._count?.expenses || 0}</p>
                <p className="text-surface-400 text-xs sm:text-sm">Expenses</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{user._count?.semesters || 0}</p>
                <p className="text-surface-400 text-xs sm:text-sm">Semesters</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">{user._count?.loans || 0}</p>
                <p className="text-surface-400 text-xs sm:text-sm">Loans</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-800 text-surface-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ═══ PROFILE TAB ═══ */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Personal Information */}
              <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoCard icon={User} label="Full Name" value={user.name} />
                  <InfoCard icon={AtSign} label="Nickname" value={user.profile?.nickname || user.nickname || '—'} />
                  <InfoCard icon={Mail} label="Email" value={user.email} />
                  <InfoCard icon={CreditCard} label="Currency" value={currency} />
                </div>
              </div>

              {/* Education Information */}
              <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-400" />
                  Education Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoCard icon={GraduationCap} label="Education Level" value={profile.educationLevel || user.eduType} />
                  <InfoCard icon={Building} label="Institution" value={profile.institutionName || user.institution} />
                  <InfoCard icon={BookOpen} label="Class / Year" value={profile.classLevel || user.classLevel} />
                  <InfoCard icon={BookOpen} label="Department" value={profile.department} />
                  <InfoCard icon={BookOpen} label="Program" value={profile.program} />
                  <InfoCard icon={BookOpen} label="Student ID" value={profile.studentId} />
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-400" />
                  Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <InfoCard icon={Calendar} label="Account Created" value={formatDateTime(user.createdAt)} />
                  <InfoCard icon={Clock} label="Last Login" value={formatDateTime(user.lastLoginAt)} />
                  <InfoCard icon={CheckCircle} label="Profile Complete" value={user.profileComplete ? 'Yes' : 'No'} />
                  <InfoCard icon={User} label="Account Status" value={user.isActive ? 'Active (7d)' : 'Inactive'} />
                  <InfoCard icon={User} label="Logged In" value={user.isLoggedIn ? 'Yes' : 'No'} />
                  <InfoCard icon={Edit} label="Onboarding" value={user.onboardingSkipped ? 'Skipped' : user.profileComplete ? 'Completed' : 'Incomplete'} />
                </div>
              </div>

              {/* Premium Status */}
              {isPremium && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <h3 className="text-base font-bold text-amber-300 mb-3 flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Premium Subscription
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-amber-500/10 rounded-xl p-4">
                      <p className="text-amber-400/70 text-xs uppercase">Expires</p>
                      <p className="text-amber-300 font-medium">{formatDate(user.premiumUntil)}</p>
                    </div>
                    {user.premiumSource && (
                      <div className="bg-amber-500/10 rounded-xl p-4">
                        <p className="text-amber-400/70 text-xs uppercase">Source</p>
                        <p className="text-amber-300 font-medium">{user.premiumSource}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings */}
              {user.settings && (
                <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-purple-400" />
                    Settings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <InfoCard icon={CreditCard} label="Notifications" value={
                      user.settings.notifications?.enabled !== false ? 'Enabled' : 'Disabled'
                    } />
                    <InfoCard icon={CreditCard} label="PIN Set" value={user.pin ? 'Yes' : 'No'} />
                    <InfoCard icon={CreditCard} label="Parent PIN" value={user.parentPin ? 'Yes' : 'No'} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ACTIVITY TAB ═══ */}
          {activeTab === 'activity' && (
            <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
              <h3 className="text-base font-bold text-white mb-4">Recent Activity</h3>

              {user.recentActivity?.length > 0 ? (
                <div className="space-y-3">
                  {user.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3.5 bg-surface-800 rounded-xl">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-500/15 text-red-400 shrink-0">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{activity.description}</p>
                        <p className="text-surface-400 text-xs">{activity.amount}</p>
                        {activity.note && (
                          <p className="text-surface-500 text-xs mt-0.5">{activity.note}</p>
                        )}
                      </div>
                      <p className="text-surface-500 text-xs shrink-0">{formatDate(activity.date)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-surface-400 text-center py-8">No recent activity</p>
              )}
            </div>
          )}

          {/* ═══ EXPENSES TAB ═══ */}
          {activeTab === 'expenses' && (
            <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Expenses ({user._count?.expenses || 0})
                </h3>
                <p className="text-surface-400 text-sm">
                  Total: <span className="text-white font-bold">
                    {currency} {(user.totalExpenses || 0).toLocaleString()}
                  </span>
                </p>
              </div>

              {user.expenses?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface-800/60">
                      <tr>
                        <th className="text-left text-xs font-medium text-surface-400 uppercase px-4 py-3 rounded-tl-lg">Type</th>
                        <th className="text-left text-xs font-medium text-surface-400 uppercase px-4 py-3">Note</th>
                        <th className="text-right text-xs font-medium text-surface-400 uppercase px-4 py-3">Amount</th>
                        <th className="text-left text-xs font-medium text-surface-400 uppercase px-4 py-3 rounded-tr-lg">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {user.expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-surface-800/30">
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 rounded text-xs">
                              {expense.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white text-sm">{expense.note || '--'}</td>
                          <td className="px-4 py-3 text-right text-white font-medium text-sm">
                            {currency} {(expense.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-surface-400 text-sm">{formatDate(expense.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-surface-400 text-center py-8">No expenses recorded</p>
              )}
            </div>
          )}

          {/* ═══ SEMESTERS TAB ═══ */}
          {activeTab === 'semesters' && (
            <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
              <h3 className="text-base font-bold text-white mb-4">
                Semesters ({user.semesters?.length || 0})
              </h3>

              {user.semesters?.length > 0 ? (
                <div className="space-y-3">
                  {user.semesters.map((sem) => {
                    const courses = Array.isArray(sem.courses) ? sem.courses : [];
                    const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
                    return (
                      <div key={sem.id} className="bg-surface-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium">{sem.name}</p>
                          <div className="flex items-center gap-2">
                            {sem.dropped && (
                              <span className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded text-xs">Dropped</span>
                            )}
                            <span className="text-surface-400 text-xs">{formatDate(sem.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-surface-400">{courses.length} courses</span>
                          <span className="text-surface-400">{totalCredits} credits</span>
                        </div>
                        {courses.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {courses.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-1 px-2 bg-surface-700/50 rounded">
                                <span className="text-surface-300">{c.name || c.code || `Course ${i + 1}`}</span>
                                <span className="text-surface-400">{c.credits || 0} cr</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-surface-400 text-center py-8">No semesters recorded</p>
              )}
            </div>
          )}

          {/* ═══ LOANS TAB ═══ */}
          {activeTab === 'loans' && (
            <div className="bg-surface-900 rounded-2xl p-5 border border-surface-800">
              <h3 className="text-base font-bold text-white mb-4">
                Loans ({user.loans?.length || 0})
              </h3>

              {user.loans?.length > 0 ? (
                <div className="space-y-3">
                  {user.loans.map((loan) => {
                    const payments = Array.isArray(loan.payments) ? loan.payments : [];
                    const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
                    return (
                      <div key={loan.id} className="bg-surface-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">{loan.loanType}</p>
                            {loan.purpose && <p className="text-surface-400 text-xs">{loan.purpose}</p>}
                          </div>
                          {loan.lender && (
                            <span className="px-2 py-0.5 bg-surface-700 text-surface-300 rounded text-xs">
                              {loan.lender}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-surface-400 text-xs">Principal</p>
                            <p className="text-white font-medium">{currency} {(loan.principal || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-surface-400 text-xs">Paid</p>
                            <p className="text-green-400 font-medium">{currency} {totalPaid.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-surface-400 text-xs">Rate</p>
                            <p className="text-white">{loan.annualRate || 0}% / year</p>
                          </div>
                          <div>
                            <p className="text-surface-400 text-xs">Tenure</p>
                            <p className="text-white">{loan.tenureMonths || 0} months</p>
                          </div>
                        </div>
                        {payments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface-700">
                            <p className="text-surface-400 text-xs mb-2">{payments.length} payment(s)</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-surface-400 text-center py-8">No loans recorded</p>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminUserDetailPage;
