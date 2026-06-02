import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Btn, Logo } from '../components/ui';

// ─── Minimal onboarding ─────────────────────────────────────────────────────
// Sign-up asks for one thing only: name.
//
// Everything else (institution, education level, currency, semester system) is
// deferred to contextual "Add" prompts on the dashboard. This gets the user to
// the app in seconds instead of forcing them to answer questions about a
// product they haven't even seen yet.
//
// Defaults applied silently on continue:
//   currency:  BDT  (user can change in Settings; ~99% of users are in BD)
//   eduType:   null (user picks an institution later, system infers level)
//   institution: null
//
// Existing users (profileComplete already true) bypass this wizard entirely.
// ────────────────────────────────────────────────────────────────────────────

export const OnboardingWizard = () => {
  const { user, setUser, navigate, addToast } = useApp();
  const [name, setName] = useState(user?.name || "");
  const inputRef = useRef(null);

  useEffect(() => {
    document.title = "Welcome — ClassCost";
    inputRef.current?.focus();
  }, []);

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      addToast("Please enter your name", "warn");
      inputRef.current?.focus();
      return;
    }
    setUser((p) => ({
      ...p,
      name: trimmed,
      currency: p?.currency || "BDT",
      profile: { ...(p?.profile || {}), fullName: trimmed },
      profileComplete: true,
      onboardingComplete: true,
    }));
    addToast(`Welcome, ${trimmed.split(' ')[0]}!`, "success");
    navigate("dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar — logo only, no Skip link (already the fastest possible onboarding) */}
      <div className="flex items-center px-6 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <Logo size={24} animated />
          <span className="text-sm font-bold text-indigo-600">ClassCost</span>
        </div>
      </div>

      {/* Centered welcome card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👋</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Fraunces',serif" }}>
              Welcome
            </h1>
            <p className="text-slate-500 text-sm">
              What should we call you?
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Full Name</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">👤</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                onKeyDown={(e) => { if (e.key === 'Enter') handleContinue(); }}
                className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>
            <Btn onClick={handleContinue} className="w-full mt-4">
              Continue →
            </Btn>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            You can add your school, college, or university anytime from the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
