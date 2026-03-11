import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU_GROUPS } from '../constants/education';

export const LandingPage = () => {
  const { navigate, setUser, addToast } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!email || !email.includes("@")) { addToast("Enter a valid email", "error"); return; }
    setLoading(true);
    setTimeout(() => {
      setUser((p) => ({ ...p, email, tempCode: "482913" }));
      setLoading(false);
      navigate("otp");
    }, 1000);
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
              <div className="text-white font-bold text-2xl" style={{ fontFamily: "'Fraunces',serif" }}>EduTrack</div>
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
              ? <><div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />Sending...</>
              : <><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</>}
          </button>
          <p className="text-white/30 text-xs text-center mt-2">No password · Code sent to email</p>
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
