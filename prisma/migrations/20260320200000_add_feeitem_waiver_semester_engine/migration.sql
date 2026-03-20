-- Additive-only migration: semester engine (FeeItem, Waiver, Tracker fields)

-- Add SCHOLARSHIP_CASH to LedgerType enum
ALTER TYPE "LedgerType" ADD VALUE IF NOT EXISTS 'SCHOLARSHIP_CASH';

-- Add columns to Tracker
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "academicPeriodType" TEXT;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "obligationMode" TEXT DEFAULT 'pooled';
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "installmentCount" INTEGER;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "grossMinor" INTEGER;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "netMinor" INTEGER;

-- Add parentEntityId to Entity
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "parentEntityId" TEXT;

-- Create FeeItem table
CREATE TABLE IF NOT EXISTS "FeeItem" (
  "id" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "feeCategory" TEXT NOT NULL,
  "billingBasis" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "creditCount" INTEGER,
  "ratePerCredit" INTEGER,
  "creditType" TEXT,
  "coveragePeriod" TEXT,
  "chargedInPeriod" TEXT,
  "reportingTreatment" TEXT NOT NULL DEFAULT 'cost',
  "isWaiverEligible" BOOLEAN NOT NULL DEFAULT true,
  "adjustmentOf" TEXT,
  "adjustmentType" TEXT,
  "subjectCode" TEXT,
  "subjectName" TEXT,
  "examBoard" TEXT,
  "examSession" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeeItem_pkey" PRIMARY KEY ("id")
);

-- Create Waiver table
CREATE TABLE IF NOT EXISTS "Waiver" (
  "id" TEXT NOT NULL,
  "trackerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "waiverType" TEXT NOT NULL,
  "amountMinor" INTEGER,
  "percentage" INTEGER,
  "appliesTo" TEXT NOT NULL,
  "feeCategory" TEXT,
  "feeItemId" TEXT,
  "resolvedMinor" INTEGER NOT NULL DEFAULT 0,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "condition" TEXT,
  "conditionMet" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT,
  "effectiveDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Waiver_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeeItem_trackerId_fkey') THEN
    ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeeItem_userId_fkey') THEN
    ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Waiver_trackerId_fkey') THEN
    ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES "Tracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Waiver_userId_fkey') THEN
    ALTER TABLE "Waiver" ADD CONSTRAINT "Waiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "FeeItem_trackerId_idx" ON "FeeItem"("trackerId");
CREATE INDEX IF NOT EXISTS "FeeItem_userId_feeCategory_idx" ON "FeeItem"("userId", "feeCategory");
CREATE INDEX IF NOT EXISTS "FeeItem_trackerId_feeCategory_coveragePeriod_idx" ON "FeeItem"("trackerId", "feeCategory", "coveragePeriod");
CREATE INDEX IF NOT EXISTS "Waiver_trackerId_idx" ON "Waiver"("trackerId");
