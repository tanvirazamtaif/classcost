-- Additive-only migration: Phase 2 (money-correctness foundations)
-- Frozen post-waiver profile snapshot on Tracker + custom-installment flag on
-- Obligation so redistribute() never overwrites hand-edited amounts.
-- No behavior change for existing rows: customAmount defaults to false
-- (every existing installment stays auto-distributed exactly as before).

ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "profileSnapshot" JSONB;
ALTER TABLE "Tracker" ADD COLUMN IF NOT EXISTS "profileFrozenAt" TIMESTAMP(3);

ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "customAmount" BOOLEAN NOT NULL DEFAULT false;
