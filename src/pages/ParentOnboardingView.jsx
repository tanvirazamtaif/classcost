import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Btn, Input } from '../components/ui';

const STEPS = [
  { title: 'About You', sub: 'Basic information' },
  { title: 'Link Your Child', sub: "Connect to your child's account" },
  { title: 'All Set!', sub: 'Your account is ready' },
];

export const ParentOnboardingView = () => {
  const { user, setUser, navigate, addToast, theme } = useApp();
  const d = theme === 'dark';

  useEffect(() => { document.title = 'Parent Setup — ClassCost'; }, []);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
  });
  const [inviteCode, setInviteCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkedChild, setLinkedChild] = useState(null);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleLinkChild = async () => {
    if (!inviteCode || inviteCode.length < 6) {
      addToast('Enter a valid 6-digit invite code', 'error');
      return;
    }
    setLinking(true);
    try {
      // TODO: Replace with real API call — api.linkChildByCode(inviteCode)
      console.log('Linking child with invite code:', inviteCode);
      // Simulate success for now
      setLinkedChild({ name: 'Child Account', code: inviteCode });
      addToast('Child linked successfully!', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to link child', 'error');
    } finally {
      setLinking(false);
    }
  };

  const handleFinish = () => {
    if (!form.fullName) {
      addToast('Please enter your name', 'error');
      return;
    }
    setUser(p => ({
      ...p,
      profile: { ...p?.profile, fullName: form.fullName, phone: form.phone },
      profileComplete: true,
    }));
    addToast('Profile ready!', 'success');
    navigate('dashboard');
  };

  const ProgBar = () => (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
              i <= step
                ? 'bg-indigo-600'
                : d ? 'bg-slate-700' : 'bg-slate-100'
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between">
        <span className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>
          Step {step + 1}/{STEPS.length}
        </span>
        <span className="text-xs font-semibold text-indigo-600">
          {Math.round((step / (STEPS.length - 1)) * 100)}% complete
        </span>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${d ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="text-sm font-bold text-indigo-600">ClassCost</div>
        <button
          onClick={() => {
            setUser(p => ({ ...p, onboardingSkipped: true, profileComplete: true }));
            navigate('dashboard');
          }}
          className={`text-sm ${d ? 'text-slate-500' : 'text-slate-400'}`}
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto pb-36">
        <ProgBar />
        <h2
          className={`text-xl font-bold mb-0.5 ${d ? 'text-white' : 'text-slate-900'}`}
          style={{ fontFamily: "'Fraunces',serif" }}
        >
          {STEPS[step].title}
        </h2>
        <p className={`text-sm mb-5 ${d ? 'text-slate-400' : 'text-slate-400'}`}>
          {STEPS[step].sub}
        </p>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <Input
              label="Full Name *"
              value={form.fullName}
              onChange={v => upd('fullName', v)}
              placeholder="Your full name"
              icon="👤"
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={v => upd('phone', v)}
              placeholder="Optional — for notifications"
              icon="📱"
              type="tel"
            />
            <div className={`rounded-2xl p-4 border ${d ? 'bg-slate-900 border-slate-800' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">👨‍👩‍👧</span>
                <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-slate-800'}`}>Parent Account</span>
              </div>
              <p className={`text-xs ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                You'll be able to monitor your child's education expenses, set budgets, and receive spending alerts.
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Link Child */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div className={`rounded-2xl p-4 border ${d ? 'bg-slate-900 border-slate-800' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔗</span>
                <span className={`text-sm font-semibold ${d ? 'text-white' : 'text-slate-800'}`}>How to link</span>
              </div>
              <ol className={`text-xs space-y-1.5 list-decimal list-inside ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>Ask your child to open their ClassCost app</li>
                <li>They go to Settings and find their Invite Code</li>
                <li>Enter the 6-digit code below</li>
              </ol>
            </div>

            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                Child's Invite Code
              </label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase())}
                placeholder="e.g. ABC123"
                maxLength={6}
                className={`w-full rounded-2xl border-2 py-3.5 px-4 text-center text-2xl font-bold tracking-[0.3em] outline-none transition ${
                  d
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-indigo-400'
                }`}
              />
            </div>

            {linkedChild ? (
              <div className={`rounded-2xl p-4 border-2 ${d ? 'bg-emerald-950 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <span className="text-white text-lg">✓</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${d ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      Child Linked!
                    </p>
                    <p className={`text-xs ${d ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      Code: {linkedChild.code}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Btn
                onClick={handleLinkChild}
                disabled={linking || inviteCode.length < 6}
                className="w-full"
                size="lg"
              >
                {linking ? 'Linking...' : 'Link Child'}
              </Btn>
            )}
          </div>
        )}

        {/* Step 2: Complete */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-5 pt-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🎉</span>
            </div>
            <div className="text-center">
              <h3 className={`text-lg font-bold mb-1 ${d ? 'text-white' : 'text-slate-900'}`}>
                Welcome, {form.fullName || 'Parent'}!
              </h3>
              <p className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>
                Your parent account is ready to use.
              </p>
            </div>

            {linkedChild && (
              <div className={`w-full rounded-2xl p-4 border ${d ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-xs font-semibold mb-1 ${d ? 'text-slate-400' : 'text-slate-500'}`}>LINKED CHILD</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <span className="text-lg">🎓</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${d ? 'text-white' : 'text-slate-800'}`}>{linkedChild.name}</p>
                    <p className={`text-xs ${d ? 'text-slate-500' : 'text-slate-400'}`}>Code: {linkedChild.code}</p>
                  </div>
                </div>
              </div>
            )}

            {!linkedChild && (
              <div className={`w-full rounded-2xl p-4 border ${d ? 'bg-slate-900 border-slate-800' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  <p className={`text-xs ${d ? 'text-slate-400' : 'text-slate-600'}`}>
                    You can link your child's account anytime from Settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className={`fixed bottom-0 left-0 right-0 border-t px-6 py-4 flex gap-3 ${
        d ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100'
      }`}>
        {step > 0 && (
          <Btn variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            ← Back
          </Btn>
        )}
        {step < 2 ? (
          <Btn
            onClick={() => {
              if (step === 0 && !form.fullName) {
                addToast('Please enter your name', 'error');
                return;
              }
              setStep(s => s + 1);
            }}
            className="flex-1"
            size="lg"
          >
            {step === 1 && !linkedChild ? 'Skip for Now →' : 'Continue →'}
          </Btn>
        ) : (
          <Btn variant="success" onClick={handleFinish} className="flex-1" size="lg">
            Go to Dashboard
          </Btn>
        )}
      </div>
    </div>
  );
};

export default ParentOnboardingView;
