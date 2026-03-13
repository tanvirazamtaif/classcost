import React from 'react';

export const PullToRefreshIndicator = ({ pullDistance, isRefreshing, threshold = 80 }) => {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = pullDistance * 3;
  const opacity = Math.min(progress, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all"
      style={{ height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px` }}
    >
      <div
        className={`w-8 h-8 rounded-full border-indigo-500 border-t-transparent ${
          isRefreshing ? 'animate-spin' : ''
        }`}
        style={{
          opacity,
          transform: `rotate(${rotation}deg)`,
          borderWidth: '3px',
          borderStyle: 'solid',
        }}
      />
      {!isRefreshing && progress >= 1 && (
        <span className="ml-2 text-xs text-indigo-400">Release to refresh</span>
      )}
    </div>
  );
};

export default PullToRefreshIndicator;
