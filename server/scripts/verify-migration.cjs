/**
 * V3 Migration Verification
 *
 * Run: node server/scripts/verify-migration.cjs
 *
 * Checks data integrity after running migrate-v3-simple.cjs
 * and migrate-v3-education.cjs.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function pass(label, detail) {
  passed++;
  console.log(`  ✅ PASS: ${label}${detail ? ' — ' + detail : ''}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  V3 Migration Verification');
  console.log('═══════════════════════════════════════════════\n');

  // ── 1. Every Expense has a matching LedgerEntry ──────────────────────────

  console.log('── Count Checks ──\n');

  const expenseCount = await prisma.expense.count();
  const expenseLedgerCount = await prisma.ledgerEntry.count({
    where: { sourceRef: { startsWith: 'expense:' } },
  });

  if (expenseCount === expenseLedgerCount) {
    pass('Expense → LedgerEntry count', `${expenseCount} expenses, ${expenseLedgerCount} entries`);
  } else {
    fail('Expense → LedgerEntry count', `${expenseCount} expenses but ${expenseLedgerCount} entries`);
  }

  // ── 2. Every Housing has a matching Entity (RESIDENCE) ───────────────────

  const housingCount = await prisma.housing.count();
  const residenceCount = await prisma.entity.count({ where: { type: 'RESIDENCE' } });

  if (housingCount === residenceCount) {
    pass('Housing → Entity(RESIDENCE) count', `${housingCount} housings, ${residenceCount} entities`);
  } else {
    fail('Housing → Entity(RESIDENCE) count', `${housingCount} housings but ${residenceCount} entities`);
  }

  // ── 3. Every CoachingCenter has a matching Entity (COACHING) ─────────────

  const coachingCount = await prisma.coachingCenter.count();
  const coachingEntityCount = await prisma.entity.count({ where: { type: 'COACHING' } });

  if (coachingCount <= coachingEntityCount) {
    pass('CoachingCenter → Entity(COACHING) count', `${coachingCount} centers, ${coachingEntityCount} entities`);
  } else {
    fail('CoachingCenter → Entity(COACHING) count', `${coachingCount} centers but only ${coachingEntityCount} entities`);
  }

  // ── 4. Expense amount SUM verification ───────────────────────────────────

  console.log('\n── Sum Checks ──\n');

  const expenseSumResult = await prisma.expense.aggregate({ _sum: { amount: true } });
  const oldExpenseSum = expenseSumResult._sum.amount || 0;

  const expenseLedgerEntries = await prisma.ledgerEntry.findMany({
    where: { sourceRef: { startsWith: 'expense:' } },
    select: { amountMinor: true },
  });
  const newExpenseSum = expenseLedgerEntries.reduce((s, e) => s + e.amountMinor, 0);

  const expenseDiff = Math.abs(Math.round(oldExpenseSum * 100) - newExpenseSum);
  if (expenseDiff <= 100) { // tolerance: 1 taka (100 paisa)
    pass('Expense SUM', `old ৳${oldExpenseSum.toFixed(2)} → new ৳${(newExpenseSum / 100).toFixed(2)} (diff: ${expenseDiff} paisa)`);
  } else {
    fail('Expense SUM', `old ৳${oldExpenseSum.toFixed(2)} → new ৳${(newExpenseSum / 100).toFixed(2)} (diff: ${expenseDiff} paisa)`);
  }

  // ── 5. EducationFee payment SUM verification ─────────────────────────────

  const eduFees = await prisma.educationFee.findMany({ select: { data: true } });
  let oldEduPaymentSum = 0;
  for (const ef of eduFees) {
    const data = ef.data || {};
    const payments = data.payments || [];
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      oldEduPaymentSum += p.isRefund ? -amt : amt;
    }
  }

  const eduLedgerEntries = await prisma.ledgerEntry.findMany({
    where: { sourceRef: { startsWith: 'educationfee:' } },
    select: { amountMinor: true, direction: true },
  });
  let newEduSum = 0;
  for (const e of eduLedgerEntries) {
    newEduSum += e.direction === 'CREDIT' ? -e.amountMinor : e.amountMinor;
  }

  const eduDiff = Math.abs(Math.round(oldEduPaymentSum * 100) - newEduSum);
  if (eduDiff <= 100) {
    pass('EducationFee payment SUM', `old ৳${oldEduPaymentSum.toFixed(2)} → new ৳${(newEduSum / 100).toFixed(2)} (diff: ${eduDiff} paisa)`);
  } else {
    fail('EducationFee payment SUM', `old ৳${oldEduPaymentSum.toFixed(2)} → new ৳${(newEduSum / 100).toFixed(2)} (diff: ${eduDiff} paisa)`);
  }

  // ── 6. LedgerEntry → Obligation referential integrity ───────────────────

  console.log('\n── Integrity Checks ──\n');

  const entriesWithObl = await prisma.ledgerEntry.findMany({
    where: { obligationId: { not: null } },
    select: { id: true, obligationId: true },
  });
  let brokenOblRefs = 0;
  for (const entry of entriesWithObl) {
    const obl = await prisma.obligation.findUnique({ where: { id: entry.obligationId }, select: { id: true } });
    if (!obl) brokenOblRefs++;
  }

  if (brokenOblRefs === 0) {
    pass('LedgerEntry → Obligation integrity', `${entriesWithObl.length} linked entries, all valid`);
  } else {
    fail('LedgerEntry → Obligation integrity', `${brokenOblRefs} of ${entriesWithObl.length} entries point to missing obligations`);
  }

  // ── 7. Obligation → Tracker referential integrity ───────────────────────

  const oblsWithTracker = await prisma.obligation.findMany({
    where: { trackerId: { not: null } },
    select: { id: true, trackerId: true },
  });
  let brokenTrackerRefs = 0;
  for (const obl of oblsWithTracker) {
    const tracker = await prisma.tracker.findUnique({ where: { id: obl.trackerId }, select: { id: true } });
    if (!tracker) brokenTrackerRefs++;
  }

  if (brokenTrackerRefs === 0) {
    pass('Obligation → Tracker integrity', `${oblsWithTracker.length} linked obligations, all valid`);
  } else {
    fail('Obligation → Tracker integrity', `${brokenTrackerRefs} of ${oblsWithTracker.length} obligations point to missing trackers`);
  }

  // ── 8. Tracker → Entity referential integrity ───────────────────────────

  const trackersWithEntity = await prisma.tracker.findMany({
    where: { entityId: { not: null } },
    select: { id: true, entityId: true },
  });
  let brokenEntityRefs = 0;
  for (const t of trackersWithEntity) {
    const entity = await prisma.entity.findUnique({ where: { id: t.entityId }, select: { id: true } });
    if (!entity) brokenEntityRefs++;
  }

  if (brokenEntityRefs === 0) {
    pass('Tracker → Entity integrity', `${trackersWithEntity.length} linked trackers, all valid`);
  } else {
    fail('Tracker → Entity integrity', `${brokenEntityRefs} of ${trackersWithEntity.length} trackers point to missing entities`);
  }

  // ── 9. Orphan LedgerEntries (migration sourceRefs with no source) ───────

  console.log('\n── Orphan Checks ──\n');

  const migrationEntries = await prisma.ledgerEntry.findMany({
    where: {
      sourceRef: { not: null },
      OR: [
        { sourceRef: { startsWith: 'expense:' } },
        { sourceRef: { startsWith: 'event:' } },
        { sourceRef: { startsWith: 'uniform:' } },
      ],
    },
    select: { id: true, sourceRef: true },
  });

  let orphans = 0;
  for (const entry of migrationEntries) {
    const [type, id] = entry.sourceRef.split(':');
    let exists = false;
    if (type === 'expense') {
      exists = !!(await prisma.expense.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'event') {
      exists = !!(await prisma.event.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'uniform') {
      exists = !!(await prisma.uniform.findUnique({ where: { id }, select: { id: true } }));
    }
    if (!exists) orphans++;
  }

  if (orphans === 0) {
    pass('No orphan LedgerEntries', `${migrationEntries.length} migration entries, all have source records`);
  } else {
    fail('Orphan LedgerEntries', `${orphans} entries have no matching source record`);
  }

  // ── Final verdict ───────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════');
  if (failed === 0) {
    console.log(`  ✅ MIGRATION VERIFIED (${passed}/${passed + failed} checks passed)`);
  } else {
    console.log(`  ⚠️  MIGRATION HAS ISSUES (${passed} passed, ${failed} failed)`);
  }
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
