import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Btn } from '../components/ui';

export const OTPVerification = () => {
  const { navigate, user, setUser, addToast } = useApp();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);
  const [resent, setResent] = useState(false);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const verify = () => {
    if (otp.join("") === (user?.tempCode || "482913")) {
      setUser((p) => ({ ...p, isLoggedIn: true, trialStart: Date.now() }));
      addToast("✅ Logged in!", "success");
      navigate("onboarding");
    } else {
      addToast("Wrong code. Demo: 482913", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 to-purple-900">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("landing")} className="text-white/60 hover:text-white mb-8 flex items-center gap-2 text-sm">← Back</button>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📨</div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Fraunces',serif" }}>Check your inbox</h2>
            <p className="text-slate-500 text-sm mt-2">Code sent to <span className="text-indigo-600 font-semibold">{user?.email}</span></p>
            <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Demo: 482913</span>
          </div>
          <div className="flex gap-2 justify-center mb-6">
            {otp.map((v, i) => (
              <input key={i} ref={(el) => inputs.current[i] = el} value={v}
                onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKey(i, e)}
                maxLength={1} inputMode="numeric" aria-label={`Digit ${i + 1}`}
                className="w-11 h-14 rounded-xl border-2 border-slate-200 text-center text-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-indigo-50 transition" />
            ))}
          </div>
          <Btn onClick={verify} className="w-full" size="lg">Verify & Continue →</Btn>
          <p className="text-center mt-4 text-sm text-slate-400">
            <button onClick={() => { setResent(true); addToast("Resent!", "info"); }} disabled={resent} className="text-indigo-600 font-semibold hover:underline disabled:opacity-50">
              {resent ? "Sent!" : "Resend"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
