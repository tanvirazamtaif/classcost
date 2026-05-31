import React from 'react';

// Soft, modern toast styles. `warn` uses translucent amber + dark text so it
// reads as friendly nudge instead of alarming error. `error` stays red for real
// failures (e.g. "Failed to save").
const TOAST_STYLES = {
  success: "bg-emerald-500 text-white",
  error:   "bg-red-500 text-white",
  warn:    "bg-amber-100/90 text-amber-900 border border-amber-300/60 backdrop-blur-md",
  info:    "bg-slate-800 text-white",
};

export const ToastContainer = React.memo(({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-80" role="status" aria-live="polite">
    {toasts.map((t) => (
      <div
        key={t.id}
        style={{ animation: "slideDown .3s ease" }}
        className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-center ${TOAST_STYLES[t.type] || TOAST_STYLES.info}`}
      >
        {t.msg}
      </div>
    ))}
  </div>
));

ToastContainer.displayName = 'ToastContainer';
