-- Additive-only migration: Phase 5 (closure & promotion) + Phase 6 (profile)
-- New tables + one nullable column on Entity. No existing columns changed.

-- Phase 6: residence-coupling soft link on Entity (nullable, no FK)
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "coupledTermId" TEXT;

-- Phase 5: AcademicTerm
CREATE TABLE IF NOT EXISTS "AcademicTerm" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "institutionId" TEXT,
  "label" TEXT NOT NULL,
  "termType" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "predecessorTermId" TEXT,
  "successorTermId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- Phase 5: ClosureRecord
CREATE TABLE IF NOT EXISTS "ClosureRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trackerId" TEXT,
  "termId" TEXT,
  "closureReason" TEXT NOT NULL,
  "effectiveEndDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'confirmed',
  "grossMinor" INTEGER NOT NULL DEFAULT 0,
  "netMinor" INTEGER NOT NULL DEFAULT 0,
  "waiverMinor" INTEGER NOT NULL DEFAULT 0,
  "paidMinor" INTEGER NOT NULL DEFAULT 0,
  "outstandingMinor" INTEGER NOT NULL DEFAULT 0,
  "refundableMinor" INTEGER NOT NULL DEFAULT 0,
  "storyCard" JSONB,
  "coupledClosureId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClosureRecord_pkey" PRIMARY KEY ("id")
);

-- Phase 6: TrustedCircle
CREATE TABLE IF NOT EXISTS "TrustedCircle" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "relation" TEXT,
  "phoneE164" TEXT,
  "preset" TEXT NOT NULL DEFAULT 'fee_buddy',
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrustedCircle_pkey" PRIMARY KEY ("id")
);

-- Phase 6: SharePermission
CREATE TABLE IF NOT EXISTS "SharePermission" (
  "id" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'hidden',
  "notify" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "SharePermission_pkey" PRIMARY KEY ("id")
);

-- Phase 6: IdentityLayer
CREATE TABLE IF NOT EXISTS "IdentityLayer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "layerType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdentityLayer_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AcademicTerm_userId_fkey') THEN
    ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClosureRecord_userId_fkey') THEN
    ALTER TABLE "ClosureRecord" ADD CONSTRAINT "ClosureRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrustedCircle_ownerUserId_fkey') THEN
    ALTER TABLE "TrustedCircle" ADD CONSTRAINT "TrustedCircle_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SharePermission_circleId_fkey') THEN
    ALTER TABLE "SharePermission" ADD CONSTRAINT "SharePermission_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "TrustedCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IdentityLayer_userId_fkey') THEN
    ALTER TABLE "IdentityLayer" ADD CONSTRAINT "IdentityLayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes + unique constraints
CREATE INDEX IF NOT EXISTS "AcademicTerm_userId_status_idx" ON "AcademicTerm"("userId", "status");
CREATE INDEX IF NOT EXISTS "AcademicTerm_institutionId_idx" ON "AcademicTerm"("institutionId");
CREATE INDEX IF NOT EXISTS "ClosureRecord_userId_idx" ON "ClosureRecord"("userId");
CREATE INDEX IF NOT EXISTS "ClosureRecord_trackerId_idx" ON "ClosureRecord"("trackerId");
CREATE INDEX IF NOT EXISTS "TrustedCircle_ownerUserId_status_idx" ON "TrustedCircle"("ownerUserId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "SharePermission_circleId_section_key" ON "SharePermission"("circleId", "section");
CREATE INDEX IF NOT EXISTS "SharePermission_circleId_idx" ON "SharePermission"("circleId");
CREATE UNIQUE INDEX IF NOT EXISTS "IdentityLayer_userId_layerType_key" ON "IdentityLayer"("userId", "layerType");
