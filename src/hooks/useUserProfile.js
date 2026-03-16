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

    // Computed helpers
    isSchool: user?.eduType === 'school',
    isCollege: user?.eduType === 'college',
    isUniversity: user?.eduType === 'university',

    // Full user object if needed
    user,
    profile,
  };
}
