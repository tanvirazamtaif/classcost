const DEFAULT_FLAGS = {
  USE_NEW_ARCHITECTURE: false,
  ENABLE_TRACKER_UI: false,
  ENABLE_ALLOCATION_UI: false,
};

function envBool(key) {
  const val = process.env[key];
  return val === "true";
}

const flags = {
  ...DEFAULT_FLAGS,
  USE_NEW_ARCHITECTURE: envBool("FEATURE_NEW_ARCH") || true, // v3 always on
  ENABLE_TRACKER_UI: envBool("FEATURE_TRACKER_UI"),
  ENABLE_ALLOCATION_UI: envBool("FEATURE_ALLOCATION_UI"),
};

function isEnabled(flagName) {
  return flags[flagName] === true;
}

module.exports = { flags, isEnabled };
