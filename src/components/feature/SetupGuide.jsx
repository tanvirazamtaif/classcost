import React from 'react';

/**
 * Pulsing dot indicator for incomplete setup
 */
export const SetupDot = ({ show = true, color = 'red', size = 'sm' }) => {
  if (!show) return null;

  const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const colors = { red: 'bg-red-500', orange: 'bg-orange-500', yellow: 'bg-yellow-500', green: 'bg-green-500' };

  return (
    <span className="relative flex">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-75`} />
      <span className={`relative inline-flex rounded-full ${sizes[size]} ${colors[color]}`} />
    </span>
  );
};

/**
 * Setup progress indicator — shows which steps are complete/incomplete
 */
export const SetupProgress = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {steps.map((_, index) => (
      <div key={index} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
          index < currentStep
            ? 'bg-green-500 text-white'
            : index === currentStep
              ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30'
              : 'bg-slate-700 text-slate-400'
        }`}>
          {index < currentStep ? '✓' : index + 1}
        </div>
        {index < steps.length - 1 && (
          <div className={`w-8 h-1 mx-1 rounded ${index < currentStep ? 'bg-green-500' : 'bg-slate-700'}`} />
        )}
      </div>
    ))}
  </div>
);

/**
 * Tooltip hint for first-time users
 */
export const SetupHint = ({ children, show = true }) => {
  if (!show) return null;

  return (
    <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
      <span className="text-lg">💡</span>
      <p className="text-sm text-indigo-300">{children}</p>
    </div>
  );
};
