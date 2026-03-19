const CATEGORIES = {
  // Education (entity-bound)
  semester_fee: { id: 'semester_fee', label: 'Semester Fee', icon: '🎓', group: 'education', entityTypes: ['INSTITUTION'] },
  tuition: { id: 'tuition', label: 'Tuition', icon: '🏫', group: 'education', entityTypes: ['INSTITUTION'] },
  exam_fee: { id: 'exam_fee', label: 'Exam Fee', icon: '📝', group: 'education', entityTypes: ['INSTITUTION'] },
  lab_fee: { id: 'lab_fee', label: 'Lab Fee', icon: '🔬', group: 'education', entityTypes: ['INSTITUTION'] },
  admission_fee: { id: 'admission_fee', label: 'Admission Fee', icon: '🎫', group: 'education', entityTypes: ['INSTITUTION'] },
  library_fee: { id: 'library_fee', label: 'Library Fee', icon: '📚', group: 'education', entityTypes: ['INSTITUTION'] },
  registration_fee: { id: 'registration_fee', label: 'Registration', icon: '📄', group: 'education', entityTypes: ['INSTITUTION'] },
  development_fee: { id: 'development_fee', label: 'Development Fee', icon: '🏗️', group: 'education', entityTypes: ['INSTITUTION'] },
  uniform: { id: 'uniform', label: 'Uniform', icon: '👔', group: 'education', entityTypes: ['INSTITUTION'] },
  id_card: { id: 'id_card', label: 'ID Card', icon: '🪪', group: 'education', entityTypes: ['INSTITUTION'] },

  // Housing (entity-bound)
  rent: { id: 'rent', label: 'Rent', icon: '🏠', group: 'housing', entityTypes: ['RESIDENCE'] },
  mess_fee: { id: 'mess_fee', label: 'Mess Fee', icon: '🍽️', group: 'housing', entityTypes: ['RESIDENCE'] },
  utilities: { id: 'utilities', label: 'Utilities', icon: '💡', group: 'housing', entityTypes: ['RESIDENCE'] },
  deposit: { id: 'deposit', label: 'Deposit', icon: '💰', group: 'housing', entityTypes: ['RESIDENCE'] },
  moving: { id: 'moving', label: 'Moving', icon: '📦', group: 'housing', entityTypes: ['RESIDENCE'] },

  // Coaching (entity-bound)
  coaching_monthly: { id: 'coaching_monthly', label: 'Monthly Fee', icon: '📖', group: 'coaching', entityTypes: ['COACHING'] },
  batch_fee: { id: 'batch_fee', label: 'Batch Fee', icon: '👥', group: 'coaching', entityTypes: ['COACHING'] },
  coaching_materials: { id: 'coaching_materials', label: 'Materials', icon: '📕', group: 'coaching', entityTypes: ['COACHING'] },

  // Personal (no entity required)
  transport: { id: 'transport', label: 'Transport', icon: '🚌', group: 'personal', entityTypes: null },
  food: { id: 'food', label: 'Food', icon: '🍽️', group: 'personal', entityTypes: null },
  books: { id: 'books', label: 'Books', icon: '📚', group: 'personal', entityTypes: null },
  stationery: { id: 'stationery', label: 'Stationery', icon: '✏️', group: 'personal', entityTypes: null },
  devices: { id: 'devices', label: 'Devices', icon: '💻', group: 'personal', entityTypes: null },
  medical: { id: 'medical', label: 'Medical', icon: '💊', group: 'personal', entityTypes: null },
  internet: { id: 'internet', label: 'Internet/Data', icon: '📱', group: 'personal', entityTypes: null },
  loan_repayment: { id: 'loan_repayment', label: 'Loan Payment', icon: '🏦', group: 'personal', entityTypes: null },
  other: { id: 'other', label: 'Other', icon: '📦', group: 'personal', entityTypes: null },
};

const SUB_CATEGORIES = {
  transport: ['bus', 'pathao', 'rickshaw', 'cng', 'train', 'uber', 'walking'],
  food: ['breakfast', 'lunch', 'dinner', 'snacks', 'tiffin'],
};

function getCategoriesForEntityType(entityType) {
  return Object.values(CATEGORIES).filter(
    (c) => c.entityTypes && c.entityTypes.includes(entityType)
  );
}

function getPersonalCategories() {
  return Object.values(CATEGORIES).filter((c) => c.entityTypes === null);
}

function isValidCategory(id) {
  return id in CATEGORIES;
}

function isValidSubCategory(categoryId, subCategoryId) {
  const subs = SUB_CATEGORIES[categoryId];
  return subs ? subs.includes(subCategoryId) : false;
}

module.exports = {
  CATEGORIES,
  SUB_CATEGORIES,
  getCategoriesForEntityType,
  getPersonalCategories,
  isValidCategory,
  isValidSubCategory,
};
