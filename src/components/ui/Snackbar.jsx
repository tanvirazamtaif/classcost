import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Snackbar = ({ message, action, onClose }) => {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50"
      >
        <div className="bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 px-4 py-3 rounded-xl shadow-elevated flex items-center justify-between max-w-md mx-auto">
          <span className="text-sm">{message}</span>
          {action && (
            <button
              onClick={() => { action.onClick?.(); onClose?.(); }}
              className="text-primary-400 dark:text-primary-600 font-medium text-sm ml-4"
            >
              {action.label}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
