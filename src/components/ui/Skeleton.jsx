import React from 'react';

const shimmer = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent`;

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const base = `${shimmer} rounded-xl bg-slate-200 dark:bg-slate-800`;

  if (variant === 'circle') {
    return <div className={`${base} rounded-full ${className}`} />;
  }
  if (variant === 'text') {
    return <div className={`${base} h-4 ${className}`} />;
  }
  return <div className={`${base} ${className}`} />;
};

export const DashboardSkeleton = ({ dark }) => {
  const bg = dark ? 'bg-slate-800' : 'bg-slate-200';
  const bgSoft = dark ? 'bg-slate-800/50' : 'bg-slate-100';

  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header skeleton */}
      <header className={`sticky top-0 z-30 border-b ${dark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} ${shimmer}`} />
            <div className={`w-24 h-5 rounded-lg ${bg} ${shimmer}`} />
          </div>
          <div className={`w-10 h-10 rounded-xl ${bg} ${shimmer}`} />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {/* Total Cost skeleton */}
        <div className="bg-gradient-to-br from-indigo-600/40 via-indigo-600/30 to-purple-700/30 rounded-3xl p-6 sm:p-8 mb-6">
          <div className={`w-20 h-3 rounded ${bgSoft} mb-3 ${shimmer}`} />
          <div className={`w-48 h-10 rounded-xl ${bgSoft} mb-3 ${shimmer}`} />
          <div className={`w-32 h-3 rounded ${bgSoft} ${shimmer}`} />
        </div>

        {/* Monthly Summary skeleton */}
        <div className={`mb-4 p-4 rounded-2xl border ${dark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
          <div className={`w-28 h-4 rounded ${bg} mb-3 ${shimmer}`} />
          <div className="flex items-center justify-between">
            <div>
              <div className={`w-24 h-7 rounded-lg ${bg} mb-1 ${shimmer}`} />
              <div className={`w-16 h-3 rounded ${bgSoft} ${shimmer}`} />
            </div>
            <div className={`w-16 h-14 rounded-xl ${bgSoft} ${shimmer}`} />
            <div className="text-right">
              <div className={`w-20 h-5 rounded-lg ${bg} mb-1 ml-auto ${shimmer}`} />
              <div className={`w-14 h-3 rounded ${bgSoft} ml-auto ${shimmer}`} />
            </div>
          </div>
        </div>

        {/* Category Cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`rounded-2xl p-4 sm:p-5 border ${dark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
              <div className={`w-10 h-10 rounded-xl ${bg} mb-3 ${shimmer}`} />
              <div className={`w-16 h-3 rounded ${bgSoft} mb-2 ${shimmer}`} />
              <div className={`w-24 h-6 rounded-lg ${bg} ${shimmer}`} />
            </div>
          ))}
        </div>
      </main>

    </div>
  );
};

export const ReportsSkeleton = ({ dark }) => {
  const bg = dark ? 'bg-slate-800' : 'bg-slate-200';
  const bgSoft = dark ? 'bg-slate-800/50' : 'bg-slate-100';

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className={`w-32 h-6 rounded-lg ${bg} ${shimmer}`} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`p-4 rounded-2xl border ${dark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
            <div className={`w-12 h-3 rounded ${bgSoft} mb-2 ${shimmer}`} />
            <div className={`w-20 h-5 rounded-lg ${bg} ${shimmer}`} />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className={`h-52 rounded-2xl border ${dark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'} ${shimmer}`} />

      {/* List items */}
      {[1, 2, 3].map(i => (
        <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl border ${dark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-white'}`}>
          <div className={`w-10 h-10 rounded-xl ${bg} ${shimmer}`} />
          <div className="flex-1">
            <div className={`w-24 h-4 rounded ${bg} mb-1.5 ${shimmer}`} />
            <div className={`w-16 h-3 rounded ${bgSoft} ${shimmer}`} />
          </div>
          <div className={`w-16 h-4 rounded ${bg} ${shimmer}`} />
        </div>
      ))}

    </div>
  );
};
