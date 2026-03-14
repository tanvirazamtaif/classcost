import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../lib/haptics';

const COLORS = {
  education: '#8b5cf6',
  transport: '#3b82f6',
  canteen: '#f97316',
  hostel: '#22c55e',
  books: '#eab308',
  uniform: '#64748b',
  other: '#9ca3af',
};

const LABELS = {
  education: 'Education',
  transport: 'Transport',
  canteen: 'Food',
  hostel: 'Housing',
  books: 'Books',
  uniform: 'Uniform',
  other: 'Other',
};

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
};

export const ExpenseChart = ({ expenses = [], currencySymbol = '৳' }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = useMemo(() => {
    const totals = {};
    expenses.forEach(exp => {
      const cat = exp.type || 'other';
      totals[cat] = (totals[cat] || 0) + (Number(exp.amount) || 0);
    });

    return Object.entries(totals)
      .filter(([_, value]) => value > 0)
      .map(([category, value]) => ({
        category,
        value,
        name: LABELS[category] || category,
        color: COLORS[category] || '#9ca3af',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const selected = activeIndex !== null ? data[activeIndex] : null;

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-surface-500">
        No data yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => { haptics.light(); setActiveIndex(i); }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" style={{ cursor: 'pointer' }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected?.category || 'total'}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <p className="text-xs text-surface-500">{selected?.name || 'Total'}</p>
              <p className="text-lg font-semibold text-surface-900 dark:text-white">
                {currencySymbol}{(selected?.value || total).toLocaleString('en-BD')}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, i) => (
          <button
            key={item.category}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            className={`flex items-center gap-2 p-2 rounded-lg transition ${activeIndex === i ? 'bg-surface-100 dark:bg-surface-800' : ''}`}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-surface-700 dark:text-surface-300">{item.name}</span>
            <span className="text-sm text-surface-500 ml-auto">{Math.round((item.value / total) * 100)}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};
