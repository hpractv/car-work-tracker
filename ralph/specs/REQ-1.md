# REQ-1 — Untrack prisma dev DB

1. Find tracked paths matching prisma dev DB / journals (path names only).
2. `git rm --cached` any found. Do not print file contents.
3. Ensure .gitignore covers `prisma/dev.db`, `prisma/dev.db-journal`, and nested forms.
4. Do not rewrite history.

Note: CI currently crashes in check-no-dev-db.js (ESM) before listing files; after this REQ,
REQ-3 will make the checker runnable. If nothing is tracked, document that and still harden gitignore.
