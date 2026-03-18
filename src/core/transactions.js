/**
 * Core Transaction Layer
 *
 * Single source of truth for:
 * 1. Category registry (icons, labels, colors)
 * 2. Transaction shape (what a transaction looks like)
 * 3. Amount validation helpers
 *
 * This is a PURE utility — no React, no context, no side effects.
 * Category pages and shared components import from here.
 */

// ═══════════════════════════════════════════════════════════════
// CATEGORY REGISTRY
// ═══════════════════════════════════════════════════════════════

export const CATEGORIES = {
  education:  { id: 'education',  icon: '🎓', label: 'Education',       color: 'purple' },
  transport:  { id: 'transport',  icon: '🚌', label: 'Transport',       color: 'blue' },
  canteen:    { id: 'canteen',    icon: '🍽️', label: 'Food',            color: 'orange' },
  hostel:     { id: 'hostel',     icon: '🏠', label: 'Housing',         color: 'green' },
  books:      { id: 'books',      icon: '📚', label: 'Study Materials', color: 'amber' },
  uniform:    { id: 'uniform',    icon: '👔', label: 'Uniform',         color: 'slate' },
  other:      { id: 'other',      icon: '📦', label: 'Other',           color: 'gray' },
};

/**
 * Get category metadata. Always returns a valid object.
 * @param {string} categoryId
 * @returns {{ id: string, icon: string, label: string, color: string }}
 */
export function getCategory(categoryId) {
  return CATEGORIES[categoryId] || CATEGORIES.other;
}

/**
 * Get icon for a category.
 * @param {string} categoryId
 * @returns {string} emoji icon
 */
export function getCategoryIcon(categoryId) {
  return getCategory(categoryId).icon;
}

/**
 * Get display label for a category.
 * @param {string} categoryId
 * @returns {string}
 */
export function getCategoryLabel(categoryId) {
  return getCategory(categoryId).label;
}

// ═══════════════════════════════════════════════════════════════
// TRANSACTION SHAPE
// ═══════════════════════════════════════════════════════════════

/**
 * Create a standardized transaction object.
 *
 * This is the canonical shape for ALL expense transactions in ClassCost.
 * Every category page should use this to create transactions before
 * passing to addExpense().
 *
 * @param {Object} params
 * @param {string} params.type - Category ID (transport, hostel, books, etc.)
 * @param {number} params.amount - Payment amount (must be > 0)
 * @param {string} [params.label] - Category label override (defaults to registry)
 * @param {string} [params.details] - User-visible description (shown as primary text on cards)
 * @param {string} [params.date] - ISO date string (defaults to today)
 * @param {string} [params.note] - Optional user note
 * @param {Object} [params.meta] - Optional metadata (subtype, entity link, tracker link, etc.)
 * @returns {Object} Transaction object ready for addExpense()
 */
export function createTransaction({
  type,
  amount,
  label,
  details,
  date,
  note,
  meta = {},
}) {
  const category = getCategory(type);

  return {
    type,
    amount: Number(amount) || 0,
    label: label || category.label,
    details: details || null,
    date: date || new Date().toISOString().split('T')[0],
    note: note || null,
    meta: {
      ...meta,
      // Always include the display label in meta for reliable card rendering
      label: meta.label || details || null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// AMOUNT HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Sanitize user input to only allow digits and decimal point.
 * Use in onChange handlers for amount inputs.
 * @param {string} value - Raw input value
 * @returns {string} Sanitized value
 */
export function sanitizeAmount(value) {
  return String(value).replace(/[^0-9.]/g, '');
}

/**
 * Parse a string to a number, returning 0 for invalid values.
 * @param {string|number} value
 * @returns {number}
 */
export function parseAmount(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

/**
 * Validate an amount for saving.
 * @param {number} amount
 * @param {Object} [options]
 * @param {number} [options.max=50000000]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAmount(amount, { max = 50000000 } = {}) {
  if (!amount || amount <= 0) return { valid: false, error: 'Enter a valid amount' };
  if (amount > max) return { valid: false, error: 'Amount seems too high' };
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// QUERY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Filter transactions by category type.
 * @param {Array} expenses - Full expenses array
 * @param {string} type - Category ID
 * @returns {Array} Filtered and sorted (newest first)
 */
export function getByCategory(expenses, type) {
  return (expenses || [])
    .filter(e => e.type === type)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/**
 * Calculate total spent for a category.
 * @param {Array} expenses
 * @param {string} [type] - If omitted, totals all
 * @returns {number}
 */
export function getTotalSpent(expenses, type) {
  const filtered = type ? (expenses || []).filter(e => e.type === type) : (expenses || []);
  return filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Get display-ready label for a transaction.
 * Resolves from details → meta.label → category label.
 * @param {Object} transaction
 * @returns {string}
 */
export function getTransactionLabel(transaction) {
  return transaction.details
    || transaction.meta?.label
    || transaction.label
    || getCategoryLabel(transaction.type)
    || 'Payment';
}

/**
 * Get display-ready sublabel (category name when details exist).
 * @param {Object} transaction
 * @returns {string|null}
 */
export function getTransactionSublabel(transaction) {
  if (transaction.details || transaction.meta?.label) {
    return transaction.label || getCategoryLabel(transaction.type);
  }
  return null;
}

/**
 * Format a date string for display.
 * @param {string} dateStr
 * @param {Object} [options]
 * @returns {string}
 */
export function formatTransactionDate(dateStr, options = { day: 'numeric', month: 'short' }) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('en-GB', options); }
  catch { return dateStr; }
}
