import React from 'react';
import { EDU, PROMOTION_CONFIG } from '../../constants/education';

const GRAD_MAP = {
  early: "from-rose-600 to-pink-500",
  school: "from-sky-600 to-cyan-500",
  college: "from-violet-600 to-purple-500",
  university: "from-indigo-600 to-blue-500",
  postgrad: "from-purple-600 to-fuchsia-500",
};

export const PromotionBanner = ({ profile, nextLevel, cfg, onPromote, onFailed, onSnooze }) => {
  const mod = EDU[profile?.educationLevel];
  const isManual = cfg?.mode === "manual";
  const grad = GRAD_MAP[mod?.group] || "from-indigo-600 to-purple-500";

  if (isManual) {
    return (
      <div style={{ animation: "slideup .4s cubic-bezier(.22,.61,.36,1) forwards" }}
        className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 shadow-xl flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">📅</div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">New {cfg?.termLabel} started?</p>
            <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">{cfg?.manualNote}</p>
            <button onClick={onSnooze} className="mt-2 text-xs text-amber-600 font-semibold underline">
              Remind me in {cfg?.snoozeDays} days
            </button>
          </div>
          <button onClick={onSnooze} className="text-amber-400 hover:text-amber-600 text-lg font-bold flex-shrink-0 ml-1">×</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Promotion check">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onSnooze} />
      <div style={{ animation: "slideup .4s cubic-bezier(.22,.61,.36,1) forwards" }}
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl pb-safe">
        <div className={`bg-gradient-to-r ${grad} rounded-t-3xl p-6 text-white`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">{mod?.icon}</div>
            <div>
              <p className="text-white/70 text-xs font-medium">Academic Year Update</p>
              <p className="text-white font-bold text-lg" style={{ fontFamily: "'Fraunces',serif" }}>Time to check in! 🎓</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/15 rounded-2xl px-4 py-3">
            <div className="text-center flex-1">
              <p className="text-white/60 text-xs mb-1">Currently</p>
              <p className="text-white font-bold text-sm">{profile?.classYear}</p>
            </div>
            <div className="text-white/60 text-2xl">→</div>
            <div className="text-center flex-1">
              <p className="text-white/60 text-xs mb-1">Next</p>
              <p className="text-white font-bold text-sm">{nextLevel}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-600 text-sm text-center mb-5 leading-relaxed">
            Did you successfully complete <span className="font-bold text-slate-800">{profile?.classYear}</span> and advance to{" "}
            <span className="font-bold text-slate-800">{nextLevel}</span>?
          </p>
          <div className="flex flex-col gap-3">
            <button onClick={onPromote}
              className={`w-full bg-gradient-to-r ${grad} text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition text-sm`}>
              ✅ Yes! I'm now {nextLevel}
            </button>
            <button onClick={onFailed}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl py-3.5 text-sm active:scale-95 transition">
              😞 I didn't pass — keep me at {profile?.classYear}
            </button>
            <button onClick={onSnooze}
              className="w-full text-slate-400 hover:text-slate-600 font-medium text-sm py-2 transition">
              ⏰ Ask me in {cfg?.snoozeDays} days
            </button>
          </div>

          {profile?.promotionHistory?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 mb-2">PAST PROMOTIONS</p>
              <div className="flex flex-col gap-1.5">
                {[...(profile.promotionHistory)].reverse().slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{h.result === "held_back" ? "😞" : "✅"}</span>
                    <span className="font-medium">{h.from}</span>
                    <span className="text-slate-300">→</span>
                    <span className={`font-medium ${h.result === "held_back" ? "text-amber-600" : "text-emerald-600"}`}>{h.to}</span>
                    <span className="ml-auto text-slate-300">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
