# Car Work Tracker — Epic project management (agent skill)

**Canonical location:** this file lives under `docs/skills/` so it shows up in the normal repo tree—searchable in VS Code, Cursor, GitHub, and code review. Cursor’s skill entry is `.cursor/skills/car-work-epic/SKILL.md`, which only holds metadata and defers to this document.

## Canonical artifact

- **`docs/epic.md`** — product intent; **information architecture** (fleet vs car hub, global nav aligned with `app/root.tsx`, terminology, roles, global vs per-car config, nav badge vs dashboard, UX guardrails); tech stack; testing bar; architecture; Prisma-aligned **data model**; **grouped route map** (shell / global tools / cars / API & exports); maintenance due logic; Overpass, PWA, push; roadmap; historical context.
- **`docs/requirements.md`** — optional; use for numbered requirements, acceptance criteria, or traceability from epic bullets to tickets. Keep it short or split by theme if it grows.

When the user asks to plan or summarize work, **read `docs/epic.md` first** (and `docs/requirements.md` if non-empty) before inventing scope.

---

## When to update the epic

| Trigger | Epic sections to touch |
| -------- | ---------------------- |
| New route, API, or export under `app/routes/` | **Route map** — add/rename/remove in the correct subsection (Shell / Global tools / Cars / API and exports); **Architecture** if new external service or subgraph |
| Nav bar links, labels, hamburger, or **due badge** logic in `app/root.tsx` | **Global navigation (shell)** table; **Nav badge vs dashboard** if counts or inputs change |
| Car hub primary actions (buttons linking to forecast, overrides, fuel, etc.) | **Terminology (UI ↔ routes)** if labels or targets drift; **Route map** car rows |
| Owner/driver rules, member flows, or who may mutate a car | **Roles and permissions**; **Data model** (`CarMember`); routes that enforce gates as needed in **Route map** notes |
| Global defaults vs per-car overrides (Settings vs Service Intervals) | **Global vs per-car configuration**; **Data model** if schema changes |
| Prisma model/field change | **Data model**; **Maintenance due logic** if behavior changes |
| New npm dependency or toolchain (PWA, test runner) | **Tech stack**; **Quality & operations**; **Dependencies** |
| New user-visible capability | **What the app is for** / primary jobs if positioning shifts; **Information architecture** if it changes where users go (nav, hub, flows) |
| Changed security/CSP/env contract | **Architecture** (security baseline); **Quality & operations** if CI/scripts change |
| Deferred or shipped roadmap idea | **Roadmap / out of scope** — move or delete bullets so the list stays honest |
| New testing policy or coverage expectation | **Testing strategy** |

Do **not** let the epic list routes or entities that no longer exist. Prefer **accurate grouped route tables** over duplicate prose; keep shell nav and terminology aligned with the live UI.

---

## Reconciliation workflow

Use this when asked to “sync the epic,” “update the doc after the feature,” or “audit epic vs code.”

1. **Inventory code** — `app/routes/**/*`, `app/root.tsx` (nav + badge), `prisma/schema.prisma`, `vite.config.ts` (PWA), `package.json` scripts/deps, notable `app/models/*.server.ts`.
2. **Diff against epic** — Grouped **route map** sub-tables; **Global navigation** vs nav links/labels; **Terminology** vs car hub CTAs; **Nav badge vs dashboard** vs loader logic in `root` and dashboard loaders; **Roles and permissions** vs member/delete/edit routes; model bullets; tech stack rows; testing bullets.
3. **Patch epic** — Minimal edits: add/remove/rename rows in the right route subsection; fix IA/nav/terminology drift in one pass where possible.
4. **Optional requirements** — If `docs/requirements.md` is in use, add or adjust IDs for new scope and reference them from epic roadmap bullets (e.g. “REQ-12: PDF export”).

---

## Epic section cheat sheet

| Section | Purpose |
| ------- | ------- |
| What the app is for | Elevator + **primary jobs** (user value) |
| Information architecture & product flow | **Mental model** (dashboard = fleet, car detail = hub); subsections below |
| Global navigation (shell) *(under IA)* | Nav labels, routes, intents — must stay aligned with `app/root.tsx` |
| Terminology (UI ↔ routes) *(under IA)* | **History**, **Schedule**, **Service Intervals**, **Reports** vs **Compare** ↔ route files |
| Roles and permissions *(under IA)* | `owner` / `driver` product rules; cross-ref from **Data model** |
| Global vs per-car configuration *(under IA)* | Settings vs per-car overrides; push user scope |
| Nav badge vs dashboard *(under IA)* | Header badge intent vs dashboard batch due/approaching/health |
| UX guardrails *(under IA)* | Shell, PWA install, export discoverability |
| Tech stack | Authoritative stack table |
| Testing strategy | Non-negotiable quality bar (unit vs integration, CI) |
| Architecture overview | Mermaid + security note |
| Data model | Prisma-aligned entity list (includes `CarMember` → roles section) |
| Route map (implemented) | **Grouped** Remix inventory: Shell / Global tools / Cars / API and exports |
| Maintenance due logic | Conceptual algorithm (keep in sync with `maintenance.server.ts`); surfaces dashboard, Compare, nav badge |
| Location-aware alerts | Geolocation + Overpass + client wiring |
| PWA & offline | Manifest, Workbox, offline page |
| Quality & operations | Scripts, link to testing section |
| Dependencies | High-level; versions live in `package.json` |
| Roadmap / out of scope | Candidates only; remove when delivered |
| Historical note | Why the doc shape exists (avoid deleting) |
| Maintaining this document | Pointer back to this skill file |

---

## Writing rules

- **Concise tables** for stack and for routes (**grouped** sub-tables in **Route map**); avoid duplicating the same route list in prose.
- **Shell consistency** — Global nav table and **Terminology** must match live UI (`app/root.tsx`, car hub links); when in doubt, reconcile from code.
- **Anchor links** — Testing section uses a stable heading so “Quality & operations” can link to it.
- **Mermaid** — Keep the architecture diagram one screenful; extend only when a new major subsystem appears (e.g. billing).
- **Roadmap** — Each bullet is testable or shippable as a future story; vague wishes belong in conversation, not the epic.

---

## Optional: work item stub

When turning a roadmap line into work, the agent can propose:

```markdown
### [Short title]

- **Epic link:** Roadmap — [quote or paraphrase bullet]
- **Code touchpoints:** routes …, models …, prisma …
- **Doc updates:** epic sections …
- **Tests:** unit … / integration … (per Testing strategy)
- **Acceptance:** …
```

Use this in chat or in `docs/requirements.md`; do not bloat `docs/epic.md` with ticket-level detail unless the user wants it there.

---

## Anti-patterns

- Treating the epic as a **changelog** — use git history for that; epic describes current + intended product shape.
- **Version pins** in epic that disagree with `package.json` — say “see package.json” for exact versions.
- **Removing** the testing strategy or route map because “it’s obvious from code” — those sections exist for humans and agents without a full codebase load.
