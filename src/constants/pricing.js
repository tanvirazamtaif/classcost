// ClassCost Pricing Constants
// All prices in BDT (Bangladeshi Taka)

export const PRICING = {
  // Student Plans
  STUDENT_FREE: {
    id: 'student_free',
    name: 'Student Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Track all expenses',
      'All categories',
      'Basic pie chart',
      'Monthly trend',
      'Last 3 months history',
    ],
    limits: {
      historyMonths: 3,
      exportPdf: false,
      exportExcel: false,
      yearlyReport: false,
      projection: false,
      budgetAlerts: false,
    },
  },

  STUDENT_PRO: {
    id: 'student_pro',
    name: 'Student Pro',
    monthlyPrice: 49,
    yearlyPrice: 499,
    features: [
      'Everything in Free',
      'Full expense history',
      'Yearly reports',
      'PDF export',
      'Excel export',
      '10-year projection',
      'Loan amortization',
      'Budget alerts',
    ],
    limits: {
      historyMonths: Infinity,
      exportPdf: true,
      exportExcel: true,
      yearlyReport: true,
      projection: true,
      budgetAlerts: true,
    },
  },

  // Parent Plans
  PARENT_FREE: {
    id: 'parent_free',
    name: 'Parent Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Link 1 child',
      'View-only access',
      'See expense charts',
      'Monthly summary',
    ],
    limits: {
      maxChildren: 1,
      editAccess: false,
      budgetAlerts: false,
      exportPdf: false,
    },
  },

  PARENT_PRO: {
    id: 'parent_pro',
    name: 'Parent Pro',
    monthlyPrice: 99,
    yearlyPrice: 999,
    features: [
      'Link up to 3 children',
      'Real-time monitoring',
      'Set budgets per child',
      'Spending alerts',
      'PDF reports',
      'Compare children',
    ],
    limits: {
      maxChildren: 3,
      editAccess: false,
      budgetAlerts: true,
      exportPdf: true,
    },
  },

  FAMILY_PLUS: {
    id: 'family_plus',
    name: 'Family Plus',
    monthlyPrice: 149,
    yearlyPrice: 1499,
    features: [
      'Link up to 5 children',
      'Everything in Parent Pro',
      'Priority support',
    ],
    limits: {
      maxChildren: 5,
      editAccess: false,
      budgetAlerts: true,
      exportPdf: true,
    },
  },

  // Legacy discount for graduated students
  LEGACY_PRO: {
    id: 'legacy_pro',
    name: 'Legacy Pro',
    monthlyPrice: null, // yearly only
    yearlyPrice: 299,
    features: [
      'For users with 5+ years history',
      'Full Pro features',
      'Lifetime data access',
    ],
  },
};

// One-time purchases
export const ONE_TIME_PURCHASES = {
  SCHOLARSHIP_PDF: {
    id: 'scholarship_pdf',
    name: 'Scholarship Certificate',
    price: 99,
    description: 'Professional expense certificate for scholarship applications',
  },
  YEARLY_REPORT: {
    id: 'yearly_report',
    name: 'Yearly Report',
    price: 49,
    description: 'Detailed yearly expense breakdown PDF',
  },
  EXCEL_EXPORT: {
    id: 'excel_export',
    name: 'Excel Export',
    price: 49,
    description: 'Export all expenses to Excel spreadsheet',
  },
};

// Helper functions
export const getPlanById = (planId) => {
  return Object.values(PRICING).find(plan => plan.id === planId) || null;
};

export const formatPrice = (amount) => {
  if (amount === 0) return 'Free';
  if (amount === null) return '—';
  return `\u09F3${amount.toLocaleString('en-BD')}`;
};

export const isProPlan = (planId) => {
  return ['student_pro', 'parent_pro', 'family_plus', 'legacy_pro'].includes(planId);
};
