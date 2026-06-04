/**
 * Pure Story Card builder — the shareable settlement artifact (Phase 5).
 * No DB, no locale formatting baked in: returns structured data + narrative
 * lines built with a caller-supplied formatter (so the UI controls ৳/Bengali).
 */

const REASON_LABEL = {
  completed: 'Completed',
  moved_out: 'Moved out',
  dropped: 'Dropped',
  promoted: 'Promoted',
  transferred: 'Transferred',
  repeated: 'Repeated',
  other: 'Closed',
};

const defaultFmt = (minor) => String(minor || 0);

/**
 * @param data {
 *   label, periodLabel, closureReason,
 *   grossMinor, waiverMinor, netMinor, paidMinor, outstandingMinor, refundableMinor
 * }
 * @param fmt  (minor) => display string (defaults to raw minor)
 * @returns { title, reason, periodLabel, stats[], narrative[] }
 */
function buildStoryCard(data = {}, fmt = defaultFmt) {
  const gross = data.grossMinor || 0;
  const waiver = data.waiverMinor || 0;
  const net = data.netMinor || 0;
  const paid = data.paidMinor || 0;
  const outstanding = data.outstandingMinor || 0;
  const refundable = data.refundableMinor || 0;
  const reasonLabel = REASON_LABEL[data.closureReason] || REASON_LABEL.other;

  const stats = [
    { key: 'original', label: 'Original', amountMinor: gross, kind: 'cost' },
  ];
  if (waiver > 0) stats.push({ key: 'waiver', label: 'Waiver / scholarship', amountMinor: -waiver, kind: 'credit' });
  stats.push({ key: 'net', label: 'Net payable', amountMinor: net, kind: 'cost' });
  stats.push({ key: 'paid', label: 'Paid', amountMinor: paid, kind: 'paid' });
  if (outstanding > 0) stats.push({ key: 'outstanding', label: 'Outstanding', amountMinor: outstanding, kind: 'owed' });
  if (refundable > 0) stats.push({ key: 'refundable', label: 'Refundable to you', amountMinor: refundable, kind: 'refund' });

  const narrative = [];
  narrative.push(`${data.label || 'This term'} — ${reasonLabel}.`);
  if (waiver > 0) {
    narrative.push(`Original cost ${fmt(gross)}, reduced by ${fmt(waiver)} in waivers to ${fmt(net)}.`);
  } else {
    narrative.push(`Total cost ${fmt(net)}.`);
  }
  narrative.push(`You paid ${fmt(paid)}.`);
  if (outstanding > 0) narrative.push(`${fmt(outstanding)} is still outstanding (carried forward).`);
  if (refundable > 0) narrative.push(`${fmt(refundable)} is refundable to you — mark received once settled.`);

  return {
    title: data.label || 'Closed',
    reason: reasonLabel,
    periodLabel: data.periodLabel || null,
    stats,
    narrative,
  };
}

module.exports = { buildStoryCard, REASON_LABEL };
