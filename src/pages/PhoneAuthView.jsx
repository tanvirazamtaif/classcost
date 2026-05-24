import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Logo } from '../components/ui';
import { sendPhoneOtp, mapFirebaseUserToAppUser, firebaseEnabled } from '../lib/firebase';

export default function PhoneAuthView() {
  const { navigate, setUser, addToast, loadUserData } = useApp();
  useEffect(() => { document.title = 'ClassCost — Sign in with phone'; }, []);

  // Two steps: 'phone' → enter number, 'otp' → enter 6-digit code
  const [step, setStep] = useState('phone');
  const [countryCode, setCountryCode] = useState('+880'); // Bangladesh default
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const confirmationRef = useRef(null);

  const fullPhone = `${countryCode}${phone.replace(/[^\d]/g, '')}`;

  const handleSend = async () => {
    if (!firebaseEnabled) {
      addToast('Firebase is not configured yet. See FIREBASE_SETUP.md', 'error');
      return;
    }
    if (!phone || phone.replace(/[^\d]/g, '').length < 7) {
      addToast('Enter a valid phone number', 'error');
      return;
    }
    setSending(true);
    try {
      const confirmation = await sendPhoneOtp(fullPhone, 'recaptcha-container');
      confirmationRef.current = confirmation;
      addToast('Code sent via SMS', 'success');
      setStep('otp');
    } catch (e) {
      console.error(e);
      addToast(e.message || 'Failed to send code', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!confirmationRef.current) {
      addToast('No verification in progress', 'error');
      return;
    }
    if (code.length !== 6) {
      addToast('Enter the 6-digit code', 'error');
      return;
    }
    setVerifying(true);
    try {
      const result = await confirmationRef.current.confirm(code);
      const appUser = mapFirebaseUserToAppUser(result.user, 'phone');
      setUser((p) => ({ ...p, ...appUser, trialStart: p?.trialStart || Date.now() }));
      addToast('Signed in!', 'success');
      if (appUser.id) {
        // Best-effort sync. Will silently fail if backend doesn't know the user yet.
        try { await loadUserData(appUser.id); } catch { /* ignore */ }
      }
      // New phone users go to role selection / onboarding.
      navigate('role-selection', { replace: true });
    } catch (e) {
      console.error(e);
      addToast(e.message || 'Invalid code', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] relative overflow-hidden flex items-center justify-center px-5 py-10">
      {/* Background gradients (matching landing) */}
      <div className="absolute top-[-200px] left-[20%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(99,102,241,.12),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(168,85,247,.1),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,.5)]">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Logo size={52} animated className="rounded-2xl" />
            </div>
            <h2 className="text-white text-xl font-bold">
              {step === 'phone' ? 'Sign in with phone' : 'Enter verification code'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {step === 'phone'
                ? "We'll send you a 6-digit code via SMS"
                : `Sent to ${fullPhone}`}
            </p>
          </div>

          {step === 'phone' && (
            <>
              <div className="flex gap-2 mb-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-3 text-white text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition"
                >
                  <option value="+880">🇧🇩 +880</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+92">🇵🇰 +92</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+60">🇲🇾 +60</option>
                </select>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="numeric"
                  placeholder="1XXXXXXXXX"
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-4 text-white placeholder-zinc-600 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Send verification code'
                )}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-4 text-white placeholder-zinc-600 text-center text-lg tracking-[0.5em] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition mb-3"
              />
              <button
                onClick={handleVerify}
                disabled={verifying || code.length !== 6}
                className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 mb-3"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and sign in'
                )}
              </button>
              <button
                onClick={() => { setStep('phone'); setCode(''); }}
                className="w-full text-zinc-500 text-xs hover:text-zinc-300 transition"
              >
                ← Use a different number
              </button>
            </>
          )}

          <button
            onClick={() => navigate('landing', { replace: true })}
            className="w-full mt-4 text-zinc-500 text-xs hover:text-zinc-300 transition"
          >
            Back to sign-in options
          </button>

          {/* Invisible reCAPTCHA target (Firebase Phone Auth requires this). */}
          <div id="recaptcha-container" />
        </div>
      </div>
    </div>
  );
}
