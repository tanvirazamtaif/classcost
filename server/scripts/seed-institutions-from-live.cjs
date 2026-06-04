/**
 * Phase 1 — Seed the curated Institution Data Center FROM LIVE DATA.
 *
 * Reads the institution-name strings that already exist in production
 * (Entity.name where type=INSTITUTION, plus User.institution) and materializes
 * curated Institution rows, each with one primary Branch. Sections are left
 * empty (a string gives no branch/section detail) — onboarding fills those later.
 *
 * It DOES NOT touch any user data: it never writes to Entity / User. It only
 * inserts into the curated Institution/Branch reference tables.
 *
 * Run: node server/scripts/seed-institutions-from-live.cjs
 * Dry run (no writes): node server/scripts/seed-institutions-from-live.cjs --dry
 *
 * Safe to re-run: skips any institution whose normalized name already exists.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY = process.argv.includes('--dry');

// Collapse whitespace + lowercase for dedupe; keep a cleaned display version.
function normalize(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}
function cleanDisplay(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 200);
}

// Allowed curated institution types (keep in sync with the design taxonomy).
const VALID_TYPES = ['school', 'college', 'university', 'coaching', 'cadet', 'madrasa'];

// Best-effort type inference from a bare name string. Derived rows are flagged
// trustLevel='community_reported' so the UI shows them as unverified.
function inferType(name) {
  const n = name.toLowerCase();
  let t;
  if (/\bcadet\b/.test(n)) t = 'cadet';
  else if (/(university|varsity|\buniv\b|\buni\b)/.test(n)) t = 'university';
  else if (/(coaching|udvash|mentors|\bucc\b|retina|saifur)/.test(n)) t = 'coaching';
  else if (/madrasha|madrasa/.test(n)) t = 'madrasa';
  else if (/college/.test(n) && /school/.test(n)) t = 'school'; // "School & College" → school-led
  else if (/college/.test(n)) t = 'college';
  else if (/school/.test(n)) t = 'school';
  else t = 'school'; // neutral default; user can correct in the curated catalog later
  return VALID_TYPES.includes(t) ? t : 'school';
}

async function main() {
  console.log(`\n=== Seed Institutions From Live Data ${DRY ? '(DRY RUN)' : ''} ===\n`);

  // 1. Gather candidate names from live sources (read-only).
  const entityRows = await prisma.entity.findMany({
    where: { type: 'INSTITUTION' },
    select: { name: true },
  });
  const userRows = await prisma.user.findMany({
    where: { institution: { not: null } },
    select: { institution: true },
  });

  const candidates = [
    ...entityRows.map((e) => e.name),
    ...userRows.map((u) => u.institution),
  ].filter((n) => n && String(n).trim().length > 0);

  // 2. Dedupe by normalized name → keep first cleaned display form.
  const byNorm = new Map();
  for (const raw of candidates) {
    const norm = normalize(raw);
    if (!norm) continue;
    if (!byNorm.has(norm)) byNorm.set(norm, cleanDisplay(raw));
  }
  console.log(`Found ${candidates.length} name strings → ${byNorm.size} unique institutions.`);

  // 3. Load existing curated institutions to skip (idempotency).
  const existing = await prisma.institution.findMany({ select: { name: true } });
  const existingNorm = new Set(existing.map((i) => normalize(i.name)));

  let created = 0;
  let skipped = 0;

  for (const [norm, display] of byNorm) {
    if (existingNorm.has(norm)) {
      skipped++;
      continue;
    }
    const type = inferType(display);
    if (DRY) {
      console.log(`  + would create [${type}] ${display}`);
      created++;
      continue;
    }
    await prisma.institution.create({
      data: {
        name: display,
        type,
        trustLevel: 'community_reported',
        branches: {
          create: [{ name: 'Main Campus', isPrimary: true }],
        },
      },
    });
    existingNorm.add(norm);
    created++;
  }

  console.log(`\nDone. ${created} ${DRY ? 'would be created' : 'created'}, ${skipped} already existed.`);

  // 4. Verify pass (counts only — no user data touched).
  if (!DRY) {
    const [instCount, branchCount] = await Promise.all([
      prisma.institution.count(),
      prisma.branch.count(),
    ]);
    console.log(`Catalog now: ${instCount} institutions, ${branchCount} branches.`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
