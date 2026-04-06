#!/usr/bin/env bash
# Usage: ./run_all.sh
# Runs all benchmark cases and generates expected.json for each
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASES_DIR="$SCRIPT_DIR/cases"
PASS=0
FAIL=0

echo "Running all 20 benchmark cases..."
echo "=================================="

for case_dir in "$CASES_DIR"/*/; do
  if [[ -f "$case_dir/input.json" ]]; then
    if "$SCRIPT_DIR/run_case.sh" "$case_dir" 2>&1; then
      PASS=$((PASS + 1))
    else
      echo "  FAILED: $case_dir" >&2
      FAIL=$((FAIL + 1))
    fi
    echo ""
  fi
done

echo "=================================="
echo "Results: $PASS passed, $FAIL failed"
