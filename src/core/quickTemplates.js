/**
 * Quick Add Template System
 *
 * Determines which expenses are eligible for 1-tap quick add,
 * provides system defaults, and derives learned patterns from
 * user's expense history.
 *
 * PURE LOGIC — no React, no UI, no side effects.
 * Used by QuickAddBar component.
 */

import { getCategoryIcon } from './transactions';

// ═══════════════════════════════════════════════════════════════
// ELIGIBILITY RULES
// ═══════════════════════════════════════════════════════════════

/**
 * Categories whose transactions can become Quick Add items.
 * Only routine daily-life categories qualify.
 */
const ELIGIBLE_CATEGORIES = new Set([
  'transport',   // daily commute, CNG, bus
  'canteen',     // food, snacks, drinks
  'books',       // stationery, small supplies
  'other',       // photocopy, misc small items
]);

/**
 * Category types that are explicitly NEVER eligible,
 * even if they belong to an eligible parent category.
 */
const EXCLUDED_TYPES = new Set([
  // Transport subtypes — rare, event-based
  'hometown_travel',
  'go_home',
  'come_to_dhaka',
  'admission_exam_travel',

  // Housing — never quick-add (setup, not routine)
  'deposit',
  'shifting',

  // Education — never quick-add (large, structured)
  'semester_fee',
  'semester_payment',
  'admission_fee',
  'registration_fee',

  // Quick-add's own source — prevent feedback loop
  'quick_add',
]);

/**
 * Maximum amount for a transaction to be Quick Add eligible.
 * Anything above this is likely not a "small routine cost".
 */
const MAX_ELIGIBLE_AMOUNT = 2000;

// ═══════════════════════════════════════════════════════════════
// SYSTEM DEFAULTS
// ═══════════════════════════════════════════════════════════════

/**
 * Default Quick Add items shown when no learned patterns exist.
 * Practical everyday items for a Bangladesh student.
 */
export const SYSTEM_DEFAULTS = [
  { id: 'default_transport',  label: 'University Transport', category: 'transport', amount: 50 },
  { id: 'default_food',       label: 'Food',                category: 'canteen',   amount: 100 },
  { id: 'default_pencil',     label: 'Pencil',              category: 'books',     amount: 15 },
  { id: 'default_photocopy',  label: 'Photocopy',           category: 'other',     amount: 10 },
];

// ═══════════════════════════════════════════════════════════════
// CORE LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a single expense is eligible for Quick Add learning.
 * @param {Object} expense
 * @returns {boolean}
 */
export function isEligible(expense) {
  // Must be in an eligible category
  if (!ELIGIBLE_CATEGORIES.has(expense.type)) return false;

  // Must not be an excluded subtype
  const meta = expense.meta || {};
  if (EXCLUDED_TYPES.has(meta.transportType)) return false;
  if (EXCLUDED_TYPES.has(meta.transportSubtype)) return false;
  if (EXCLUDED_TYPES.has(meta.housingType)) return false;
  if (EXCLUDED_TYPES.has(meta.source)) return false;

  // Must have a meaningful label
  const label = expense.details || meta.label || expense.label || '';
  if (!label || label.length < 2) return false;

  // Must be a small-ish amount (not a one-time large purchase)
  const amount = Number(expense.amount) || 0;
  if (amount > MAX_ELIGIBLE_AMOUNT) return false;

  return true;
}

/**
 * Derive Quick Add items from user's expense history.
 *
 * Logic:
 * 1. Scan last 100 expenses for eligible repeatable patterns
 * 2. Group by category + label (case-insensitive)
 * 3. Require 2+ occurrences to be "learned"
 * 4. Use last recorded amount as default
 * 5. Mix with system defaults if not enough learned items
 * 6. Cap at 5 items total
 *
 * @param {Array} expenses - Full expenses array from context
 * @returns {Array<{ id, label, icon, category, amount, source }>}
 */
export function deriveQuickAdds(expenses) {
  const patterns = {};
  const recent = (expenses || []).slice(-100);

  recent.forEach(exp => {
    if (!isEligible(exp)) return;

    const label = exp.details || exp.meta?.label || exp.label || '';
    const key = `${exp.type}::${label.toLowerCase().trim()}`;

    if (!patterns[key]) {
      patterns[key] = { count: 0, totalAmount: 0, label, category: exp.type, lastAmount: 0 };
    }
    patterns[key].count++;
    patterns[key].totalAmount += Number(exp.amount) || 0;
    patterns[key].lastAmount = Number(exp.amount) || 0;
  });

  // Learned: 2+ occurrences, sorted by frequency
  const learned = Object.values(patterns)
    .filter(p => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p, i) => ({
      id: `learned_${i}`,
      label: p.label,
      icon: getCategoryIcon(p.category),
      category: p.category,
      amount: p.lastAmount || Math.round(p.totalAmount / p.count),
      source: 'learned',
    }));

  // If enough learned items, use only those
  if (learned.length >= 3) return learned.slice(0, 5);

  // Fill remaining slots with non-overlapping system defaults
  const usedLabels = new Set(learned.map(l => l.label.toLowerCase()));
  const defaults = SYSTEM_DEFAULTS
    .filter(d => !usedLabels.has(d.label.toLowerCase()))
    .map(d => ({ ...d, icon: getCategoryIcon(d.category), source: 'system' }));

  return [...learned, ...defaults].slice(0, 5);
}
