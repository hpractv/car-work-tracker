# QA report — ci-green

QA writes evidence here each loop.

## Loop 1 — REQ-1 PASS

- `git ls-files` matching `dev.db` / journals: **none** (already untracked on main @ d7e59cef)
- `git rm --cached --ignore-unmatch` on known paths: no-op (nothing to remove from index)
- `.gitignore` covers `prisma/dev.db`, `prisma/**/dev.db`, `**/dev.db` (+ journals)
- No history rewrite; DB file contents never opened/printed

## Loop 2 — REQ-2 PASS

- `.github/workflows/ci.yml` job `env.SESSION_SECRET`:
  `${{ secrets.SESSION_SECRET || 'ci-only-dummy-session-secret-not-for-production' }}`
- Comment documents: prefer secret; dummy only when unset; CI never deploys; dummy not for production

## Loop 3 — REQ-3 PASS

### Real cause of check:no-dev-db failure
`scripts/check-no-dev-db.js` used CommonJS `require` under package.json `"type": "module"`, so Node crashed before any DB check. Latest main Actions log confirms this (not a currently tracked DB file).

### Fix (scripts + package.json only; no app/test changes)
- Replace `scripts/check-no-dev-db.js` with `scripts/check-no-dev-db.cjs` (same pattern as `check-env.cjs`)
- Broaden `git ls-files` pathspecs; still prints **paths only**
- `package.json` script `check:no-dev-db` → `node ./scripts/check-no-dev-db.cjs`

### Results (with SESSION_SECRET dummy)
- `npm run check:no-dev-db` → OK
- `npm run check:env` → OK
- `npm run build` → OK
- `npm run test:ci` → 14 files / **44 tests passed**
- No tests weakened or skipped; no app/ code edits
