import { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';

const AppContext = createContext(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }) => {
  const [view, setView] = useLocalStorage("ut_v3_view", "landing");
  const [user, setUser] = useLocalStorage("ut_v3_user", null);
  const [expenses, setExpenses] = useLocalStorage("ut_v3_expenses", []);
  const [semesters, setSemesters] = useLocalStorage("ut_v3_semesters", []);
  const [loans, setLoans] = useLocalStorage("ut_v3_loans", []);
  const [notifications, setNotifications] = useLocalStorage("ut_v3_notifs", {
    enabled: true, canteen: true, transport: true,
  });
  const { toasts, addToast } = useToast();

  const navigate = (v) => setView(v);

  useEffect(() => {
    if (user?.isLoggedIn) {
      if (!user.profileComplete && !user.onboardingSkipped) setView("onboarding");
      else if (["landing", "otp"].includes(view)) setView("dashboard");
    }
  }, []);

  useEffect(() => {
    if (!user?.isLoggedIn || !notifications.enabled) return;
    const t = setTimeout(() => {
      const last = (type) => expenses.filter((e) => e.type === type).slice(-1)[0];
      const days = (e) => e ? Math.floor((Date.now() - new Date(e.date)) / 86400000) : 99;
      if (notifications.transport && days(last("transport")) >= 2) addToast("🚌 Log your transport!", "warn");
      else if (notifications.canteen && days(last("canteen")) >= 2) addToast("🍽️ Log your canteen!", "warn");
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
