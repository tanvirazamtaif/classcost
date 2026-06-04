/**
 * Pure obligation money math — single source of truth for "what is still owed".
 *
 * NET/GROSS invariant (see the project's waiver-convention note):
 *   amountMinor       = what's owed before any OBLIGATION-LEVEL waiver
 *   waiverAmountMinor = obligation-level reduction (0 for engine obligations,
 *                       which are already NET; > 0 only for the per-obligation
 *                       "apply a waiver to this charge" feature)
 *
 * effectiveDue = amountMinor - waiverAmountMinor is correct for BOTH:
 *   - semester-engine obligations: NET amount, waiver 0  → due = amount
 *   - per-obligation waivers:       GROSS amount + waiver → due = amount - waiver
 *
 * Centralizing this prevents the latent double-subtraction bug (which would
 * only arise if a row ever had BOTH a NET amount AND a non-zero waiver).
 */

function effectiveDue(obligation) {
  return (obligation.amountMinor || 0) - (obligation.waiverAmountMinor || 0);
}

function amountRemaining(obligation, amountPaid) {
  return effectiveDue(obligation) - (amountPaid || 0);
}

module.exports = { effectiveDue, amountRemaining };
