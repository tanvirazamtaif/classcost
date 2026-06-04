/**
 * Pure Trusted-Circle preset → per-section permissions (Phase 6).
 * No DB. The privacy "hard floor": food / transit / other / personal reminders
 * are NEVER visible by default, even for full_picture.
 */

const ALL_SECTIONS = ['institutions', 'residence', 'forecast', 'fees', 'reminders', 'food', 'transit', 'other'];
const PRIVATE_FLOOR = ['food', 'transit', 'other'];

// Returns [{ section, visibility, notify }] for a preset.
function presetPermissions(preset) {
  const visible = (sections, notify = false) =>
    ALL_SECTIONS.map((section) => ({
      section,
      visibility: sections.includes(section) ? 'visible' : 'hidden',
      notify: notify && sections.includes(section),
    }));

  switch (preset) {
    case 'full_picture':
      // Everything EXCEPT the PIN-locked private floor.
      return visible(ALL_SECTIONS.filter((s) => !PRIVATE_FLOOR.includes(s)));
    case 'custodian':
      // Fee Buddy + payment visibility (canMarkPaid handled separately).
      return visible(['institutions', 'residence', 'forecast', 'fees', 'reminders'], true);
    case 'custom':
      // Start hidden — the user opts sections in explicitly.
      return visible([]);
    case 'fee_buddy':
    default:
      // Fees, dues, and forecast only — the common, safe default.
      return visible(['fees', 'forecast', 'reminders'], true);
  }
}

// Whether a custodian-type circle may mark payments (used by the route layer).
function canMarkPaid(preset) {
  return preset === 'custodian';
}

module.exports = { presetPermissions, canMarkPaid, ALL_SECTIONS, PRIVATE_FLOOR };
