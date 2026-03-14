import React from 'react';
import { motion } from 'framer-motion';

export const SuccessCheck = ({ size = 64 }) => (
  <div className="relative" style={{ width: size, height: size }}>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute inset-0 bg-success-50 rounded-full"
    />
    <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full">
      <motion.circle
        cx="25" cy="25" r="20"
        fill="none" stroke="#34a853" strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path
        d="M15 25 L22 32 L35 18"
        fill="none" stroke="#34a853" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
    </svg>
  </div>
);
