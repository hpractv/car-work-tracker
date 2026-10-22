# car-work-tracker Constitution

## Core Principles

### I. Ralph-Only Execution
Spec Kit owns authoring (constitution, specify, clarify, plan, checklist, tasks, analyze).
**Spec Kit never writes product code.** `/speckit.implement` and `/speckit.converge` are
overridden by the `ralph-handoff` preset: implement seeds `ralph/` and stops; converge folds
QA gaps into `ralph/task_status.json`. All product implementation happens in the Ralph loop.

### II. Roy's Explicit Go
No Ralph loop starts, and nothing merges, without Roy Wong's explicit go. The implement handoff
ends at **Start Ralph now?** and waits.

### III. Iris Gates PRs
Pull requests are gated by **Iris**. Agents must not merge. Final commits and PR title/body must
contain no CI-skip markers.

### IV. Security-First
No secrets in code, logs, or commit messages. Agents must never open, read, print, modify, stage,
or commit `.env`. Exclude `.env` from searches. Do not change `.gitignore` handling of `.env`.

### V. Existing Gates Are Law
These commands remain mandatory and must not be weakened:

- `npm ci`
- `npm run check:no-dev-db`
- `npm run check:env`
- `npm run build`
- `npm run test:ci`

### VI. One Task Per Loop
Ralph runs one selected task per planning→dev→QA loop. Do not expand past epic out of scope.

### VII. QA-Only Passes
Only the QA persona sets `passes: true`, after independent verification. Dev sets `dev_done` only.
A PR opens only when `completeEpic: true`.

## Scaffolding Scope

This adoption work may change only Spec Kit / Ralph scaffolding (`.specify/`, Spec Kit
cursor-agent files under `.cursor/` alongside existing content, example `specs/`, `docs/`,
`ralph/`, and the CI guard step). Do not change app behaviour under `app/`, `prisma/`, `public/`,
`tests/`, `scripts/`, or runtime `package.json` dependencies.

## Governance

This constitution supersedes ad-hoc agent habits for Spec Kit / Ralph work in this repository.
Amendments require Roy's approval. Iris remains the merge gate.

**Version**: 1.0.0 | **Ratified**: 2026-10-18 | **Last Amended**: 2026-10-19
