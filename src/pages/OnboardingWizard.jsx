import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { EDU, EDU_GROUPS, INSTITUTIONS } from '../constants/education';
import { CURRENCIES } from '../constants/currencies';
import { HOSTEL_TYPES } from '../constants/categories';
import { Btn, Input, Select, Toggle } from '../components/ui';

export const OnboardingWizard = () => {
  const { user, setUser, navigate, addToast } = useApp();
  useEffect(() => { document.title = "Setup Profile — ClassCost"; }, []);
  const [step, setStep] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({
    fullName: "", educationLevel: "", variant: "",
    institutionName: "", classYear: "", semesterType: "tri", currency: "BDT",
    admissionFee: "",
    hasHostel: false, hostelFee: "", hostelType: "monthly",
    hasCoaching: false, coachingName: "", coachingFee: "", coachingFreq: "monthly",
    hasBatch: false, batchName: "", batchFee: "", batchFreq: "monthly",
    previousTransport: "", previousCanteen: "",
  });
  const [instQuery, setInstQuery] = useState("");
  const [showInstDrop, setShowInstDrop] = useState(false);
  const upd = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const mod = EDU[form.educationLevel];
  const allInsts = INSTITUTIONS[form.educationLevel] || [];
  const filteredInsts = allInsts.filter((u) => u.toLowerCase().includes(instQuery.toLowerCase()));

  // Dynamic placeholder based on education level
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
    { title: "Institution Details", sub: "Where do you study?" },
    { title: "Currency", sub: "Choose your preferred currency" },
    { title: "Recurring Costs", sub: "Coaching, batch, and other recurring fees" },
    { title: "Previous Costs", sub: "Any education expenses from before?" },
    { title: "All Set!", sub: "Your profile is ready" },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return true; // Welcome
      case 1: return !!form.educationLevel; // Education level required
      case 2: return true; // Institution type optional (some levels don't have variants)
      case 3: return !!form.fullName; // Name required
      case 4: return !!form.currency; // Currency required
      case 5: return true; // Recurring costs optional
      case 6: return true; // Previous costs optional
      default: return true;
    }
  };

  const handleFinish = () => {
    if (!form.fullName || !form.educationLevel) { addToast("Fill required fields", "error"); return; }
    setUser((p) => ({
      ...p,
      name: form.fullName,
      eduType: mod?.group || form.educationLevel,
      institution: form.institutionName,
      classLevel: form.classYear,
      currency: form.currency,
      profile: form,
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

        {/* Step 3: Institution Details (Name + Class/Year) */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Input label="Full Name *" value={form.fullName} onChange={(v) => upd("fullName", v)} placeholder="Your full name" icon="👤" />

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
                    <button key={u} onClick={() => { upd("institutionName", u); setInstQuery(u); setShowInstDrop(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 text-slate-700 font-medium border-b border-slate-50 last:border-0">
                      {mod?.icon} {u}
                    </button>
                  ))}
                  {instQuery && !filteredInsts.includes(instQuery) && (
                    <button onClick={() => { upd("institutionName", instQuery); setShowInstDrop(false); }}
                      className="w-full text-left px-4 py-3 text-sm text-indigo-600 font-semibold border-t border-slate-100">
                      + Use "{instQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>

            {mod && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">{mod.periodLabel} / Class</label>
                <div className="flex flex-wrap gap-2">
                  {mod.levels.map((y) => (
                    <button key={y} onClick={() => upd("classYear", y)}
                      className={`px-3.5 py-2 rounded-xl text-sm font-semibold border-2 transition ${form.classYear === y ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-600"}`}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mod?.hasSemesterChoice && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">Semester System</label>
                <div className="grid grid-cols-2 gap-3">
                  {(mod.semChoiceOptions || [{ v: "tri", l: "Trimester" }, { v: "bi", l: "Semester" }]).map((o) => (
                    <button key={o.v} onClick={() => upd("semesterType", o.v)}
                      className={`p-3 rounded-2xl text-left border-2 transition ${form.semesterType === o.v ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-slate-50"}`}>
                      <div className={`text-sm font-bold ${form.semesterType === o.v ? "text-indigo-700" : "text-slate-700"}`}>{o.l}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Currency ONLY */}
        {step === 4 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Preferred Currency</label>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map((c) => (
                <button key={c.id} onClick={() => upd("currency", c.id)}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition ${form.currency === c.id ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-white"}`}>
                  <span className="text-xl">{c.flag}</span>
                  <div className="text-left min-w-0">
                    <div className={`text-sm font-bold ${form.currency === c.id ? "text-indigo-700" : "text-slate-700"}`}>{c.symbol} {c.id}</div>
                    <div className="text-xs text-slate-400 truncate">{c.name}</div>
                  </div>
                  {form.currency === c.id && <span className="ml-auto text-indigo-600 text-sm">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Recurring Costs (Coaching, Batch, Hostel — CONSOLIDATED) */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 mb-1">Add any recurring education costs. You can skip if none apply.</p>

            {/* Coaching */}
            <div className={`p-4 rounded-2xl border-2 transition ${form.hasCoaching ? "border-violet-300 bg-violet-50" : "border-slate-100 bg-white"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-xl">📖</span><div><p className="font-bold text-slate-800 text-sm">Coaching Center</p><p className="text-xs text-slate-400">Private coaching fees</p></div></div>
                <Toggle label="" value={form.hasCoaching} onChange={(v) => upd("hasCoaching", v)} />
              </div>
              {form.hasCoaching && (
                <div className="flex flex-col gap-3 pt-3 border-t border-violet-100">
                  <Input label="Center Name" value={form.coachingName} onChange={(v) => upd("coachingName", v)} placeholder="e.g., Udvash, Unmesh" icon="🏫" />
                  <Input label="Monthly Fee" type="number" value={form.coachingFee} onChange={(v) => upd("coachingFee", v)} placeholder="e.g. 3000" icon="💰" />
                  <Select label="Frequency" value={form.coachingFreq} onChange={(v) => upd("coachingFreq", v)} icon="🔄"
                    options={[{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }, { value: "onetime", label: "One-time" }]} />
                </div>
              )}
            </div>

            {/* Batch */}
            <div className={`p-4 rounded-2xl border-2 transition ${form.hasBatch ? "border-amber-300 bg-amber-50" : "border-slate-100 bg-white"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><span className="text-xl">👥</span><div><p className="font-bold text-slate-800 text-sm">Batch / Program</p><p className="text-xs text-slate-400">Group coaching or program fee</p></div></div>
                <Toggle label="" value={form.hasBatch} onChange={(v) => upd("hasBatch", v)} />
              </div>
              {form.hasBatch && (
                <div className="flex flex-col gap-3 pt-3 border-t border-amber-100">
                  <Input label="Batch Name" value={form.batchName} onChange={(v) => upd("batchName", v)} placeholder="e.g., HSC 2025 Batch" icon="📋" />
                  <Input label="Fee Amount" type="number" value={form.batchFee} onChange={(v) => upd("batchFee", v)} placeholder="e.g. 15000" icon="💰" />
                  <Select label="Frequency" value={form.batchFreq} onChange={(v) => upd("batchFreq", v)} icon="🔄"
                    options={[{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "onetime", label: "One-time" }]} />
                </div>
              )}
            </div>

            {/* Hostel */}
            {mod?.hasHostel && (
              <div className={`p-4 rounded-2xl border-2 transition ${form.hasHostel ? "border-sky-300 bg-sky-50" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><span className="text-xl">🏠</span><div><p className="font-bold text-slate-800 text-sm">Hostel / Hall</p><p className="text-xs text-slate-400">Monthly accommodation</p></div></div>
                  <Toggle label="" value={form.hasHostel} onChange={(v) => upd("hasHostel", v)} />
                </div>
                {form.hasHostel && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-sky-100">
                    <Input label="Fee Amount" type="number" value={form.hostelFee} onChange={(v) => upd("hostelFee", v)} placeholder="e.g. 5000" icon="💰" />
                    <div className="flex flex-wrap gap-2">
                      {HOSTEL_TYPES.map((t) => (
                        <button key={t.id} onClick={() => upd("hostelType", t.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition ${form.hostelType === t.id ? "border-sky-500 bg-sky-100 text-sky-700" : "border-slate-100 bg-slate-50 text-slate-600"}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Previous Costs — ONE STEP for ALL categories */}
        {step === 6 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-500 mb-1">Have you already spent on education this year? Enter approximate totals. You can skip if none.</p>
            <Input label="Admission / Registration Fee" type="number" value={form.admissionFee} onChange={(v) => upd("admissionFee", v)} placeholder="Total paid so far" icon="💳" />
            <Input label="Previous Transport Cost" type="number" value={form.previousTransport} onChange={(v) => upd("previousTransport", v)} placeholder="Total spent before today" icon="🚌" />
            <Input label="Previous Canteen Cost" type="number" value={form.previousCanteen} onChange={(v) => upd("previousCanteen", v)} placeholder="Total spent before today" icon="🍽️" />
          </div>
        )}

        {/* Step 7: Finish */}
        {step === 7 && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="text-6xl">🎉</div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">You're All Set!</h3>
              <p className="text-sm text-slate-500 max-w-xs mb-4">Your profile is ready. Start tracking your education expenses now.</p>
              {form.institutionName && (
                <div className="bg-indigo-50 rounded-2xl p-3 inline-block">
                  <p className="text-sm text-indigo-700 font-medium">{mod?.icon} {form.institutionName}</p>
                  {form.classYear && <p className="text-xs text-indigo-500">{form.classYear}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
        {step > 0 && <Btn variant="secondary" onClick={() => setStep((s) => s - 1)} className="flex-1">← Back</Btn>}
        {step < 7
          ? <Btn onClick={() => { if (canProceed()) setStep((s) => s + 1); else addToast("Please complete this step", "error"); }} className="flex-1" size="lg">Continue →</Btn>
          : <Btn variant="success" onClick={handleFinish} className="flex-1" size="lg">Start Tracking!</Btn>}
      </div>
    </div>
  );
};
