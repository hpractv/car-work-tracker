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

## 📋 Future Improvements
- [ ] Add `v3_singleFetch` future flag (breaking change — requires loader return type migration)
- [ ] Consider migrating from `vite-plugin-pwa` to `@vite-pwa/remix` for better Remix integration
- [ ] Add app icons in multiple sizes for better PWA compliance
