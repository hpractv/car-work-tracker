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

## 📋 Future Improvements
- [ ] Add `v3_singleFetch` future flag (breaking change — requires loader return type migration)  
- [ ] Consider migrating from `vite-plugin-pwa` to `@vite-pwa/remix` for better Remix integration
- [ ] Add `entry.server.tsx` custom streaming — DONE in Loop 3
- [ ] Add app icons in multiple sizes for better PWA compliance
- [ ] Add offline indicator UI when service worker detects no network
