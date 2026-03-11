import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { usePromotion } from '../hooks/usePromotion';
import { usePrivacy } from '../hooks/usePrivacy';
import { EDU } from '../constants/education';
import { CURRENCIES } from '../constants/currencies';
import { makeFmt } from '../utils/format';
import { Card } from '../components/ui';
import { PINPad, CostSummaryCard, PromotionBanner } from '../components/feature';

const MOD_GRADIENT = {
  preprimary: "from-rose-700 via-rose-600 to-pink-600",
  primary: "from-sky-700 via-sky-600 to-cyan-600",
  junior: "from-teal-700 via-teal-600 to-emerald-600",
  secondary: "from-blue-700 via-blue-600 to-indigo-600",
  fullschool: "from-cyan-700 via-cyan-600 to-teal-600",
  hsc: "from-violet-700 via-violet-600 to-purple-600",
  degree_college: "from-amber-700 via-amber-600 to-orange-600",
  honours_college: "from-orange-700 via-orange-600 to-amber-600",
  undergrad_private: "from-indigo-700 via-indigo-600 to-purple-600",
  undergrad_public: "from-green-700 via-green-600 to-teal-600",
  masters: "from-purple-700 via-purple-600 to-fuchsia-600",
  research: "from-fuchsia-700 via-fuchsia-600 to-pink-600",
};

export const DashboardView = () => {
  const { user, setUser, expenses, semesters, loans, navigate } = useApp();
  const profile = user?.profile;
  const mod = EDU[profile?.educationLevel || "undergrad_private"];
  const fmt = makeFmt(profile?.currency || "BDT");

  const { showBanner, nextLevel, cfg, handlePromote, handleFailed, handleSnooze } = usePromotion(profile, setUser);
  const { priv, unlock, lock, setPIN } = usePrivacy();
  const [pinModal, setPinModal] = useState(null);
  const [shareModal, setShareModal] = useState(null);

  const handleLockToggle = () => {
    if (!priv.studentPIN) { setPinModal("set"); return; }
    if (priv.isLocked) { setPinModal("unlock"); } else { lock(); }
  };

  const handleRequestShare = (onSuccess) => {
    const sharePass = profile?.parentRestrictions?.sharePassword;
    if (!sharePass) return;
    setShareModal({ onSuccess });
  };

  const byType = (t) => expenses.filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
  const transport = byType("transport"), canteen = byType("canteen"), hostel = byType("hostel"),
    coaching = byType("coaching"), batch = byType("batch"), other = byType("other");
  const recent = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const gradClass = MOD_GRADIENT[profile?.educationLevel] || "from-indigo-700 via-indigo-600 to-purple-600";

  return (
    <div className="flex flex-col gap-5">
      {showBanner && nextLevel && (
        <PromotionBanner profile={profile} nextLevel={nextLevel} cfg={cfg}
          onPromote={handlePromote} onFailed={handleFailed} onSnooze={handleSnooze} />
      )}

      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPinModal(null)} />
          <div style={{ animation: "slideup .35s cubic-bezier(.22,.61,.36,1)" }}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            {pinModal === "set" && <PINPad mode="set" accentColor="indigo"
              onSuccess={(pin) => { setPIN(pin); setPinModal(null); }} onCancel={() => setPinModal(null)} />}
            {pinModal === "unlock" && <PINPad mode="verify" storedPIN={priv.studentPIN} accentColor="indigo"
              label="Enter your PIN to reveal" onSuccess={() => { unlock(priv.studentPIN); setPinModal(null); }}
              onCancel={() => setPinModal(null)} />}
          </div>
        </div>
      )}

      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShareModal(null)} />
          <div style={{ animation: "slideup .35s cubic-bezier(.22,.61,.36,1)" }}
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">👨‍👩‍👦</div>
              <p className="font-bold text-slate-800">Parent Shared This With You</p>
              <p className="text-slate-400 text-xs mt-1">Enter the share password your parent gave you</p>
            </div>
            <PINPad mode="verify"
              storedPIN={profile?.parentRestrictions?.sharePassword}
              accentColor="teal"
              label="Enter share password"
              onSuccess={() => { shareModal.onSuccess(); setShareModal(null); }}
              onCancel={() => setShareModal(null)} />
          </div>
        </div>
      )}

      <CostSummaryCard
        profile={profile} expenses={expenses} semesters={semesters} loans={loans}
        fmt={fmt} gradClass={gradClass} priv={priv}
        onLockToggle={handleLockToggle}
        onRequestShare={handleRequestShare}
      />

      {!profile?.fullName && (
        <button onClick={() => navigate("onboarding")} className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-3 w-full text-left">
          <div className="w-10 h-10 bg-amber-200 rounded-xl flex items-center justify-center text-xl">✨</div>
          <div><div className="text-amber-800 font-bold text-sm animate-pulse">Complete your profile →</div><div className="text-amber-600 text-xs">For better personalized tracking</div></div>
        </button>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[{ l: "Transport", v: transport, i: "🚌" }, { l: "Canteen", v: canteen, i: "🍽️" }, { l: "Hostel", v: hostel, i: "🏠" }, { l: "Coaching", v: coaching, i: "📖" }, { l: "Batch", v: batch, i: "👥" }, { l: "Others", v: other, i: "💸" }].map(({ l, v, i }) => (
          <Card key={l} className="p-3 text-center">
            <div className="text-xl mb-1">{i}</div>
            <p className="text-slate-400 text-xs">{l}</p>
            <p className="text-sm font-bold text-slate-800">{fmt(v)}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate("add-daily")} className="flex-1 bg-indigo-600 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition">
          ➕ Add Today's Expense
        </button>
        <button onClick={() => navigate("semester")} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-xl active:scale-95 transition">📚</button>
      </div>

      {(profile?.hasHostel || profile?.hasCoaching || profile?.hasBatch) && (
        <Card className="p-4 bg-gradient-to-r from-sky-50 to-violet-50 border-sky-100">
          <p className="text-xs font-bold text-slate-500 mb-2">RECURRING FEES</p>
          {profile?.hasHostel && <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">🏠 Hostel</span><span className="font-bold">{fmt(profile.hostelFee)}</span></div>}
          {profile?.hasCoaching && <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">📖 {profile.coachingName || "Coaching"}</span><span className="font-bold">{fmt(profile.coachingFee)}</span></div>}
          {profile?.hasBatch && <div className="flex justify-between text-sm"><span className="text-slate-600">👥 {profile.batchName || "Batch"}</span><span className="font-bold">{fmt(profile.batchFee)}</span></div>}
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">Recent Activity</h3>
          <button onClick={() => navigate("reports")} className="text-indigo-600 text-xs font-semibold">See All →</button>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-6"><div className="text-4xl mb-2">📭</div><p className="text-slate-400 text-sm">No expenses yet</p></div>
        ) : recent.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
            <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
              {{ transport: "🚌", canteen: "🍽️", hostel: "🏠", coaching: "📖", batch: "👥", other: "💸" }[e.type] || "📝"}
            </div>
            <div className="flex-1"><p className="text-sm font-semibold text-slate-700">{e.label || e.type}</p><p className="text-xs text-slate-400">{e.date}</p></div>
            <p className="text-sm font-bold text-slate-800">{fmt(e.amount)}</p>
          </div>
        ))}
      </Card>
    </div>
  );
};
