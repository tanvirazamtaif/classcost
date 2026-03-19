import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { sendOTP, googleSignIn } from '../api';
import { Logo } from '../components/ui';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LANDING_CATEGORIES = [
  { label: 'Semester fees', bgColor: 'rgba(99,102,241,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/></svg> },
  { label: 'Transport', bgColor: 'rgba(59,130,246,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h5l3 5v5h-2M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg> },
  { label: 'Housing', bgColor: 'rgba(34,197,94,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { label: 'Food', bgColor: 'rgba(249,115,22,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
  { label: 'Study materials', bgColor: 'rgba(245,158,11,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
];

export const LandingPage = () => {
  const { navigate, setUser, addToast, loadUserData, setSignupMethod } = useApp();
  useEffect(() => { document.title = "ClassCost — Track Your Education Journey"; }, []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
      locale: 'en',
    });

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      width: 340,
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      locale: 'en',
    });
  }, []);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) return;
    setGLoading(true);
    try {
      const result = await googleSignIn(response.credential);
      setUser((p) => ({
        ...p, ...result,
        isLoggedIn: true,
        trialStart: p?.trialStart || Date.now(),
      }));
      addToast("Signed in with Google!", "success");
      if (result.id) await loadUserData(result.id);
      if (result.profileComplete) {
        navigate("dashboard", { replace: true });
      } else {
        setSignupMethod('google');
        navigate("role-selection", { replace: true });
      }
    } catch (e) {
      addToast(e.message || "Google sign-in failed", "error");
    } finally {
      setGLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!email || !email.includes("@")) { addToast("Enter a valid email", "error"); return; }
    setLoading(true);
    try {
      await sendOTP(email);
      setUser((p) => ({ ...p, email }));
      setSignupMethod('email');
      addToast("Code sent to your email!", "success");
      navigate("otp");
    } catch (e) {
      addToast(e.message || "Failed to send code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] relative overflow-hidden">
      <div className="absolute top-[-100px] left-[30%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(99,102,241,.15),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[5%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(168,85,247,.1),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">

        {/* ═══ LEFT ═══ */}
        <div className="hidden lg:flex flex-col justify-center pl-12 xl:pl-20 2xl:pl-28 pr-8 py-12">
          <div className="max-w-[480px]">
            <div className="animate-landing-fade-up flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/15 rounded-full w-fit mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-xs text-indigo-300 font-medium">Trusted by 500+ students</span>
            </div>
            <h1 className="animate-landing-fade-up-d1 text-[40px] xl:text-[48px] 2xl:text-[54px] font-extrabold leading-[1.1] tracking-tight text-white mb-5">
              Track every taka<br />of your{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">education journey</span>
            </h1>
            <p className="animate-landing-fade-up-d2 text-base text-zinc-500 leading-relaxed mb-8 max-w-[420px]">
              From semester fees to rickshaw fares — ClassCost helps Bangladesh students see exactly where their money goes.
            </p>
            <div className="animate-landing-fade-up-d3 flex gap-8 mb-10">
              <div>
                <div className="text-[28px] font-bold text-white">৳2.4M+</div>
                <div className="text-xs text-zinc-600 mt-0.5">Expenses tracked</div>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <div className="text-[28px] font-bold text-white">15+</div>
                <div className="text-xs text-zinc-600 mt-0.5">Universities</div>
              </div>
              <div className="w-px bg-zinc-800" />
              <div>
                <div className="text-[28px] font-bold text-white">Free</div>
                <div className="text-xs text-zinc-600 mt-0.5">For students</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {LANDING_CATEGORIES.map((cat, i) => (
                <div key={cat.label} className="animate-landing-slide-in flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 bg-[#111118] border border-[#1e1e2a] rounded-xl"
                  style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center" style={{ background: cat.bgColor }}>{cat.icon}</div>
                  <span className="text-xs text-zinc-400 font-medium">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT ═══ */}
        <div className="flex items-center justify-center px-5 py-12 lg:py-0 min-h-screen lg:min-h-0">
          <div className="relative">

            {/* Floating cards — desktop only */}
            <div className="hidden lg:block">
              <div className="absolute -top-8 -left-28 xl:-left-36 animate-landing-float-1 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,.3)] z-0">
                <div className="text-[11px] text-zinc-600 mb-1">BRACU · Spring 2026</div>
                <div className="text-lg font-bold text-white">৳85,000</div>
                <div className="text-[10px] text-emerald-400 mt-0.5">✓ Semester fee paid</div>
              </div>
              <div className="absolute -top-16 -right-20 xl:-right-28 animate-landing-float-2 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,.3)] z-0">
                <div className="text-[11px] text-zinc-600 mb-1">This month</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-white">৳12,400</span>
                  <span className="text-[10px] text-red-400">↑ 8%</span>
                </div>
                <div className="flex gap-[3px] mt-1.5">
                  {[16, 24, 12, 28, 20].map((h, i) => (
                    <div key={i} className={`w-5 rounded-sm ${i === 4 ? 'bg-purple-400' : 'bg-indigo-500'}`} style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-12 -left-20 xl:-left-28 animate-landing-float-3 bg-[#111118] border border-[#1e1e2a] rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,.3)] z-0">
                <div className="text-[11px] text-zinc-600 mb-2">Today</div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-md bg-blue-500/15 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">University Transport</div>
                    <div className="text-[10px] text-zinc-600">CNG · 2:30 PM</div>
                  </div>
                  <div className="text-xs font-semibold text-white">৳50</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-orange-500/15 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white">Canteen</div>
                    <div className="text-[10px] text-zinc-600">Lunch · 1:15 PM</div>
                  </div>
                  <div className="text-xs font-semibold text-white">৳120</div>
                </div>
              </div>
            </div>

            {/* Mobile hero */}
            <div className="lg:hidden text-center mb-8">
              <Logo size={56} animated className="mb-4 mx-auto rounded-2xl" />
              <h1 className="text-white text-2xl font-bold tracking-tight mb-1">ClassCost</h1>
              <p className="text-zinc-500 text-sm">Smart expense tracking for students</p>
            </div>

            {/* AUTH CARD */}
            <div className="w-full max-w-[340px] lg:max-w-none lg:w-[400px] xl:w-[420px] bg-[#111118] border border-[#1e1e2a] rounded-[20px] p-7 lg:p-9 relative z-10 shadow-[0_16px_48px_rgba(0,0,0,.4)]">
              <div className="text-center mb-5">
                <div className="flex justify-center mb-3">
                  <Logo size={48} animated className="rounded-[14px]" />
                </div>
                <h2 className="text-white text-lg lg:text-xl font-bold">Get started</h2>
                <p className="text-zinc-600 text-xs mt-1">Sign in or create an account</p>
              </div>
              {GOOGLE_CLIENT_ID && (
                <>
                  <div ref={googleBtnRef} className="flex justify-center mb-3" style={{ minHeight: 44 }} />
                  {gLoading && (
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                      <span className="text-zinc-500 text-xs">Signing in...</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-zinc-600 text-[11px]">or</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                </>
              )}
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address"
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                className="w-full rounded-xl bg-[#1a1a24] border border-zinc-800 py-3 px-4 text-white placeholder-zinc-600 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition mb-3" />
              <button onClick={handleContinue} disabled={loading}
                className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white">
                {loading ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />Sending code...</> : "Continue with Email"}
              </button>
              <p className="text-zinc-700 text-[11px] text-center mt-3">We'll send a 6-digit code</p>
            </div>

            {/* Mobile pills */}
            <div className="lg:hidden flex flex-wrap justify-center gap-2 mt-6">
              {LANDING_CATEGORIES.map((cat) => (
                <div key={cat.label} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-[#111118] border border-[#1e1e2a] rounded-lg">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cat.bgColor }}>{cat.icon}</div>
                  <span className="text-[10px] text-zinc-500">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
