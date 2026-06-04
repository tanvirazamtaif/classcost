const DEFAULT_FLAGS = {
  USE_NEW_ARCHITECTURE: true,
  ENABLE_TRACKER_UI: false,
  ENABLE_ALLOCATION_UI: false,
  ENABLE_REPORTS_V2: false, // Phase 4 — server-side forecast card in Reports
  ENABLE_PROFILE_V2: false, // Phase 6 — layered profile: Wholeness ring + Trusted Circles
};

function getOverrides() {
  try {
    const raw = localStorage.getItem("classcost_feature_flags");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const flags = { ...DEFAULT_FLAGS, ...getOverrides() };

export function isEnabled(flagName) {
  return flags[flagName] === true;
}

export default flags;
