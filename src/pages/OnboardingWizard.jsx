import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, EDU_GROUPS, INSTITUTIONS } from '../constants/education';
import { CURRENCIES } from '../constants/currencies';
import { Btn, Input, Toggle } from '../components/ui';
import { validateInstitution } from '../utils/guardian';

export const OnboardingWizard = () => {
  const { user, setUser, navigate, addToast } = useApp();
  useEffect(() => { document.title = "Setup Profile — ClassCost"; }, []);
  const [step, setStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({
    fullName: "", educationLevel: "", variant: "",
    institutionName: "", currency: "BDT",
    hasCoaching: false, coachingName: "",
  });
  const [instQuery, setInstQuery] = useState("");
  const [showInstDrop, setShowInstDrop] = useState(false);
  const [guardianError, setGuardianError] = useState("");
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Guardian: validate institution when selected
  const selectInstitution = (name) => {
    const eduGroup = mod?.group || form.educationLevel;
    if (eduGroup && name) {
      const check = validateInstitution(name, eduGroup);
      if (!check.valid) { setGuardianError(check.error); return; }
      if (check.warning) { addToast(check.warning, "warning"); }
    }
    setGuardianError("");
    upd("institutionName", name);
    setInstQuery(name);
    setShowInstDrop(false);
  };

  const mod = EDU[form.educationLevel];
  const allInsts = INSTITUTIONS[form.educationLevel] || [];
  const filteredInsts = allInsts.filter((u) => u.toLowerCase().includes(instQuery.toLowerCase()));

  const getInstitutionPlaceholder = () => {
    const group = mod?.group;
    switch (group) {
      case 'early': return 'e.g., ABC Kindergarten';
      case 'school': return 'e.g., Dhaka Residential Model College';
      case 'college': return 'e.g., Notre Dame College';
      case 'university': return 'e.g., BUET, DU, NSU';
      case 'postgrad': return 'e.g., BUET, DU';
      default: return 'Enter institution name';
    }
  };

  const STEPS = [
    { title: "Welcome!", sub: "Let's set up your ClassCost profile" },
    { title: "Education Level", sub: "What stage of education are you in?" },
    { title: "Institution Type", sub: "What type of institution?" },
    { title: "Your Details", sub: "Tell us about yourself" },
    { title: "All Set!", sub: "Your profile is ready" },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return true;
      case 1: return !!form.educationLevel;
      case 2: return true;
      case 3: return !!form.fullName && !!form.currency;
      default: return true;
    }
  };

  const handleFinish = () => {
    if (!form.fullName || !form.educationLevel) { addToast("Fill required fields", "error"); return; }

    if (form.institutionName) {
      const eduGroup = mod?.group || form.educationLevel;
      const instCheck = validateInstitution(form.institutionName, eduGroup);
      if (!instCheck.valid) { addToast(instCheck.error, "error"); return; }
      if (instCheck.warning) addToast(instCheck.warning, "warning");
    }

    // Build institutions array — include onboarding institution
    const existingInstitutions = user?.profile?.institutions || [];
    const newInstitutions = [...existingInstitutions];
    if (form.institutionName && !existingInstitutions.some(i => i.name.toLowerCase() === form.institutionName.toLowerCase())) {
      newInstitutions.push({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: form.institutionName,
        type: mod?.group || 'university',
        addedAt: new Date().toISOString(),
        source: 'onboarding',
      });
    }

    setUser((p) => ({
      ...p,
      name: form.fullName,
      eduType: mod?.group || form.educationLevel,
      institution: form.institutionName,
      currency: form.currency,
      profile: {
        ...form,
        educationLevel: form.educationLevel,
        institutionName: form.institutionName,
        institutionType: form.variant || null,
        institutions: newInstitutions,
      },
      profileComplete: true,
      onboardingStep: STEPS.length,
      onboardingComplete: true,
    }));
    addToast("Profile ready!", "success");
    navigate("dashboard", { replace: true });
  };

  const ProgBar = () => (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-2">
        {STEPS.map((_, i) => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${i <= step ? "bg-indigo-600" : "bg-slate-100"}`} />)}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-slate-400">Step {step + 1}/{STEPS.length}</span>
        <span className="text-xs font-semibold text-indigo-600">{Math.round(step / (STEPS.length - 1) * 100)}% complete</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div className="text-sm font-bold text-indigo-600">ClassCost</div>
        <button onClick={() => { setUser((p) => ({ ...p, onboardingSkipped: true })); navigate("dashboard", { replace: true }); }} className="text-slate-400 text-sm">Skip</button>
      </div>

      <div className="flex-1 px-6 py-4 overflow-y-auto pb-36">
        <ProgBar />
        <h2 className="text-xl font-bold text-slate-900 mb-0.5" style={{ fontFamily: "'Fraunces',serif" }}>{STEPS[step].title}</h2>
        <p className="text-slate-400 text-sm mb-5">{STEPS[step].sub}</p>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🎓</div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Track Your Education Costs</h3>
              <p className="text-sm text-slate-500 max-w-xs">ClassCost helps you track tuition, coaching, tutors, and all education expenses in one place.</p>
            </div>
          </div>
        )}

        {/* Step 1: Education Level */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            {EDU_GROUPS.map((g) => (
              <div key={g.id}>
                <button onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition text-left ${selectedGroup === g.id ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${selectedGroup === g.id ? "text-indigo-700" : "text-slate-700"}`}>{g.label}</p>
                    <p className="text-xs text-slate-400">{g.ids.map((id) => EDU[id]?.shortLabel).join(" · ")}</p>
                  </div>
                  <span className="text-slate-300">{selectedGroup === g.id ? "▲" : "▾"}</span>
                </button>
                {selectedGroup === g.id && (
                  <div className="mt-2 ml-2 flex flex-col gap-2">
                    {g.ids.map((id) => { const m = EDU[id]; return (
                      <button key={id} onClick={() => upd("educationLevel", id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition ${form.educationLevel === id ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-slate-50 hover:border-slate-200"}`}>
                        <div className={`w-9 h-9 ${m.bgColor} rounded-xl flex items-center justify-center text-lg`}>{m.icon}</div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${form.educationLevel === id ? "text-indigo-700" : "text-slate-700"}`}>{m.label}</p>
                          <p className="text-xs text-slate-400">{m.desc}</p>
                        </div>
                        {form.educationLevel === id && <span className="text-indigo-600 font-bold">✓</span>}
                      </button>
                    ); })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Institution Type (Govt/Private) */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {mod && (
              <div className={`${mod.bgColor} rounded-2xl p-3 border ${mod.borderColor} flex items-center gap-2 mb-2`}>
                <span className="text-2xl">{mod.icon}</span>
                <div><p className="text-sm font-bold">{mod.label}</p><p className="text-xs text-slate-500">{mod.desc}</p></div>
              </div>
            )}
            {mod?.variants && mod.variants.length > 0 ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Institution Type</label>
                <div className="flex flex-col gap-2">
                  {mod.variants.map((v) => (
                    <button key={v.id || v.v} onClick={() => upd("variant", v.id || v.v)}
                      className={`p-3.5 rounded-2xl text-left border-2 transition ${form.variant === (v.id || v.v) ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                      <p className={`text-sm font-bold ${form.variant === (v.id || v.v) ? "text-indigo-700" : "text-slate-700"}`}>{v.label || v.l}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                <div className="text-3xl mb-2">{mod?.icon || "📚"}</div>
                <p className="text-slate-500 text-sm">No specific institution types for {mod?.label || "this level"}</p>
                <p className="text-slate-400 text-xs mt-1">Continue to the next step</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Your Details (SIMPLIFIED — no money, no class/year) */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Input label="Full Name *" value={form.fullName} onChange={(v) => upd("fullName", v)} placeholder="Your full name" icon="👤" />

            {/* Institution Name with autocomplete */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">{mod?.institutionLabel || "Institution Name"}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{mod?.icon || "🏫"}</span>
                <input value={instQuery || (instQuery === "" && form.institutionName ? form.institutionName : instQuery)}
                  onChange={(e) => { setInstQuery(e.target.value); upd("institutionName", ""); setShowInstDrop(true); }}
                  onFocus={() => setShowInstDrop(true)}
                  placeholder={getInstitutionPlaceholder()}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400" />
              </div>
              {showInstDrop && (
                <div className="absolute top-20 left-0 right-0 z-20 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-52 overflow-y-auto">
                  {(instQuery ? filteredInsts : allInsts.slice(0, 8)).map((u) => (
                    <button key={u} onClick={() => selectInstitution(u)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 text-slate-700 font-medium border-b border-slate-50 last:border-0">
                      {mod?.icon} {u}
                    </button>
                  ))}
                  {instQuery && !filteredInsts.includes(instQuery) && (
                    <button onClick={() => selectInstitution(instQuery)}
                      className="w-full text-left px-4 py-3 text-sm text-indigo-600 font-semibold border-t border-slate-100">
                      + Use "{instQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {guardianError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <span className="text-red-500 text-sm mt-0.5">❌</span>
                <div>
                  <p className="text-sm text-red-700 font-medium">{guardianError}</p>
                  <p className="text-xs text-red-500 mt-0.5">Please choose the correct institution for your education level.</p>
                </div>
              </div>
            )}

            {/* Currency — compact pills */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Currency</label>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.slice(0, 6).map((c) => (
                  <button key={c.id} onClick={() => upd("currency", c.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 flex items-center gap-1.5 transition ${
                      form.currency === c.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-white text-slate-600"
                    }`}>
                    <span>{c.flag}</span> {c.symbol} {c.id}
                    {form.currency === c.id && <span className="text-indigo-600">✓</span>}
                  </button>
                ))}
              </div>
              {!CURRENCIES.slice(0, 6).some(c => c.id === form.currency) && form.currency !== 'BDT' && (
                <p className="text-xs text-slate-400">Selected: {form.currency}</p>
              )}
            </div>

            {/* Coaching toggle — name only, NO fee */}
            <div className={`p-4 rounded-2xl border-2 transition ${form.hasCoaching ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-white"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📖</span>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Coaching Center</p>
                    <p className="text-xs text-slate-400">Do you go to any coaching?</p>
                  </div>
                </div>
                <Toggle label="" value={form.hasCoaching} onChange={(v) => upd("hasCoaching", v)} />
              </div>
              {form.hasCoaching && (
                <div className="pt-3 mt-3 border-t border-violet-100">
                  <Input label="Center Name" value={form.coachingName} onChange={(v) => upd("coachingName", v)} placeholder="e.g., Udvash, Unmesh" icon="🏫" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: All Set! */}
        {step === 4 && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🎉</div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">You're All Set!</h3>
              <p className="text-sm text-slate-500 max-w-xs mb-4">Your profile is ready. Start tracking your education expenses now.</p>
              {form.institutionName && (
                <div className="bg-indigo-50 rounded-2xl p-3 inline-block mb-2">
                  <p className="text-sm text-indigo-700 font-medium">{mod?.icon} {form.institutionName}</p>
                </div>
              )}
              {form.hasCoaching && form.coachingName && (
                <div className="bg-violet-50 rounded-2xl p-3 inline-block">
                  <p className="text-sm text-violet-700 font-medium">📖 {form.coachingName}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
        {step > 0 && <Btn variant="secondary" onClick={() => {
          const prevStep = step - 1;
          if (prevStep === 2 && (!mod?.variants || mod.variants.length === 0)) {
            setStep(1);
          } else {
            setStep(prevStep);
          }
        }} className="flex-1">← Back</Btn>}
        {step < 4
          ? <Btn onClick={() => {
              if (!canProceed()) { addToast("Please complete this step", "error"); return; }
              let nextStep = step + 1;
              if (nextStep === 2) {
                const selectedMod = EDU[form.educationLevel];
                if (!selectedMod?.variants || selectedMod.variants.length === 0) nextStep = 3;
              }
              setStep(nextStep);
            }} className="flex-1" size="lg">Continue →</Btn>
          : <Btn variant="success" onClick={handleFinish} className="flex-1" size="lg">Start Tracking!</Btn>}
      </div>
    </div>
  );
};
