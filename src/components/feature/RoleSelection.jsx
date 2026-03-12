import React from 'react';
import { useApp } from '../../contexts/AppContext';

/**
 * RoleSelection - Student vs Parent role selection screen
 *
 * Usage:
 * <RoleSelection onSelect={(role) => handleRoleSelect(role)} />
 */
export const RoleSelection = ({ onSelect }) => {
  const { theme } = useApp();
  const d = theme === 'dark';

  const roles = [
    {
      id: 'student',
      icon: '🎓',
      title: 'Student',
      description: 'Track your own education expenses, semester costs, and loans',
      features: ['Log daily expenses', 'Semester tracking', 'Loan management', 'Cost reports'],
    },
    {
      id: 'parent',
      icon: '👨‍👩‍👧',
      title: 'Parent',
      description: 'Monitor your children\'s education spending and set budgets',
      features: ['Link children', 'View their expenses', 'Set budgets', 'Get alerts'],
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${d ? 'bg-gray-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-white font-bold">C</span>
        </div>
        <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
          Welcome to ClassCost
        </h1>
        <p className={`text-sm ${d ? 'text-gray-400' : 'text-slate-600'}`}>
          How will you use ClassCost?
        </p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-sm space-y-4">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onSelect(role.id)}
            className={`w-full text-left rounded-2xl p-5 transition-all active:scale-[0.98] border-2 ${
              d
                ? 'bg-gray-800 border-gray-700 hover:border-blue-500'
                : 'bg-white border-slate-200 hover:border-blue-500'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{role.icon}</span>
              <div>
                <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-slate-900'}`}>
                  {role.title}
                </h2>
                <p className={`text-xs ${d ? 'text-gray-400' : 'text-slate-500'}`}>
                  {role.description}
                </p>
              </div>
            </div>

            <ul className="grid grid-cols-2 gap-1.5">
              {role.features.map((feat, i) => (
                <li key={i} className={`text-xs flex items-center gap-1.5 ${d ? 'text-gray-400' : 'text-slate-600'}`}>
                  <span className="text-blue-500">•</span>
                  {feat}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className={`text-xs mt-8 text-center ${d ? 'text-gray-600' : 'text-slate-400'}`}>
        You can change this later in Settings
      </p>
    </div>
  );
};

export default RoleSelection;
