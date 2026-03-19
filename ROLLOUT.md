# ClassCost V3 Architecture Rollout

## Pre-Rollout Checklist
- [ ] All v3 API endpoints deployed and tested
- [ ] Migration scripts run on staging database
- [ ] Verification script passes all checks
- [ ] DashboardV3 renders correctly with migrated data
- [ ] AddPaymentV3 creates valid LedgerEntries
- [ ] EntityDetailV3 shows correct tracker/obligation data
- [ ] Obligation auto-generation works for recurring trackers
- [ ] Summary endpoint returns correct totals
- [ ] Old dashboard still works with flag OFF

## Rollout Steps
1. Deploy code with all v3 components (flag OFF)
2. Run migration scripts on production database
3. Run verification script — must show ALL PASS
4. Enable flag for developer accounts only (add to localStorage)
5. Test all flows on production with real data
6. Enable flag for 10% of users (server-side)
7. Monitor error rates and sum accuracy for 48 hours
8. If clean: enable for 100% of users
9. Mark old tables as deprecated in schema comments
10. After 30 days: remove old components and AppContext references

## Rollback Plan
1. Disable feature flag (immediate, no deploy needed)
2. All users fall back to old dashboard reading old tables
3. New LedgerEntries created during v3 period are preserved
4. Investigate and fix the issue
5. Re-enable when fixed
