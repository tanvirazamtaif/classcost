# Phase 0 — Safety Net & Migration Discipline

This work (institution data center + the 5 systems that follow) touches a **live,
auto-deploying** production app. The VPS systemd timer polls `origin/main` every
~60 seconds and deploys with **no CI gate**. That means:

> **A schema migration MUST be applied to the production database BEFORE the code
> that reads the new columns reaches `main`.** Otherwise the auto-deploy ships code
> expecting columns that don't exist, and the app breaks for every live student
> within a minute.

## The deploy gate we agreed on: "Manual prod migration, then merge"

For every phase that includes a migration:

1. Work + migration land on a **feature branch** (never `main`).
2. **Back up production** (below).
3. Apply the migration to production manually: `npx prisma migrate deploy`.
4. Confirm it applied: `npx prisma migrate status` → "Database schema is up to date".
5. **Only then** merge the feature branch to `main` (the 60s timer deploys the code,
   which now finds the columns it expects).

All migrations in this project are **additive-only** (the existing two migrations are
the gold standard): `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`ADD VALUE IF NOT EXISTS` for enums, FKs guarded by `pg_constraint` checks,
`CREATE INDEX IF NOT EXISTS`. **No `DROP`, no `NOT NULL` on existing columns without a
default + backfill, no enum renames.** Rollback for additive changes = disable the
feature flag (no down-migration needed).

## Step zero — back up production (run BEFORE any migration)

```bash
# On the VPS (or anywhere with DATABASE_URL for prod), timestamped dump:
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="classcost-backup-$(date +%Y%m%d-%H%M%S).dump"

# Verify the dump is non-empty and restorable into a scratch DB:
createdb classcost_restore_test
pg_restore --dbname=classcost_restore_test --no-owner \
  "classcost-backup-XXXXXXXX-XXXXXX.dump"
# Spot-check row counts match prod, then drop the scratch DB:
psql classcost_restore_test -c "SELECT count(*) FROM \"User\";"
dropdb classcost_restore_test
```

Keep the `.dump` off the VPS (download it) so a disk failure during migration is survivable.

## Verify current migration integrity (before adding new migrations)

```bash
# Confirms prod was deployed via `migrate deploy` (history intact, no drift):
npx prisma migrate status

# Re-run the existing V1→V3 backfill verifier — must PASS before we build on it:
node server/scripts/verify-migration.cjs
```

If `migrate status` reports drift or an un-applied migration, STOP and reconcile with
`npx prisma migrate resolve` before adding anything new.

## Per-phase checklist (use for Phase 1 onward)

- [ ] Production backed up (dump downloaded off the VPS)
- [ ] `npx prisma migrate status` clean on prod
- [ ] New migration is additive-only (no DROP / destructive NOT NULL)
- [ ] New UI/behavior is behind a feature flag (default off)
- [ ] Applied migration to prod manually; `migrate status` up to date
- [ ] Smoke-tested a known user's dashboard totals (unchanged)
- [ ] **Then** merge branch → main (auto-deploy picks it up)
