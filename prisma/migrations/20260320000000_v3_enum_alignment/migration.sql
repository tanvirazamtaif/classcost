-- Step 1: Add new enum values to existing enums (PostgreSQL allows adding, not removing)

-- LedgerStatus: add POSTED, VOIDED
ALTER TYPE "LedgerStatus" ADD VALUE IF NOT EXISTS 'POSTED';
ALTER TYPE "LedgerStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- LedgerType: add INCOME, WAIVER_CREDIT, CORRECTION
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'INCOME';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'WAIVER_CREDIT';
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'CORRECTION';

-- ObligationStatus: add UPCOMING, DUE, PARTIALLY_PAID, SKIPPED, VOIDED
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'UPCOMING';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'DUE';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'SKIPPED';
ALTER TYPE "ObligationStatus" ADD VALUE IF NOT EXISTS 'VOIDED';

-- TrackerStatus: add PAUSED, CANCELLED
ALTER TYPE "TrackerStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "TrackerStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- TrackerType: add RECURRING_MONTHLY, RECURRING_YEARLY, PER_CLASS, INSTALLMENT_PLAN, SESSION, EXAM_CYCLE, ABROAD_PREP
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'RECURRING_MONTHLY';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'RECURRING_YEARLY';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'PER_CLASS';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'INSTALLMENT_PLAN';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'SESSION';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'EXAM_CYCLE';
ALTER TYPE "TrackerType" ADD VALUE IF NOT EXISTS 'ABROAD_PREP';

-- EntityType: add ABROAD, PERSONAL_PHASE
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'ABROAD';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'PERSONAL_PHASE';

COMMIT;

-- Step 2: Update existing rows to use new values
UPDATE "LedgerEntry" SET status = 'POSTED' WHERE status = 'CONFIRMED';
UPDATE "LedgerEntry" SET status = 'VOIDED' WHERE status = 'VOID';
UPDATE "LedgerEntry" SET type = 'PAYMENT' WHERE type = 'EXPENSE';

UPDATE "Obligation" SET status = 'UPCOMING' WHERE status = 'PENDING';
UPDATE "Obligation" SET status = 'PARTIALLY_PAID' WHERE status = 'PARTIAL';
UPDATE "Obligation" SET status = 'VOIDED' WHERE status = 'CANCELLED';

UPDATE "Tracker" SET status = 'CANCELLED' WHERE status = 'ARCHIVED';
UPDATE "Tracker" SET type = 'RECURRING_MONTHLY' WHERE type = 'MONTHLY';

-- Step 3: Now safely recreate enums without old values
-- PostgreSQL doesn't support DROP VALUE from enum, so we create new enums and swap

-- LedgerStatus
ALTER TYPE "LedgerStatus" RENAME TO "LedgerStatus_old";
CREATE TYPE "LedgerStatus" AS ENUM ('POSTED', 'PENDING', 'VOIDED');
ALTER TABLE "LedgerEntry" ALTER COLUMN status TYPE "LedgerStatus" USING status::text::"LedgerStatus";
DROP TYPE "LedgerStatus_old";

-- LedgerType
ALTER TYPE "LedgerType" RENAME TO "LedgerType_old";
CREATE TYPE "LedgerType" AS ENUM ('PAYMENT', 'INCOME', 'REFUND', 'WAIVER_CREDIT', 'ADJUSTMENT', 'CORRECTION');
ALTER TABLE "LedgerEntry" ALTER COLUMN type TYPE "LedgerType" USING type::text::"LedgerType";
DROP TYPE "LedgerType_old";

-- ObligationStatus
ALTER TYPE "ObligationStatus" RENAME TO "ObligationStatus_old";
CREATE TYPE "ObligationStatus" AS ENUM ('UPCOMING', 'DUE', 'OVERDUE', 'PAID', 'PARTIALLY_PAID', 'WAIVED', 'SKIPPED', 'VOIDED');
ALTER TABLE "Obligation" ALTER COLUMN status TYPE "ObligationStatus" USING status::text::"ObligationStatus";
DROP TYPE "ObligationStatus_old";

-- TrackerStatus
ALTER TYPE "TrackerStatus" RENAME TO "TrackerStatus_old";
CREATE TYPE "TrackerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Tracker" ALTER COLUMN status TYPE "TrackerStatus" USING status::text::"TrackerStatus";
DROP TYPE "TrackerStatus_old";

-- TrackerType
ALTER TYPE "TrackerType" RENAME TO "TrackerType_old";
CREATE TYPE "TrackerType" AS ENUM ('SEMESTER', 'RECURRING_MONTHLY', 'RECURRING_YEARLY', 'ONE_TIME', 'PER_CLASS', 'INSTALLMENT_PLAN', 'SESSION', 'EXAM_CYCLE', 'ABROAD_PREP', 'CUSTOM');
ALTER TABLE "Tracker" ALTER COLUMN type TYPE "TrackerType" USING type::text::"TrackerType";
DROP TYPE "TrackerType_old";

-- EntityType
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
CREATE TYPE "EntityType" AS ENUM ('INSTITUTION', 'RESIDENCE', 'COACHING', 'ABROAD', 'PERSONAL_PHASE');
ALTER TABLE "Entity" ALTER COLUMN type TYPE "EntityType" USING type::text::"EntityType";
DROP TYPE "EntityType_old";

-- Step 4: Apply other schema changes (entity fields, waiver, etc.)
-- Add missing Entity columns
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "subType" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "eduLevel" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- Rename Entity columns if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Entity' AND column_name = 'meta') THEN
    ALTER TABLE "Entity" RENAME COLUMN "meta" TO "metadata";
  END IF;
END $$;
ALTER TABLE "Entity" DROP COLUMN IF EXISTS "shortName";
ALTER TABLE "Entity" DROP COLUMN IF EXISTS "archivedAt";

-- Make Tracker.entityId nullable
ALTER TABLE "Tracker" ALTER COLUMN "entityId" DROP NOT NULL;

-- Fix Obligation: replace waiverPct with waiverAmountMinor
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "waiverAmountMinor" INTEGER DEFAULT 0;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "waiverReason" TEXT;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "period" TEXT;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "installmentSeq" INTEGER;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "installmentOf" INTEGER;
-- Migrate existing waiverPct data before dropping
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Obligation' AND column_name = 'waiverPct') THEN
    UPDATE "Obligation" SET "waiverAmountMinor" = ("amountMinor" * "waiverPct" / 100) WHERE "waiverPct" > 0;
    ALTER TABLE "Obligation" DROP COLUMN "waiverPct";
  END IF;
END $$;

-- Remove paidMinor (derived, not stored)
ALTER TABLE "Obligation" DROP COLUMN IF EXISTS "paidMinor";

-- Add Tracker.category and cadence if missing
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'other';
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "cadence" TEXT;

-- Add Entity relation to LedgerEntry if missing
ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS "Entity_userId_isActive_idx" ON "Entity"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "Obligation_userId_period_idx" ON "Obligation"("userId", "period");
CREATE INDEX IF NOT EXISTS "LedgerEntry_userId_entityId_date_idx" ON "LedgerEntry"("userId", "entityId", "date");
