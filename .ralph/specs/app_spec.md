# App Spec — Car Work Tracker (summary)

This document captures the high-level application behavior for the Remix PWA.

Core flows:
- Authentication: signup/login/logout using cookie sessions; redirectTo preserved for protected routes.
- Cars: create/read/update/delete cars; membership roles owner/driver; archive/restore car.
- Maintenance: create/read/update/delete maintenance records; per-type intervals and forecasting.
- PWA: service worker, offline page at /offline, manifest + install prompt.
- Exports: per-car and fleet CSV exports with proper CSV escaping (quotes/commas handled).

Acceptance criteria:
- Server guards return 401/403 appropriately for unauthenticated/unauthorized actions.
- Build succeeds with `npm run build` and service worker generated.
- Tests run via `npm run test` and provide basic coverage for utils and key server-only functions.
