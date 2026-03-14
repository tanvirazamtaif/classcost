import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { haptics } from '../../lib/haptics';

export const FAB = ({ onClick }) => {
  const handleClick = () => {
    haptics.medium();
    onClick?.();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary-600 text-white rounded-full shadow-fab flex items-center justify-center"
      aria-label="Add payment"
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  );
};
