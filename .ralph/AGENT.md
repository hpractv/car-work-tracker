# Agent Instructions

- **Run Dev Server:** Use `npm run dev` to start the Remix development server.
- **Database Studio:** Use `npx prisma studio` to view the SQLite database.
- **Database Push:** Use `npx prisma db push` to push schema changes to the SQLite database.
- **Build App:** Use `npm run build` to verify the application builds correctly.
- **Package Manager:** Use `npm` for all dependency management.

**Important Workflows:**
- If you change the database schema in `prisma/schema.prisma`, always run `npx prisma db push` to apply changes.
- Ensure that the PWA Service Worker is generating correctly on build. 
- Use standard Remix routing conventions in the `app/routes` directory.
