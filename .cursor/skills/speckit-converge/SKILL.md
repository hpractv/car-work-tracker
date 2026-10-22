---
name: speckit-converge
description: 'RALPH HANDOFF: fold ralph/qa-report.md gaps into ralph/task_status.json
  as new tasks. Never touches tasks.md or code.'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:ralph-handoff
---

# Speckit Converge Skill

<!-- RALPH-HANDOFF-PRESET v0.1.0 -->
## User Input

```text
$ARGUMENTS
```

# /speckit.converge → Ralph QA gap fold-in

HARD RULES: do not edit product code, do not edit tasks.md, do not set `passes: true` on anything (QA-only field).

1. Run `python3 .specify/scripts/speckit-to-ralph.py --converge`.
2. Report the gaps added as new Ralph tasks (status pending, passes false). Deduping is by stable id inside the converter.
3. End with: **Resume Ralph now?** (requires Roy's go).

Generated copies of this file keep the `RALPH-HANDOFF-PRESET` marker.
