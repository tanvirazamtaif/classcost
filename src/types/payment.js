// ─── Category Definitions ────────────────────────────────────────────────────

export const MAIN_CATEGORIES = [
  { id: 'education', icon: '🎓', label: 'Education', color: 'bg-purple-100 dark:bg-purple-900/30', hasPage: true },
  { id: 'hostel', icon: '🏠', label: 'Housing', color: 'bg-green-100 dark:bg-green-900/30', hasPage: true },
  { id: 'books', icon: '📚', label: 'Books', color: 'bg-amber-100 dark:bg-amber-900/30', hasPage: true },
  { id: 'transport', icon: '🚌', label: 'Transport', color: 'bg-blue-100 dark:bg-blue-900/30', hasPage: false },
  { id: 'canteen', icon: '🍽️', label: 'Food', color: 'bg-orange-100 dark:bg-orange-900/30', hasPage: false },
];

// ─── Education Sub-types ─────────────────────────────────────────────────────

export const EDUCATION_TYPES = [
  { id: 'school_fee', label: 'School/College Fee', icon: '🏫', description: 'Monthly or term tuition fee' },
  { id: 'semester_fee', label: 'Semester Fee', icon: '📋', description: 'University semester payment' },
  { id: 'coaching', label: 'Coaching/Tuition', icon: '👨‍🏫', description: 'Private tuition or coaching center' },
  { id: 'exam_fee', label: 'Exam Fee', icon: '📝', description: 'Board or university exam fees' },
  { id: 'admission', label: 'Admission Fee', icon: '🎟️', description: 'One-time admission or enrollment' },
  { id: 'lab_fee', label: 'Lab/Activity Fee', icon: '🔬', description: 'Lab, sports, or activity charges' },
];

// ─── Housing Sub-types ───────────────────────────────────────────────────────

export const HOUSING_TYPES = [
  { id: 'hostel_rent', label: 'Hostel/Mess Rent', icon: '🏠', description: 'Monthly hostel or mess fee' },
  { id: 'utilities', label: 'Utilities', icon: '💡', description: 'Electricity, water, internet' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧', description: 'Repairs and maintenance' },
  { id: 'deposit', label: 'Security Deposit', icon: '🔐', description: 'Refundable deposit' },
];

// ─── Books Sub-types ─────────────────────────────────────────────────────────

export const BOOKS_TYPES = [
  { id: 'textbook', label: 'Textbooks', icon: '📖', description: 'Course textbooks' },
  { id: 'notebook', label: 'Notebooks/Stationery', icon: '📓', description: 'Writing supplies' },
  { id: 'guide', label: 'Guides/References', icon: '📘', description: 'Reference books, guides' },
  { id: 'digital', label: 'Digital/Online', icon: '💻', description: 'Online courses, e-books' },
];

// ─── Transport Sub-types ─────────────────────────────────────────────────────

export const TRANSPORT_TYPES = [
  { id: 'daily', label: 'Daily Commute', icon: '🚌' },
  { id: 'rickshaw', label: 'Rickshaw/CNG', icon: '🛺' },
  { id: 'ride_share', label: 'Ride Share', icon: '🚗' },
  { id: 'monthly_pass', label: 'Monthly Pass', icon: '🎫' },
];

// ─── Food Sub-types ──────────────────────────────────────────────────────────

export const FOOD_TYPES = [
  { id: 'canteen_meal', label: 'Canteen Meal', icon: '🍛' },
  { id: 'snacks', label: 'Snacks/Tea', icon: '☕' },
  { id: 'outside', label: 'Outside Food', icon: '🍔' },
  { id: 'groceries', label: 'Groceries', icon: '🛒' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getSubTypes(categoryId) {
  switch (categoryId) {
    case 'education': return EDUCATION_TYPES;
    case 'hostel': return HOUSING_TYPES;
    case 'books': return BOOKS_TYPES;
    case 'transport': return TRANSPORT_TYPES;
    case 'canteen': return FOOD_TYPES;
    default: return [];
  }
}

export function getCategoryById(id) {
  return MAIN_CATEGORIES.find(c => c.id === id);
}

export function getSubTypeById(categoryId, subTypeId) {
  return getSubTypes(categoryId).find(s => s.id === subTypeId);
}
