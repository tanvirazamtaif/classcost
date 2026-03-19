/**
 * V3 Data Migration — Simple Models
 *
 * Migrates: user.institution, Housing, CoachingCenter, Batch,
 *           Expense, Event, Uniform → Entity / Tracker / Obligation / LedgerEntry
 *
 * Run: node server/scripts/migrate-v3-simple.cjs
 *
 * Safe to re-run: skips records that already have a sourceRef in LedgerEntry.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Old expense type → new category mapping ─────────────────────────────────

const TYPE_MAP = {
  education: 'semester_fee',
  transport: 'transport',
  canteen: 'food',
  hostel: 'rent',
  books: 'books',
  uniform: 'uniform',
  other: 'other',
};

function mapCategory(oldType) {
  return TYPE_MAP[oldType] || 'other';
}

function toMinor(amount) {
  return Math.round((Number(amount) || 0) * 100);
}

// ── Counters ────────────────────────────────────────────────────────────────

const counts = {
  entities: 0,
  trackers: 0,
  obligations: 0,
  ledgerEntries: 0,
  skipped: 0,
};

// ── 1. Migrate user.institution → Entity ────────────────────────────────────

async function migrateInstitutions() {
  console.log('\n── Migrating user.institution → Entity ──');
  const users = await prisma.user.findMany({
    where: { institution: { not: null } },
    select: { id: true, institution: true, eduType: true },
  });

  // Map: userId → entityId (for linking expenses later)
  const entityMap = {};
  // Map: userId+institutionName → entityId
  const nameMap = {};

  for (const user of users) {
    if (!user.institution || user.institution.trim() === '') continue;

    // Check if already migrated
    const existing = await prisma.entity.findFirst({
      where: { userId: user.id, name: user.institution, type: 'INSTITUTION' },
    });
    if (existing) {
      entityMap[user.id] = existing.id;
      nameMap[`${user.id}::${user.institution.toLowerCase()}`] = existing.id;
      continue;
    }

    const entity = await prisma.entity.create({
      data: {
        userId: user.id,
        type: 'INSTITUTION',
        name: user.institution,
        meta: user.eduType ? { eduLevel: user.eduType } : null,
        isActive: true,
      },
    });
    entityMap[user.id] = entity.id;
    nameMap[`${user.id}::${user.institution.toLowerCase()}`] = entity.id;
    counts.entities++;
  }

  console.log(`  Created ${counts.entities} institution entities`);
  return { entityMap, nameMap };
}

// ── 2. Migrate Housing → Entity + Tracker + Obligation ──────────────────────

async function migrateHousing() {
  console.log('\n── Migrating Housing → Entity + Tracker ──');
  const housings = await prisma.housing.findMany();
  let entityCount = 0, trackerCount = 0, oblCount = 0;

  for (const h of housings) {
    // Check if already migrated
    const existingEntity = await prisma.entity.findFirst({
      where: { userId: h.userId, name: h.name, type: 'RESIDENCE' },
    });
    if (existingEntity) continue;

    const entity = await prisma.entity.create({
      data: {
        userId: h.userId,
        type: 'RESIDENCE',
        name: h.name,
        meta: { subType: h.housingType },
        isActive: h.isActive,
      },
    });
    entityCount++;

    const data = h.data || {};
    const tracker = await prisma.tracker.create({
      data: {
        userId: h.userId,
        entityId: entity.id,
        type: 'MONTHLY',
        label: 'Monthly Rent',
        startDate: data.moveInDate ? new Date(data.moveInDate) : h.createdAt,
        status: h.isActive ? 'ACTIVE' : 'ARCHIVED',
        meta: { category: 'rent', dueDay: 10 },
      },
    });
    trackerCount++;

    if (data.monthlyRent && Number(data.monthlyRent) > 0) {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);
      await prisma.obligation.create({
        data: {
          userId: h.userId,
          entityId: entity.id,
          trackerId: tracker.id,
          category: 'rent',
          label: 'Monthly Rent - ' + now.toLocaleString('en', { month: 'short', year: 'numeric' }),
          amountMinor: toMinor(data.monthlyRent),
          dueDate,
          status: now > dueDate ? 'OVERDUE' : 'PENDING',
          isRecurring: true,
          recurrenceRule: 'MONTHLY',
        },
      });
      oblCount++;
    }
  }

  counts.entities += entityCount;
  counts.trackers += trackerCount;
  counts.obligations += oblCount;
  console.log(`  Created ${entityCount} residence entities, ${trackerCount} trackers, ${oblCount} obligations`);
}

// ── 3. Migrate CoachingCenter → Entity + Tracker + Obligations ──────────────

async function migrateCoaching() {
  console.log('\n── Migrating CoachingCenter → Entity + Tracker ──');
  const centers = await prisma.coachingCenter.findMany();
  let entityCount = 0, trackerCount = 0, oblCount = 0;

  for (const c of centers) {
    const existingEntity = await prisma.entity.findFirst({
      where: { userId: c.userId, name: c.name, type: 'COACHING' },
    });
    if (existingEntity) continue;

    const entity = await prisma.entity.create({
      data: {
        userId: c.userId,
        type: 'COACHING',
        name: c.name,
        isActive: c.isActive,
      },
    });
    entityCount++;

    const tracker = await prisma.tracker.create({
      data: {
        userId: c.userId,
        entityId: entity.id,
        type: 'MONTHLY',
        label: c.name + ' Monthly',
        startDate: c.startDate,
        status: c.isActive ? 'ACTIVE' : 'ARCHIVED',
        meta: { category: 'coaching_monthly', dueDay: 10 },
        budgetMinor: toMinor(c.monthlyFee),
      },
    });
    trackerCount++;

    // Create obligations for paid months
    const amountMinor = toMinor(c.monthlyFee);
    if (amountMinor > 0) {
      const start = new Date(c.startDate);
      for (let i = 0; i < c.monthsPaid; i++) {
        const oblMonth = new Date(start.getFullYear(), start.getMonth() + i, 10);
        await prisma.obligation.create({
          data: {
            userId: c.userId,
            entityId: entity.id,
            trackerId: tracker.id,
            category: 'coaching_monthly',
            label: c.name + ' - ' + oblMonth.toLocaleString('en', { month: 'short', year: 'numeric' }),
            amountMinor,
            paidMinor: amountMinor,
            dueDate: oblMonth,
            status: 'PAID',
            isRecurring: true,
            recurrenceRule: 'MONTHLY',
          },
        });
        oblCount++;
      }

      // Current month obligation
      const now = new Date();
      const currentDue = new Date(now.getFullYear(), now.getMonth(), 10);
      await prisma.obligation.create({
        data: {
          userId: c.userId,
          entityId: entity.id,
          trackerId: tracker.id,
          category: 'coaching_monthly',
          label: c.name + ' - ' + now.toLocaleString('en', { month: 'short', year: 'numeric' }),
          amountMinor,
          dueDate: currentDue,
          status: now > currentDue ? 'OVERDUE' : 'PENDING',
          isRecurring: true,
          recurrenceRule: 'MONTHLY',
        },
      });
      oblCount++;
    }
  }

  counts.entities += entityCount;
  counts.trackers += trackerCount;
  counts.obligations += oblCount;
  console.log(`  Created ${entityCount} coaching entities, ${trackerCount} trackers, ${oblCount} obligations`);
}

// ── 4. Migrate Expense → LedgerEntry ────────────────────────────────────────

async function migrateExpenses(nameMap) {
  console.log('\n── Migrating Expense → LedgerEntry ──');
  const expenses = await prisma.expense.findMany();
  let created = 0, skipped = 0;
  let oldSum = 0, newSum = 0;

  for (const exp of expenses) {
    const sourceRef = 'expense:' + exp.id;

    // Skip if already migrated
    const existing = await prisma.ledgerEntry.findFirst({ where: { sourceRef } });
    if (existing) { skipped++; continue; }

    const amountMinor = toMinor(exp.amount);
    oldSum += Number(exp.amount) || 0;
    newSum += amountMinor;

    // Try to find matching entity via meta.institutionName
    const meta = exp.meta || {};
    const instName = meta.institutionName || meta.institution || '';
    const entityKey = instName ? `${exp.userId}::${instName.toLowerCase()}` : '';
    const matchedEntityId = entityKey ? (nameMap[entityKey] || null) : null;

    // Find tracker via entity if matched
    let trackerId = null;
    if (matchedEntityId) {
      const tracker = await prisma.tracker.findFirst({
        where: { entityId: matchedEntityId, userId: exp.userId },
        select: { id: true },
      });
      if (tracker) trackerId = tracker.id;
    }

    await prisma.ledgerEntry.create({
      data: {
        userId: exp.userId,
        trackerId,
        type: 'EXPENSE',
        direction: 'DEBIT',
        category: mapCategory(exp.type),
        amountMinor,
        currency: 'BDT',
        status: 'CONFIRMED',
        date: new Date(exp.date),
        note: exp.note || null,
        sourceRef,
        meta: exp.meta || null,
      },
    });
    created++;
  }

  counts.ledgerEntries += created;
  counts.skipped += skipped;
  console.log(`  Created ${created} ledger entries from expenses (${skipped} skipped)`);
  return { oldSum, newSum };
}

// ── 5. Migrate Event → LedgerEntry ─────────────────────────────────────────

async function migrateEvents() {
  console.log('\n── Migrating Event → LedgerEntry ──');
  const events = await prisma.event.findMany();
  let created = 0, skipped = 0;

  for (const evt of events) {
    const sourceRef = 'event:' + evt.id;
    const existing = await prisma.ledgerEntry.findFirst({ where: { sourceRef } });
    if (existing) { skipped++; continue; }

    await prisma.ledgerEntry.create({
      data: {
        userId: evt.userId,
        type: 'EXPENSE',
        direction: 'DEBIT',
        category: 'other',
        amountMinor: toMinor(evt.amount),
        currency: 'BDT',
        status: 'CONFIRMED',
        date: evt.date,
        note: evt.name || null,
        sourceRef,
        meta: { originalCategory: evt.category },
      },
    });
    created++;
  }

  counts.ledgerEntries += created;
  counts.skipped += skipped;
  console.log(`  Created ${created} ledger entries from events (${skipped} skipped)`);
}

// ── 6. Migrate Uniform → LedgerEntry ───────────────────────────────────────

async function migrateUniforms() {
  console.log('\n── Migrating Uniform → LedgerEntry ──');
  const uniforms = await prisma.uniform.findMany();
  let created = 0, skipped = 0;

  for (const uni of uniforms) {
    const sourceRef = 'uniform:' + uni.id;
    const existing = await prisma.ledgerEntry.findFirst({ where: { sourceRef } });
    if (existing) { skipped++; continue; }

    await prisma.ledgerEntry.create({
      data: {
        userId: uni.userId,
        type: 'EXPENSE',
        direction: 'DEBIT',
        category: 'uniform',
        amountMinor: toMinor(uni.amount),
        currency: 'BDT',
        status: 'CONFIRMED',
        date: uni.purchaseDate,
        note: uni.description || null,
        sourceRef,
      },
    });
    created++;
  }

  counts.ledgerEntries += created;
  counts.skipped += skipped;
  console.log(`  Created ${created} ledger entries from uniforms (${skipped} skipped)`);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  V3 Migration — Simple Models');
  console.log('═══════════════════════════════════════════════');

  const { nameMap } = await migrateInstitutions();
  await migrateHousing();
  await migrateCoaching();
  const { oldSum, newSum } = await migrateExpenses(nameMap);
  await migrateEvents();
  await migrateUniforms();

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Entities created:      ${counts.entities}`);
  console.log(`  Trackers created:      ${counts.trackers}`);
  console.log(`  Obligations created:   ${counts.obligations}`);
  console.log(`  LedgerEntries created: ${counts.ledgerEntries}`);
  console.log(`  Records skipped:       ${counts.skipped}`);
  console.log('');
  console.log(`  Old Expense SUM:       ৳${oldSum.toFixed(2)}`);
  console.log(`  New LedgerEntry SUM:   ৳${(newSum / 100).toFixed(2)}`);
  const diff = Math.abs(oldSum - newSum / 100);
  if (diff > 1) {
    console.log(`  ⚠️  WARNING: Amount difference of ৳${diff.toFixed(2)} detected!`);
  } else {
    console.log('  ✓ Amounts match within tolerance');
  }
  console.log('═══════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
