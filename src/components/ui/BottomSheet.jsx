import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { haptics } from '../../lib/haptics';

export const BottomSheet = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  haptics.light();
                  onClose();
                }
              }}
              className="w-full bg-white dark:bg-surface-900 rounded-t-3xl max-h-[70vh] overflow-hidden pointer-events-auto"
              style={{ maxWidth: 480 }}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-surface-300 dark:bg-surface-700 rounded-full" />
              </div>
              {title && (
                <div className="flex items-center justify-between px-5 pb-4">
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{title}</h2>
                  <button
                    onClick={() => { haptics.light(); onClose(); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-surface-500" />
                  </button>
                </div>
              )}
              <div className="px-5 pb-8 overflow-y-auto max-h-[calc(70vh-80px)]">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
