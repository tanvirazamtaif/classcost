/**
 * V3 Data Migration — EducationFee (Complex)
 *
 * Migrates EducationFee JSON blobs → Entity / Tracker / Obligation / LedgerEntry
 *
 * Run: node server/scripts/migrate-v3-education.cjs
 *
 * Safe to re-run: skips records whose sourceRef already exists.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── feeType → v3 category mapping ──────────────────────────────────────────

const FEE_TYPE_TO_CATEGORY = {
  school_fee: 'tuition',
  coaching: 'coaching_monthly',
  batch: 'batch_fee',
  private_tutor: 'coaching_monthly',
  semester_fee: 'semester_fee',
  exam_fee_semester: 'exam_fee',
  exam_fee_board: 'exam_fee',
  lab_fee: 'lab_fee',
  library_fee: 'library_fee',
  clubs: 'other',
  events: 'other',
  development_fee: 'development_fee',
  session_fee: 'registration_fee',
  uniform: 'uniform',
  admission_fee: 'admission_fee',
  registration_fee: 'registration_fee',
  thesis_fee: 'exam_fee',
  medical_bond: 'other',
  id_card: 'id_card',
};

// ── paymentPattern → TrackerType mapping ────────────────────────────────────

const PATTERN_TO_TRACKER_TYPE = {
  recurring: 'MONTHLY',
  per_class: 'CUSTOM',
  semester: 'SEMESTER',
  installment: 'SEMESTER',
  yearly: 'CUSTOM',
  one_time: 'ONE_TIME',
};

// ── old status → ObligationStatus mapping ───────────────────────────────────

const STATUS_MAP = {
  paid: 'PAID',
  partial: 'PARTIAL',
  upcoming: 'PENDING',
  overdue: 'OVERDUE',
  skipped: 'CANCELLED',
  future: 'PENDING',
};

function mapStatus(oldStatus) {
  return STATUS_MAP[oldStatus] || 'PENDING';
}

function toMinor(amount) {
  return Math.round((Number(amount) || 0) * 100);
}

function mapCategory(feeType) {
  return FEE_TYPE_TO_CATEGORY[feeType] || 'other';
}

// ── Counters & warnings ────────────────────────────────────────────────────

const counts = {
  processed: 0,
  trackers: 0,
  obligations: 0,
  ledgerEntries: 0,
  skipped: 0,
  ambiguous: 0,
};
const warnings = [];
let oldPaymentSum = 0;
let newPaymentSum = 0;

// ── Find or create entity for a fee ────────────────────────────────────────

async function findOrCreateEntity(userId, feeName) {
  if (!feeName || feeName.trim() === '') return null;

  // Try to find existing entity by name
  const existing = await prisma.entity.findFirst({
    where: { userId, name: feeName, type: 'INSTITUTION' },
  });
  if (existing) return existing.id;

  // Also try COACHING type
  const coaching = await prisma.entity.findFirst({
    where: { userId, name: feeName, type: 'COACHING' },
  });
  if (coaching) return coaching.id;

  return null;
}

// ── Period string → Date ───────────────────────────────────────────────────

function periodToDate(period, dueDay) {
  const day = dueDay || 10;
  if (period.endsWith('-yearly')) {
    const year = parseInt(period);
    return new Date(year, 0, day);
  }
  const [year, month] = period.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ── Main migration per record ──────────────────────────────────────────────

async function migrateEducationFee(record) {
  const data = record.data || {};
  const userId = record.userId;
  const feeType = record.feeType || data.feeType;
  const pattern = data.paymentPattern || 'one_time';
  const category = mapCategory(feeType);
  const feeName = data.name || data.customTypeName || feeType || '';

  // Flag ambiguous records
  if (!feeName || feeName.trim() === '') {
    counts.ambiguous++;
    warnings.push(`EducationFee ${record.id}: empty name, using feeType="${feeType}" as label`);
  }

  const label = feeName.trim() || feeType || 'Unknown Fee';

  // 1. Find or create entity
  const entityId = await findOrCreateEntity(userId, feeName);

  // 2. Create Tracker
  const trackerType = PATTERN_TO_TRACKER_TYPE[pattern] || 'ONE_TIME';
  const trackerMeta = {
    category,
    dueDay: data.recurring?.dueDay || data.perClass?.dueDay || data.yearly?.dueDay || 10,
    originalFeeType: feeType,
    originalPattern: pattern,
    sourceRef: 'educationfee:' + record.id,
  };
  if (pattern === 'yearly') {
    trackerMeta.recurrence = 'YEARLY';
    trackerMeta.dueMonth = data.yearly?.dueMonth || 1;
  }

  // Determine startDate
  let startDate = record.createdAt;
  if (data.recurring?.startDate) startDate = new Date(data.recurring.startDate);
  else if (data.createdAt) startDate = new Date(data.createdAt);

  const tracker = await prisma.tracker.create({
    data: {
      userId,
      entityId,
      type: trackerType,
      label,
      startDate,
      status: data.isDeleted ? 'ARCHIVED' : 'ACTIVE',
      meta: trackerMeta,
    },
  });
  counts.trackers++;

  // 3. Create Obligations
  // Map: period → obligationId (for linking payments)
  const periodToOblId = {};

  if (pattern === 'recurring' || pattern === 'per_class') {
    await migrateRecurringObligations(userId, entityId, tracker.id, category, label, data, periodToOblId);
  } else if (pattern === 'semester' || pattern === 'installment') {
    await migrateSemesterObligations(userId, entityId, tracker.id, category, label, data, periodToOblId);
  } else if (pattern === 'yearly') {
    await migrateYearlyObligations(userId, entityId, tracker.id, category, label, data, periodToOblId);
  } else if (pattern === 'one_time') {
    await migrateOneTimeObligation(userId, entityId, tracker.id, category, label, data, periodToOblId);
  }

  // 4. Create LedgerEntries from payments[]
  const payments = data.payments || [];
  for (const payment of payments) {
    const paymentSourceRef = 'educationfee:' + record.id + ':payment:' + (payment.id || Math.random().toString(36).slice(2));

    // Skip if already migrated
    const existing = await prisma.ledgerEntry.findFirst({ where: { sourceRef: paymentSourceRef } });
    if (existing) { counts.skipped++; continue; }

    const payAmount = Number(payment.amount) || 0;
    const amountMinor = toMinor(payAmount);
    const isRefund = payment.isRefund === true;

    oldPaymentSum += isRefund ? -payAmount : payAmount;
    newPaymentSum += isRefund ? -amountMinor : amountMinor;

    // Match obligation by period
    let obligationId = null;
    if (payment.forPeriod && periodToOblId[payment.forPeriod]) {
      obligationId = periodToOblId[payment.forPeriod];
    } else if (payment.forInstallment && periodToOblId['inst:' + payment.forInstallment]) {
      obligationId = periodToOblId['inst:' + payment.forInstallment];
    } else if (payment.forPeriod) {
      warnings.push(`EducationFee ${record.id}: payment ${payment.id} forPeriod="${payment.forPeriod}" has no matching obligation`);
    }

    const entryMeta = {};
    if (payment.method) entryMeta.method = payment.method;
    if (payment.receiptNumber) entryMeta.receiptNumber = payment.receiptNumber;
    if (payment.lateFee) entryMeta.lateFee = payment.lateFee;
    if (payment.discount) entryMeta.discount = payment.discount;
    if (payment.discountReason) entryMeta.discountReason = payment.discountReason;
    if (payment.isAdvance) entryMeta.isAdvance = true;
    if (payment.advanceMonths) entryMeta.advanceMonths = payment.advanceMonths;
    if (payment.isPartial) entryMeta.isPartial = true;
    if (payment.isLate) entryMeta.isLate = true;

    await prisma.ledgerEntry.create({
      data: {
        userId,
        trackerId: tracker.id,
        obligationId,
        type: isRefund ? 'REFUND' : 'PAYMENT',
        direction: isRefund ? 'CREDIT' : 'DEBIT',
        category,
        amountMinor,
        currency: 'BDT',
        status: 'CONFIRMED',
        date: payment.paidAt ? new Date(payment.paidAt) : record.createdAt,
        note: payment.note || null,
        sourceRef: paymentSourceRef,
        meta: Object.keys(entryMeta).length > 0 ? entryMeta : null,
      },
    });
    counts.ledgerEntries++;

    // Recalculate obligation paidMinor if linked
    if (obligationId) {
      const agg = await prisma.ledgerEntry.aggregate({
        where: { obligationId, direction: 'DEBIT', status: 'CONFIRMED' },
        _sum: { amountMinor: true },
      });
      const totalPaid = agg._sum.amountMinor || 0;
      await prisma.obligation.update({
        where: { id: obligationId },
        data: { paidMinor: totalPaid },
      });
    }
  }

  counts.processed++;
}

// ── Recurring obligations ──────────────────────────────────────────────────

async function migrateRecurringObligations(userId, entityId, trackerId, category, label, data, periodToOblId) {
  const periodStatus = data.periodStatus || {};
  const recurringAmount = data.recurring?.amount || data.perClass?.ratePerClass || 0;
  const dueDay = data.recurring?.dueDay || data.perClass?.dueDay || 10;

  for (const [period, pData] of Object.entries(periodStatus)) {
    const status = typeof pData === 'object' ? pData.status : pData;
    const dueAmount = (typeof pData === 'object' && pData.dueAmount) ? pData.dueAmount : recurringAmount;
    const amountMinor = toMinor(dueAmount);
    const dueDate = periodToDate(period, dueDay);
    const paidAmount = typeof pData === 'object' ? (pData.paidAmount || 0) : 0;

    const obl = await prisma.obligation.create({
      data: {
        userId,
        entityId,
        trackerId,
        category,
        label: label + ' - ' + formatPeriod(period),
        amountMinor,
        paidMinor: toMinor(paidAmount),
        dueDate,
        status: mapStatus(status),
        isRecurring: true,
        recurrenceRule: 'MONTHLY',
        meta: { originalPeriod: period },
      },
    });
    periodToOblId[period] = obl.id;
    counts.obligations++;
  }
}

// ── Semester obligations ───────────────────────────────────────────────────

async function migrateSemesterObligations(userId, entityId, trackerId, category, label, data, periodToOblId) {
  const sem = data.semester;
  if (!sem) return;

  const totalMinor = toMinor(sem.totalAmount);
  const dueDate = sem.dueDate ? new Date(sem.dueDate) : null;

  // Determine parent status from periodStatus or payments
  const periodStatus = data.periodStatus || {};
  const payments = data.payments || [];
  let parentStatus = 'PENDING';
  if (payments.length > 0) {
    const paidTotal = payments.filter(p => !p.isRefund).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    if (paidTotal >= (sem.totalAmount || 0)) parentStatus = 'PAID';
    else if (paidTotal > 0) parentStatus = 'PARTIAL';
  }

  const parent = await prisma.obligation.create({
    data: {
      userId,
      entityId,
      trackerId,
      category,
      label: label + (sem.semesterName ? ' - ' + sem.semesterName : ''),
      amountMinor: totalMinor,
      paidMinor: toMinor(payments.filter(p => !p.isRefund).reduce((s, p) => s + (Number(p.amount) || 0), 0)),
      dueDate,
      status: parentStatus,
      meta: {
        semesterName: sem.semesterName || null,
        isPerCredit: sem.isPerCredit || false,
        creditBreakdown: sem.creditBreakdown || null,
      },
    },
  });
  // Use semester-level period key or a generic key for payment linking
  const semPeriodKey = Object.keys(periodStatus)[0] || 'semester';
  periodToOblId[semPeriodKey] = parent.id;
  counts.obligations++;

  // Installments
  if (sem.isInstallment && Array.isArray(sem.installments) && sem.installments.length > 0) {
    for (const inst of sem.installments) {
      const instStatus = inst.status ? mapStatus(inst.status) : 'PENDING';
      const obl = await prisma.obligation.create({
        data: {
          userId,
          entityId,
          trackerId,
          parentId: parent.id,
          category,
          label: label + ' - Part ' + (inst.part || '?'),
          amountMinor: toMinor(inst.amount),
          paidMinor: toMinor(inst.paidAmount || 0),
          dueDate: inst.dueDate ? new Date(inst.dueDate) : null,
          status: instStatus,
          meta: { installmentPart: inst.part, originalId: inst.id },
        },
      });
      if (inst.id) periodToOblId['inst:' + inst.id] = obl.id;
      counts.obligations++;
    }
  }
}

// ── Yearly obligations ─────────────────────────────────────────────────────

async function migrateYearlyObligations(userId, entityId, trackerId, category, label, data, periodToOblId) {
  const periodStatus = data.periodStatus || {};
  const yearlyAmount = data.yearly?.amount || 0;
  const dueMonth = data.yearly?.dueMonth || 1;
  const dueDay = data.yearly?.dueDay || 15;

  for (const [period, pData] of Object.entries(periodStatus)) {
    const status = typeof pData === 'object' ? pData.status : pData;
    const dueAmount = (typeof pData === 'object' && pData.dueAmount) ? pData.dueAmount : yearlyAmount;
    const amountMinor = toMinor(dueAmount);
    const paidAmount = typeof pData === 'object' ? (pData.paidAmount || 0) : 0;

    // Parse year from period key
    const year = parseInt(period);
    const dueDate = isNaN(year) ? new Date() : new Date(year, dueMonth - 1, dueDay);

    const obl = await prisma.obligation.create({
      data: {
        userId,
        entityId,
        trackerId,
        category,
        label: label + ' - ' + (isNaN(year) ? period : year),
        amountMinor,
        paidMinor: toMinor(paidAmount),
        dueDate,
        status: mapStatus(status),
        isRecurring: true,
        recurrenceRule: 'YEARLY',
        meta: { originalPeriod: period },
      },
    });
    periodToOblId[period] = obl.id;
    counts.obligations++;
  }
}

// ── One-time obligation ────────────────────────────────────────────────────

async function migrateOneTimeObligation(userId, entityId, trackerId, category, label, data, periodToOblId) {
  const ot = data.oneTime;
  if (!ot) {
    // Fallback: try to derive from periodStatus or payments
    const payments = data.payments || [];
    if (payments.length === 0) return;
    // Create a single obligation from the first payment
    const totalPaid = payments.filter(p => !p.isRefund).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const obl = await prisma.obligation.create({
      data: {
        userId,
        entityId,
        trackerId,
        category,
        label,
        amountMinor: toMinor(totalPaid),
        paidMinor: toMinor(totalPaid),
        status: 'PAID',
      },
    });
    periodToOblId['one_time'] = obl.id;
    counts.obligations++;
    return;
  }

  const amountMinor = toMinor(ot.amount);
  const isPaid = ot.isPaid === true;

  const obl = await prisma.obligation.create({
    data: {
      userId,
      entityId,
      trackerId,
      category,
      label,
      amountMinor,
      paidMinor: isPaid ? amountMinor : 0,
      dueDate: ot.dueDate ? new Date(ot.dueDate) : null,
      status: isPaid ? 'PAID' : 'PENDING',
      meta: ot.paidAt ? { paidAt: ot.paidAt } : null,
    },
  });
  periodToOblId['one_time'] = obl.id;

  // Also map any period keys from periodStatus
  const periodStatus = data.periodStatus || {};
  for (const key of Object.keys(periodStatus)) {
    periodToOblId[key] = obl.id;
  }

  counts.obligations++;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatPeriod(period) {
  if (period.endsWith('-yearly')) return period.replace('-yearly', '');
  const [year, month] = period.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] + ' ' + year;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  V3 Migration — EducationFee (Complex)');
  console.log('═══════════════════════════════════════════════');

  const records = await prisma.educationFee.findMany();
  console.log(`\nFound ${records.length} EducationFee records to process\n`);

  for (const record of records) {
    const sourceRef = 'educationfee:' + record.id;

    // Skip if tracker already exists for this record
    const existingTracker = await prisma.tracker.findFirst({
      where: { meta: { path: ['sourceRef'], equals: sourceRef } },
    });
    if (existingTracker) {
      console.log(`  Skipping EducationFee ${record.id} (already migrated)`);
      counts.skipped++;
      continue;
    }

    try {
      await migrateEducationFee(record);
      console.log(`  ✓ Migrated: ${record.feeType} — "${(record.data || {}).name || record.feeType}"`);
    } catch (err) {
      console.error(`  ✗ FAILED: EducationFee ${record.id} — ${err.message}`);
      warnings.push(`EducationFee ${record.id}: migration failed — ${err.message}`);
      counts.ambiguous++;
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`  EducationFees processed: ${counts.processed}`);
  console.log(`  Trackers created:        ${counts.trackers}`);
  console.log(`  Obligations created:     ${counts.obligations}`);
  console.log(`  LedgerEntries created:   ${counts.ledgerEntries}`);
  console.log(`  Records skipped:         ${counts.skipped}`);
  console.log(`  Ambiguous (review):      ${counts.ambiguous}`);
  console.log('');
  console.log(`  Old payments SUM:        ৳${oldPaymentSum.toFixed(2)}`);
  console.log(`  New LedgerEntry SUM:     ৳${(newPaymentSum / 100).toFixed(2)}`);
  const diff = Math.abs(oldPaymentSum - newPaymentSum / 100);
  if (diff > 1) {
    console.log(`  ⚠️  WARNING: Amount difference of ৳${diff.toFixed(2)} detected!`);
  } else {
    console.log('  ✓ Amounts match within tolerance');
  }

  if (warnings.length > 0) {
    console.log(`\n── Warnings (${warnings.length}) ──`);
    for (const w of warnings) {
      console.log(`  ⚠️  ${w}`);
    }
  }

  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
