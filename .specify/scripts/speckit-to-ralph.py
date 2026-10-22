#!/usr/bin/env python3
"""Spec Kit -> Ralph bridge.

Single source of truth after handoff: ralph/task_status.json.

Usage:
  speckit-to-ralph.py FEATURE_DIR
  speckit-to-ralph.py --converge

Python 3 stdlib only. Never sets passes:true. Never uses shell=True, eval, or exec.
FEATURE_DIR must resolve under <repo>/specs/.
"""
from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys

ROOT = pathlib.Path.cwd().resolve()
SPECS = (ROOT / "specs").resolve()
RALPH = ROOT / "ralph"
STATUS = RALPH / "task_status.json"


def utc_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def die(msg: str, code: int = 2) -> None:
    print("REFUSED: " + msg, file=sys.stderr)
    sys.exit(code)


def resolve_feature_dir(raw: str) -> pathlib.Path:
    """Resolve FEATURE_DIR and confine it to specs/."""
    path = pathlib.Path(raw)
    if not path.is_absolute():
        path = (ROOT / path).resolve()
    else:
        path = path.resolve()
    try:
        path.relative_to(SPECS)
    except ValueError:
        die(f"FEATURE_DIR must be under specs/ (got {path})")
    if not path.is_dir():
        die(f"FEATURE_DIR is not a directory: {path}")
    return path


def in_flight(data: dict) -> bool:
    if data.get("completeEpic") is True:
        return False
    if data.get("status") in ("completed", "complete", "done"):
        return False
    tasks = data.get("tasks") or data.get("todos") or []
    if not tasks:
        return False
    return True


def check_gates(fdir: pathlib.Path) -> None:
    checklists = fdir / "checklists"
    if checklists.is_dir():
        for md in sorted(checklists.glob("*.md")):
            text = md.read_text(encoding="utf-8")
            unchecked = re.findall(r"^- \[ \] (.+)$", text, re.M)
            if unchecked:
                die(
                    f"unticked checklist items in {md.relative_to(ROOT)}: "
                    + "; ".join(unchecked[:5])
                )
    analyze = fdir / "analyze-report.md"
    if not analyze.exists():
        die(f"missing {analyze.relative_to(ROOT)} (run /speckit.analyze and save the report)")
    analyze_text = analyze.read_text(encoding="utf-8")
    if has_critical_finding(analyze_text):
        die(f"CRITICAL findings in {analyze.relative_to(ROOT)}; resolve before handoff")


def has_critical_finding(analyze_text: str) -> bool:
    """True if analyze-report has a CRITICAL finding in any stock Spec Kit form.

    Matches:
    - Prefix forms: `CRITICAL:`, `- CRITICAL:`, `**CRITICAL**:` (case-insensitive)
    - Stock /speckit.analyze table rows with a CRITICAL severity cell, e.g.
      `| C1 | Constitution | CRITICAL | ... |`
    - `Critical Issues Count: N` where N >= 1

    Does not match prose like "No critical issues found."
    """
    # Prefix / bullet forms with a colon (not bare prose).
    if re.search(
        r"(?i)(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?CRITICAL(?:\*\*)?\s*:",
        analyze_text,
    ):
        return True
    # Markdown table row: any cell that is exactly CRITICAL (optional bold).
    # Stock analyze puts severity in column 3, but accept any column.
    if re.search(
        r"(?im)^\s*\|(?:[^|\n]*\|)*\s*\**CRITICAL\**\s*\|",
        analyze_text,
    ):
        return True
    # Explicit count from stock analyze summary.
    m = re.search(
        r"(?i)Critical\s+Issues?\s+Count\s*:\s*(\d+)",
        analyze_text,
    )
    if m and int(m.group(1)) >= 1:
        return True
    return False


def parse_frs(spec_text: str) -> list[tuple[str, str]]:
    # Accept **FR-001**: text or FR-001: text
    patterns = [
        r"\*\*(FR-\d+)\*\*:?\s*(.+)",
        r"^(FR-\d+):\s*(.+)$",
    ]
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, spec_text, re.M):
            fid, title = m.group(1), m.group(2).strip()
            if fid not in seen:
                seen.add(fid)
                found.append((fid, title))
    return found


def parse_tasks(tasks_text: str) -> list[tuple[str, str, bool]]:
    """Return (id, text, checked) from tasks.md checkbox lines."""
    out: list[tuple[str, str, bool]] = []
    for m in re.finditer(r"^- \[([ xX])\]\s+(T\d+)\s+(.*)$", tasks_text, re.M):
        checked = m.group(1).lower() == "x"
        out.append((m.group(2), m.group(3).strip(), checked))
    return out


AGENT_MD = """# Ralph agent signs

How to build, test, and run this project. Keep this file brief. Update it when you learn a better command.

## Loop rules

- One task per loop. Read `ralph/task_status.json` and implement only `selected`.
- Ignore prior chat. Files in `ralph/` are memory.
- Search the codebase before assuming something is missing.
- After changes, run tests for the unit you changed.
- New tests must document why they exist.
- No placeholders, stubs, or "TODO implement later".
- Do not restyle the whole product or expand past epic out of scope.
- Do not reintroduce long-lived CI artifacts, secrets, or unrelated refactors.
- After a task passes QA, commit that task on the working branch.
- Do not open a PR, and do not push commits onto a PR, until `completeEpic` is true.
- Intermediate commits use `[skip ci]`.
- Dev never sets `passes: true`. Only QA does, after independent verification.
- PR only when `completeEpic: true`. Final commit, PR title, and PR body must contain no CI-skip marker (`[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`, `[actions skip]`, `***NO_CI***`).

## Commands

```
npm ci
npm run check:no-dev-db
npm run check:env
npm run typecheck
npm run build
npm run test:ci
python3 -m unittest discover -s .specify/scripts/tests -v
bash .specify/scripts/check-ralph-handoff.sh
```
"""

PROMPT_PLANNING = """# PERSONA: planning

Ignore prior chat. Read only `ralph/` and the code. Do not open a PR. If a PR appears, close it. Do not merge. Do not implement product features. Intermediate commits: `[skip ci]`.

1. Read `ralph/epic.md`, `ralph/task_status.json`, `ralph/AGENT.md`, and `ralph/specs/`.
2. Search the codebase. Do not assume a requirement is unimplemented.
3. Sync `ralph/task_status.json` `tasks` to the epic REQs (do not invent REQs). Fill `acceptanceCriteria` from Validation.
4. Set `selected` to the single most important remaining task id (`pending` or `fail`). If every task already `passes`, set `selected` to `null`.
5. Update `loop`, `persona: "planning"`. Commit `ralph/` only.

Report: selected id and why, remaining tasks, branch, no PR open.
"""

PROMPT_DEV = """# PERSONA: dev

Ignore prior chat. Read only `ralph/` and the code. Do not open a PR. Do not push commits onto a PR. If a PR appears, close it. Do not merge. Intermediate commits: `[skip ci]`.

1. Read `ralph/task_status.json`. Implement **only** `selected`.
2. Read that task’s spec in `ralph/specs/` and its `acceptanceCriteria`.
3. Search first. Full implementation, no placeholders.
4. Add tests that document why they exist and that fail if the old bug returns.
5. Run the unit tests named in `ralph/AGENT.md`.
6. Set that task `status` to `dev_done`. Do **not** set `passes: true`.
7. Update `loop`, `persona: "dev"`. You may commit work-in-progress on this branch with `[skip ci]`. The required commit is the one QA makes after this task passes.

Report: files changed, tests run, branch, no PR open.
"""

PROMPT_QA = """# PERSONA: qa

Ignore prior chat. Read only `ralph/` and the code. Do not open a PR. Do not push commits onto a PR. If a PR appears, close it. Do not merge. Do not implement product features. Intermediate commits: `[skip ci]`.

1. Independently verify `selected` (or every task if `selected` is null). Do not trust Dev notes.
2. Map each acceptance criterion to evidence (code path + tests run).
3. Run the tests in `ralph/AGENT.md`.
4. Update `ralph/task_status.json`: `pass` and `passes: true`, or `fail` and `passes: false`. Failures become `selected`.
5. If every task `passes`, set `completeEpic: true` and `status: "complete"`.
6. Write evidence in `ralph/qa-report.md`. Update `loop`, `persona: "qa"`.
7. If this task passed: commit on the working branch. That commit is the record that the task passed QA. Do not open a PR and do not push this commit onto a PR.

Report: per-task pass/fail, test counts, whether `completeEpic` is true, branch, commit hash if passed, no PR open.
"""

PROMPT_RELEASE = """# PERSONA: release

Only run when `ralph/task_status.json` has `completeEpic: true`.

This is the first time the epic is pushed to a pull request. Open the **single** PR for this working branch. No `[skip ci]` on this push. Do not merge. Do not add product features.

If a PR was closed earlier for this branch, reopen it. Report the PR URL.
"""

QA_REPORT = """# QA report

QA writes evidence here each loop. `ralph/task_status.json` remains the canonical pass/fail tracker.
"""

REQUIREMENTS_STUB = """# Requirements

Generated by speckit-to-ralph. See `ralph/epic.md` and `ralph/task_status.json`.
Only QA may set `passes: true`. Open a PR only when `completeEpic` is true.
Final commit / PR title / body must contain no CI-skip marker.
"""


def write_pack_files(epic_body: str, status: dict) -> None:
    RALPH.mkdir(parents=True, exist_ok=True)
    (RALPH / "specs").mkdir(parents=True, exist_ok=True)
    (RALPH / "epic.md").write_text(epic_body, encoding="utf-8")
    (RALPH / "requirements.md").write_text(REQUIREMENTS_STUB, encoding="utf-8")
    (RALPH / "AGENT.md").write_text(AGENT_MD, encoding="utf-8")
    (RALPH / "PROMPT_planning.md").write_text(PROMPT_PLANNING, encoding="utf-8")
    (RALPH / "PROMPT_dev.md").write_text(PROMPT_DEV, encoding="utf-8")
    (RALPH / "PROMPT_qa.md").write_text(PROMPT_QA, encoding="utf-8")
    (RALPH / "PROMPT_release.md").write_text(PROMPT_RELEASE, encoding="utf-8")
    (RALPH / "qa-report.md").write_text(QA_REPORT, encoding="utf-8")
    keep = RALPH / "specs" / ".gitkeep"
    if not keep.exists():
        keep.write_text("", encoding="utf-8")
    STATUS.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")


def convert(feature_dir: str) -> None:
    fdir = resolve_feature_dir(feature_dir)
    for name in ("spec.md", "plan.md", "tasks.md"):
        if not (fdir / name).exists():
            die(f"missing {fdir.relative_to(ROOT) / name}")

    check_gates(fdir)

    if STATUS.exists():
        cur = json.loads(STATUS.read_text(encoding="utf-8"))
        if in_flight(cur):
            die(
                f"Ralph epic '{cur.get('epic')}' is in flight "
                f"(status={cur.get('status')}, completeEpic={cur.get('completeEpic')}). "
                "Finish it or remove ralph/task_status.json before seeding a new epic. "
                "Never overwrites an in-flight task-status file."
            )
        die(
            "ralph/task_status.json already exists and is not in-flight; "
            "refusing to overwrite. Remove it explicitly if you intend a fresh seed."
        )

    spec_text = (fdir / "spec.md").read_text(encoding="utf-8")
    plan_text = (fdir / "plan.md").read_text(encoding="utf-8")
    tasks_text = (fdir / "tasks.md").read_text(encoding="utf-8")

    frs = parse_frs(spec_text)
    tlines = parse_tasks(tasks_text)
    if not frs:
        die("could not parse FR-### requirements from spec.md")
    if not tlines:
        die("could not parse T### tasks from tasks.md")

    fr_to_tasks: dict[str, list[str]] = {fid: [] for fid, _ in frs}
    tasks_out: list[dict] = []
    for tid, text, _checked in tlines:
        linked = re.findall(r"FR-\d+", text)
        clean = re.sub(r"\[(P|US\d+)\]\s*", "", text)
        clean = re.sub(r"\s*\((?:FR|SC)-[\d, FRSC-]+\)", "", clean).strip()
        for fr in linked:
            if fr in fr_to_tasks:
                fr_to_tasks[fr].append(tid.lower())
        acs = [f"Maps to {fr}" for fr in linked] or ["Complete the task as specified"]
        tasks_out.append(
            {
                "id": tid.lower(),
                "title": clean,
                "status": "pending",
                "passes": False,
                "acceptanceCriteria": acs,
                "notes": f"sourceTask={tid}; FRs={','.join(linked) or 'none'}",
            }
        )

    orphans = [fid for fid, mapped in fr_to_tasks.items() if not mapped]
    if orphans:
        die(f"requirements with no task: {orphans} (fix tasks.md / rerun analyze)")

    # Safety: never set passes true
    for t in tasks_out:
        if t.get("passes") is True:
            die("internal error: converter attempted to set passes:true")

    title_m = re.search(r"^# (.+)$", spec_text, re.M)
    title = title_m.group(1) if title_m else fdir.name
    now = utc_now()
    rel = fdir.relative_to(ROOT)
    epic_body = (
        f"# {title}\n\n"
        f"> Generated by speckit-to-ralph from `{rel}` at {now}. "
        "Spec Kit files are read-only input; ralph/task_status.json is the execution source of truth. "
        "Only QA sets passes:true. Open a PR only when completeEpic is true; "
        "final commit/PR must have no CI-skip marker.\n\n"
        f"## Spec\n\n{spec_text}\n\n"
        f"## Implementation plan\n\n{plan_text}\n\n"
        f"## Task breakdown (input only)\n\n{tasks_text}\n"
    )

    status = {
        "epic": fdir.name,
        "branch": f"ralph/{fdir.name}",
        "status": "in_progress",
        "loop": 0,
        "persona": "planning",
        "selected": None,
        "completeEpic": False,
        "tasks": tasks_out,
        "generatedBy": "speckit-to-ralph",
        "sourceArtifacts": [str(rel / n) for n in ("spec.md", "plan.md", "tasks.md")],
        "lastUpdated": now,
    }
    write_pack_files(epic_body, status)
    print(
        f"epic={fdir.name} FRs={len(frs)} tasks={len(tasks_out)}\n"
        f"wrote ralph/epic.md, ralph/task_status.json, and Ralph pack files\n"
        "Start Ralph now?"
    )


def stable_gap_id(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:48] or "gap"
    return f"gap-{slug}"


def converge() -> None:
    if not STATUS.exists():
        die("no ralph/task_status.json")
    qa = RALPH / "qa-report.md"
    if not qa.exists():
        die("no ralph/qa-report.md")
    data = json.loads(STATUS.read_text(encoding="utf-8"))
    gaps = re.findall(
        r"^- (?:\[ \] )?(?:GAP|FAIL)[:\s]+(.+)$",
        qa.read_text(encoding="utf-8"),
        re.M | re.I,
    )
    tasks = data.setdefault("tasks", [])
    existing_ids = {t.get("id") for t in tasks}
    existing_titles = {t.get("title") for t in tasks}
    added: list[str] = []
    for g in gaps:
        title = g.strip()
        tid = stable_gap_id(title)
        if tid in existing_ids or title in existing_titles:
            continue
        tasks.append(
            {
                "id": tid,
                "title": title,
                "status": "pending",
                "passes": False,
                "acceptanceCriteria": [f"Resolve GAP/FAIL: {title}"],
                "notes": f"added by --converge from qa-report.md {utc_now()}",
            }
        )
        existing_ids.add(tid)
        existing_titles.add(title)
        added.append(tid)
    if added:
        data["status"] = "in_progress"
        data["completeEpic"] = False
        data["persona"] = "planning"
        data["lastUpdated"] = utc_now()
        # Never set passes on any task
        STATUS.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"gaps added: {added or 'none'}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("feature_dir", nargs="?", help="Path under specs/")
    parser.add_argument("--converge", action="store_true", help="Fold qa-report GAP/FAIL into tasks")
    args = parser.parse_args(argv)
    if args.converge:
        if args.feature_dir:
            die("--converge does not take FEATURE_DIR")
        converge()
    elif args.feature_dir:
        convert(args.feature_dir)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
