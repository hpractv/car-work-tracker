#!/usr/bin/env bash
# Guard: fail if Spec Kit implement/converge lost the Ralph handoff override,
# if the converter is missing/duplicated, or if a second preset SOURCE copy exists.
# Wired into .github/workflows/ci.yml.
set -euo pipefail

rc=0
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"

echo "check-ralph-handoff: repo root=$root"

for s in implement converge; do
  f=".cursor/skills/speckit-${s}/SKILL.md"
  if [[ ! -f "$f" ]]; then
    echo "FAIL: missing $f" >&2
    rc=1
    continue
  fi
  if ! grep -q "RALPH-HANDOFF-PRESET" "$f"; then
    echo "FAIL: $f lacks RALPH-HANDOFF-PRESET marker. Reinstall: specify preset add --dev .specify/presets-src/ralph-handoff" >&2
    rc=1
  fi
done

# Exactly one converter
mapfile -t converters < <(find . -path ./.git -prune -o -name 'speckit-to-ralph.py' -print 2>/dev/null | sed 's|^\./||' | sort)
if [[ ${#converters[@]} -eq 0 ]]; then
  echo "FAIL: converter .specify/scripts/speckit-to-ralph.py is missing" >&2
  rc=1
elif [[ ${#converters[@]} -ne 1 ]]; then
  echo "FAIL: converter duplicated:" >&2
  printf '  %s\n' "${converters[@]}" >&2
  rc=1
elif [[ "${converters[0]}" != ".specify/scripts/speckit-to-ralph.py" ]]; then
  echo "FAIL: converter must live at .specify/scripts/speckit-to-ralph.py (found ${converters[0]})" >&2
  rc=1
fi

# Exactly one preset SOURCE tree (presets-src). Generated .specify/presets/ralph-handoff is allowed.
if [[ ! -d .specify/presets-src/ralph-handoff ]]; then
  echo "FAIL: missing preset source .specify/presets-src/ralph-handoff" >&2
  rc=1
fi
if [[ -d .specify/ralph-handoff-preset ]]; then
  echo "FAIL: duplicate preset source .specify/ralph-handoff-preset (use presets-src only)" >&2
  rc=1
fi
# Any other ralph-handoff dirs under .specify besides presets-src and presets
mapfile -t extras < <(find .specify -type d -name 'ralph-handoff' 2>/dev/null | sed 's|^\./||' | sort)
for d in "${extras[@]:-}"; do
  case "$d" in
    .specify/presets-src/ralph-handoff|.specify/presets/ralph-handoff) ;;
    *)
      echo "FAIL: unexpected ralph-handoff directory: $d" >&2
      rc=1
      ;;
  esac
done

# Source and installed preset trees must stay byte-identical (Iris D8 drift).
if [[ -d .specify/presets-src/ralph-handoff && -d .specify/presets/ralph-handoff ]]; then
  if ! diff -rq .specify/presets-src/ralph-handoff .specify/presets/ralph-handoff >/dev/null; then
    echo "FAIL: presets-src/ralph-handoff and presets/ralph-handoff differ:" >&2
    diff -r .specify/presets-src/ralph-handoff .specify/presets/ralph-handoff >&2 || true
    echo "Re-sync: specify preset add --dev .specify/presets-src/ralph-handoff (or copy src → presets)" >&2
    rc=1
  fi
fi

if [[ $rc -eq 0 ]]; then
  echo "OK: Ralph handoff override present; single converter; single preset source; src==installed"
fi
exit "$rc"
