Build & Test Quick Commands:
- Install: npm ci
- Build (production): npm run build
- Run tests (dev watch): npm test
- Run tests (single-run): npm run test -- --run
- CI test: npm run test:ci
- Coverage: npm run test:coverage (if configured)

Notes:
- Ensure SESSION_SECRET and DATABASE_URL are set in environment (CI/prod).
- Use npm run check:no-dev-db to detect accidentally committed Prisma dev.db.
- Note: Automated git push may fail in this environment if 'origin' is not configured or credentials are missing. Ensure CI agent has git remote & auth.

Quick new tips:
- Use docker-compose up --build to run a local dev instance (exposes 3000).
- Use `node scripts/generate-vapid.cjs` to generate VAPID keys for web-push during setup.
- Use `npm run check:no-dev-db` and `node scripts/check-pwa-assets.cjs` in CI to prevent regressions.

