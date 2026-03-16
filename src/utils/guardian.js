/**
 * ClassCost Guardian Validation Module
 * Enforces domain rules and prevents invalid data from being saved.
 */

import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// KNOWN INSTITUTIONS DATABASE
// ═══════════════════════════════════════════════════════════════

export const UNIVERSITIES = {
  // Public Universities
  'DU': { full: 'University of Dhaka', type: 'public' },
  'BUET': { full: 'Bangladesh University of Engineering & Technology', type: 'public' },
  'KUET': { full: 'Khulna University of Engineering & Technology', type: 'public' },
  'RUET': { full: 'Rajshahi University of Engineering & Technology', type: 'public' },
  'CUET': { full: 'Chittagong University of Engineering & Technology', type: 'public' },
  'RU': { full: 'University of Rajshahi', type: 'public' },
  'CU': { full: 'University of Chittagong', type: 'public' },
  'JU': { full: 'Jahangirnagar University', type: 'public' },
  'JNU': { full: 'Jagannath University', type: 'public' },
  'SUST': { full: 'Shahjalal University of Science & Technology', type: 'public' },
  'BAU': { full: 'Bangladesh Agricultural University', type: 'public' },
  'HSTU': { full: 'Hajee Mohammad Danesh Science & Technology University', type: 'public' },
  'PSTU': { full: 'Patuakhali Science and Technology University', type: 'public' },
  'JUST': { full: 'Jessore University of Science and Technology', type: 'public' },
  'NSTU': { full: 'Noakhali Science and Technology University', type: 'public' },
  'MBSTU': { full: 'Mawlana Bhashani Science and Technology University', type: 'public' },
  
  // Private Universities
  'NSU': { full: 'North South University', type: 'private' },
  'BRAC': { full: 'BRAC University', type: 'private' },
  'BRAC UNIVERSITY': { full: 'BRAC University', type: 'private' },
  'IUB': { full: 'Independent University, Bangladesh', type: 'private' },
  'AIUB': { full: 'American International University-Bangladesh', type: 'private' },
  'EWU': { full: 'East West University', type: 'private' },
  'UIU': { full: 'United International University', type: 'private' },
  'ULAB': { full: 'University of Liberal Arts Bangladesh', type: 'private' },
  'DIU': { full: 'Daffodil International University', type: 'private' },
  'AUST': { full: 'Ahsanullah University of Science & Technology', type: 'private' },
  'UAP': { full: 'University of Asia Pacific', type: 'private' },
  'GUB': { full: 'Green University of Bangladesh', type: 'private' },
  'STAMFORD': { full: 'Stamford University Bangladesh', type: 'private' },
  'PRIMEASIA': { full: 'Primeasia University', type: 'private' },
  'NUB': { full: 'Northern University Bangladesh', type: 'private' },
  'IUBAT': { full: 'International University of Business Agriculture and Technology', type: 'private' },
};

export const COLLEGES = {
  'NOTRE DAME': { full: 'Notre Dame College', type: 'private', location: 'Dhaka' },
  'NOTRE DAME COLLEGE': { full: 'Notre Dame College', type: 'private', location: 'Dhaka' },
  'NDC': { full: 'Notre Dame College', type: 'private', location: 'Dhaka' },
  'HOLY CROSS': { full: 'Holy Cross College', type: 'private', location: 'Dhaka' },
  'HOLY CROSS COLLEGE': { full: 'Holy Cross College', type: 'private', location: 'Dhaka' },
  'DHAKA CITY COLLEGE': { full: 'Dhaka City College', type: 'private', location: 'Dhaka' },
  'DCC': { full: 'Dhaka City College', type: 'private', location: 'Dhaka' },
  'DHAKA COLLEGE': { full: 'Dhaka College', type: 'government', location: 'Dhaka' },
  'RAJUK': { full: 'Rajuk Uttara Model College', type: 'government', location: 'Dhaka' },
  'RAJUK UTTARA MODEL COLLEGE': { full: 'Rajuk Uttara Model College', type: 'government' },
  'VIQARUNNISA': { full: 'Viqarunnisa Noon College', type: 'government', location: 'Dhaka' },
  'ADAMJEE': { full: 'Adamjee Cantonment College', type: 'government', location: 'Dhaka' },
  'BAF SHAHEEN': { full: 'BAF Shaheen College', type: 'government' },
  'BIRSHRESHTHA NOOR MOHAMMAD': { full: 'Birshreshtha Noor Mohammad College', type: 'government' },
  'GOVT. SCIENCE COLLEGE': { full: 'Government Science College', type: 'government' },
  'DHAKA COMMERCE COLLEGE': { full: 'Dhaka Commerce College', type: 'government' },
};

export const COACHING_CENTERS = {
  'UDVASH': { focus: ['admission', 'hsc'] },
  'UNMESH': { focus: ['admission', 'hsc'] },
  'ANUSHILAN': { focus: ['admission'] },
  'UCCHASH': { focus: ['admission', 'hsc'] },
  'PRONOY': { focus: ['admission'] },
  'UDVASH ACADEMIC CARE': { focus: ['school', 'hsc'] },
  'UAC': { focus: ['school', 'hsc'] },
  'BIOLOGY ROCKERS': { focus: ['admission', 'medical'] },
  'PHYSICS CARE': { focus: ['hsc', 'admission'] },
  'MENTORS': { focus: ['english', 'ielts'] },
  'GENESIS': { focus: ['admission'] },
  'LAGBE NAKI': { focus: ['admission'] },
};

// ═══════════════════════════════════════════════════════════════
// EDUCATION LEVEL CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const EDUCATION_CONFIG = {
  school: {
    label: 'School',
    grades: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
             'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'],
    exam: 'SSC',
    allowedFeeTypes: [
      'school_fee', 'exam_fee', 'library_fee', 'uniform', 
      'transport', 'tiffin_fee', 'sports_fee', 'lab_fee',
      'coaching', 'batch', 'private_tutor', 'books', 'stationery'
    ],
    hasSemesters: false,
    placeholder: 'e.g., Ideal School, Mastermind, Viqarunnisa Noon School'
  },
  college: {
    label: 'College',
    grades: ['Class 11', 'Class 12', 'HSC 1st Year', 'HSC 2nd Year'],
    exam: 'HSC',
    allowedFeeTypes: [
      'admission_fee', 'tuition_fee', 'exam_fee', 'library_fee',
      'lab_fee', 'transport', 'uniform', 'coaching', 'batch',
      'private_tutor', 'books', 'stationery'
    ],
    hasSemesters: false,
    placeholder: 'e.g., Notre Dame College, Dhaka College, Holy Cross'
  },
  university: {
    label: 'University',
    grades: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Masters', 'PhD'],
    allowedFeeTypes: [
      'semester_fee', 'credit_fee', 'admission_fee', 'tuition_fee',
      'library_fee', 'lab_fee', 'transport', 'hostel_fee',
      'coaching', 'batch', 'private_tutor', 'books', 'stationery'
    ],
    hasSemesters: true,
    placeholder: 'e.g., BUET, DU, NSU, BRAC University'
  },
  coaching: {
    label: 'Coaching Only',
    grades: [],
    allowedFeeTypes: ['coaching', 'batch', 'books', 'stationery'],
    hasSemesters: false,
    placeholder: 'e.g., Udvash, Unmesh, Anushilan'
  }
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if an institution name matches the selected education level
 * @param {string} institutionName - Name of institution
 * @param {string} eduType - Education level (school/college/university/coaching)
 * @returns {Object} { valid: boolean, error?: string, suggestion?: string, warning?: string }
 */
export function validateInstitution(institutionName, eduType) {
  if (!institutionName || !eduType) {
    return { valid: false, error: 'Institution name and education type are required' };
  }

  const normalized = institutionName.toUpperCase().trim();
  
  // Check if it's a known university
  const isUniversity = Object.keys(UNIVERSITIES).some(key => 
    normalized.includes(key) || normalized === key
  );
  
  // Check if it's a known college
  const isCollege = Object.keys(COLLEGES).some(key => 
    normalized.includes(key) || normalized === key
  );
  
  // Check if it's a coaching center
  const isCoaching = Object.keys(COACHING_CENTERS).some(key => 
    normalized.includes(key) || normalized === key
  );

  // HARD BLOCKS
  if (isUniversity && eduType === 'school') {
    return {
      valid: false,
      error: `"${institutionName}" is a UNIVERSITY. It cannot be selected for school level.`,
      suggestion: 'Change education level to "University" or enter your actual school name.'
    };
  }

  if (isUniversity && eduType === 'college') {
    return {
      valid: false,
      error: `"${institutionName}" is a UNIVERSITY, not a college.`,
      suggestion: 'Change education level to "University" or enter your college name (e.g., Notre Dame College).'
    };
  }

  if (isCollege && eduType === 'school') {
    return {
      valid: false,
      error: `"${institutionName}" is a COLLEGE (HSC level), not a school.`,
      suggestion: 'Change education level to "College" or enter your school name.'
    };
  }

  if (isCollege && eduType === 'university') {
    return {
      valid: false,
      error: `"${institutionName}" is a COLLEGE, not a university.`,
      suggestion: 'Change education level to "College" or enter your university name.'
    };
  }

  // WARNINGS
  if (isCoaching && eduType !== 'coaching') {
    return {
      valid: true,
      warning: `"${institutionName}" appears to be a coaching center. If this is your supplementary coaching, add it separately in the Coaching section. Your main institution should be your school/college/university.`
    };
  }

  // Check for common mistakes
  if (eduType === 'school' && (normalized.includes('UNIVERSITY') || normalized.includes('VARSITY'))) {
    return {
      valid: false,
      error: 'You selected "School" but entered a university name.',
      suggestion: 'Either change education level to "University" or enter your school name.'
    };
  }

  if (eduType === 'school' && normalized.includes('COLLEGE') && !normalized.includes('SCHOOL')) {
    return {
      valid: false,
      error: 'You selected "School" but entered a college name.',
      suggestion: 'Either change education level to "College" or enter your school name.'
    };
  }

  return { valid: true };
}

/**
 * Check if a class/grade matches the education level
 * @param {string} classLevel - Selected class/grade
 * @param {string} eduType - Education level
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateClassLevel(classLevel, eduType) {
  if (!classLevel || !eduType) {
    return { valid: false, error: 'Class level and education type are required' };
  }

  const config = EDUCATION_CONFIG[eduType];
  if (!config) {
    return { valid: false, error: `Unknown education type: ${eduType}` };
  }

  const normalized = classLevel.trim();
  
  // Check if it's in the allowed grades
  const isValid = config.grades.some(grade => 
    grade.toLowerCase() === normalized.toLowerCase()
  );

  if (!isValid) {
    return {
      valid: false,
      error: `"${classLevel}" is not valid for ${config.label} level.`,
      suggestion: `Valid options: ${config.grades.join(', ')}`
    };
  }

  // Additional check: HSC classes should not be in school
  if (eduType === 'school' && (normalized.includes('11') || normalized.includes('12') || normalized.toUpperCase().includes('HSC'))) {
    return {
      valid: false,
      error: 'Class 11-12 / HSC is college level, not school.',
      suggestion: 'Change education level to "College".'
    };
  }

  return { valid: true };
}

/**
 * Check if a fee type is valid for the education level
 * @param {string} feeType - Type of fee
 * @param {string} eduType - Education level
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateFeeType(feeType, eduType) {
  const config = EDUCATION_CONFIG[eduType];
  if (!config) {
    return { valid: false, error: `Unknown education type: ${eduType}` };
  }

  if (!config.allowedFeeTypes.includes(feeType)) {
    return {
      valid: false,
      error: `"${feeType}" is not applicable for ${config.label} students.`,
      suggestion: `Available fee types: ${config.allowedFeeTypes.join(', ')}`
    };
  }

  // Specific checks
  if (feeType === 'semester_fee' && eduType !== 'university') {
    return {
      valid: false,
      error: 'Semester fees are only for university students.',
      suggestion: 'Schools and colleges use annual or term-based fees.'
    };
  }

  if (feeType === 'school_fee' && eduType !== 'school') {
    return {
      valid: false,
      error: '"School fee" is only for school students.',
      suggestion: eduType === 'university' ? 'Use "tuition_fee" or "semester_fee".' : 'Use "tuition_fee".'
    };
  }

  return { valid: true };
}

/**
 * Validate expense/fee amount
 * @param {number} amount - Amount value
 * @param {string} feeType - Type of fee (optional, for context)
 * @param {string} eduType - Education level (optional, for context)
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 */
export function validateAmount(amount, feeType = null, eduType = null) {
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount < 0) {
    return { 
      valid: false, 
      error: 'Amount cannot be negative.',
      suggestion: 'For refunds, create a separate "refund" entry or adjust the original expense.'
    };
  }

  if (numAmount === 0) {
    return { 
      valid: false, 
      error: 'Amount cannot be zero.',
      suggestion: 'Enter the actual amount spent.'
    };
  }

  // Reasonable amount checks (in BDT)
  const maxAmounts = {
    school: {
      school_fee: 100000,      // 1 lakh max monthly for premium schools
      exam_fee: 50000,         // 50k max
      uniform: 50000,          // 50k max
      default: 500000          // 5 lakh max for any school expense
    },
    college: {
      admission_fee: 200000,   // 2 lakh max
      tuition_fee: 100000,     // 1 lakh max monthly
      default: 500000          // 5 lakh max
    },
    university: {
      semester_fee: 500000,    // 5 lakh max per semester
      admission_fee: 500000,   // 5 lakh max
      default: 1000000         // 10 lakh max
    }
  };

  if (eduType && maxAmounts[eduType]) {
    const max = feeType && maxAmounts[eduType][feeType] 
      ? maxAmounts[eduType][feeType] 
      : maxAmounts[eduType].default;
    
    if (numAmount > max) {
      return {
        valid: true,  // Allow but warn
        warning: `Amount ৳${numAmount.toLocaleString()} seems unusually high for ${feeType || 'this expense'}. Please verify.`
      };
    }
  }

  // General sanity check: more than 1 crore
  if (numAmount > 10000000) {
    return {
      valid: false,
      error: 'Amount exceeds maximum limit (1 crore).',
      suggestion: 'Please verify the amount. If correct, split into multiple entries.'
    };
  }

  return { valid: true };
}

/**
 * Validate date for expense
 * @param {Date|string} date - Date value
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 */
export function validateExpenseDate(date) {
  const expenseDate = new Date(date);
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (isNaN(expenseDate.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  // Future date (more than 1 day ahead)
  if (expenseDate > new Date(now.getTime() + oneDayMs)) {
    return {
      valid: true,  // Allow but warn
      warning: 'This expense date is in the future. Are you scheduling a future payment?'
    };
  }

  // Very old date (more than 10 years ago)
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
  if (expenseDate < tenYearsAgo) {
    return {
      valid: true,  // Allow but warn
      warning: 'This expense is from more than 10 years ago. Please verify the date.'
    };
  }

  return { valid: true };
}

/**
 * Validate private tutor data
 * @param {Object} tutorData - { tutorName, subject, monthlyFee, ... }
 * @returns {Object} { valid: boolean, error?: string, warning?: string }
 */
export function validatePrivateTutor(tutorData) {
  const { tutorName, subject, monthlyFee } = tutorData;

  if (!tutorName || tutorName.trim().length < 2) {
    return { valid: false, error: 'Tutor name is required (at least 2 characters)' };
  }

  // Check if tutor name looks like an institution
  const normalizedName = tutorName.toUpperCase().trim();
  
  if (UNIVERSITIES[normalizedName] || COLLEGES[normalizedName] || COACHING_CENTERS[normalizedName]) {
    return {
      valid: false,
      error: `"${tutorName}" appears to be an institution, not a person's name.`,
      suggestion: 'Enter the tutor\'s actual name (e.g., "Mr. Rahman", "Fatema Apa").'
    };
  }

  if (normalizedName.includes('SCHOOL') || normalizedName.includes('COLLEGE') || 
      normalizedName.includes('UNIVERSITY') || normalizedName.includes('COACHING')) {
    return {
      valid: false,
      error: 'Private tutor should be a person\'s name, not an institution.',
      suggestion: 'Enter the tutor\'s actual name (e.g., "Mr. Rahman", "Fatema Apa").'
    };
  }

  if (!subject || subject.trim().length < 2) {
    return { valid: false, error: 'Subject is required' };
  }

  const amountCheck = validateAmount(monthlyFee, 'private_tutor');
  if (!amountCheck.valid) {
    return amountCheck;
  }

  // Warn if tutor fee seems too high (more than 20k/month)
  if (monthlyFee > 20000) {
    return {
      valid: true,
      warning: `৳${monthlyFee.toLocaleString()}/month for a private tutor seems high. Please verify.`
    };
  }

  return { valid: true };
}

/**
 * Validate that coaching and batch are treated as separate entities
 * @param {Object} data - Data being saved
 * @param {string} type - 'coaching' or 'batch'
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateCoachingBatchSeparation(data, type) {
  if (type === 'coaching') {
    // Coaching should have: name, monthlyFee, no "batch" in name
    if (data.name && data.name.toLowerCase().includes('batch')) {
      return {
        valid: true,
        warning: 'This looks like a batch, not a coaching center. Batches should be added separately.'
      };
    }
  }

  if (type === 'batch') {
    // Batch should have: name, fee, frequency
    if (data.name && COACHING_CENTERS[data.name.toUpperCase()]) {
      return {
        valid: true,
        warning: 'This looks like a coaching center name. Coaching centers should be added separately from batches.'
      };
    }
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// MASTER VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Run all relevant validations on a data object
 * @param {Object} data - Data to validate
 * @param {string} dataType - Type of data ('user', 'expense', 'educationFee', 'tutor', etc.)
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
export function guardianValidate(data, dataType) {
  const errors = [];
  const warnings = [];

  switch (dataType) {
    case 'user':
    case 'profile': {
      // Validate institution
      if (data.institution && data.eduType) {
        const instResult = validateInstitution(data.institution, data.eduType);
        if (!instResult.valid) errors.push(instResult.error);
        if (instResult.warning) warnings.push(instResult.warning);
      }
      
      // Validate class level
      if (data.classLevel && data.eduType) {
        const classResult = validateClassLevel(data.classLevel, data.eduType);
        if (!classResult.valid) errors.push(classResult.error);
      }
      break;
    }

    case 'expense': {
      // Validate amount
      const amountResult = validateAmount(data.amount, data.category, data.eduType);
      if (!amountResult.valid) errors.push(amountResult.error);
      if (amountResult.warning) warnings.push(amountResult.warning);

      // Validate date
      if (data.date) {
        const dateResult = validateExpenseDate(data.date);
        if (!dateResult.valid) errors.push(dateResult.error);
        if (dateResult.warning) warnings.push(dateResult.warning);
      }
      break;
    }

    case 'educationFee': {
      // Validate fee type for education level
      if (data.feeType && data.eduType) {
        const feeResult = validateFeeType(data.feeType, data.eduType);
        if (!feeResult.valid) errors.push(feeResult.error);
      }

      // Validate amount
      const amountResult = validateAmount(data.amount, data.feeType, data.eduType);
      if (!amountResult.valid) errors.push(amountResult.error);
      if (amountResult.warning) warnings.push(amountResult.warning);
      break;
    }

    case 'tutor':
    case 'privateTutor': {
      const tutorResult = validatePrivateTutor(data);
      if (!tutorResult.valid) errors.push(tutorResult.error);
      if (tutorResult.warning) warnings.push(tutorResult.warning);
      break;
    }

    case 'coaching': {
      const coachingResult = validateCoachingBatchSeparation(data, 'coaching');
      if (!coachingResult.valid) errors.push(coachingResult.error);
      if (coachingResult.warning) warnings.push(coachingResult.warning);
      
      const amountResult = validateAmount(data.monthlyFee, 'coaching');
      if (!amountResult.valid) errors.push(amountResult.error);
      if (amountResult.warning) warnings.push(amountResult.warning);
      break;
    }

    case 'batch': {
      const batchResult = validateCoachingBatchSeparation(data, 'batch');
      if (!batchResult.valid) errors.push(batchResult.error);
      if (batchResult.warning) warnings.push(batchResult.warning);
      
      const amountResult = validateAmount(data.fee, 'batch');
      if (!amountResult.valid) errors.push(amountResult.error);
      if (amountResult.warning) warnings.push(amountResult.warning);
      break;
    }

    default:
      warnings.push(`Unknown data type: ${dataType}. Basic validation only.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get correct placeholder text for institution name field
 * @param {string} eduType - Education level
 * @returns {string} Placeholder text
 */
export function getInstitutionPlaceholder(eduType) {
  return EDUCATION_CONFIG[eduType]?.placeholder || 'Enter institution name';
}

/**
 * Get allowed grades/classes for education level
 * @param {string} eduType - Education level
 * @returns {string[]} Array of grade options
 */
export function getGradeOptions(eduType) {
  return EDUCATION_CONFIG[eduType]?.grades || [];
}

/**
 * Get allowed fee types for education level
 * @param {string} eduType - Education level
 * @returns {string[]} Array of fee type codes
 */
export function getAllowedFeeTypes(eduType) {
  return EDUCATION_CONFIG[eduType]?.allowedFeeTypes || [];
}

/**
 * Check if education level supports semesters
 * @param {string} eduType - Education level
 * @returns {boolean}
 */
export function hasSemesters(eduType) {
  return EDUCATION_CONFIG[eduType]?.hasSemesters || false;
}

/**
 * Auto-correct common institution name typos/abbreviations
 * @param {string} name - Input name
 * @returns {string} Corrected name (or original if no correction)
 */
export function autoCorrectInstitution(name) {
  const corrections = {
    'nsu': 'NSU (North South University)',
    'brac': 'BRAC University',
    'buet': 'BUET',
    'du': 'University of Dhaka',
    'notre dame': 'Notre Dame College',
    'holy cross': 'Holy Cross College',
    'udvash': 'Udvash',
    'unmesh': 'Unmesh',
  };

  const normalized = name.toLowerCase().trim();
  return corrections[normalized] || name;
}

// ═══════════════════════════════════════════════════════════════
// REACT HOOK (for easy integration)
// ═══════════════════════════════════════════════════════════════

/**
 * React hook for using Guardian validation in forms
 * 
 * Usage:
 * const { validate, errors, warnings, isValid } = useGuardian('expense');
 * 
 * const handleSubmit = () => {
 *   const result = validate(formData);
 *   if (result.valid) {
 *     // proceed with save
 *   }
 * };
 */
export function useGuardianValidation(dataType) {
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback((data) => {
    const result = guardianValidate(data, dataType);
    setErrors(result.errors);
    setWarnings(result.warnings);
    setIsValid(result.valid);
    return result;
  }, [dataType]);

  const clearValidation = useCallback(() => {
    setErrors([]);
    setWarnings([]);
    setIsValid(true);
  }, []);

  return {
    validate,
    clearValidation,
    errors,
    warnings,
    isValid
  };
}

export default {
  validateInstitution,
  validateClassLevel,
  validateFeeType,
  validateAmount,
  validateExpenseDate,
  validatePrivateTutor,
  validateCoachingBatchSeparation,
  guardianValidate,
  getInstitutionPlaceholder,
  getGradeOptions,
  getAllowedFeeTypes,
  hasSemesters,
  autoCorrectInstitution,
  useGuardianValidation,
  UNIVERSITIES,
  COLLEGES,
  COACHING_CENTERS,
  EDUCATION_CONFIG
};
