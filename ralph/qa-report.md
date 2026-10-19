# QA report — ci-green

QA writes evidence here each loop.

## Loop 1 — REQ-1 PASS

- `git ls-files` matching `dev.db` / journals: **none** (already untracked on main @ d7e59cef)
- `git rm --cached --ignore-unmatch` on known paths: no-op (nothing to remove from index)
- `.gitignore` covers `prisma/dev.db`, `prisma/**/dev.db`, `**/dev.db` (+ journals)
- No history rewrite; DB file contents never opened/printed
