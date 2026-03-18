Build & test instructions (concise)

Repository root: C:\Users\ROY28095\temp\car-work-tracker

Quick commands (Windows):
- npm install
- npm run build         # production build
- npm run dev           # dev server
- npm run test          # run tests (watch)
- npm run test:ci       # CI / headless test run (recommended in CI)

Required env vars (CI/prod): DATABASE_URL, SESSION_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

Dev seed:
- npm run prisma:seed   # seeds dev user (dev@example.com / password123) and maintenance types

Notes:
- Keep tsconfig.json "noEmit": true to avoid emitted JS causing Remix route ID collisions.
- If you change prisma/schema.prisma: run npx prisma db push and then npm run prisma:seed if you need seed data.
- Use relative imports in tests (e.g., ../app/utils/...) to avoid alias resolution issues in Vitest.

CI:
- Use npm run test:ci to run tests in CI (headless).
- Run npm run check:no-dev-db to detect accidentally committed prisma dev DB files before merging.

That's it — minimal steps to build and test the project.

- Note: The app uses virtual:pwa-register for client-side SW registration. Do not add static public/registerSW.js; if present it is redundant and will be removed.

