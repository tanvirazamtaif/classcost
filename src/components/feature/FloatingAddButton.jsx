import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';

export const FloatingAddButton = ({ onOpenForm }) => {
  const { theme } = useApp();
  const d = theme === 'dark';
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    { id: 'education', icon: '🎓', label: 'Education', color: 'from-purple-500 to-indigo-500' },
    { id: 'transport', icon: '🚌', label: 'Transport', color: 'from-blue-500 to-cyan-500' },
    { id: 'canteen', icon: '🍽️', label: 'Food', color: 'from-orange-500 to-red-500' },
    { id: 'hostel', icon: '🏠', label: 'Housing', color: 'from-green-500 to-emerald-500' },
    { id: 'books', icon: '📚', label: 'Books', color: 'from-violet-500 to-purple-500' },
  ];

  const handleCategoryClick = (categoryId) => {
    setIsExpanded(false);
    onOpenForm(categoryId);
  };

  return (
    <>
      {/* Overlay when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Category buttons (expanded state) */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      }`}>
        <div className="flex gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex flex-col items-center gap-1.5 transition-transform hover:scale-110`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-lg`}>
                {cat.icon}
              </div>
              <span className={`text-xs font-medium ${d ? 'text-white' : 'text-slate-700'}`}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-all duration-300 ${
          isExpanded ? 'rotate-45 scale-90' : 'rotate-0 scale-100'
        }`}
      >
        <span className="text-white text-3xl font-light leading-none">+</span>
      </button>
    </>
  );
};

export default FloatingAddButton;
