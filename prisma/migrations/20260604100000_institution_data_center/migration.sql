-- Additive-only migration: Institution Data Center (Phase 1)
-- Curated global reference templates (Institution × Branch × Section) +
-- nullable soft-link columns on Entity. No destructive changes; existing
-- string-named entities keep working untouched.

-- Soft-link columns on Entity (nullable, no FK — match parentEntityId pattern)
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Entity" ADD COLUMN IF NOT EXISTS "sectionId" TEXT;

-- Institution (curated canonical identity)
CREATE TABLE IF NOT EXISTS "Institution" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameBn" TEXT,
  "aliases" TEXT[] NOT NULL DEFAULT '{}',
  "type" TEXT NOT NULL,
  "eduLevel" TEXT,
  "division" TEXT,
  "district" TEXT,
  "area" TEXT,
  "trustLevel" TEXT NOT NULL DEFAULT 'approximate',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- Branch (physical campus of an Institution)
CREATE TABLE IF NOT EXISTS "Branch" (
  "id" TEXT NOT NULL,
  "institutionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameBn" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "division" TEXT,
  "district" TEXT,
  "area" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- Section (academic program type offered at a branch)
CREATE TABLE IF NOT EXISTS "Section" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameBn" TEXT,
  "sectionType" TEXT,
  "eduLevel" TEXT,
  "classRangeFrom" TEXT,
  "classRangeTo" TEXT,
  "residencePolicy" TEXT NOT NULL DEFAULT 'none',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- Foreign keys among the curated templates only (never touches user data)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Branch_institutionId_fkey') THEN
    ALTER TABLE "Branch" ADD CONSTRAINT "Branch_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Section_branchId_fkey') THEN
    ALTER TABLE "Section" ADD CONSTRAINT "Section_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Institution_type_idx" ON "Institution"("type");
CREATE INDEX IF NOT EXISTS "Institution_district_idx" ON "Institution"("district");
CREATE INDEX IF NOT EXISTS "Branch_institutionId_idx" ON "Branch"("institutionId");
CREATE INDEX IF NOT EXISTS "Section_branchId_idx" ON "Section"("branchId");
CREATE INDEX IF NOT EXISTS "Entity_institutionId_idx" ON "Entity"("institutionId");
