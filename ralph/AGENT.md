# Ralph agent signs — ci-green

## Loop rules
- One task per loop. Only QA sets `passes: true`.
- Ignore prior chat; `ralph/` is memory.
- Never read/print/recreate `.env`. No secrets in logs or commits.
- Intermediate commits may use `[skip ci]`. Final commit must not.
- Do not open a PR until `completeEpic` is true.
- Do not touch `speckit/ralph-handoff`.
- Out of scope: session.server.ts insecure fallback, node_modules, Spec Kit.

## Commands
```
npm ci
npm run check:no-dev-db
npm run check:env
npm run build
npm run test:ci
```
Use Node 18 for proof runs matching `ci.yml`.
