# Fix Plan / TODO List

## ✅ Completed - Phase 1: Project Setup
- [x] Remix 2.x + Vite + TypeScript project structure created
- [x] `vite-plugin-pwa` configured in `vite.config.ts` with manifest + workbox
- [x] Prisma schema with User, Car, CarMember, MaintenanceRecord, MaintenanceType
- [x] `remix-auth`, `bcryptjs` installed and wired up

## ✅ Completed - Phase 2: Authentication
- [x] Cookie session storage (`createCookieSessionStorage`) in `session.server.ts`
- [x] `remix-auth` with `FormStrategy` in `auth.server.ts`
- [x] Auth routes: `/login`, `/logout`, `/signup` all implemented
- [x] `requireUserId` guard used in all protected routes
- [x] Seed maintenance types in `prisma/seed.ts`

## ✅ Completed - Phase 3: Cars & Owners/Drivers
- [x] Car CRUD routes: `cars._index.tsx`, `cars.new.tsx`, `cars.$carId.tsx`, `cars.$carId.edit.tsx`, `cars.$carId.delete.tsx`
- [x] CarMember management: `cars.$carId.members.tsx` (add/remove)
- [x] Car form: make, model, year, mileage, cost, vendor, description
- [x] Car list and detail views with auth checks

## ✅ Completed - Phase 4: Maintenance History
- [x] MaintenanceRecord CRUD routes implemented
- [x] Maintenance types seeded (oil_change, tire_rotation, brake_service, etc.)
- [x] `MaintenanceList` component with timeline view
- [x] Display: date, mileage, cost, vendor, description

## ✅ Completed - Phase 5: Location-Aware Alerts
- [x] `/api/nearby-services` Overpass API proxy implemented
- [x] `getMaintenanceDue` function in `maintenance.server.ts`
- [x] `NearbyServicesAlert` component uses geolocation API
- [x] `AlertBanner` component shows combined due+nearby alert

## ✅ Completed - Phase 6: PWA Polish
- [x] Web app manifest configured in `vite.config.ts`
- [x] Workbox `generateSW` with runtime caching
- [x] `InstallPrompt` component for "Add to Home Screen"
- [x] Service worker registration: `registerSW.js` loaded in `root.tsx`

## ✅ Completed - Phase 7: Loop 2 Improvements
- [x] Fix Route ID Collision: deleted all duplicate `.js` files from app/ source dirs (caused by tsc emitting without noEmit)
- [x] Add `noEmit: true` to `tsconfig.json` to prevent future JS emission
- [x] Add `.gitignore` (node_modules, build/, .env, prisma dev.db)
- [x] User Profile page (`/profile`): update name/email and change password
- [x] Auto-update car mileage when maintenance record mileage exceeds current car mileage (Prisma transaction)
- [x] Fix maintenance due logic: skip "no record found" for cars with zero history
- [x] Add maintenance stats (record count + total cost) to car detail page
- [x] Fix date timezone bug: parse HTML date inputs as noon local time (not UTC midnight)
- [x] Loading state in `NearbyServicesAlert` while geolocation/Overpass check runs
- [x] Add `v3_lazyRouteDiscovery` future flag to reduce Remix warnings

## ✅ Completed - Phase 8: Loop 3 Bug Fixes & Improvements
- [x] Fix delete car error display: `cars.$carId.delete.tsx` now calls `useActionData()` and renders error alert on failure
- [x] Fix NearbyServicesAlert error display: shows info alert when nearby services fetch fails; removed duplicate named export
- [x] Simplify AlertBanner dismiss button: merged duplicate if/else dismiss branches into single handler using `onDismiss?.()`
- [x] Fix addCarMember duplicate membership: check for existing membership before create, throw friendly error "already a member"
- [x] Remove unused auth.server.ts: dead code removed (routes use verifyLogin() directly)
- [x] Add redirectTo support to login flow: requireUserId now preserves original URL; login loader/form passes redirectTo through
- [x] Fix profile form re-render after update: added `key` prop to Profile Form so it remounts with fresh defaultValues after action
- [x] Add entry.server.tsx: proper SSR entry point with streaming support and 5s abort timeout
- [x] Add favicon.svg: SVG favicon created in public/ and linked in root.tsx links function

## ✅ Completed - Phase 9: Loop 4 Security, Validation & UX Improvements
- [x] Fix authorization on cars.$carId.edit.tsx loader — drivers now get 403 Forbidden instead of seeing the edit form
- [x] Add SESSION_SECRET production guard — throws error in production if env var missing, warns in dev
- [x] Improve server-side input validation — year range (1886–currentYear+2), mileage ≥0, cost ≥0 in all 4 form routes
- [x] Fix NearbyServicesAlert geolocation error handling — shows permission denied / unavailable / generic messages instead of silent null
- [x] URL-persisted maintenance type filter on car detail — uses useSearchParams so filter state survives refresh
- [x] Add fleet stats card to dashboard — shows total cars, records, total spend, cars needing service
- [x] Create app/utils/format.ts utility — formatMaintenanceType, formatDate, formatCurrency, formatMileage shared helpers
- [x] Fix maintenance type name inconsistency — AlertBanner in car detail was showing lowercase types, now uses formatMaintenanceType
- [x] Enhanced CarCard — shows last service date and record count below mileage
- [x] Update cars._index.tsx — passes lastServiceDate and totalRecords to CarCard

## ✅ Completed - Phase 10: Loop 5 Features & Bug Fixes
- [x] Fix NearbyServicesAlert dueTypes: now uses formatMaintenanceType for proper capitalization
- [x] Fix delete maintenance route: uses formatMaintenanceType from ~/utils/format instead of inline replace
- [x] Add getServiceIntervalStatus to maintenance.server.ts — per-type mileage/time progress calculation
- [x] Add updateCarMileage to car.server.ts — authorized mileage update
- [x] Enhanced car detail page (cars.$carId.tsx): service schedule progress bars, quick mileage update form, spending by type breakdown, sort controls for maintenance history (URL-persisted)
- [x] Add CSV export route: /cars/:carId/maintenance/export downloads maintenance history as CSV
- [x] Improve seed.ts: 11 realistic maintenance types with proper mile/month intervals
- [x] Add Settings page (/settings): displays all maintenance types and their service intervals
- [x] Add Settings link to navbar in root.tsx

## ✅ Completed - Phase 11: Loop 6 Improvements
- [x] Fix due logic: remove "no record found" — only flag when interval genuinely exceeded (spec-compliant)
- [x] Add getMaintenanceApproaching() — returns types at 60–99% of service interval for proactive alerts
- [x] Settings page: full CRUD for maintenance types (create, inline edit, delete with confirm guard)
- [x] Quick "Log Service" buttons on all due maintenance items in dashboard and car detail
- [x] Dashboard: Upcoming Maintenance section with progress bars for approaching items
- [x] Car detail: client-side pagination (10/page) for maintenance history
- [x] Car detail: Monthly Spending last-12-months inline bar chart
- [x] Car detail: Due maintenance replaced with actionable card (per-item Log Service links)
- [x] NearbyServicesAlert: expandable list of up to 5 nearby shops with distance toggle
- [x] Add /offline route — PWA offline page with Try Again button
- [x] vite.config.ts: navigateFallback=/offline for service worker offline routing
- [x] CSV export: ISO date format (YYYY-MM-DD)
- [x] Maintenance new form: pre-selects type from ?type= URL query param

## ✅ Completed - Phase 12: Loop 7 Quality & UX Improvements
- [x] Fix dashboard CarCards: now shows lastServiceDate and totalRecords (was inconsistent with /cars page)
- [x] Optimize N+1 queries: batch queries replace per-car individual DB calls in dashboard and cars list loaders
- [x] Settings: catch Prisma P2002 for duplicate type names — friendly "already exists" error
- [x] Settings: Add "Restore Defaults" button — upserts 11 default maintenance types with confirmation
- [x] Profile: Add "Danger Zone" account deletion — password-confirmed, deletes solo-owned cars
- [x] Car detail: Add "× Clear" filter button + filtered record count display
- [x] Cars list: Add fleet stats bar (cars count, service records, total spent) above search
- [x] Maintenance forms: Client-side mileage warning when entered mileage < car current mileage - 1000

## ✅ Completed - Phase 13: Loop 8 Performance, Features & UX

- [x] Batch getMaintenanceDue: Added getBatchMaintenanceDue + getBatchMaintenanceApproaching (2 queries vs 2N per page load)
- [x] Update dashboard loader to use batch versions (getBatchMaintenanceDue + getBatchMaintenanceApproaching in one Promise.all)
- [x] Update cars list loader to use getBatchMaintenanceDue
- [x] Global /maintenance history route: search/filter by car+type, sort all fields, summary stats, CSV-ready table
- [x] Fleet-wide CSV export at /cars/export: all cars' records in one download with Car column
- [x] Export All button on /cars page (conditional on having cars)
- [x] Google Maps navigation links on NearbyServicesAlert: nearest shop linked in alert text + 📍 Map buttons in expandable list
- [x] Dashboard and History links added to navbar
- [x] + Log buttons on every service schedule card (car detail page)
- [x] Owner/Driver role badge shown next to car title on car detail page
- [x] dueTypes list shown on CarCard (⚠️ Due: Oil Change, Tire Rotation...)
- [x] InstallPrompt dismissal persisted in localStorage (no re-appear on refresh)
- [x] Confirm dialog before removing a car member
- [x] Auto-sanitize maintenance type names to snake_case in settings create/update

## ✅ Completed - Phase 14: Loop 9 Features
- [x] Add Car imageUrl + notes fields to Prisma schema, forms, CarCard, and car detail
- [x] Add MaintenanceRecord receiptUrl field to Prisma schema, forms, and display
- [x] Create /reports route with year-over-year cost comparison and HTML bar chart
- [x] Add date range filter (from/to) on /maintenance history page
- [x] Add server-side pagination to /maintenance history (replace client-side)
- [x] Add navbar notification badge showing count of due maintenance items
- [x] Add Reports link to authenticated navbar
- [x] Add printable maintenance history report per car (print button + CSS)
- [x] Add global search route /search (across cars and records)

## ✅ Completed - Phase 15: Loop 10 Bug Fixes & Enhancements

- [x] Fix date range off-by-one in maintenance._index.tsx (use lt + next day instead of lte + 23:59:59)
- [x] Fix type filter partial match in maintenance._index.tsx (use exact equals, not contains)
- [x] Improve maintenance history UX: aria-sort, clear filtered vs total labels
- [x] Fix search.tsx: trim whitespace before length check, show total count with truncation notice
- [x] Optimize root.tsx loader: skip due count for unauthenticated users
- [x] Add OfflineIndicator to root.tsx navbar
- [x] Fix NearbyServicesAlert: move setLoading(false) to finally block, catch .json() parse errors
- [x] Enhance reports: add YoY % change labels, fix division by zero on cost/mile
- [x] Fix maintenance.server.ts month math: use accurate getFullYear/getMonth diff instead of 30-day ms approximation
- [x] Add getMaintenanceForecast() to maintenance.server.ts
- [x] Add maintenance forecasting to cars.$carId.tsx service schedule cards
- [x] Fix car.server.ts: email format validation in addCarMember, negative mileage guard

## ✅ Completed - Phase 16: Loop 11 New Features & Improvements
- [x] Fix root.tsx monthsDiff bug — replaced 30-day approximation with accurate calendar monthsDiff helper (matches maintenance.server.ts)
- [x] Add dark mode CSS — CSS custom properties with prefers-color-scheme media query for full dark theme support
- [x] Add VIN and color fields to Car schema — vin String?, color String?, forms, CarCard, car detail display
- [x] Add car archive/decommission — isArchived Boolean @default(false), archiveCar/restoreCar server functions, archive button on car detail, archived section on cars list
- [x] Add OdometerLog model and /cars/:carId/odometer route — track mileage readings over time with trend chart
- [x] Improve CSV exports — add VIN, Color, Receipt URL columns to both fleet-wide and per-car CSV exports
- [x] Enhance reports page — service frequency table, 24-month trend, top 5 expensive services
- [x] Add receipt URL links to global maintenance history page (/maintenance)

## 📋 Future Improvements
- [x] Consider migrating from `vite-plugin-pwa` to `@vite-pwa/remix` for better Remix integration (considered; deferred - keeping vite-plugin-pwa + virtual:pwa-register for now)
- [x] Add push notification support for maintenance due reminders — subscription storage, server endpoints, client subscribe UI, and test send route implemented
- [x] Add per-car maintenance interval overrides (CarMaintenanceOverride model)

## Short-term tasks (next)

### Ralph session tasks (autogenerated) - top 10
- [x] Add PWA icons (public/icons/icon-192.svg, public/icons/icon-512.svg) and update manifest/vite config if needed (already present as PNGs; verified)
- [x] Add Dockerfile and docker-compose.yml for local dev (sqlite volume, node service)
- [x] Add npm scripts: "prisma:migrate" and "prisma:deploy" and document usage in .ralph/AGENT.md
- [x] Add a minimal E2E smoke script (scripts/e2e-smoke.cjs) and npm script "test:e2e" (lightweight HTTP check)
- [x] Add coverage threshold to vitest config and npm script "test:ci:coverage" to fail on regressions
- [x] Add scripts/generate-vapid.cjs to help generate VAPID keys and document env vars in .env.example
- [x] Add scripts/check-pwa-assets.cjs that verifies icon files referenced by manifest exist; call in CI
- [x] Update .ralph/AGENT.md with concise build/test/deploy instructions and tips for faster iterate cycles
- [x] Add a small sqlite backup or export helper (scripts/backup-sqlite.cjs) and add to docker-compose as a placeholder
- [x] Run npm run build && npm run test:ci locally, update .ralph/logs/progress.txt and .ralph/logs/learnings.md, then commit and push (completed: build ✅, tests ✅)



- [x] Add unit tests for utils/format.ts (formatMaintenanceType, formatDate, formatCurrency, formatMileage, getMaintenanceCategory) (2026-03-18)
- [x] Extract monthsDiff to app/utils/date.ts and add tests (2026-03-18)
- [x] Add unit tests for session.server.safeRedirect (2026-03-18)
- [x] Add unit tests for webpush.getPublicVapidKey (2026-03-18)
- [x] Increase Vitest coverage by adding more unit tests (baseline)
- [x] Update .ralph/AGENT.md with concise build/test instructions
- [x] Consider replacing registerSW.js with virtual:pwa-register approach for better integration
- [x] Improve PWA manifest icons sizes and verify assets
- [x] Add tests for session.requireUserId redirect flow (non-authenticated)
- [x] Add simple test for CSV export escaping function
- [x] Add unit tests for app/models/car.server.ts (2026-03-18)
- [x] Add unit tests for app/models/push.server.ts (2026-03-18)


## 🔧 Discovered issues (loop)
- [x] Missing PWA icon assets (apple-touch-icon / icons/icon-192.png) — app/root.tsx references /icons/icon-192.png but file is missing; temporarily point to /favicon.svg and add icons to public/icons; verify with npm run build. (Discovered: 2026-03-18T03:37:56Z UTC) (Resolved: updated app/root.tsx to reference /favicon.svg).
- [x] Fix CSV export escaping in maintenance.export.tsx (malformed CSV when fields contain commas/quotes)
- [x] Add safeRedirect to session.server.ts and sanitize redirectTo in login action (prevent open redirect)
- [x] Make logout POST-only (remove session destroy on GET)
- [x] Make getMaintenanceForecast respect per-car overrides (align with other functions)
- [x] Replace inline months calc with monthsDiff in getBatchMaintenanceHealthScores (consistency)
- [x] Fix manifest icons sizes in vite.config.ts
- [x] Add runtimeCaching rules for images and /api endpoints in vite.config.ts
- [x] Convert server-only export routes (.tsx -> .ts) to avoid client bundling of server-only loaders
- [x] Add accessibility improvements to NearbyServicesAlert, OfflineIndicator, AlertBanner, CarCard

- [x] Fix runtime Prisma import in app/routes/settings.tsx — file imports Prisma at runtime causing client bundling issues; changed to type-only import and replaced instanceof checks with shape-based checks. (Discovered: 2026-03-18T07:30:48Z UTC) (Resolved: 2026-03-18T07:31:30Z UTC)


## Discovered Issues - Loop 12

- [x] safeRedirect accepts strings starting with '/', but percent-encoded slashes (e.g., '/%2F%2Fevil.com') decode to '//evil.com' — open-redirect risk.
- [x] Add unit tests for encoded-slash payloads (e.g., '/%2F%2Fevil.com') and for decode-and-validate behavior.
- [x] Fix: either reject percent-encoded slashes or decode-then-validate that decoded value starts with a single '/' (not '//') and contains no scheme/host.
- [x] Add CI regression test and update docs.


- [x] Add test suite & Vitest configuration — vitest.config.ts and a tests/ scaffold exist; unit/integration tests added and Vitest run verified (1 passing test).
- [x] Remove committed Prisma dev DB (prisma/dev.db) — removed nested prisma/prisma/dev.db from repo and added .gitignore entry (prisma/**/dev.db); next: rotate any leaked data if necessary.
- [x] Add .env.example documenting DATABASE_URL & SESSION_SECRET — .env.example created; next: ensure CI provides SESSION_SECRET and DATABASE_URL.
- [x] Add .ralph/specs/app_spec.md placeholder — app_spec.md created; next: expand specs with detailed acceptance criteria.
- [x] Ensure SESSION_SECRET is set in production & document — session.server.ts now throws in production; .env.example documents SESSION_SECRET.
- [x] Discovered: PWA register script missing (/registerSW.js referenced in app/root.tsx but file absent). Action: added public/registerSW.js to resolve (2026-03-18).
- [x] Discovered: VAPID env var mismatch (.env.example uses VITE_PUBLIC_VAPID_*, server expects VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY). Action: updated .env.example to include VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (2026-03-18).
- [x] Resolved: PWA register script missing — added public/registerSW.js to satisfy root.tsx (2026-03-18)
- [x] Resolved: VAPID env var mismatch — updated .env.example to include VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (2026-03-18)
## Iteration 1 - 2026-03-18
- Verified test suite (23 tests) and production build passed.
- Selected top-10 tasks (session plan created). No changes required; tasks already implemented.
\n- [x] Consolidated CSV escaping across export routes and added tests (cars..maintenance.export.ts, cars..fuel.export.ts, maintenance.export.ts, cars.export.ts)
## Iteration 2 - 2026-03-18
- Ran 
pm run build and 
pm test to verify baseline; build and tests succeeded.
- Tasks Attempted: build & tests check
- Tasks Completed: build ✅, tests ✅ (28 tests)

## Iteration 3 - 2026-03-18
- Tasks Attempted: repository exploration, created session plan in Copilot session-state, ran production build + CI tests
- Tasks Completed: created session plan in session-state (not committed) ✅, npm run build ✅, npm run test:ci ✅ (28 tests)
- Notes: Most high-priority items from .ralph/fix_plan.md were already implemented; no code changes required this loop. Next loop will implement any remaining items or address regressions.


- [x] Removed public/registerSW.js; standardized on virtual:pwa-register client registration (entry.client.tsx import) (2026-03-18T04:37:14Z)

## Iteration 4 - 2026-03-18
- Tasks Attempted: implement format util normalization, improve CSV escaping/sanitizeFilename, fix safeRedirect double-encoding, normalize webpush env vars, add/extend unit tests for format/csv/date/session/webpush, run build & tests
- Tasks Completed: 
  - Updated app/utils/format.ts to normalize maintenance type formatting and guard invalid dates ✅
  - Improved app/utils/csv.ts to quote fields with leading/trailing whitespace and collapse filename separators ✅
  - Patched app/session.server.ts safeRedirect to reject double-encoded percent-encoded slashes/backslashes ✅
  - Normalized VAPID env handling in app/utils/webpush.server.ts and made getPublicVapidKey robust to empty strings ✅
  - Added/updated unit tests: tests/format.test.ts, tests/csv.test.ts, tests/session.server.test.ts, tests/webpush.test.ts, tests/date.test.ts ✅
  - npm run build ✅, npm test ✅ (all tests passed)
- Notes: All tests pass locally; updated fix_plan and logs. Temporary note: SESSION_SECRET warning shown in test environment — tests run with default insecure secret; ensure CI provides SESSION_SECRET.


Resolved: logout.tsx converted to logout.ts (2026-03-18)
## Iteration 2026-03-18 - Changes

- [x] Sanitized CSV filenames in export routes: cars.export.ts, cars.$carId.fuel.export.ts, cars.$carId.maintenance.export.ts (Completed: 2026-03-18T11:20:22Z)
- [x] Hardened login loader redirectTo (app/routes/login.tsx) — sanitize before returning to client (Completed: 2026-03-18T11:20:22Z)
- [x] Moved server db imports into loaders for key routes to avoid client bundling (cars._index.tsx, maintenance._index.tsx, _index.tsx) (Completed: 2026-03-18T11:20:22Z)


- [x] Converted server-only route logout.tsx -> logout.ts to avoid client bundling (resolved).
- [x] Added favicon.svg to PWA manifest icons in vite.config.ts.
- [x] Clarified VAPID env var documentation (.env.example) and added VITE_PUBLIC_VAPID_KEY guidance.
- [x] Added a small npm script and helper to detect committed prisma dev.db (scripts/check-no-dev-db.js) and package.json script check:no-dev-db.
- [x] Added GitHub Actions CI workflow (.github/workflows/ci.yml) to run build, tests and check:no-dev-db.


---
[2026-03-18] Iteration: Verified build & tests, selected top-10 tasks. Plan added to session-state/plan.md.

Tasks Attempted:
- Explore .ralph/specs/*, search codebase for TODOs/unimplemented code, run npm run build and npm test.

Tasks Completed:
- Verified npm run build ✅

## Iteration 2026-03-18 - Config Tweak

- Tasks Attempted: remove favicon.ico from includeAssets in vite.config.ts
- Tasks Completed: removed favicon.ico from includeAssets in vite.config.ts ✅; npm run build ✅; npm run test:ci ✅ (44 tests)

- Verified npm test ✅
- Created session plan (session-state/plan.md) ✅
- Updated .ralph/AGENT.md with concise build/test instructions ✅

---
[2026-03-18] Loop: Created session plan and baseline verification

Tasks Attempted:
- Create session plan file in Copilot session-state; run production build + CI-mode tests

Tasks Completed:
- Created plan.md in Copilot session-state ✅
- npm run build ✅
- npm run test:ci ✅ (28 tests)

Notes:
- No repository source changes required this iteration; repository is currently stable and tests pass. Next: implement prioritized items from session-state/plan.md in small commits.


## Iteration 2026-03-18T01:29:21Z - Verification
- Verified production build (
pm run build) succeeded.
- Verified CI tests (
pm run test:ci) passed.
- No incomplete tasks found in .ralph/fix_plan.md.
- Updated .ralph/logs/progress.txt and .ralph/logs/learnings.md; updated .ralph/AGENT.md with push-note.
## Iteration (automated) - 2026-03-18
- Verified build and tests (44 tests). No changes required; session plan created at session-state/plan.md.
## Iteration 2026-03-18 — Selected session tasks
- Created session-state/plan.md listing top-10 tasks to improve tests, PWA assets, and small hardening fixes. (plan created at .copilot/session-state/.../plan.md)
## Iteration (Copilot) - 2026-03-18T11:56:00Z
- Verified specs against codebase; no missing implementations found.
- Created session plan in Copilot session-state.
- Ran npm run build and npm run test:ci — both succeeded.
- Appended progress and learning logs; created local git tag 0.0.49.

- [x] Loop: verified build & tests (2026-03-18T12:28:05Z) — no code changes required.
\n## Updates: Implemented in this iteration\n- [x] Added scripts/generate-vapid.cjs (gen:vapid) to help generate VAPID keys.\n- [x] Added scripts/check-env.cjs and wired into CI (check:env).\n- [x] Added scripts/check-pwa-assets.cjs (check:pwa-assets).\n

- [x] Verified build & tests on 2026-03-18T07:10:01.2864644-06:00 — nothing to implement this loop

## Iteration (verify) - 2026-03-18

- Verified production build and CI tests passed (44 tests).
- No code changes required this loop; updated logs and learnings.


### [2026-03-18T13:29:46.346Z] Loop: verification
- Verified build & tests (npm run build ✅; npm run test:ci ✅ (44 tests)). No missing functionality detected. Tag 0.0.59 created locally.

### 2026-03-18T07:33:56.0467381-06:00 — Verified build & tests — no code changes required
