import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary, BottomNav, RoleSelection } from './components/feature';
import { ToastContainer } from './components/ui';

// Keep these as regular imports (needed on first load)
import { LandingPage } from './pages/LandingPage';
import { OTPVerification } from './pages/OTPVerification';

// Lazy load all other page components
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const ParentOnboardingView = lazy(() => import('./pages/ParentOnboardingView'));
const DashboardView = lazy(() => import('./pages/DashboardView').then(m => ({ default: m.DashboardView })));
const ParentDashboardView = lazy(() => import('./pages/ParentDashboardView'));
const AddExpenseView = lazy(() => import('./pages/AddExpenseView'));
const SemesterView = lazy(() => import('./pages/SemesterView'));
const ReportsView = lazy(() => import('./pages/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./pages/SettingsView'));
const LoansView = lazy(() => import('./pages/LoansView'));
const EducationSetupView = lazy(() => import('./pages/EducationSetupView'));
const HistoricalDataView = lazy(() => import('./pages/HistoricalDataView'));
const BudgetSettingsView = lazy(() => import('./pages/BudgetSettingsView'));

// ─── Loading Fallback ────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ─── Inner pages with bottom nav (non-dashboard) ─────────────────────────────
const InnerPage = () => {
  const { view, navigate, theme } = useApp();
  const d = theme === "dark";

  const pages = {
    "add-daily": <AddExpenseView />,
    loans: <LoansView />,
    reports: <ReportsView />,
    settings: <SettingsView />,
    semester: <SemesterView />,
  };

  return (
    <div className={`min-h-screen ${d ? "bg-slate-950" : "bg-slate-50"}`}>
      <div className="max-w-md mx-auto pb-24 px-4 pt-6">
        {pages[view] || pages["add-daily"]}
      </div>
      <BottomNav active={view} navigate={navigate} />
    </div>
  );
};

// ─── View Router ──────────────────────────────────────────────────────────────
const ViewRouter = () => {
  const { view, toasts, user } = useApp();
  const isParent = user?.accountType === 'parent';

  return (
    <>
      <ToastContainer toasts={toasts} />
      {view === "landing" && <LandingPage />}
      {view === "otp" && <OTPVerification />}
      {view === "role-selection" && <RoleSelection />}
      <Suspense fallback={<PageLoader />}>
        {view === "onboarding" && <OnboardingWizard />}
        {view === "parent-onboarding" && <ParentOnboardingView />}
        {view === "education-setup" && <EducationSetupView />}
        {view === "historical-data" && <HistoricalDataView />}
        {view === "budget-settings" && <BudgetSettingsView />}
        {view === "dashboard" && (isParent ? <ParentDashboardView /> : <DashboardView />)}
        {["add-daily", "semester", "reports", "settings", "loans"].includes(view) && (
          <InnerPage />
        )}
      </Suspense>
    </>
  );
};

// ─── Root Component ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <div
        style={{
          fontFamily: "'DM Sans',system-ui,sans-serif",
          minHeight: "100vh",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Fraunces:wght@600;700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}html,body{overscroll-behavior:none}
          @keyframes slideDown{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}
          @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
          .animate-slideup{animation:slideup .35s cubic-bezier(.22,.61,.36,1) forwards}
          .animate-spin{animation:spin 1s linear infinite}
          .animate-shake{animation:shake .5s ease}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
          select{-webkit-appearance:none}
        `}</style>
        <AppProvider>
          <ViewRouter />
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
}
