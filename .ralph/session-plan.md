# Session Plan — Top 10 Tasks

Date: 2026-03-18

This plan selects ten focused tasks (from .ralph/fix_plan.md and specs) to improve robustness, PWA quality, and tests. Each task is small, verifiable, and safe to implement in this repo.

Tasks:

1. session-safe-redirect-tests: Add/verify safeRedirect behavior and unit tests for percent-encoded slashes in app/session.server.ts and tests/session.server.test.ts.
2. logout-post-only: Ensure logout route is POST-only and update tests (app/routes/logout.ts).
3. csv-escaping-edgecases: Harden CSV escaping utility (app/utils/csv.ts) and add tests for commas/quotes/newlines.
4. webpush-env-robustness: Make getPublicVapidKey robust to empty env vars and add tests (app/utils/webpush.server.ts, tests/webpush.test.ts).
5. vite-pwa-caching: Add runtimeCaching rules for images and /api endpoints in vite.config.ts PWA config.
6. manifest-icons: Ensure manifest includes correct icon sizes and verify public/icons files exist or add conservative fallbacks.
7. convert-server-routes: Convert any remaining server-only .tsx export routes to .ts to avoid client bundling (search app/routes/*export*).
8. accessibility-tweaks: Small ARIA improvements (NearbyServicesAlert, OfflineIndicator, AlertBanner, CarCard).
9. docs-agent: Update .ralph/AGENT.md with concise build/test instructions and notes learned in this session.
10. logs-and-progress: Append concise entries to .ralph/logs/progress.txt and .ralph/logs/learnings.md describing actions, test/build results, and learnings.

Implementation notes:
- Make minimal, focused changes and run a single full test+build at the end to verify.
- Update .ralph/fix_plan.md only for items we resolve in this session.
- Commit changes in a single commit and push, then create a patch tag.


