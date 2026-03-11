import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import * as api from '../api';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }) => {
  // Detect /admin URL path on initial load
  const initialView = (() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') return 'admin';
    return null;
  })();
  const [view, setView] = useLocalStorage("ut_v3_view", initialView || "landing");
  const [user, setUserLocal] = useLocalStorage("ut_v3_user", null);
  const [expenses, setExpensesLocal] = useLocalStorage("ut_v3_expenses", []);
  const [semesters, setSemestersLocal] = useLocalStorage("ut_v3_semesters", []);
  const [loans, setLoansLocal] = useLocalStorage("ut_v3_loans", []);
  const [notifications, setNotificationsLocal] = useLocalStorage("ut_v3_notifs", {
    enabled: true, canteen: true, transport: true,
  });
  const [syncing, setSyncing] = useState(false);
  const [theme, setThemeLocal] = useLocalStorage("ut_v3_theme", "dark");
  const { toasts, addToast } = useToast();

  const toggleTheme = useCallback(() => {
    setThemeLocal((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const navigate = (v) => setView(v);

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
          classLevel: u.classLevel, currency: u.currency, familyCode: u.familyCode,
          pin: u.pin, parentPin: u.parentPin, isLoggedIn: u.isLoggedIn,
          profileComplete: u.profileComplete, onboardingSkipped: u.onboardingSkipped,
          profile: u.profile || null,
        });
      } catch (e) { console.error('Failed to sync user:', e); }
    }
  }, [user]);

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

  // Handle /admin URL path — always show admin panel if URL is /admin
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      setView('admin');
    }
  }, []);

  // On initial load, if user is logged in, sync from server
  useEffect(() => {
    if (user?.isLoggedIn && user?.id) {
      loadUserData(user.id);
    }
  }, []);

  useEffect(() => {
    if (user?.isLoggedIn) {
      if (["landing", "otp"].includes(view)) setView("dashboard");
    }
  }, []);

  useEffect(() => {
    if (!user?.isLoggedIn || !notifications.enabled) return;
    const t = setTimeout(() => {
      const last = (type) => expenses.filter((e) => e.type === type).slice(-1)[0];
      const days = (e) => e ? Math.floor((Date.now() - new Date(e.date)) / 86400000) : 99;
      if (notifications.transport && days(last("transport")) >= 2) addToast("\u{1F68C} Log your transport!", "warn");
      else if (notifications.canteen && days(last("canteen")) >= 2) addToast("\u{1F37D}\uFE0F Log your canteen!", "warn");
    }, 2500);
    return () => clearTimeout(t);
  }, [user?.isLoggedIn]);

  const value = {
    view, navigate,
    user, setUser,
    expenses, setExpenses,
    semesters, setSemesters,
    loans, setLoans,
    notifications, setNotifications,
    toasts, addToast,
    theme, toggleTheme,
    // Server-synced helpers
    addExpense, removeExpense,
    addSemester, editSemester,
    addLoan, addLoanPayment,
    loadUserData,
    syncing,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
