-- Additive-only migration: adds new enum values, columns, and indexes.
-- Never removes enum values or drops columns.

-- ═══════════════════════════════════════════════════════════════
-- STEP 1: Add new enum values (IF NOT EXISTS is safe to re-run)
-- ═══════════════════════════════════════════════════════════════

-- EntityType
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'ABROAD';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'PERSONAL_PHASE';

-- TrackerType
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'RECURRING_MONTHLY';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'RECURRING_YEARLY';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'PER_CLASS';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'INSTALLMENT_PLAN';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'SESSION';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'EXAM_CYCLE';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'ABROAD_PREP';

-- TrackerStatus
ALTER TYPE "TrackerStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "TrackerStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- ObligationStatus
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'UPCOMING';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'DUE';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- LedgerType
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'INCOME';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'WAIVER_CREDIT';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'CORRECTION';

-- LedgerStatus
ALTER TYPE "LedgerStatus" ADD VALUE IF NOT EXISTS 'POSTED';
ALTER TYPE "LedgerStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: Add new columns to Entity
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "subType" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "eduLevel" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: Make Tracker.entityId nullable + add new columns
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "Tracker" ALTER COLUMN "entityId" DROP NOT NULL;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'other';
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "cadence" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- STEP 4: Add new columns to Obligation
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "waiverAmountMinor" INTEGER DEFAULT 0;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "waiverReason" TEXT;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "period" TEXT;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "installmentSeq" INTEGER;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "installmentOf" INTEGER;

-- ═══════════════════════════════════════════════════════════════
-- STEP 5: Add entityId to LedgerEntry
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

-- ═══════════════════════════════════════════════════════════════
-- STEP 6: Add new indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS "Obligation_userId_period_idx" ON "Obligation"("userId", "period");
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_entityId_date_idx" ON "LedgerEntry"("userId", "entityId", "date");

-- ═══════════════════════════════════════════════════════════════
-- STEP 7: Update defaults for new code
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "LedgerEntry" ALTER COLUMN "status" SET DEFAULT 'POSTED'::"LedgerStatus";
ALTER TABLE "Obligation" ALTER COLUMN "status" SET DEFAULT 'UPCOMING'::"ObligationStatus";
