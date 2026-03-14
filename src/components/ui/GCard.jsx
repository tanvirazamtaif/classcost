import React from 'react';
import { motion } from 'framer-motion';

export const GCard = ({ children, className = '', onClick, hoverable = false }) => (
  <motion.div
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={`
      bg-white dark:bg-surface-900
      rounded-2xl border border-surface-200 dark:border-surface-800
      ${hoverable ? 'cursor-pointer hover:shadow-elevated transition-shadow' : ''}
      ${className}
    `}
  >
    {children}
  </motion.div>
);

export const GCardContent = ({ children, className = '' }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
