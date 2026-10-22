# ralph-handoff preset (SOURCE)

This is the **single** in-repo source for the Ralph handoff preset.

Install / reinstall:

```bash
specify preset remove ralph-handoff   # optional; restores stock implement/converge
specify preset add --dev .specify/presets-src/ralph-handoff
```

Generated install location (managed by Spec Kit; do not edit as source of truth):
`.specify/presets/ralph-handoff/` and the integration skill files under `.cursor/skills/speckit-implement/` and `speckit-converge/`.

The converter lives at `.specify/scripts/speckit-to-ralph.py` — not duplicated here.
