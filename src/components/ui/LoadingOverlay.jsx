import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export const LoadingOverlay = ({ message = 'Loading...', fullScreen = true }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090f] flex items-center justify-center">
        <LoadingSpinner size={72} message={message} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size={56} message={message} />
    </div>
  );
};
