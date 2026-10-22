"""Unit tests for .specify/scripts/speckit-to-ralph.py

Why these tests exist:
- Prove the converter seeds Roy's Ralph pack schema when no ralph/ exists.
- Prove refusals for unmapped FR, in-flight epic, unticked checklist, missing/
  CRITICAL analyze-report, and path escape outside specs/.
- Prove --converge dedupes and never sets passes:true.
- All filesystem work uses TemporaryDirectory — never the repo ralph/ folder.
"""
from __future__ import annotations

import importlib.util
import json
import os
import shutil
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "speckit-to-ralph.py"


def load_module():
    spec = importlib.util.spec_from_file_location("speckit_to_ralph", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


GOOD_SPEC = textwrap.dedent(
    """\
    # Example feature

    ## Requirements
    **FR-001**: User can list vehicles.
    **FR-002**: User can add a vehicle.
    """
)

GOOD_PLAN = "# Plan\n\nImplement list and add.\n"

GOOD_TASKS = textwrap.dedent(
    """\
    # Tasks
    - [ ] T001 [P] Scaffold list route (FR-001)
    - [ ] T002 Add vehicle form (FR-002)
    """
)

GOOD_ANALYZE = "# Analyze\n\nNo blocking findings.\nSeverity: INFO only.\n"

GOOD_CHECKLIST = textwrap.dedent(
    """\
    # Checklist
    - [x] Spec complete
    - [x] Tasks map to FRs
    """
)


class ConverterTestCase(unittest.TestCase):
    def setUp(self):
        self._orig_cwd = os.getcwd()
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.specs = self.root / "specs" / "000-example-list-add"
        self.specs.mkdir(parents=True)
        (self.specs / "spec.md").write_text(GOOD_SPEC)
        (self.specs / "plan.md").write_text(GOOD_PLAN)
        (self.specs / "tasks.md").write_text(GOOD_TASKS)
        (self.specs / "analyze-report.md").write_text(GOOD_ANALYZE)
        (self.specs / "checklists").mkdir()
        (self.specs / "checklists" / "req.md").write_text(GOOD_CHECKLIST)
        os.chdir(self.root)
        # Reload module so ROOT/SPECS/RALPH bind to temp cwd
        if "speckit_to_ralph" in sys.modules:
            del sys.modules["speckit_to_ralph"]
        self.mod = load_module()

    def tearDown(self):
        os.chdir(self._orig_cwd)
        self.tmp.cleanup()

    def test_creates_full_pack_when_no_ralph(self):
        """Why: positive handoff path must seed Roy schema with passes:false."""
        self.mod.convert(str(self.specs))
        ralph = self.root / "ralph"
        for name in (
            "epic.md",
            "requirements.md",
            "AGENT.md",
            "PROMPT_planning.md",
            "PROMPT_dev.md",
            "PROMPT_qa.md",
            "PROMPT_release.md",
            "qa-report.md",
            "task_status.json",
        ):
            self.assertTrue((ralph / name).is_file(), name)
        self.assertTrue((ralph / "specs").is_dir())
        data = json.loads((ralph / "task_status.json").read_text())
        self.assertFalse(data["completeEpic"])
        self.assertEqual(data["status"], "in_progress")
        self.assertEqual(data["loop"], 0)
        self.assertEqual(data["persona"], "planning")
        self.assertIsNone(data["selected"])
        self.assertTrue(data["tasks"])
        self.assertTrue(all(t["passes"] is False for t in data["tasks"]))
        agent = (ralph / "AGENT.md").read_text()
        self.assertIn("Only QA", agent)
        self.assertIn("completeEpic", agent)
        self.assertIn("CI-skip", agent)

    def test_refuses_unmapped_fr(self):
        """Why: every FR must map to >=1 task."""
        (self.specs / "tasks.md").write_text("- [ ] T001 only FR-001 (FR-001)\n")
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)
        self.assertFalse((self.root / "ralph" / "task_status.json").exists())

    def test_refuses_in_flight_epic(self):
        """Why: never overwrite an in-flight task-status (use temp ralph/, not repo)."""
        self.mod.convert(str(self.specs))
        # Second convert while in flight must refuse with no overwrite of tasks count
        before = (self.root / "ralph" / "task_status.json").read_text()
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)
        self.assertEqual((self.root / "ralph" / "task_status.json").read_text(), before)

    def test_refuses_unticked_checklist(self):
        """Why: checklist gate must block handoff."""
        (self.specs / "checklists" / "req.md").write_text("- [ ] Spec complete\n")
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)
        self.assertFalse((self.root / "ralph").exists())

    def test_refuses_missing_analyze_report(self):
        """Why: analyze-report convention is enforced in code."""
        (self.specs / "analyze-report.md").unlink()
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)

    def test_refuses_critical_in_analyze(self):
        """Why: CRITICAL: prefix findings must stop handoff."""
        (self.specs / "analyze-report.md").write_text("CRITICAL: conflict between FR-001 and plan\n")
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)

    def test_refuses_stock_analyze_table_critical(self):
        """Why: Iris C — stock /speckit.analyze puts severity in a table cell, not CRITICAL:."""
        stock = textwrap.dedent(
            """\
            # Specification Analysis Report

            | ID | Category | Severity | Location | Summary | Recommendation |
            |----|----------|----------|----------|---------|----------------|
            | C1 | Constitution | CRITICAL | spec.md | Conflicts with security-first principle | Adjust spec |
            | I1 | Underspecification | LOW | plan.md | Missing edge case note | Clarify |

            ## Summary
            - Total Findings: 2
            - Critical Issues Count: 1
            - Ready for implementation: NO
            """
        )
        (self.specs / "analyze-report.md").write_text(stock)
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)
        self.assertFalse((self.root / "ralph" / "task_status.json").exists())

    def test_refuses_critical_issues_count_only(self):
        """Why: Critical Issues Count >= 1 must refuse even without a table row."""
        (self.specs / "analyze-report.md").write_text(
            "# Analysis\n\nCritical Issues Count: 2\nReady for implementation: NO\n"
        )
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(self.specs))
        self.assertNotEqual(cm.exception.code, 0)

    def test_allows_clean_stock_analyze_report(self):
        """Why: a clean stock-format report (zero CRITICAL) must still hand off."""
        clean = textwrap.dedent(
            """\
            # Specification Analysis Report

            | ID | Category | Severity | Location | Summary | Recommendation |
            |----|----------|----------|----------|---------|----------------|
            | I1 | Underspecification | LOW | plan.md | Minor note | Optional |

            ## Summary
            - Total Findings: 1
            - Critical Issues Count: 0
            - Ready for implementation: YES

            No critical issues found.
            """
        )
        (self.specs / "analyze-report.md").write_text(clean)
        self.mod.convert(str(self.specs))
        data = json.loads((self.root / "ralph" / "task_status.json").read_text())
        self.assertFalse(data["completeEpic"])
        self.assertTrue(all(t["passes"] is False for t in data["tasks"]))

    def test_refuses_path_outside_specs(self):
        """Why: FEATURE_DIR path confinement to specs/."""
        outside = self.root / "not-specs" / "feat"
        outside.mkdir(parents=True)
        with self.assertRaises(SystemExit) as cm:
            self.mod.convert(str(outside))
        self.assertNotEqual(cm.exception.code, 0)

    def test_converge_adds_and_dedupes(self):
        """Why: converge must append GAP/FAIL once only and never set passes."""
        self.mod.convert(str(self.specs))
        qa = self.root / "ralph" / "qa-report.md"
        qa.write_text("# QA\n\n- GAP: Missing empty state\n- FAIL: Broken link\n")
        self.mod.converge()
        data = json.loads((self.root / "ralph" / "task_status.json").read_text())
        gap_ids = [t["id"] for t in data["tasks"] if str(t["id"]).startswith("gap-")]
        self.assertEqual(len(gap_ids), 2)
        self.assertTrue(all(t["passes"] is False for t in data["tasks"]))
        # Second converge: no duplicates
        self.mod.converge()
        data2 = json.loads((self.root / "ralph" / "task_status.json").read_text())
        gap_ids2 = [t["id"] for t in data2["tasks"] if str(t["id"]).startswith("gap-")]
        self.assertEqual(gap_ids2, gap_ids)

    def test_no_shell_true_or_eval_in_source(self):
        """Why: supply-chain / safety review for E gate."""
        src = SCRIPT.read_text()
        # Ignore the module docstring; forbid real dangerous call sites.
        body = src.split('"""', 2)[-1] if src.count('"""') >= 2 else src
        self.assertNotIn("shell=True", body)
        self.assertNotIn("eval(", body)
        self.assertNotIn("exec(", body)
        self.assertNotIn("subprocess", body)


if __name__ == "__main__":
    unittest.main()
