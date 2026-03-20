import React, { Suspense, lazy, useState } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { EducationFeeProvider } from './contexts/EducationFeeContext';
import { V3Provider } from './contexts/V3Context';
import { isEnabled } from './lib/featureFlags';
import { ErrorBoundary, RoleSelection } from './components/feature';
import { ToastContainer, DashboardSkeleton, ReportsSkeleton, LoadingOverlay } from './components/ui';
import { Header, LayoutBottomNav, Sidebar } from './components/layout';

// Keep these as regular imports (needed on first load)
import { LandingPage } from './pages/LandingPage';
import { OTPVerification } from './pages/OTPVerification';

// Lazy load all other page components
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const ParentOnboardingView = lazy(() => import('./pages/ParentOnboardingView'));
const DashboardView = lazy(() => import('./pages/DashboardView').then(m => ({ default: m.DashboardView })));
const ParentDashboardView = lazy(() => import('./pages/ParentDashboardView'));
const DashboardV3 = lazy(() => import('./pages/DashboardV3'));
const ReportsView = lazy(() => import('./pages/ReportsView').then(m => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('./pages/SettingsView'));
const LoansView = lazy(() => import('./pages/LoansView'));
const EducationSetupView = lazy(() => import('./pages/EducationSetupView'));
const HistoricalDataView = lazy(() => import('./pages/HistoricalDataView'));
const BudgetSettingsView = lazy(() => import('./pages/BudgetSettingsView'));
const ScheduleView = lazy(() => import('./pages/ScheduleView').then(m => ({ default: m.ScheduleView })));
const EducationFeeFormPage = lazy(() => import('./pages/EducationFeeFormPage'));
const SemesterLandingPage = lazy(() => import('./pages/SemesterLandingPage'));
const AddSemesterPage = lazy(() => import('./pages/AddSemesterPage'));
const SemesterDetailPage = lazy(() => import('./pages/SemesterDetailPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const StudyMaterialsPage = lazy(() => import('./pages/StudyMaterialsPage'));
const HousingLandingPage = lazy(() => import('./pages/HousingLandingPage'));
const AddHousingPage = lazy(() => import('./pages/AddHousingPage'));
const HousingDetailPage = lazy(() => import('./pages/HousingDetailPage'));
const EducationHomePage = lazy(() => import('./pages/EducationHomePage'));
const InstitutionDetailPage = lazy(() => import('./pages/InstitutionDetailPage'));
const EntityDetailV3 = lazy(() => import('./pages/EntityDetailV3'));
const GeneralCostTrackerPage = lazy(() => import('./pages/GeneralCostTrackerPage'));
const ClubDetailPage = lazy(() => import('./pages/ClubDetailPage'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

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
  return <LoadingOverlay />;
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
        {view === "admin" && <AdminApp />}
        {view === "onboarding" && <OnboardingWizard />}
        {view === "parent-onboarding" && <ParentOnboardingView />}
        {view === "education-setup" && <EducationSetupView />}
        {view === "historical-data" && <HistoricalDataView />}
        {view === "dashboard" && (
          isEnabled('USE_NEW_ARCHITECTURE')
            ? <DashboardV3 />
            : (isParent ? <ParentDashboardView /> : <DashboardView />)
        )}
        {view === "education-fee-form" && <EducationFeeFormPage />}
        {view === "semester-landing" && <SemesterLandingPage />}
        {view === "add-semester" && <AddSemesterPage />}
        {view === "semester-detail" && <SemesterDetailPage />}
        {view === "transport" && <TransportPage />}
        {view === "study-materials" && <StudyMaterialsPage />}
        {view === "housing-landing" && <HousingLandingPage />}
        {view === "add-housing" && <AddHousingPage />}
        {view === "housing-detail" && <HousingDetailPage />}
        {view === "education-home" && <EducationHomePage />}
        {view === "institution-detail" && (
          isEnabled('USE_NEW_ARCHITECTURE')
            ? <EntityDetailV3 />
            : <InstitutionDetailPage />
        )}
        {view === "create-semester" && (
          <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a14' }}>
            <p style={{ color: '#71717a' }}>Create Semester — coming in Prompt 5</p>
          </div>
        )}
        {view === "general-cost-tracker" && <GeneralCostTrackerPage />}
        {view === "club-detail" && <ClubDetailPage />}
        {["reports", "settings", "loans", "budget-settings", "schedule"].includes(view) && (
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
            <V3Provider>
              <ViewRouter />
            </V3Provider>
          </EducationFeeProvider>
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
}
