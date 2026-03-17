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

## 🔧 Active Bugs / In Progress
- [x] **BUILD FAILURE**: `~/` path alias not resolved by Rollup — Fix: add `resolve.alias` with `fileURLToPath` to `vite.config.ts`
- [x] **logout.tsx loader bug**: loader creates fake Request without cookies — Fix: pass real `request` param  
- [x] **root.tsx no auth check**: nav shows "Logout" even for unauthenticated users — Fix: add loader returning `isLoggedIn`
- [x] **No dev seed user**: seed.ts only seeds MaintenanceTypes — Fix: add `dev@example.com` / `password123`

## 📋 Future Improvements
- [ ] Add PWA icons (icon-192.png, icon-512.png) to public/icons/ (currently referenced but missing)
- [ ] Add `entry.server.tsx` for custom server-side rendering (optional, Remix provides default)
- [ ] Consider migrating from `vite-plugin-pwa` to `@vite-pwa/remix` for better Remix integration
