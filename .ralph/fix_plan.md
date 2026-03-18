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
- [ ] Consider migrating from `vite-plugin-pwa` to `@vite-pwa/remix` for better Remix integration
- [x] Add push notification support for maintenance due reminders — subscription storage, server endpoints, client subscribe UI, and test send route implemented
- [x] Add per-car maintenance interval overrides (CarMaintenanceOverride model)

## 🔧 Discovered issues (loop)
- [x] Fix CSV export escaping in maintenance.export.tsx (malformed CSV when fields contain commas/quotes)
- [x] Add safeRedirect to session.server.ts and sanitize redirectTo in login action (prevent open redirect)
- [x] Make logout POST-only (remove session destroy on GET)
- [x] Make getMaintenanceForecast respect per-car overrides (align with other functions)
- [x] Replace inline months calc with monthsDiff in getBatchMaintenanceHealthScores (consistency)
- [x] Fix manifest icons sizes in vite.config.ts
- [x] Add runtimeCaching rules for images and /api endpoints in vite.config.ts
- [x] Convert server-only export routes (.tsx -> .ts) to avoid client bundling of server-only loaders
- [x] Add accessibility improvements to NearbyServicesAlert, OfflineIndicator, AlertBanner, CarCard


## Discovered Issues - Loop 12

- [x] Add test suite & Vitest configuration — vitest.config.ts and a tests/ scaffold exist; unit/integration tests added and Vitest run verified (1 passing test).
- [x] Remove committed Prisma dev DB (prisma/dev.db) — removed nested prisma/prisma/dev.db from repo and added .gitignore entry (prisma/**/dev.db); next: rotate any leaked data if necessary.
- [x] Add .env.example documenting DATABASE_URL & SESSION_SECRET — .env.example created; next: ensure CI provides SESSION_SECRET and DATABASE_URL.
- [x] Add .ralph/specs/app_spec.md placeholder — app_spec.md created; next: expand specs with detailed acceptance criteria.
- [ ] Ensure SESSION_SECRET is set in production & document — production not enforced; next: fail startup if SESSION_SECRET is absent and document requirements in the fix plan and .env.example.
