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
