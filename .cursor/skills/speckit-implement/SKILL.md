---
name: speckit-implement
description: 'RALPH HANDOFF: convert spec/plan/tasks into ralph/ and stop. Never writes
  product code.'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:ralph-handoff
---

# Speckit Implement Skill

<!-- RALPH-HANDOFF-PRESET v0.1.0 -->
## User Input

```text
$ARGUMENTS
```

# /speckit.implement → Ralph handoff (the ONLY execution path)

HARD RULES — violating any of these is a failure:
- Do NOT write, edit, or delete any product source code, tests, or config in this command.
- Do NOT execute tasks from tasks.md. Do NOT mark tasks.md checkboxes.
- Do NOT launch Ralph, a cloud agent, or ralph-gui. Stop at the go point.

Steps:
1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` and parse FEATURE_DIR.
2. Gate: if `FEATURE_DIR/checklists/` has any unchecked `- [ ]` item, list them and STOP. If `FEATURE_DIR/analyze-report.md` is missing or contains a CRITICAL finding, STOP and tell the user to run /speckit.analyze and save its report there. Treat as CRITICAL: a `CRITICAL:` / `- CRITICAL:` / `**CRITICAL**:` line, a stock analyze markdown table row whose severity cell is `CRITICAL` (e.g. `| C1 | Constitution | CRITICAL | … |`), or `Critical Issues Count: N` with N ≥ 1. Prose like "No critical issues found." is fine.
3. Run `python3 .specify/scripts/speckit-to-ralph.py "$FEATURE_DIR"`. If it exits non-zero (e.g. Ralph epic in flight), show its output and STOP. Do not work around it.
4. Show the summary it printed (epic id, REQ/todo counts, files written).
5. End with exactly: **Start Ralph now?** — ralph/ is seeded; launching the loop requires Roy's explicit go.

Generated copies of this file (under `.cursor/skills/` or `.specify/presets/`) are produced by `specify preset add` and must keep the `RALPH-HANDOFF-PRESET` marker.
