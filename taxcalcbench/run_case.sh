#!/usr/bin/env bash
# Usage: ./run_case.sh <case_dir>
# Runs a benchmark case through the tax binary, saves output to expected.json
set -euo pipefail

CASE_DIR="${1:?Usage: $0 <case_dir>}"
TAX_DIR="$(cd "$(dirname "$0")/.." && pwd)"
tax() { deno run --allow-read --allow-write "$TAX_DIR/cli/main.ts" "$@"; }
INPUT="$CASE_DIR/input.json"

if [[ ! -f "$INPUT" ]]; then
  echo "Error: $INPUT not found" >&2
  exit 1
fi

YEAR=$(jq -r '.year' "$INPUT")
SCENARIO=$(jq -r '.scenario' "$INPUT")
echo "Running: $(basename "$CASE_DIR")"
echo "  Scenario: $SCENARIO"

# Create the return
RETURN_ID=$(tax return create --year "$YEAR" --json | jq -r '.returnId')
echo "  Created return: $RETURN_ID"

# Add each form entry
FORM_COUNT=$(jq '.forms | length' "$INPUT")
for i in $(seq 0 $((FORM_COUNT - 1))); do
  NODE_TYPE=$(jq -r ".forms[$i].node_type" "$INPUT")
  DATA=$(jq -c ".forms[$i].data" "$INPUT")
  echo "  Adding: $NODE_TYPE"
  tax form add --returnId "$RETURN_ID" --node_type "$NODE_TYPE" "$DATA" --json > /dev/null
done

# Compute and save expected output
echo "  Computing result..."
tax return get --returnId "$RETURN_ID" --json > "$CASE_DIR/expected.json"
echo "  Saved: $CASE_DIR/expected.json"

# Show summary
jq '.summary' "$CASE_DIR/expected.json"
