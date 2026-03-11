import React from 'react';

const TOAST_STYLES = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warn: "bg-amber-500",
  info: "bg-slate-800",
};

export const ToastContainer = React.memo(({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-80" role="status" aria-live="polite">
    {toasts.map((t) => (
      <div
        key={t.id}
        style={{ animation: "slideDown .3s ease" }}
        className={`px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white text-center ${TOAST_STYLES[t.type] || TOAST_STYLES.info}`}
      >
        {t.msg}
      </div>
    ))}
  </div>
));

ToastContainer.displayName = 'ToastContainer';
