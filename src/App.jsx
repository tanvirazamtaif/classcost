import { AppProvider, useApp } from './contexts/AppContext';
import { ErrorBoundary, BottomNav, RoleSelection } from './components/feature';
import { ToastContainer } from './components/ui';
import {
  LandingPage,
  OTPVerification,
  OnboardingWizard,
  ParentOnboardingView,
  DashboardView,
  ParentDashboardView,
  AddExpenseView,
  SemesterView,
  ReportsView,
  SettingsView,
  LoansView,
  EducationSetupView,
} from './pages';

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
      {view === "onboarding" && <OnboardingWizard />}
      {view === "parent-onboarding" && <ParentOnboardingView />}
      {view === "education-setup" && <EducationSetupView />}
      {view === "dashboard" && (isParent ? <ParentDashboardView /> : <DashboardView />)}
      {["add-daily", "semester", "reports", "settings", "loans"].includes(view) && (
        <InnerPage />
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
