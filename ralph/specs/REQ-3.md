# REQ-3 — build + test:ci pass

Real causes observed:
1. `scripts/check-no-dev-db.js` uses CommonJS `require` but package.json has `type: module` → crashes in CI (this is why check:no-dev-db fails — not a currently tracked DB).
2. After that, build/test must pass with SESSION_SECRET set.

Fix checker by converting to `.cjs` (match sibling scripts) and broaden pathspecs. Update package.json script only. Touch app/tests only if build/test fail for real reasons.
