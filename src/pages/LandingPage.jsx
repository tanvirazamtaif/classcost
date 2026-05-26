import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { sendOTP, googleSignIn } from '../api';
import { Logo } from '../components/ui';
import { useT } from '../lib/i18n';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LANDING_CATEGORIES = [
  { labelKey: 'cat.semesterFees', bgColor: 'rgba(99,102,241,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/></svg> },
  { labelKey: 'cat.transport', bgColor: 'rgba(59,130,246,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h5l3 5v5h-2M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM20 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg> },
  { labelKey: 'cat.housing', bgColor: 'rgba(34,197,94,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { labelKey: 'cat.food', bgColor: 'rgba(249,115,22,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg> },
  { labelKey: 'cat.studyMaterials', bgColor: 'rgba(245,158,11,.15)',
    icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
];

// ─── Language toggle ─────────────────────────────────────────────────────────
const LanguageToggle = ({ lang, setLang }) => (
  <div className="inline-flex rounded-full bg-white/[0.04] border border-white/[0.08] p-0.5 text-xs font-medium">
    <button
      onClick={() => setLang('en')}
      className={`px-3 py-1 rounded-full transition ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
      aria-pressed={lang === 'en'}
      aria-label="Switch to English"
    >
      EN
    </button>
    <button
      onClick={() => setLang('bn')}
      className={`px-3 py-1 rounded-full transition ${lang === 'bn' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
      aria-pressed={lang === 'bn'}
      aria-label="বাংলায় পরিবর্তন করুন"
    >
      বাং
    </button>
  </div>
);

export const LandingPage = () => {
  const { navigate, setUser, addToast, loadUserData, setSignupMethod } = useApp();
  const { t, lang, setLang } = useT();
  useEffect(() => { document.title = "ClassCost — Track Your Education Journey"; }, []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    // Google Identity Services locks its UI language at SCRIPT LOAD TIME via the
    // `hl` URL parameter — `locale` options on initialize/renderButton are
    // unreliable once the SDK has loaded. To honor the in-app EN/বাং toggle, we
    // tear down any previously loaded GSI script + global, then load a fresh
    // script with the matching `?hl=` parameter. When `lang` changes the whole
    // effect re-runs, swapping the script for the new locale.
    document.documentElement.lang = lang;

    let cancelled = false;

    const renderButtonNow = () => {
      if (cancelled || !window.google?.accounts || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 340,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    };

    // Remove any previously injected GSI scripts so the next load picks up the
    // new `hl` query parameter. Without this the browser will reuse the
    // already-evaluated script and keep the old language.
    document.querySelectorAll('script[data-classcost-gsi]').forEach((s) => s.remove());
    // Also force-evict the cached SDK globals so the fresh script reinitializes
    // with the new locale instead of short-circuiting on an existing instance.
    try {
      if (window.google?.accounts) {
        window.google.accounts.id?.cancel?.();
      }
      delete window.google;
    } catch { /* ignore — some browsers freeze this property after init */ }

    const script = document.createElement('script');
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(lang)}`;
    script.async = true;
    script.defer = true;
    script.dataset.classcostGsi = 'true';
    script.onload = renderButtonNow;
    script.onerror = () => console.warn('Google Identity Services script failed to load.');
    document.head.appendChild(script);

    return () => { cancelled = true; };
  }, [lang]);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) return;
    setGLoading(true);
    try {
      let result;
      try {
        // Preferred: backend verifies the credential signature and returns a server user record.
        result = await googleSignIn(response.credential);
      } catch (backendErr) {
        // Fallback: backend isn't running (common in dev). Decode the JWT client-side
        // so the user can still sign in. The JWT comes from Google's own SDK, so its
        // contents are trustworthy for non-production use. For production, run the
        // backend so the signature is actually verified.
        console.warn('Google sign-in: backend unreachable, using client-side decode.', backendErr?.message);
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        result = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          avatar: payload.picture,
          profileComplete: false,
        };
      }
      setUser((p) => ({
        ...p, ...result,
        isLoggedIn: true,
        trialStart: p?.trialStart || Date.now(),
      }));
      addToast("Signed in with Google!", "success");
      if (result.id) {
        try { await loadUserData(result.id); } catch { /* backend offline, skip */ }
      }
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
      try {
        await sendOTP(email);
        setUser((p) => ({ ...p, email, emailDemo: false }));
        setSignupMethod('email');
        addToast("Code sent to your email!", "success");
        navigate("otp");
      } catch (backendErr) {
        // Backend is unreachable or email service isn't configured — fall back
        // to a local demo flow so the user isn't stuck. They'll enter 482913 on
        // the OTP screen. Honest about the limitation via a toast + banner.
        console.warn('Email OTP backend failed, switching to demo mode:', backendErr?.message);
        setUser((p) => ({ ...p, email, emailDemo: true }));
        setSignupMethod('email');
        addToast(t('auth.emailFallbackToDemo'), 'info');
        navigate("otp");
      }
    } catch (e) {
      addToast(e.message || "Failed to send code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] relative overflow-hidden">

      {/* Background layers */}
      <div className="absolute top-[-200px] left-[20%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(99,102,241,.12),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-200px] right-[-5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(168,85,247,.1),transparent_60%)] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(59,130,246,.06),transparent_60%)] pointer-events-none" />

      {/* Grid pattern — right side (desktop) */}
      <div className="hidden lg:block absolute top-0 right-0 w-[55%] h-full pointer-events-none overflow-hidden opacity-[0.04]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Floating dots */}
      <div className="hidden lg:block absolute top-[15%] right-[8%] w-2 h-2 rounded-full bg-indigo-500/30 animate-landing-float-1" />
      <div className="hidden lg:block absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-purple-500/25 animate-landing-float-2" />
      <div className="hidden lg:block absolute top-[45%] right-[5%] w-2.5 h-2.5 rounded-full bg-blue-500/20 animate-landing-float-3" />
      <div className="hidden lg:block absolute bottom-[30%] right-[15%] w-2 h-2 rounded-full bg-indigo-400/20 animate-landing-float-1" />
      <div className="hidden lg:block absolute bottom-[20%] right-[30%] w-1.5 h-1.5 rounded-full bg-purple-400/25 animate-landing-float-2" />
      <div className="hidden lg:block absolute top-[60%] right-[40%] w-2 h-2 rounded-full bg-blue-400/15 animate-landing-float-3" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* Top bar — desktop */}
        <div className="hidden lg:flex items-center justify-between px-12 xl:px-20 py-6">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <span className="text-white text-lg font-bold tracking-tight">ClassCost</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t('nav.features')}</span>
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t('nav.about')}</span>
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t('nav.contact')}</span>
            <LanguageToggle lang={lang} setLang={setLang} />
          </div>
        </div>

        {/* Mobile-only floating language toggle (no top bar on mobile) */}
        <div className="lg:hidden absolute top-4 right-4 z-30">
          <LanguageToggle lang={lang} setLang={setLang} />
        </div>

        {/* Two-column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center">

          {/* LEFT */}
          <div className="hidden lg:flex flex-col justify-center pl-12 xl:pl-20 2xl:pl-28 pr-8">
            <div className="max-w-[520px]">
              <div className="animate-landing-fade-up flex items-center gap-2 px-4 py-2 bg-indigo-500/8 border border-indigo-500/15 rounded-full w-fit mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-indigo-300 font-medium tracking-wide uppercase">{t('landing.trustedBadge')}</span>
              </div>

              <h1 className="animate-landing-fade-up-d1 text-[44px] xl:text-[52px] 2xl:text-[60px] font-extrabold leading-[1.05] tracking-tight text-white mb-6">
                {t('landing.titleLine1')}
                <br />{t('landing.titleLine2Prefix')}{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{t('landing.titleHighlight')}</span>
                {t('landing.titleLine2Suffix') ? ' ' + t('landing.titleLine2Suffix') : ''}
              </h1>

              <p className="animate-landing-fade-up-d2 text-lg text-zinc-400 leading-relaxed mb-10 max-w-[440px]">
                {t('landing.subtitle')}
              </p>

              <div className="animate-landing-fade-up-d3 flex gap-10 mb-12">
                <div>
                  <div className="text-[32px] font-bold text-white">৳2.4M+</div>
                  <div className="text-sm text-zinc-600 mt-1">{t('landing.stat.expensesTracked')}</div>
                </div>
                <div className="w-px bg-zinc-800/50" />
                <div>
                  <div className="text-[32px] font-bold text-white">15+</div>
                  <div className="text-sm text-zinc-600 mt-1">{t('landing.stat.universities')}</div>
                </div>
                <div className="w-px bg-zinc-800/50" />
                <div>
                  <div className="text-[32px] font-bold text-white">{t('landing.stat.free')}</div>
                  <div className="text-sm text-zinc-600 mt-1">{t('landing.stat.forStudents')}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {LANDING_CATEGORIES.map((cat, i) => (
                  <div key={cat.labelKey} className="animate-landing-slide-in flex items-center gap-2 pl-1.5 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl backdrop-blur-sm"
                    style={{ animationDelay: `${i * 120}ms` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cat.bgColor }}>{cat.icon}</div>
                    <span className="text-[13px] text-zinc-400 font-medium">{t(cat.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center justify-center px-5 py-10 lg:py-0 min-h-screen lg:min-h-0 lg:pr-12 xl:pr-20">
            <div className="relative w-full max-w-[420px]">

              {/* Data cards — desktop */}
              <div className="hidden lg:block">
                <div className="absolute -top-6 -left-32 xl:-left-40 animate-landing-float-1 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,.4)] z-20">
                  <div className="text-[11px] text-zinc-500 mb-1 font-medium">BRACU · Spring 2026</div>
                  <div className="text-xl font-bold text-white">৳85,000</div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-medium">✓ Semester fee paid</div>
                </div>
                <div className="absolute -top-14 -right-10 xl:-right-16 animate-landing-float-2 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,.4)] z-20">
                  <div className="text-[11px] text-zinc-500 mb-1 font-medium">This month</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-white">৳12,400</span>
                    <span className="text-[10px] text-red-400 font-medium">↑ 8%</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[16, 24, 12, 28, 20].map((h, i) => (
                      <div key={i} className={`w-4 rounded-sm ${i === 4 ? 'bg-purple-400/80' : 'bg-indigo-500/70'}`} style={{ height: `${h}px` }} />
                    ))}
                  </div>
                </div>
                <div className="absolute -bottom-10 -left-24 xl:-left-32 animate-landing-float-3 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,.4)] z-20">
                  <div className="text-[11px] text-zinc-500 mb-2 font-medium">Today</div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">Transport</div>
                      <div className="text-[10px] text-zinc-600">CNG · 2:30 PM</div>
                    </div>
                    <div className="text-xs font-bold text-white">৳50</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white">Canteen</div>
                      <div className="text-[10px] text-zinc-600">Lunch · 1:15 PM</div>
                    </div>
                    <div className="text-xs font-bold text-white">৳120</div>
                  </div>
                </div>
              </div>

              {/* Mobile hero */}
              <div className="lg:hidden text-center mb-8">
                <Logo size={56} animated className="mb-4 mx-auto rounded-2xl" />
                <h1 className="text-white text-2xl font-bold tracking-tight mb-1">ClassCost</h1>
                <p className="text-zinc-500 text-sm">{t('landing.mobileTagline')}</p>
              </div>

              {/* AUTH CARD */}
              <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-8 lg:p-10 relative z-10 shadow-[0_20px_60px_rgba(0,0,0,.5)]">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <Logo size={52} animated className="rounded-2xl" />
                  </div>
                  <h2 className="text-white text-xl font-bold">{t('auth.getStarted')}</h2>
                  <p className="text-zinc-500 text-sm mt-1">{t('auth.signInOrCreate')}</p>
                </div>
                {GOOGLE_CLIENT_ID && (
                  <>
                    <div ref={googleBtnRef} className="flex justify-center mb-3" style={{ minHeight: 44 }} />
                    {gLoading && (
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                        <span className="text-zinc-500 text-xs">{t('auth.signingIn')}</span>
                      </div>
                    )}
                  </>
                )}
                {GOOGLE_CLIENT_ID && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-white/[0.06]" />
                    <span className="text-zinc-600 text-[11px]">{t('auth.or')}</span>
                    <div className="flex-1 h-px bg-white/[0.06]" />
                  </div>
                )}
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t('auth.emailPlaceholder')}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-4 text-white placeholder-zinc-600 text-sm outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition mb-3" />
                <button onClick={handleContinue} disabled={loading}
                  className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-600/20">
                  {loading ? <><div className="w-4 h-4 border-2 border-pink-300 border-t-white rounded-full animate-spin" />{t('auth.sendingCode')}</> : t('auth.continueWithEmail')}
                </button>
                <p className="text-zinc-600 text-[11px] text-center mt-3">{t('auth.codeHint')}</p>
              </div>

              {/* Mobile pills */}
              <div className="lg:hidden flex flex-wrap justify-center gap-2 mt-6">
                {LANDING_CATEGORIES.map((cat) => (
                  <div key={cat.labelKey} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: cat.bgColor }}>{cat.icon}</div>
                    <span className="text-[10px] text-zinc-500">{t(cat.labelKey)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
