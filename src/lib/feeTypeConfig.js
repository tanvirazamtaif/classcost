/**
 * Fee-type catalog + semester-profile defaults for the Universal Installment
 * System. Kept SEPARATE from src/types/educationFees.js (EDUCATION_FEE_TYPES) so
 * the legacy catalog — depended on app-wide and serialized — stays untouched.
 */

// eligibleDefault = whether a waiver applies to this fee type out of the box.
// sheet = which add-fee flow ('tuition' has the credit grid; 'simple' is amount-only).
export const FEE_TYPES = {
  tuition:         { icon: '🎓', label: 'Tuition',         eligibleDefault: true,  sheet: 'tuition' },
  lab:             { icon: '🔬', label: 'Lab Fee',         eligibleDefault: true,  sheet: 'simple' },
  dev:             { icon: '🏗️', label: 'Development Fee', eligibleDefault: true,  sheet: 'simple' },
  library:         { icon: '📚', label: 'Library Fee',     eligibleDefault: true,  sheet: 'simple' },
  exam:            { icon: '📝', label: 'Exam Fee',        eligibleDefault: false, sheet: 'simple' },
  registration:    { icon: '📋', label: 'Registration Fee', eligibleDefault: false, sheet: 'simple' },
  hostel:          { icon: '🏨', label: 'Hostel Fee',      eligibleDefault: false, sheet: 'simple' },
  club:            { icon: '🎭', label: 'Club Fee',        eligibleDefault: false, sheet: 'simple' },
  transport:       { icon: '🚌', label: 'Transport Fee',   eligibleDefault: false, sheet: 'simple' },
  study_materials: { icon: '📖', label: 'Study Materials',  eligibleDefault: false, sheet: 'simple' },
  custom:          { icon: '📦', label: 'Custom Fee',      eligibleDefault: false, sheet: 'simple', editableName: true },
};

// 6 core chips shown by default in the Add Fee panel / wizard breakdown.
export const CORE_FEE_TYPES = ['tuition', 'lab', 'dev', 'library', 'exam', 'registration'];
// Revealed under "More fee types".
export const MORE_FEE_TYPES = ['hostel', 'club', 'transport', 'study_materials'];

export const SCHOLARSHIP_LABELS = {
  merit: 'Merit',
  'need-based': 'Need-Based',
  dept: 'Department',
  'ff-quota': 'FF Quota',
  sibling: 'Sibling',
  special: 'Special Grant',
};
export const SCHOLARSHIP_TYPES = Object.keys(SCHOLARSHIP_LABELS);

export const WAIVER_PRESETS = [0, 25, 50, 75, 100];
export const BILLING_DAY_PRESETS = [1, 5, 10, 15, 20, 25];
export const PLAN_OPTIONS = [
  { value: 1, label: 'Full' },
  { value: 2, label: '2×' },
  { value: 3, label: '3×' },
  { value: 4, label: '4×' },
  { value: 'custom', label: 'Custom' },
];

// Sensible default per-credit rate (BDT). Mirrors legacy CONSTANTS.DEFAULT_CREDIT_RATE.
export const DEFAULT_CREDIT_RATE = 5500;

export const feeTypeInfo = (type) => FEE_TYPES[type] || FEE_TYPES.custom;

// Fresh semester profile (eligibleFeeTypes is an ARRAY for JSON serialization).
export function defaultProfile() {
  return {
    waiverPercent: 0,
    scholarshipType: null,
    billingDay: 10,
    installmentPreference: 1,
    semesterEndDate: '',
    eligibleFeeTypes: Object.keys(FEE_TYPES).filter((t) => FEE_TYPES[t].eligibleDefault),
  };
}
