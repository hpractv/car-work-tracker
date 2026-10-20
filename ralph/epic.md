---
epic: ci-green
title: Make CI green
status: approved
owner: Roy Wong
go: Roy (direct)
repo: hpractv/car-work-tracker
baseline: main @ d7e59cef2ad56b30e1663644b810cabe4e25889e
branch: fix/ci-green
max_loops: 12
---

# Summary

Make GitHub Actions CI green on hpractv/car-work-tracker. Every main CI run currently fails at
`npm run check:no-dev-db`. After that, `check:env` requires `SESSION_SECRET`, but `ci.yml` never sets it.

# Requirements

## REQ-1 Untrack prisma dev DB
Untrack committed prisma dev DB file(s) (`git rm --cached`); ensure `.gitignore` covers them.
Do not print DB contents. Do not rewrite history.

## REQ-2 SESSION_SECRET in CI
In `ci.yml`, provide `SESSION_SECRET` to the job: `${{ secrets.SESSION_SECRET }}` when set,
otherwise a clearly CI-only dummy value. Document the dummy in a comment. CI never deploys.

## REQ-3 Later CI steps pass
`build` and `test:ci` must pass. Fix real causes. Change app/test code only when strictly required;
explain each change; never weaken or skip tests.

## REQ-4 Prove it
Run the exact `ci.yml` steps locally on Node 18. Report that a PR run will confirm on GitHub Actions
(workflow triggers on push only to main/master, plus pull_request to main).

# Out of scope
- Insecure dev fallback in `app/session.server.ts`
- Committed `node_modules`
- Anything Spec Kit

# Constraints
- Never read, print, or recreate `.env`
- No secrets in code or logs
- Final commit has no CI-skip marker
- Never merge; do not open/close issues
