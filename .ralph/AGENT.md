# Agent Instructions

- **Run Dev Server:** Use `npm run dev` to start the Remix development server.
- **Database Studio:** Use `npx prisma studio` to view the SQLite database.
- **Database Push:** Use `npx prisma db push` to push schema changes to the SQLite database.
- **Database Seed:** Use `npm run prisma:seed` to seed maintenance types and dev user (dev@example.com / password123).
- **Build App:** Use `npm run build` to verify the application builds correctly.
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