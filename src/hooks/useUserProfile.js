import { useApp } from '../contexts/AppContext';

export function useUserProfile() {
  const { user } = useApp();
  const profile = user?.profile || {};

  return {
    // Canonical profile data — single source of truth
    institutionName: user?.institution || profile?.institutionName || '',
    educationLevel: user?.eduType || profile?.educationLevel || '',
    classLevel: user?.classLevel || profile?.classLevel || '',
    currency: user?.currency || 'BDT',
    institutionType: profile?.institutionType || '',

    // Computed helpers — recognize stream-derived groups, not just the
    // original 3 values. e.g. an English Medium primary student has
    // eduType='em_school' and should be classified as a school student.
    isSchool: ['school','early','em_school','madrasha_primary','madrasha_secondary','tech_school'].includes(user?.eduType),
    isCollege: ['college','em_college','madrasha_college','tech_college'].includes(user?.eduType),
    isUniversity: ['university','postgrad','diploma','madrasha_university','madrasha_postgrad'].includes(user?.eduType),

    // Full user object if needed
    user,
    profile,
  };
}
