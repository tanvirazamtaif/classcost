import React from 'react';
import { AlertCircle } from 'lucide-react';
import { sanitizeAmount } from '../../core/transactions';

/**
 * Shared amount input with ৳ prefix.
 *
 * Replaces the 10+ duplicate amount input patterns across the codebase.
 * Handles sanitization, validation display, and consistent styling.
 *
 * Usage:
 *   <AmountInput value={amount} onChange={setAmount} dark={d} error={errors.amount} />
 *   <AmountInput value={amount} onChange={setAmount} dark={d} size="sm" />
 */
export const AmountInput = ({
  value,
  onChange,
  dark = false,
  error,
  placeholder = '0',
  size = 'lg',     // 'lg' (default, 2xl font) | 'sm' (regular input size)
  autoFocus = false,
  disabled = false,
  currencySymbol = '৳',
}) => {
  const d = dark;
  const isLg = size === 'lg';

  const handleChange = (e) => {
    onChange(sanitizeAmount(e.target.value));
  };

  return (
    <div>
      <div className={`flex items-center border-2 rounded-xl transition ${
        error
          ? 'border-danger-500'
          : `${d ? 'border-surface-800' : 'border-surface-200'} focus-within:border-primary-500`
      } ${d ? 'bg-surface-900' : 'bg-white'} ${isLg ? 'px-4 py-3' : 'px-3 py-2.5'}`}>
        <span className={`text-surface-400 mr-2 ${isLg ? 'text-xl' : 'text-lg'}`}>
          {currencySymbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          autoFocus={autoFocus}
          disabled={disabled}
          className={`font-semibold bg-transparent outline-none w-full ${
            isLg ? 'text-2xl' : 'text-lg'
          } ${d ? 'text-white' : 'text-surface-900'} ${
            disabled ? 'opacity-50' : ''
          }`}
        />
      </div>
      {error && (
        <p className="text-xs text-danger-500 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
};
