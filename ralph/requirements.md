---
epic: ci-green
branch: fix/ci-green
baseline: main @ d7e59cef2ad56b30e1663644b810cabe4e25889e
---

# Requirements

## REQ-1 Untrack prisma dev DB
`git rm --cached` any committed prisma dev DB path(s); `.gitignore` must cover them.
Do not print DB contents. Do not rewrite history.

## REQ-2 SESSION_SECRET in ci.yml
Job env: secret when set, else CI-only dummy; comment documents the dummy.

## REQ-3 build + test:ci pass
Fix real causes; no weakened/skipped tests; explain any app/test changes.

## REQ-4 Local Node 18 proof of exact ci.yml steps
