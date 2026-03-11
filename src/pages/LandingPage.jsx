import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU_GROUPS } from '../constants/education';
import { sendOTP } from '../api';

export const LandingPage = () => {
  const { navigate, setUser, addToast } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900">
      <div className="absolute top-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      <button onClick={() => navigate("admin")} className="absolute top-5 right-5 text-white/30 hover:text-white/60 text-xs">Admin →</button>

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl border border-white/20">🎓</div>
            <div className="text-left">
              <div className="text-white font-bold text-2xl" style={{ fontFamily: "'Fraunces',serif" }}>ClassCost</div>
              <div className="text-white/50 text-xs">Education Expense Manager</div>
            </div>
          </div>
          <span className="inline-block px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30">🎉 2 Months Free Trial</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[["🎒", "Student", "Track daily expenses"], ["👨‍👩‍👦", "Parent Mode", "Switch with a PIN"], ["💳", "Loans", "Manage EMIs"]].map(([icon, label, sub]) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-white text-xs font-bold">{label}</div>
              <div className="text-white/40 text-xs mt-0.5 leading-tight">{sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-2xl">
          <p className="text-white/60 text-xs text-center mb-3">One account for the whole family</p>
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2">✉️</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              placeholder="yourname@gmail.com" onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              className="w-full rounded-2xl bg-white/10 border border-white/20 py-3 pl-12 pr-4 text-white placeholder-white/40 text-sm font-medium outline-none focus:border-white/50 transition" />
          </div>
          <button onClick={handleContinue} disabled={loading}
            className="w-full text-sm font-bold rounded-2xl py-3.5 flex items-center justify-center gap-3 transition active:scale-95 shadow-lg disabled:opacity-50 bg-white hover:bg-slate-50 text-indigo-700">
            {loading
              ? <><div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />Sending code...</>
              : <>✉️ Continue with Email</>}
          </button>
          <p className="text-white/30 text-xs text-center mt-2">No password · 6-digit code sent to your email</p>
        </div>

        <div className="mt-5 flex gap-2 flex-wrap justify-center">
          {EDU_GROUPS.map((g) => (
            <span key={g.id} className="text-xs text-white/40 flex items-center gap-1">{g.icon} {g.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
