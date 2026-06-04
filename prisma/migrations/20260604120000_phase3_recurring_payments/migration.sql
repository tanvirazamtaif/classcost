-- Additive-only migration: Phase 3 (recurring payments engine)
-- New tables only; coexists with the legacy lazy obligation generator.
-- No changes to any existing table's columns.

CREATE TABLE IF NOT EXISTS "RecurringSchedule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trackerId" TEXT,
  "entityId" TEXT,
  "category" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "cadence" TEXT NOT NULL DEFAULT 'MONTHLY',
  "dueDay" INTEGER NOT NULL DEFAULT 1,
  "amountMinor" INTEGER NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "autoCreate" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScheduleVersion" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentSlot" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "expectedMinor" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "origin" TEXT NOT NULL DEFAULT 'AUTO',
  "obligationId" TEXT,
  "paidDate" TIMESTAMP(3),
  "advanceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdvancePayment" (
  "id" TEXT NOT NULL,
  "scheduleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "monthsCovered" INTEGER NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "perPeriodMinor" INTEGER NOT NULL,
  "startPeriod" TEXT NOT NULL,
  "endPeriod" TEXT NOT NULL,
  "paidOn" TIMESTAMP(3) NOT NULL,
  "paidBy" TEXT NOT NULL DEFAULT 'SELF',
  "ledgerEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvancePayment_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (guarded; cascade chain: user → schedule → versions/slots/advances)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringSchedule_userId_fkey') THEN
    ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleVersion_scheduleId_fkey') THEN
    ALTER TABLE "ScheduleVersion" ADD CONSTRAINT "ScheduleVersion_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PaymentSlot_scheduleId_fkey') THEN
    ALTER TABLE "PaymentSlot" ADD CONSTRAINT "PaymentSlot_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdvancePayment_scheduleId_fkey') THEN
    ALTER TABLE "AdvancePayment" ADD CONSTRAINT "AdvancePayment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Hard idempotency for slot materialization + lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSlot_scheduleId_period_key" ON "PaymentSlot"("scheduleId", "period");
CREATE INDEX IF NOT EXISTS "RecurringSchedule_userId_isActive_idx" ON "RecurringSchedule"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "RecurringSchedule_entityId_idx" ON "RecurringSchedule"("entityId");
CREATE INDEX IF NOT EXISTS "RecurringSchedule_trackerId_idx" ON "RecurringSchedule"("trackerId");
CREATE INDEX IF NOT EXISTS "ScheduleVersion_scheduleId_idx" ON "ScheduleVersion"("scheduleId");
CREATE INDEX IF NOT EXISTS "PaymentSlot_userId_status_idx" ON "PaymentSlot"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentSlot_scheduleId_status_idx" ON "PaymentSlot"("scheduleId", "status");
CREATE INDEX IF NOT EXISTS "AdvancePayment_scheduleId_idx" ON "AdvancePayment"("scheduleId");
