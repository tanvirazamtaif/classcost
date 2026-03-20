const DEFAULT_FLAGS = {
  USE_NEW_ARCHITECTURE: true,
  ENABLE_TRACKER_UI: false,
  ENABLE_ALLOCATION_UI: false,
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
