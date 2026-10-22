# Agent instructions — car-work-tracker

- **Epic and product spec:** `docs/epic.md` is the source of truth for intent, architecture, route map, and testing expectations.
- **Keeping the epic aligned with code:** Follow `docs/skills/car-work-epic.md` (workflows, section checklist, anti-patterns). Cursor also registers this content via `.cursor/skills/car-work-epic/SKILL.md`.

## Spec Kit → Ralph handoff

- Spec Kit authors specs/plans/tasks; **Ralph is the only execution path**.
- See `docs/speckit-ralph-workflow.md` (pinned specify-cli, preset, converter, CI guard, **Iris** gate).
- Do not run stock `/speckit.implement` as a coding session — the `ralph-handoff` preset seeds `ralph/` and stops.
