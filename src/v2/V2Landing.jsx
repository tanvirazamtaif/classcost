// ClassCost v2 — marketing landing + auth (mirrors v1's LandingPage design).
// Full-width, fixed-dark; the auth card runs v2's own login (OTP + Google) → store.login.
import React, { useState, useRef, useEffect } from 'react';
import { GraduationCap, Bus, Building2, Utensils, BookOpen } from 'lucide-react';
import { useV2 } from './store';
import { sendOTP, verifyOTP, googleSignIn } from '../api';
import { Logo } from '../components/ui/Logo';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const CATS = [
  { en: 'Semester fees', bn: 'সেমিস্টার ফি', Icon: GraduationCap, color: '#818cf8', bg: 'rgba(99,102,241,.15)' },
  { en: 'Transport', bn: 'যাতায়াত', Icon: Bus, color: '#60a5fa', bg: 'rgba(59,130,246,.15)' },
  { en: 'Housing', bn: 'বাসা', Icon: Building2, color: '#4ade80', bg: 'rgba(34,197,94,.15)' },
  { en: 'Food', bn: 'খাবার', Icon: Utensils, color: '#fb923c', bg: 'rgba(249,115,22,.15)' },
  { en: 'Study materials', bn: 'বই-পত্র', Icon: BookOpen, color: '#fbbf24', bg: 'rgba(245,158,11,.15)' },
];

const T = (lang) => {
  const bn = lang === 'bn';
  return {
    features: bn ? 'ফিচার' : 'Features', about: bn ? 'সম্পর্কে' : 'About', contact: bn ? 'যোগাযোগ' : 'Contact',
    badge: bn ? '৫০০+ শিক্ষার্থীর আস্থা' : 'TRUSTED BY 500+ STUDENTS',
    titlePre: bn ? 'তোমার ' : 'Track every taka of your ',
    titleHi: bn ? 'পড়াশোনার' : 'education',
    titlePost: bn ? ' প্রতিটি টাকা হিসাব রাখো' : ' journey',
    subtitle: bn
      ? 'সেমিস্টার ফি থেকে রিকশা ভাড়া — ClassCost বাংলাদেশের শিক্ষার্থীদের দেখায় তাদের টাকা ঠিক কোথায় যাচ্ছে।'
      : 'From semester fees to rickshaw fares — ClassCost helps Bangladesh students see exactly where their money goes.',
    expensesTracked: bn ? 'খরচ ট্র্যাক করা' : 'Expenses tracked',
    universities: bn ? 'বিশ্ববিদ্যালয়' : 'Universities',
    free: bn ? 'ফ্রি' : 'Free', forStudents: bn ? 'শিক্ষার্থীদের জন্য' : 'For students',
    mobileTagline: bn ? 'তোমার পড়াশোনার খরচের সঙ্গী' : 'Your education money, sorted.',
    getStarted: bn ? 'শুরু করো' : 'Get started',
    signInOrCreate: bn ? 'সাইন ইন করো বা অ্যাকাউন্ট খোলো' : 'Sign in or create an account',
    or: bn ? 'অথবা' : 'or',
    emailPlaceholder: bn ? 'ইমেইল ঠিকানা' : 'Email address',
    continueWithEmail: bn ? 'ইমেইল দিয়ে চালিয়ে যাও' : 'Continue with Email',
    sending: bn ? 'কোড পাঠানো হচ্ছে…' : 'Sending…',
    codeHint: bn ? 'আমরা একটি ৬-সংখ্যার ভেরিফিকেশন কোড পাঠাবো' : "We'll send a 6-digit verification code",
    enterCode: (e) => bn ? `${e}-এ পাঠানো ৬-সংখ্যার কোড লিখো` : `Enter the 6-digit code sent to ${e}`,
    verify: bn ? 'যাচাই করে সাইন ইন করো' : 'Verify & sign in',
    verifying: bn ? 'যাচাই হচ্ছে…' : 'Verifying…',
    diffEmail: bn ? '← অন্য ইমেইল ব্যবহার করো' : '← Use a different email',
    signingIn: bn ? 'সাইন ইন হচ্ছে…' : 'Signing in…',
    guest: bn ? 'গেস্ট হিসেবে চালিয়ে যাও (ডেভ প্রিভিউ)' : 'Continue as guest (dev preview)',
  };
};

const LanguageToggle = ({ lang, setLang }) => (
  <div className="inline-flex rounded-full bg-white/[0.04] border border-white/[0.08] p-0.5 text-xs font-medium">
    {['en', 'bn'].map((l) => (
      <button key={l} onClick={() => setLang(l)}
        className={`px-3 py-1 rounded-full transition ${lang === l ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
        {l === 'en' ? 'EN' : 'বাং'}
      </button>
    ))}
  </div>
);

export function V2Landing({ onGuest }) {
  const { login } = useV2();
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('ut_v3_lang') || 'en'; } catch { return 'en'; } });
  const t = T(lang);
  const [stage, setStage] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [gBusy, setGBusy] = useState(false);
  const [err, setErr] = useState('');
  const googleBtnRef = useRef(null);
  const setLangP = (l) => { setLang(l); try { localStorage.setItem('ut_v3_lang', l); } catch { /* ignore */ } };

  const submitEmail = async () => {
    const e = email.trim(); if (!e || !e.includes('@') || busy) { if (!e.includes('@')) setErr('Enter a valid email'); return; }
    setBusy(true); setErr('');
    try { await sendOTP(e); setStage('code'); }
    catch (x) { setErr(x.message || 'Could not send the code. Is the server running?'); }
    finally { setBusy(false); }
  };
  const submitCode = async () => {
    if (busy) return; setBusy(true); setErr('');
    try { const res = await verifyOTP(email.trim(), code.trim()); await login(res); }
    catch (x) { setErr(x.message || 'Invalid or expired code.'); }
    finally { setBusy(false); }
  };
  const handleGoogleResponse = async (response) => {
    if (!response?.credential) return;
    setGBusy(true); setErr('');
    try {
      let result;
      try { result = await googleSignIn(response.credential); }
      catch { const p = JSON.parse(atob(response.credential.split('.')[1])); result = { id: p.sub, email: p.email, name: p.name || p.given_name || 'Student' }; }
      await login(result);
    } catch (x) { setErr(x.message || 'Google sign-in failed.'); }
    finally { setGBusy(false); }
  };
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || stage !== 'email') return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google?.accounts || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', width: 340, text: 'continue_with', shape: 'rectangular', logo_alignment: 'left' });
    };
    document.querySelectorAll('script[data-cc-gsi]').forEach((s) => s.remove());
    try { window.google?.accounts?.id?.cancel?.(); delete window.google; } catch { /* ignore */ }
    const script = document.createElement('script');
    script.src = `https://accounts.google.com/gsi/client?hl=${encodeURIComponent(lang)}`;
    script.async = true; script.defer = true; script.dataset.ccGsi = 'true';
    script.onload = render;
    document.head.appendChild(script);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, stage]);

  return (
    <div className="min-h-screen bg-[#09090f] relative overflow-hidden" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* background glows */}
      <div className="absolute top-[-200px] left-[20%] w-[700px] h-[700px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(99,102,241,.12), transparent 60%)' }} />
      <div className="absolute bottom-[-200px] right-[-5%] w-[600px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(168,85,247,.1), transparent 60%)' }} />
      <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,.06), transparent 60%)' }} />
      {/* floating dots (desktop) */}
      <div className="hidden lg:block absolute top-[15%] right-[8%] w-2 h-2 rounded-full bg-indigo-500/30 animate-landing-float-1" />
      <div className="hidden lg:block absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-purple-500/25 animate-landing-float-2" />
      <div className="hidden lg:block absolute top-[45%] right-[5%] w-2.5 h-2.5 rounded-full bg-blue-500/20 animate-landing-float-3" />
      <div className="hidden lg:block absolute bottom-[20%] right-[30%] w-1.5 h-1.5 rounded-full bg-purple-400/25 animate-landing-float-2" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* top bar (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-12 xl:px-20 py-6">
          <div className="flex items-center gap-3"><Logo size={32} /><span className="text-white text-lg font-bold tracking-tight">ClassCost</span></div>
          <div className="flex items-center gap-8">
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t.features}</span>
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t.about}</span>
            <span className="text-sm text-zinc-500 hover:text-zinc-300 transition cursor-default">{t.contact}</span>
            <LanguageToggle lang={lang} setLang={setLangP} />
          </div>
        </div>
        <div className="lg:hidden absolute top-4 right-4 z-30"><LanguageToggle lang={lang} setLang={setLangP} /></div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-center">
          {/* LEFT — hero (desktop) */}
          <div className="hidden lg:flex flex-col justify-center pl-12 xl:pl-20 2xl:pl-28 pr-8">
            <div className="max-w-[520px]">
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/[0.08] border border-indigo-500/[0.15] rounded-full w-fit mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-indigo-300 font-medium tracking-wide uppercase">{t.badge}</span>
              </div>
              <h1 className="text-[44px] xl:text-[52px] 2xl:text-[60px] font-extrabold leading-[1.05] tracking-tight text-white mb-6">
                {t.titlePre}<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{t.titleHi}</span>{t.titlePost}
              </h1>
              <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-[440px]">{t.subtitle}</p>
              <div className="flex gap-10 mb-12">
                <div><div className="text-[32px] font-bold text-white">৳2.4M+</div><div className="text-sm text-zinc-600 mt-1">{t.expensesTracked}</div></div>
                <div className="w-px bg-zinc-800/50" />
                <div><div className="text-[32px] font-bold text-white">15+</div><div className="text-sm text-zinc-600 mt-1">{t.universities}</div></div>
                <div className="w-px bg-zinc-800/50" />
                <div><div className="text-[32px] font-bold text-white">{t.free}</div><div className="text-sm text-zinc-600 mt-1">{t.forStudents}</div></div>
              </div>
              <div className="flex flex-wrap gap-3">
                {CATS.map(({ en, bn, Icon, color, bg }) => (
                  <div key={en} className="flex items-center gap-2 pl-1.5 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}><Icon size={13} color={color} /></div>
                    <span className="text-[13px] text-zinc-400 font-medium">{lang === 'bn' ? bn : en}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — auth card + floating cards */}
          <div className="flex items-center justify-center px-5 py-10 lg:py-0 min-h-screen lg:min-h-0 lg:pr-12 xl:pr-20">
            <div className="relative w-full max-w-[420px]">
              {/* floating data cards (desktop) */}
              <div className="hidden lg:block">
                <div className="absolute -top-6 -left-32 xl:-left-40 animate-landing-float-1 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 z-20" style={{ boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                  <div className="text-[11px] text-zinc-500 mb-1 font-medium">BRACU · Spring 2026</div>
                  <div className="text-xl font-bold text-white">৳85,000</div>
                  <div className="text-[10px] text-emerald-400 mt-1 font-medium">✓ Semester fee paid</div>
                </div>
                <div className="absolute -top-14 -right-10 xl:-right-16 animate-landing-float-2 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 z-20" style={{ boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                  <div className="text-[11px] text-zinc-500 mb-1 font-medium">This month</div>
                  <div className="flex items-baseline gap-1.5"><span className="text-xl font-bold text-white">৳12,400</span><span className="text-[10px] text-red-400 font-medium">↑ 8%</span></div>
                  <div className="flex gap-1 mt-2">{[16, 24, 12, 28, 20].map((h, i) => (<div key={i} className={`w-4 rounded-sm ${i === 4 ? 'bg-purple-400/80' : 'bg-indigo-500/70'}`} style={{ height: `${h}px` }} />))}</div>
                </div>
                <div className="absolute -bottom-10 -left-24 xl:-left-32 animate-landing-float-3 bg-[#111118]/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-4 z-20" style={{ boxShadow: '0 8px 32px rgba(0,0,0,.4)' }}>
                  <div className="text-[11px] text-zinc-500 mb-2 font-medium">Today</div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/[0.15] flex items-center justify-center"><Bus size={12} color="#60a5fa" /></div>
                    <div className="flex-1"><div className="text-xs font-medium text-white">Transport</div><div className="text-[10px] text-zinc-600">CNG · 2:30 PM</div></div>
                    <div className="text-xs font-bold text-white">৳50</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/[0.15] flex items-center justify-center"><Utensils size={12} color="#fb923c" /></div>
                    <div className="flex-1"><div className="text-xs font-medium text-white">Canteen</div><div className="text-[10px] text-zinc-600">Lunch · 1:15 PM</div></div>
                    <div className="text-xs font-bold text-white">৳120</div>
                  </div>
                </div>
              </div>

              {/* mobile hero */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex justify-center mb-4"><Logo size={56} animated /></div>
                <h1 className="text-white text-2xl font-bold tracking-tight mb-1">ClassCost</h1>
                <p className="text-zinc-500 text-sm">{t.mobileTagline}</p>
              </div>

              {/* AUTH CARD */}
              <div className="bg-[#111118]/80 backdrop-blur-xl border border-white/[0.08] rounded-[24px] p-8 lg:p-10 relative z-10" style={{ boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4"><Logo size={52} animated /></div>
                  <h2 className="text-white text-xl font-bold">{t.getStarted}</h2>
                  <p className="text-zinc-500 text-sm mt-1">{stage === 'email' ? t.signInOrCreate : t.enterCode(email)}</p>
                </div>

                {stage === 'email' ? (
                  <>
                    {GOOGLE_CLIENT_ID && (
                      <>
                        <div ref={googleBtnRef} className="flex justify-center mb-3" style={{ minHeight: 44 }} />
                        {gBusy && <div className="flex items-center justify-center gap-2 mb-3"><div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" /><span className="text-zinc-500 text-xs">{t.signingIn}</span></div>}
                        <div className="flex items-center gap-3 mb-4"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-zinc-600 text-[11px]">{t.or}</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
                      </>
                    )}
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t.emailPlaceholder}
                      onKeyDown={(e) => e.key === 'Enter' && submitEmail()}
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-4 text-white placeholder-zinc-600 text-sm outline-none focus:border-indigo-500/50 transition mb-3" />
                    <button onClick={submitEmail} disabled={busy}
                      className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-pink-600 hover:bg-pink-500 text-white" style={{ boxShadow: '0 10px 25px rgba(219,39,119,.2)' }}>
                      {busy ? <><div className="w-4 h-4 border-2 border-pink-300 border-t-white rounded-full animate-spin" />{t.sending}</> : t.continueWithEmail}
                    </button>
                    <p className="text-zinc-600 text-[11px] text-center mt-3">{t.codeHint}</p>
                  </>
                ) : (
                  <>
                    <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="------"
                      onKeyDown={(e) => e.key === 'Enter' && submitCode()} autoFocus
                      className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] py-3.5 px-4 text-white text-center text-lg tracking-[0.4em] placeholder-zinc-700 outline-none focus:border-indigo-500/50 transition mb-3" />
                    <button onClick={submitCode} disabled={busy || code.length < 4}
                      className="w-full text-sm font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-pink-600 hover:bg-pink-500 text-white" style={{ boxShadow: '0 10px 25px rgba(219,39,119,.2)' }}>
                      {busy ? <><div className="w-4 h-4 border-2 border-pink-300 border-t-white rounded-full animate-spin" />{t.verifying}</> : t.verify}
                    </button>
                    <button onClick={() => { setStage('email'); setCode(''); setErr(''); }} className="w-full text-zinc-500 text-xs mt-3 hover:text-zinc-300 transition">{t.diffEmail}</button>
                  </>
                )}
                {err && <p className="text-pink-400 text-[12px] text-center mt-3">{err}</p>}
              </div>

              {/* mobile pills */}
              <div className="lg:hidden flex flex-wrap justify-center gap-2 mt-6">
                {CATS.map(({ en, bn, Icon, color, bg }) => (
                  <div key={en} className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                    <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: bg }}><Icon size={11} color={color} /></div>
                    <span className="text-[10px] text-zinc-500">{lang === 'bn' ? bn : en}</span>
                  </div>
                ))}
              </div>

              {onGuest && <div className="text-center mt-6"><button onClick={onGuest} className="text-zinc-600 text-[12px] underline hover:text-zinc-400">{t.guest}</button></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default V2Landing;
