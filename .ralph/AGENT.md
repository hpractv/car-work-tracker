# Agent Instructions

Quick commands:
- npm run dev        # start Remix dev server
- npm run build      # build production bundle (generates sw.js)
- npm run test       # run tests locally
- npm run test:ci    # run tests in CI/headless mode

# Agent Instructions

- **Run Dev Server:** Use `npm run dev` to start the Remix development server.
- **Database Studio:** Use `npx prisma studio` to view the SQLite database.
- **Database Push:** Use `npx prisma db push` to push schema changes to the SQLite database.
- **Database Seed:** Use `npm run prisma:seed` to seed maintenance types and dev user (dev@example.com / password123).
- **Build App:** Use `npm run build` to verify the application builds correctly.
- **Run Tests:** Use `npm run test` for local runs and `npm run test:ci` for CI/headless runs.
- **Package Manager:** Use `npm` for all dependency management.

**Important Workflows:**
- If you change the database schema in `prisma/schema.prisma`, always run `npx prisma db push` to apply changes.
- Ensure that the PWA Service Worker is generating correctly on build.
- Use standard Remix routing conventions in the `app/routes` directory.
- The `~` path alias (maps to `./app/`) is configured via `resolve.alias` in `vite.config.ts` — DO NOT remove it or the build will fail.
- Logout must be a `<Form method="post" action="/logout">` — not an anchor tag — so cookies are properly destroyed.

**Dev Login:** `dev@example.com` / `password123`

**Prevent JS Emission from tsc:**
The `tsconfig.json` has `"noEmit": true` — do NOT remove this. Without it, running `tsc` emits `.js` files next to every TypeScript source file, causing Remix Route ID Collision warnings.

**Git Ignore:** A `.gitignore` is now present covering `node_modules/`, `build/`, `.env`, and Prisma dev database files.

**Format Utilities:**
- Shared formatting helpers are in `app/utils/format.ts`: `formatMaintenanceType`, `formatDate`, `formatCurrency`, `formatMileage`
- Always import from this file instead of inlining `.replace(/_/g, " ")` chains

**Settings Page:**
- Maintenance type intervals are global (affect all users)
- "Restore Defaults" button on the Settings page re-seeds the 11 default maintenance types
- Duplicate type names are caught with a friendly error message

**Profile Page:**
- /profile now has a "Danger Zone" section for account deletion
- Requires password confirmation + browser confirm dialog
- Deletes user + all solo-owned cars (cars with other owners are preserved)

**Security Notes:**
- `SESSION_SECRET` env var must be set before starting the server in production — session.server.ts will throw at startup if missing; ensure CI sets this var and document in .env.example
- The edit route for cars (`/cars/:id/edit`) is now owner-only at the loader level (throws 403 for drivers)

**New Routes Added (Loop 9):**
- `/reports` — Analytics: year-over-year cost, cost by car/type, monthly trend (pure CSS charts)
- `/search` — Global search across cars and maintenance records
- `/cars/:carId/print` — Printable maintenance history report (standalone HTML, bypasses root layout)

**Prisma Schema (Loop 9 additions):**
- `Car.imageUrl String?` — optional URL to a car photo (shown as thumbnail in CarCard + detail)
- `Car.notes String?` — optional freeform notes about the car
- `MaintenanceRecord.receiptUrl String?` — optional URL to a receipt/invoice

**Navbar Links (authenticated):**
Dashboard | My Cars | History | Reports | Settings | Profile | Logout
(Dashboard shows a red badge with count of due maintenance items)

**New Routes Added (Loop 8):**
- `/maintenance` — Global maintenance history across all cars (server-side filter/sort/pagination)
- `/cars/export` — Fleet-wide CSV download (cars.export.tsx)

**Push Notifications Support:**
- Server: `web-push` is used to send Web Push notifications. Install with `npm install web-push` when needed.
- Env: Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env` for production. If not set, ephemeral keys are generated for development (not persisted).
- Routes: `/api/push/subscribe`, `/api/push/unsubscribe`, and `/api/push/send-test` handle subscription storage and test sends.
- Client: The Settings page includes a PushManager component to subscribe/unsubscribe and send a test notification.
## Recent build notes (2026-03-18)
- Use `npm run build` to produce the production bundle; VitePWA will emit `build/client/sw.js` which the runtime registration script should reference at `/sw.js`.
- Ensure `.env` contains: DATABASE_URL, SESSION_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY. The server exposes the public key to clients via loader responses (no need to set VITE_PUBLIC_* unless you prefer a build-time copy).
