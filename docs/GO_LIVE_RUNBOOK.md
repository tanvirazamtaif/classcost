# Go-Live Runbook — branch `feat/institution-data-center`

Six phases of additive, tested work. Every migration is additive-only (no DROP,
no destructive NOT NULL); rollback for any phase = leave the feature flag off.
**107 tests pass; the frontend builds clean.** Nothing here changes existing
user-facing behavior until a flag is turned on.

## Migrations to apply (in this order — `prisma migrate deploy` does it automatically)

1. `20260604100000_institution_data_center`        — Institution/Branch/Section + Entity soft links
2. `20260604110000_phase2_profile_snapshot_custom_amount` — Tracker.profileSnapshot, Obligation.customAmount
3. `20260604120000_phase3_recurring_payments`      — RecurringSchedule/ScheduleVersion/PaymentSlot/AdvancePayment
4. `20260604130000_phase5_6_closure_profile`       — AcademicTerm/ClosureRecord/TrustedCircle/SharePermission/IdentityLayer + Entity.coupledTermId

(Phase 4 reports is read-only — no migration.)

## The sequence (your manual gate: migrate prod, THEN merge)

```bash
# 0. Branch up to date, tests green
git checkout feat/institution-data-center
npx vitest run            # → 107 passed
npx vite build            # → built

# 1. BACK UP PRODUCTION (off the VPS — see PHASE0_RUNBOOK.md)
pg_dump "$DATABASE_URL" --format=custom --file="classcost-backup-$(date +%Y%m%d-%H%M%S).dump"

# 2. Apply all 4 migrations to prod
npx prisma migrate deploy
npx prisma migrate status            # → "Database schema is up to date"

# 3. Seed the institution catalog from live data (Phase 1)
node server/scripts/seed-institutions-from-live.cjs --dry   # review
node server/scripts/seed-institutions-from-live.cjs         # commit

# 4. ONLY NOW merge → main (the 60s systemd timer deploys the code,
#    which now finds the columns/tables it expects)
git checkout main && git merge --no-ff feat/institution-data-center
git push    # ← only when you say so; this triggers the live deploy
```

## What's live immediately after merge (no flags needed)

- **Phase 2 money-correctness** — `redistribute()` no longer wipes hand-edited
  installments; `effectiveDue` consolidated; double-subtraction locked out by tests.
- New **read-only APIs** sit unused until their UIs ship:
  `/api/institutions`, `/api/recurring`, `/api/reports`, `/api/closure`, `/api/circles`.

## Flags (default OFF — flip when you want the UI live)

- `ENABLE_REPORTS_V2` → shows the server-side **forecast card** in Reports.
  Set in browser localStorage `classcost_feature_flags` = `{"ENABLE_REPORTS_V2":true}`,
  or change the default in `src/lib/featureFlags.js`.

## Still to build (presentation layer on top of working, tested backends)

- Phase 3 — recurring schedule management UI (create/list/pay/advance screens)
- Phase 4 — full 4-tab Reports surface (only the forecast card is wired so far)
- Phase 5 — closure wizard screens + Story Card share UI (the data/engine is done)
- Phase 6 — full profile redesign (Trusted Circles UI, Wholeness ring; the data/engine is done)

## Open decision

- **App-wide auth**: `req.params.userId` is not validated against a session on ANY
  route (pre-existing across the whole app — the new routes match the existing
  pattern). Fixing it is an app-wide middleware change, not a per-phase task.
