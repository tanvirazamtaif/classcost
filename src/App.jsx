import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary } from './components/feature';
import { ToastContainer } from './components/ui';
import { BottomNav } from './components/feature';
import {
  LandingPage,
  OTPVerification,
  OnboardingWizard,
  DashboardView,
  AddExpenseView,
  SemesterView,
  ReportsView,
  SettingsView,
  StageUpgradeWizard,
  LoansView,
  AcademicJourneyView,
  ParentModeView,
  AdminPanel,
} from './pages';

// ─── Main App Shell ───────────────────────────────────────────────────────────
const MainApp = () => {
  const { view, navigate } = useApp();

  const tabMap = {
    dashboard: "home",
    "add-daily": "add",
    semester: "semester",
    reports: "reports",
    settings: "settings",
    loans: "loans",
  };

  const activeTab = tabMap[view] || "home";

  const pages = {
    home: <DashboardView />,
    add: <AddExpenseView />,
    loans: <LoansView />,
    reports: <ReportsView />,
    settings: <SettingsView />,
    semester: <SemesterView />,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto pb-24 px-4 pt-6">
        {pages[activeTab] || pages.home}
      </div>
      <BottomNav
        active={activeTab === "home" ? "dashboard" : activeTab === "add" ? "add-daily" : view}
        navigate={navigate}
      />
    </div>
  );
};

// ─── View Router ──────────────────────────────────────────────────────────────
const ViewRouter = () => {
  const { view, toasts } = useApp();

  return (
    <>
      <ToastContainer toasts={toasts} />
      {view === "landing" && <LandingPage />}
      {view === "otp" && <OTPVerification />}
      {view === "parent-mode" && <ParentModeView />}
      {view === "onboarding" && <OnboardingWizard />}
      {view === "stage-upgrade" && <StageUpgradeWizard />}
      {view === "academic-journey" && <AcademicJourneyView />}
      {view === "admin" && <AdminPanel />}
      {["dashboard", "add-daily", "semester", "reports", "settings", "loans"].includes(view) && (
        <MainApp />
      )}
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
          background: "#f8f7ff",
          minHeight: "100vh",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Fraunces:wght@600;700;800&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}html,body{background:#f8f7ff;overscroll-behavior:none}
          @keyframes slideDown{from{transform:translateY(-16px);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes slideup{from{transform:translateY(100%)}to{transform:translateY(0)}}
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
