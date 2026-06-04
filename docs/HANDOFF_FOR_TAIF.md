# Deploy handoff — branch `feat/institution-data-center`

Hi Taif — this branch adds 6 feature phases + a user-auth fix. Everything is
**additive-only** (every migration is `CREATE TABLE` / `ADD COLUMN IF NOT EXISTS`
— no drops, no destructive changes), **113 tests pass**, the frontend builds, and
all new UIs are **behind default-off flags**. `main` is untouched.

## ⚠️ One thing matters: migrate the DB BEFORE the code reaches `main`

`main` auto-deploys, and the new code (esp. the Phase-2 semester-engine changes)
reads new columns. So the prod DB must be migrated **first**, then merge.

### Steps (on the server / with prod `DATABASE_URL`)

```bash
# 1. Back up prod
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%F-%H%M).dump"

# 2. Get the branch and apply the 5 additive migrations
git fetch origin
git checkout feat/institution-data-center
npx prisma migrate deploy
npx prisma migrate status        # → "Database schema is up to date"

# 3. Seed the institution catalog from existing live data (idempotent; --dry to preview)
node server/scripts/seed-institutions-from-live.cjs

# 4. NOW merge → main (this is what triggers the live deploy of the matching code)
git checkout main
git merge --no-ff feat/institution-data-center
git push
```

After step 4, the app is live with the new code + matching DB. The new features
stay invisible until their flags are turned on.

## Turning things on (whenever you're ready — all optional)

- **New UIs** (default off): client flags in `src/lib/featureFlags.js` or localStorage
  `classcost_feature_flags` — `ENABLE_REPORTS_V2`, `ENABLE_PROFILE_V2`,
  `ENABLE_RECURRING_UI`, `ENABLE_CLOSURE_UI`.
- **User auth** (default off): this branch fixes the "any userId in the URL" hole
  for student routes (admin already had JWT). To enforce: set a strong
  `USER_JWT_SECRET` and `REQUIRE_AUTH=true` in the prod env, restart. Existing
  sessions re-login once. Until then it's a no-op.

## Optional: make migrations automatic going forward

If your deploy runs `npm run build` on the server (with prod `DATABASE_URL` in env),
add `npx prisma migrate deploy` to the build/release step so future migrations
apply themselves on deploy. Safe because all migrations are additive + idempotent.

## Reference

- 5 migrations: `prisma/migrations/20260604100000…20260604130000`
- Full runbook: `docs/GO_LIVE_RUNBOOK.md`
- Rollback for any phase = leave its flag off (additive changes need no down-migration)
