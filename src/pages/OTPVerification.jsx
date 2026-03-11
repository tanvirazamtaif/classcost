import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Btn } from '../components/ui';
import { verifyOTP, sendOTP } from '../api';

export const OTPVerification = () => {
  const { navigate, user, setUser, addToast, loadUserData } = useApp();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val.slice(-1); setOtp(n);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputs.current[5]?.focus();
      e.preventDefault();
    }
  };

  const verify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { addToast("Enter all 6 digits", "error"); return; }
    setLoading(true);
    try {
      const result = await verifyOTP(user?.email, code);
      setUser((p) => ({ ...p, ...result, isLoggedIn: true, trialStart: p?.trialStart || Date.now() }));
      addToast("Logged in!", "success");
      if (result.id) await loadUserData(result.id);
      navigate(result.profileComplete ? "dashboard" : "onboarding");
    } catch (e) {
      addToast(e.message || "Invalid code", "error");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      await sendOTP(user.email);
      addToast("New code sent!", "success");
    } catch (e) {
      addToast(e.message || "Failed to resend", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-950 to-purple-900">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("landing")} className="text-white/60 hover:text-white mb-8 flex items-center gap-2 text-sm">&larr; Back</button>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📨</div>
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Fraunces',serif" }}>Check your inbox</h2>
            <p className="text-slate-500 text-sm mt-2">6-digit code sent to <span className="text-indigo-600 font-semibold">{user?.email}</span></p>
            <p className="text-slate-400 text-xs mt-1">Check spam folder if you don't see it</p>
          </div>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {otp.map((v, i) => (
              <input key={i} ref={(el) => inputs.current[i] = el} value={v}
                onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKey(i, e)}
                maxLength={1} inputMode="numeric" aria-label={`Digit ${i + 1}`}
                className="w-11 h-14 rounded-xl border-2 border-slate-200 text-center text-xl font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-indigo-50 transition" />
            ))}
          </div>
          <Btn onClick={verify} className="w-full" size="lg" disabled={loading}>
            {loading ? "Verifying..." : "Verify & Continue →"}
          </Btn>
          <p className="text-center mt-4 text-sm text-slate-400">
            <button onClick={handleResend} disabled={resending} className="text-indigo-600 font-semibold hover:underline disabled:opacity-50">
              {resending ? "Sending..." : "Resend Code"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
