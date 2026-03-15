import React, { Suspense, lazy, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { EducationFeeProvider } from './contexts/EducationFeeContext';
import { ErrorBoundary, RoleSelection } from './components/feature';
import { ToastContainer, DashboardSkeleton, ReportsSkeleton } from './components/ui';
import { Header, LayoutBottomNav, Sidebar } from './components/layout';

// Keep these as regular imports (needed on first load)
import { LandingPage } from './pages/LandingPage';
import { OTPVerification } from './pages/OTPVerification';

// Lazy load all other page components
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const ParentOnboardingView = lazy(() => import('./pages/ParentOnboardingView'));
const DashboardView = lazy(() => import('./pages/DashboardView').then(m => ({ default: m.DashboardView })));
const ParentDashboardView = lazy(() => import('./pages/ParentDashboardView'));
const SemesterView = lazy(() => import('./pages/SemesterView'));
const ReportsView = lazy(() => import('./pages/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./pages/SettingsView'));
const LoansView = lazy(() => import('./pages/LoansView'));
const EducationSetupView = lazy(() => import('./pages/EducationSetupView'));
const HistoricalDataView = lazy(() => import('./pages/HistoricalDataView'));
const BudgetSettingsView = lazy(() => import('./pages/BudgetSettingsView'));
const ScheduleView = lazy(() => import('./pages/ScheduleView').then(m => ({ default: m.ScheduleView })));
const EducationEntryPage = lazy(() => import('./pages/EducationEntryPage'));
const HousingEntryPage = lazy(() => import('./pages/HousingEntryPage'));
const BooksEntryPage = lazy(() => import('./pages/BooksEntryPage'));
const EducationFeePage = lazy(() => import('./pages/EducationFeePage'));
const EducationFeeFormPage = lazy(() => import('./pages/EducationFeeFormPage'));

// ─── Loading Fallback ────────────────────────────────────────────────────────
const PageLoader = ({ view, dark }) => {
  if (view === 'dashboard') return <DashboardSkeleton dark={dark} />;
  if (view === 'reports') return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="max-w-md mx-auto pb-24 px-4 pt-6">
        <ReportsSkeleton dark={dark} />
      </div>
    </div>
  );
  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-slate-50'} flex items-center justify-center`}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</p>
      </div>
    </div>
  );
};

// ─── Inner pages with bottom nav (non-dashboard) ─────────────────────────────
const InnerPage = () => {
  const { view, theme } = useApp();
  const d = theme === "dark";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pages = {
    loans: <LoansView />,
    reports: <ReportsView />,
    settings: <SettingsView />,
    semester: <SemesterView />,
    "budget-settings": <BudgetSettingsView />,
    schedule: <ScheduleView />,
  };

  return (
    <div className={`min-h-screen ${d ? "bg-surface-950" : "bg-surface-50"}`}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="max-w-md mx-auto pb-24 px-4 pt-6">
        {pages[view] || pages["loans"]}
      </div>
      <LayoutBottomNav />
    </div>
  );
};

// ─── View Router ──────────────────────────────────────────────────────────────
const ViewRouter = () => {
  const { view, toasts, user, theme } = useApp();
  const isParent = user?.accountType === 'parent';
  const dark = theme === 'dark';

  return (
    <>
      <ToastContainer toasts={toasts} />
      {view === "landing" && <LandingPage />}
      {view === "otp" && <OTPVerification />}
      {view === "role-selection" && <RoleSelection />}
      <Suspense fallback={<PageLoader view={view} dark={dark} />}>
        {view === "onboarding" && <OnboardingWizard />}
        {view === "parent-onboarding" && <ParentOnboardingView />}
        {view === "education-setup" && <EducationSetupView />}
        {view === "historical-data" && <HistoricalDataView />}
        {view === "dashboard" && (isParent ? <ParentDashboardView /> : <DashboardView />)}
        {view === "education-entry" && <EducationEntryPage />}
        {view === "housing-entry" && <HousingEntryPage />}
        {view === "books-entry" && <BooksEntryPage />}
        {view === "education-fees" && <EducationFeePage />}
        {view === "education-fee-form" && <EducationFeeFormPage />}
        {["semester", "reports", "settings", "loans", "budget-settings", "schedule"].includes(view) && (
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
          @keyframes shimmer{100%{transform:translateX(100%)}}
          .animate-slideup{animation:slideup .35s cubic-bezier(.22,.61,.36,1) forwards}
          .animate-spin{animation:spin 1s linear infinite}
          .animate-shake{animation:shake .5s ease}
          ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:4px}
          select{-webkit-appearance:none}
        `}</style>
        <AppProvider>
          <EducationFeeProvider>
            <ViewRouter />
          </EducationFeeProvider>
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
}
