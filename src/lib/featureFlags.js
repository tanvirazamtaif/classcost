const DEFAULT_FLAGS = {
  USE_NEW_ARCHITECTURE: true,
  ENABLE_TRACKER_UI: false,
  ENABLE_ALLOCATION_UI: false,
  ENABLE_REPORTS_V2: false, // Phase 4 — server-side forecast card in Reports
  ENABLE_PROFILE_V2: false, // Phase 6 — layered profile: Wholeness ring + Trusted Circles
  ENABLE_RECURRING_UI: false, // Phase 3 — server-side recurring schedules + slots
  ENABLE_CLOSURE_UI: false, // Phase 5 — closure wizard + Story Cards
  ENABLE_ASSISTANT: true, // "Ask ClassCost" help assistant (floating chat). ON for local testing; flip to false before production if not wanted.
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
