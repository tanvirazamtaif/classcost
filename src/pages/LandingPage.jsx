import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { sendOTP, googleSignIn } from '../api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const LandingPage = () => {
  const { navigate, setUser, addToast, loadUserData } = useApp();
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
      width: 320,
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
      navigate("dashboard");
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
      addToast("Code sent to your email!", "success");
      navigate("otp");
    } catch (e) {
      addToast(e.message || "Failed to send code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-slate-950 relative overflow-hidden">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />

      <button onClick={() => navigate("admin")} className="absolute top-4 right-4 text-white/20 hover:text-white/50 text-xs transition">Admin</button>

      <div className="relative z-10 w-full max-w-[380px]">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-1">ClassCost</h1>
          <p className="text-slate-400 text-sm">Smart expense tracking for students</p>
        </div>

        {/* Feature pills */}
        <div className="flex justify-center gap-2 mb-8">
          {["Expenses", "Loans", "Family"].map((label) => (
            <span key={label} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400 font-medium">
              {label}
            </span>
          ))}
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
          <h2 className="text-white text-lg font-semibold text-center mb-1">Get started</h2>
          <p className="text-slate-500 text-xs text-center mb-6">Sign in or create an account</p>

          {/* Google Sign-In */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div ref={googleBtnRef} className="flex justify-center mb-4" style={{ minHeight: 44 }} />
              {gLoading && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                  <span className="text-slate-400 text-xs">Signing in...</span>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-slate-500 text-xs font-medium">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </>
          )}

          {/* Email Input */}
          <div className="mb-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="Email address" onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              className="w-full rounded-xl bg-slate-800 border border-white/10 py-3 px-4 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
          </div>

          <button onClick={handleContinue} disabled={loading}
            className="w-full text-sm font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25">
            {loading
              ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />Sending code...</>
              : "Continue with Email"}
          </button>

          <p className="text-slate-600 text-xs text-center mt-3">We'll send a 6-digit verification code</p>
        </div>

      </div>
    </div>
  );
};
