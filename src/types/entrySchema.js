// ─── Entry & Item Creation ───────────────────────────────────────────────────

let _entryCounter = Date.now();

function uid() {
  return `entry_${++_entryCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new entry (a category-level payment record with items and history).
 */
export function createEntry({ category, mode = 'bulk', items = [], totalAmount = 0, note = '' }) {
  const now = new Date().toISOString();
  const id = uid();

  const entry = {
    id,
    category,          // 'education' | 'hostel' | 'books' | 'transport' | 'canteen'
    mode,              // 'bulk' | 'individual'
    items,             // Array of EntryItem
    totalAmount: mode === 'individual'
      ? items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
      : Number(totalAmount) || 0,
    note,
    date: now.split('T')[0],
    createdAt: now,
    updatedAt: now,
    history: [{
      action: 'created',
      timestamp: now,
      totalAmount: mode === 'individual'
        ? items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
        : Number(totalAmount) || 0,
      itemCount: items.length,
    }],
  };

  return entry;
}

/**
 * Create a single item within an entry.
 */
export function createEntryItem({ subType, label, amount = 0, note = '' }) {
  return {
    id: uid(),
    subType,   // e.g. 'school_fee', 'hostel_rent'
    label,
    amount: Number(amount) || 0,
    note,
  };
}

// ─── History Utilities ───────────────────────────────────────────────────────

/**
 * Add a history record when an entry's total is updated.
 */
export function addUpdateHistory(entry, { newTotal, reason = 'updated' }) {
  const now = new Date().toISOString();
  const prev = entry.totalAmount;

  return {
    ...entry,
    totalAmount: Number(newTotal),
    updatedAt: now,
    history: [
      ...entry.history,
      {
        action: reason,
        timestamp: now,
        previousAmount: prev,
        totalAmount: Number(newTotal),
        itemCount: entry.items.length,
      },
    ],
  };
}

/**
 * Add a history record when items are changed.
 */
export function addItemChangeHistory(entry, { items, reason = 'items_updated' }) {
  const now = new Date().toISOString();
  const newTotal = entry.mode === 'individual'
    ? items.reduce((s, i) => s + (Number(i.amount) || 0), 0)
    : entry.totalAmount;

  return {
    ...entry,
    items,
    totalAmount: newTotal,
    updatedAt: now,
    history: [
      ...entry.history,
      {
        action: reason,
        timestamp: now,
        totalAmount: newTotal,
        itemCount: items.length,
      },
    ],
  };
}

// ─── Mismatch Detection ─────────────────────────────────────────────────────

const MISMATCH_THRESHOLD = 50; // ৳50

/**
 * Check if the sum of items differs from the entry total by more than threshold.
 */
export function detectMismatch(entry) {
  if (entry.mode !== 'individual' || !entry.items.length) return null;
  const itemSum = entry.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const diff = Math.abs(itemSum - entry.totalAmount);
  if (diff > MISMATCH_THRESHOLD) {
    return { itemSum, entryTotal: entry.totalAmount, difference: diff };
  }
  return null;
}
