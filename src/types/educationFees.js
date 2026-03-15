// ═══════════════════════════════════════════════════════════════
// EDUCATION FEE TYPES - Complete Bangladesh Education System
// ═══════════════════════════════════════════════════════════════

export const PAYMENT_PATTERNS = {
  RECURRING: 'recurring',
  SEMESTER: 'semester',
  YEARLY: 'yearly',
  ONE_TIME: 'one_time',
  PER_CLASS: 'per_class',
  INSTALLMENT: 'installment',
};

export const EDUCATION_FEE_TYPES = [
  // RECURRING (Monthly)
  {
    id: 'school_fee',
    icon: '🏫',
    label: 'School / College Fee',
    desc: 'Monthly tuition fee',
    defaultPattern: PAYMENT_PATTERNS.RECURRING,
    fields: ['name', 'amount', 'dueDay', 'reminder'],
  },
  {
    id: 'coaching',
    icon: '📖',
    label: 'Coaching Center',
    desc: 'Coaching/batch fees',
    defaultPattern: PAYMENT_PATTERNS.RECURRING,
    fields: ['name', 'amount', 'dueDay', 'reminder'],
  },
  {
    id: 'private_tutor',
    icon: '👨‍🏫',
    label: 'Private Tutor',
    desc: 'Home tutor fees',
    defaultPattern: PAYMENT_PATTERNS.RECURRING,
    allowedPatterns: [PAYMENT_PATTERNS.RECURRING, PAYMENT_PATTERNS.PER_CLASS],
    fields: ['name', 'amount', 'dueDay', 'reminder', 'ratePerClass'],
  },
  {
    id: 'school_transport',
    icon: '🚌',
    label: 'School Transport',
    desc: 'School bus/van fees',
    defaultPattern: PAYMENT_PATTERNS.RECURRING,
    fields: ['name', 'amount', 'dueDay', 'reminder'],
  },
  {
    id: 'tiffin',
    icon: '🍱',
    label: 'Tiffin / Lunch',
    desc: 'School meal fees',
    defaultPattern: PAYMENT_PATTERNS.RECURRING,
    fields: ['name', 'amount', 'dueDay', 'reminder'],
  },

  // SEMESTER (Every 6 months)
  {
    id: 'semester_fee',
    icon: '🎓',
    label: 'Semester Fee',
    desc: 'University semester payment',
    defaultPattern: PAYMENT_PATTERNS.SEMESTER,
    allowedPatterns: [PAYMENT_PATTERNS.SEMESTER, PAYMENT_PATTERNS.INSTALLMENT],
    fields: ['name', 'semesterName', 'amount', 'dueDate', 'perCredit', 'installments'],
    supportsPerCredit: true,
    supportsInstallments: true,
  },
  {
    id: 'exam_fee_semester',
    icon: '📝',
    label: 'Exam Fee (Semester)',
    desc: 'University exam fees',
    defaultPattern: PAYMENT_PATTERNS.SEMESTER,
    fields: ['name', 'semesterName', 'amount', 'dueDate'],
  },
  {
    id: 'lab_fee',
    icon: '🔬',
    label: 'Lab / Practical Fee',
    desc: 'Laboratory costs',
    defaultPattern: PAYMENT_PATTERNS.SEMESTER,
    fields: ['name', 'amount', 'dueDate'],
  },

  // YEARLY (Once a year)
  {
    id: 'library_fee',
    icon: '📚',
    label: 'Library Fee',
    desc: 'Annual library fee',
    defaultPattern: PAYMENT_PATTERNS.YEARLY,
    fields: ['name', 'amount', 'dueMonth', 'dueDay'],
  },
  {
    id: 'sports_fee',
    icon: '⚽',
    label: 'Sports / Club Fee',
    desc: 'Annual sports or club fee',
    defaultPattern: PAYMENT_PATTERNS.YEARLY,
    fields: ['name', 'amount', 'dueMonth', 'dueDay'],
  },
  {
    id: 'development_fee',
    icon: '🏗️',
    label: 'Development Fee',
    desc: 'Annual development fee',
    defaultPattern: PAYMENT_PATTERNS.YEARLY,
    fields: ['name', 'amount', 'dueMonth', 'dueDay'],
  },
  {
    id: 'session_fee',
    icon: '📋',
    label: 'Session Fee',
    desc: 'Annual session fee',
    defaultPattern: PAYMENT_PATTERNS.YEARLY,
    fields: ['name', 'amount', 'dueMonth', 'dueDay'],
  },
  {
    id: 'uniform',
    icon: '👔',
    label: 'Uniform',
    desc: 'School uniform',
    defaultPattern: PAYMENT_PATTERNS.YEARLY,
    fields: ['name', 'amount'],
  },

  // ONE-TIME (Pay once)
  {
    id: 'admission_fee',
    icon: '🎫',
    label: 'Admission Fee',
    desc: 'One-time admission',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    fields: ['name', 'amount', 'dueDate', 'isPaid'],
  },
  {
    id: 'registration_fee',
    icon: '📄',
    label: 'Registration / Form Fee',
    desc: 'Exam or admission form',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    fields: ['name', 'amount', 'dueDate', 'isPaid'],
  },
  {
    id: 'exam_fee_board',
    icon: '📝',
    label: 'Board Exam Fee',
    desc: 'SSC/HSC/JSC exam',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    fields: ['name', 'amount', 'dueDate', 'isPaid'],
  },
  {
    id: 'thesis_fee',
    icon: '📑',
    label: 'Thesis / Project Fee',
    desc: 'Final year thesis',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    fields: ['name', 'amount', 'dueDate', 'isPaid'],
  },
  {
    id: 'id_card',
    icon: '🪪',
    label: 'ID Card Fee',
    desc: 'Student ID card',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    fields: ['name', 'amount', 'isPaid'],
  },
  {
    id: 'medical_bond',
    icon: '💼',
    label: 'Medical College Bond',
    desc: 'Service bond payment',
    defaultPattern: PAYMENT_PATTERNS.ONE_TIME,
    allowedPatterns: [PAYMENT_PATTERNS.ONE_TIME, PAYMENT_PATTERNS.INSTALLMENT],
    fields: ['name', 'amount', 'dueDate', 'isPaid', 'installments'],
    supportsInstallments: true,
  },
];

export const FEE_STATUS = {
  PAID: 'paid',
  PARTIAL: 'partial',
  UPCOMING: 'upcoming',
  OVERDUE: 'overdue',
  SKIPPED: 'skipped',
  FUTURE: 'future',
};

export const STATUS_CONFIG = {
  paid: { color: 'green', icon: '✅', label: 'Paid' },
  partial: { color: 'yellow', icon: '🟡', label: 'Partial' },
  upcoming: { color: 'yellow', icon: '🟡', label: 'Upcoming' },
  overdue: { color: 'red', icon: '🔴', label: 'Overdue' },
  skipped: { color: 'gray', icon: '⚪', label: 'Skipped' },
  future: { color: 'gray', icon: '⚪', label: 'Future' },
};

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const SEMESTER_NAMES = [
  'Spring 2026',
  'Summer 2026',
  'Fall 2026',
  'Spring 2027',
  'Summer 2027',
  'Fall 2027',
];

export const PAYMENT_METHODS = [
  { id: 'cash', icon: '💵', label: 'Cash' },
  { id: 'bkash', icon: '📱', label: 'bKash' },
  { id: 'nagad', icon: '📱', label: 'Nagad' },
  { id: 'bank', icon: '🏦', label: 'Bank' },
  { id: 'card', icon: '💳', label: 'Card' },
  { id: 'other', icon: '📋', label: 'Other' },
];
