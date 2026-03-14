import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import * as api from '../api';

const DEFAULT_USER = {
  id: null,
  email: null,
  accountType: 'student', // 'student' | 'parent'
  profileComplete: false,
  subscription: {
    planId: 'student_free',
    expiresAt: null,
    billingCycle: null, // 'monthly' | 'yearly' | null
  },
  linkedAccounts: [], // For parents: array of child user IDs
  inviteCode: null, // For students: their shareable invite code
  parentId: null, // For students: linked parent's user ID
};

/** Merge stored user with defaults so new fields always exist */
const mergeUserDefaults = (stored) => {
  if (!stored) return null;
  return {
    ...DEFAULT_USER,
    ...stored,
    subscription: { ...DEFAULT_USER.subscription, ...(stored.subscription || {}) },
    linkedAccounts: stored.linkedAccounts || DEFAULT_USER.linkedAccounts,
  };
};

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

// Valid views for deep linking — prevents navigating to invalid routes via URL
const VALID_VIEWS = new Set([
  'landing', 'otp', 'role-selection', 'onboarding', 'parent-onboarding',
  'education-setup', 'historical-data', 'budget-settings',
  'dashboard', 'add-daily', 'semester', 'reports', 'settings', 'loans',
]);

/** Read pathname on initial page load so direct links like /reports work */
const getInitialView = () => {
  // Support both clean URLs (/reports) and legacy hash URLs (/#reports)
  const path = window.location.pathname.slice(1);
  if (path && VALID_VIEWS.has(path)) return path;
  const hash = window.location.hash.slice(1);
  if (hash && VALID_VIEWS.has(hash)) return hash;
  return null; // fall through to localStorage default
};

export const AppProvider = ({ children }) => {
  const initialHash = getInitialView();
  const [view, setView] = useLocalStorage("ut_v3_view", "landing", initialHash);
  const [rawUser, setUserLocal] = useLocalStorage("ut_v3_user", null);
  const user = rawUser ? mergeUserDefaults(rawUser) : null;
  const [expenses, setExpensesLocal] = useLocalStorage("ut_v3_expenses", []);
  const [semesters, setSemestersLocal] = useLocalStorage("ut_v3_semesters", []);
  const [loans, setLoansLocal] = useLocalStorage("ut_v3_loans", []);
  const [notifications, setNotificationsLocal] = useLocalStorage("ut_v3_notifs", {
    enabled: true, canteen: true, transport: true,
  });
  const [syncing, setSyncing] = useState(false);
  const [pendingAccountType, setPendingAccountType] = useState(null); // temp during signup
  const [signupMethod, setSignupMethod] = useState(null); // 'email' | 'google' | null
  const [theme, setThemeLocal] = useLocalStorage("ut_v3_theme", "dark");
  const { toasts, addToast } = useToast();

  const toggleTheme = useCallback(() => {
    setThemeLocal((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // ─── Clean URL browser history navigation ──────────────────────────────
  const getViewFromPath = () => {
    const path = window.location.pathname.slice(1);
    if (path && VALID_VIEWS.has(path)) return path;
    // Legacy hash fallback
    const hash = window.location.hash.slice(1);
    if (hash && VALID_VIEWS.has(hash)) return hash;
    return null;
  };

  const navigate = useCallback((v, { replace = false } = {}) => {
    setView(v);
    if (replace) {
      window.history.replaceState({ view: v }, '', `/${v}`);
    } else {
      window.history.pushState({ view: v }, '', `/${v}`);
    }
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = (e) => {
      const v = e.state?.view || getViewFromPath();
      if (v) setView(v);
    };
    window.addEventListener('popstate', handlePopState);

    // Set initial URL if on root
    const currentPath = window.location.pathname.slice(1);
    if (!currentPath && !window.location.hash && view) {
      window.history.replaceState({ view }, '', `/${view}`);
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync user data from server on login
  const loadUserData = useCallback(async (userId) => {
    try {
      const [expData, semData, loanData, setData] = await Promise.all([
        api.getExpenses(userId),
        api.getSemesters(userId),
        api.getLoans(userId),
        api.getSettings(userId),
      ]);
      setExpensesLocal(expData);
      setSemestersLocal(semData);
      setLoansLocal(loanData);
      if (setData?.notifications) setNotificationsLocal(setData.notifications);
    } catch (e) {
      console.error('Failed to load user data:', e);
    }
  }, []);

  // Wrapped setters that sync to server
  const setUser = useCallback(async (newUser) => {
    const u = typeof newUser === 'function' ? newUser(user) : newUser;
    setUserLocal(u);
    if (u?.id) {
      try {
        await api.updateProfile(u.id, {
          name: u.name, eduType: u.eduType, institution: u.institution,
          classLevel: u.classLevel, currency: u.currency,
          pin: u.pin, parentPin: u.parentPin, isLoggedIn: u.isLoggedIn,
          profileComplete: u.profileComplete, onboardingSkipped: u.onboardingSkipped,
          profile: u.profile || null,
          accountType: u.accountType || 'student',
          subscription: u.subscription || DEFAULT_USER.subscription,
          linkedAccounts: u.linkedAccounts || [],
          inviteCode: u.inviteCode || null,
          parentId: u.parentId || null,
        });
      } catch (e) { console.error('Failed to sync user:', e); }
    }
  }, [user]);

  const updateSubscription = useCallback((subscriptionData) => {
    setUser(prev => ({
      ...prev,
      subscription: { ...prev.subscription, ...subscriptionData },
    }));
  }, [setUser]);

  const setAccountType = useCallback((type) => {
    setUser(prev => ({ ...prev, accountType: type }));
  }, [setUser]);

  const generateInviteCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
    let code = '';
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 6; i++) code += chars[arr[i] % chars.length];
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setUser(prev => ({ ...prev, inviteCode: code, inviteCodeExpiresAt: expiresAt }));
    return { code, expiresAt };
  }, [setUser]);

  const setExpenses = useCallback(async (newExpenses) => {
    const exps = typeof newExpenses === 'function' ? newExpenses(expenses) : newExpenses;
    setExpensesLocal(exps);
    // Server sync happens via individual add/delete calls in page components
  }, [expenses]);

  const setSemesters = useCallback(async (newSemesters) => {
    const sems = typeof newSemesters === 'function' ? newSemesters(semesters) : newSemesters;
    setSemestersLocal(sems);
  }, [semesters]);

  const setLoans = useCallback(async (newLoans) => {
    const lns = typeof newLoans === 'function' ? newLoans(loans) : newLoans;
    setLoansLocal(lns);
  }, [loans]);

  const setNotifications = useCallback(async (newNotifs) => {
    const n = typeof newNotifs === 'function' ? newNotifs(notifications) : newNotifs;
    setNotificationsLocal(n);
    if (user?.id) {
      try { await api.updateSettings(user.id, { notifications: n }); }
      catch (e) { console.error('Failed to sync notifications:', e); }
    }
  }, [notifications, user?.id]);

  // Helper: add expense and sync to server
  const addExpense = useCallback(async (expense) => {
    setExpensesLocal(prev => [...prev, expense]);
    if (user?.id) {
      try {
        await api.createExpense({ ...expense, userId: user.id });
      } catch (e) { console.error('Failed to sync expense:', e); }
    }
  }, [user?.id]);

  // Helper: delete expense and sync to server
  const removeExpense = useCallback(async (expenseId) => {
    setExpensesLocal(prev => prev.filter(e => e.id !== expenseId));
    try { await api.deleteExpense(expenseId); }
    catch (e) { console.error('Failed to delete expense:', e); }
  }, []);

  // Helper: add semester and sync
  const addSemester = useCallback(async (semester) => {
    setSemestersLocal(prev => [...prev, semester]);
    if (user?.id) {
      try { await api.createSemester({ ...semester, userId: user.id }); }
      catch (e) { console.error('Failed to sync semester:', e); }
    }
  }, [user?.id]);

  // Helper: update semester and sync
  const editSemester = useCallback(async (id, data) => {
    setSemestersLocal(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    try { await api.updateSemester(id, data); }
    catch (e) { console.error('Failed to update semester:', e); }
  }, []);

  // Helper: add loan and sync
  const addLoan = useCallback(async (loan) => {
    setLoansLocal(prev => [...prev, loan]);
    if (user?.id) {
      try { await api.createLoan({ ...loan, userId: user.id }); }
      catch (e) { console.error('Failed to sync loan:', e); }
    }
  }, [user?.id]);

  // Helper: add loan payment and sync
  const addLoanPayment = useCallback(async (loanId, payment) => {
    setLoansLocal(prev => prev.map(l =>
      l.id === loanId ? { ...l, payments: [...(l.payments || []), payment] } : l
    ));
    try { await api.addLoanPayment(loanId, payment); }
    catch (e) { console.error('Failed to sync loan payment:', e); }
  }, []);

  // On initial load, if user is logged in, sync from server
  useEffect(() => {
    if (user?.isLoggedIn && user?.id) {
      loadUserData(user.id);
    }
  }, []);

  useEffect(() => {
    if (user?.isLoggedIn) {
      if (["landing", "otp", "role-selection"].includes(view)) {
        navigate("dashboard", { replace: true });
      }
    }
  }, []);

  // Nudge reminders moved to DashboardView as subtle dismissible tips

  const value = {
    view, navigate, goBack,
    user, setUser,
    expenses, setExpenses,
    semesters, setSemesters,
    loans, setLoans,
    notifications, setNotifications,
    toasts, addToast,
    theme, toggleTheme,
    updateSubscription, setAccountType, generateInviteCode,
    pendingAccountType, setPendingAccountType,
    signupMethod, setSignupMethod,
    // Server-synced helpers
    addExpense, removeExpense,
    addSemester, editSemester,
    addLoan, addLoanPayment,
    loadUserData,
    syncing,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
