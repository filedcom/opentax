#!/usr/bin/env bash
# run_benchmark.sh — Run all cases through ./tax and compare to correct values
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAX="$SCRIPT_DIR/../tax"
CASES_DIR="$SCRIPT_DIR/cases"

PASS=0; FAIL=0; TOTAL=0

# ANSI colours
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; RST='\033[0m'

# Header
printf "\n%-30s %12s %12s %12s %12s %12s %12s\n" \
  "Case" "AGI" "Taxable" "TotalTax" "Payments" "Refund" "Owed"
printf '%s\n' "$(printf '%-30s %12s %12s %12s %12s %12s %12s\n' \
  "------------------------------" "------------" "------------" \
  "------------" "------------" "------------" "------------")"

for case_dir in "$CASES_DIR"/*/; do
  name=$(basename "$case_dir")
  input="$case_dir/input.json"
  correct_file="$case_dir/correct.json"
  [[ -f "$input" && -f "$correct_file" ]] || continue

  TOTAL=$((TOTAL + 1))

  YEAR=$(jq -r '.year' "$input")
  RID=$("$TAX" return create --year "$YEAR" --json | jq -r '.returnId')

  FORM_COUNT=$(jq '.forms | length' "$input")
  for i in $(seq 0 $((FORM_COUNT - 1))); do
    NT=$(jq -r ".forms[$i].node_type" "$input")
    DATA=$(jq -c ".forms[$i].data" "$input")
    "$TAX" form add --returnId "$RID" --node_type "$NT" "$DATA" --json > /dev/null
  done

  engine=$(  "$TAX" return get --returnId "$RID" --json)
  # Arrays occur when multiple nodes write the same field; take first element
  scalar() { echo "$1" | jq -r 'if type=="array" then .[0] else . end // 0'; }
  eng_agi=$( scalar "$(echo "$engine" | jq '.lines.line11_agi // .summary.line11_agi // 0')")
  eng_ti=$(  scalar "$(echo "$engine" | jq '.lines.line15_taxable_income // .summary.line15_taxable_income // 0')")
  eng_tax=$( scalar "$(echo "$engine" | jq '.lines.line24_total_tax // .summary.line24_total_tax // 0')")
  eng_pay=$( scalar "$(echo "$engine" | jq '.lines.line33_total_payments // .summary.line33_total_payments // 0')")
  eng_ref=$( scalar "$(echo "$engine" | jq '.summary.line35a_refund // 0')")
  eng_owe=$( scalar "$(echo "$engine" | jq '.summary.line37_amount_owed // 0')")

  cor_agi=$( jq -r '.correct.line11_agi'            "$correct_file")
  cor_ti=$(  jq -r '.correct.line15_taxable_income'  "$correct_file")
  cor_tax=$( jq -r '.correct.line24_total_tax'       "$correct_file")
  cor_pay=$( jq -r '.correct.line33_total_payments'  "$correct_file")
  cor_ref=$( jq -r '.correct.line35a_refund'         "$correct_file")
  cor_owe=$( jq -r '.correct.line37_amount_owed'     "$correct_file")

  # Compare helper: return coloured engine value or diff
  fmt_cell() {
    local eng=$1 cor=$2
    diff=$(python3 -c "print(abs($eng - $cor))")
    if python3 -c "exit(0 if abs($eng - $cor) <= 5 else 1)"; then
      printf "${GRN}%12.0f${RST}" "$eng"
    else
      printf "${RED}%12.0f${RST}" "$eng"
    fi
  }

  # Determine overall pass/fail (tax and refund/owed within $5)
  ok=$(python3 -c "
t = abs($eng_tax - $cor_tax) <= 5
r = abs($eng_ref - $cor_ref) <= 5
o = abs($eng_owe - $cor_owe) <= 5
print('1' if t and r and o else '0')
")
  if [[ "$ok" == "1" ]]; then
    PASS=$((PASS + 1))
    status="${GRN}PASS${RST}"
  else
    FAIL=$((FAIL + 1))
    status="${RED}FAIL${RST}"
  fi

  printf "%-30s" "$name"
  fmt_cell "$eng_agi"  "$cor_agi"
  fmt_cell "$eng_ti"   "$cor_ti"
  fmt_cell "$eng_tax"  "$cor_tax"
  fmt_cell "$eng_pay"  "$cor_pay"
  fmt_cell "$eng_ref"  "$cor_ref"
  fmt_cell "$eng_owe"  "$cor_owe"
  printf "  %b\n" "$status"
done

printf '\n%s\n' "────────────────────────────────────────────────────────────────"
printf "Results: %b%d PASS%b  %b%d FAIL%b  out of %d cases\n" \
  "$GRN" "$PASS" "$RST" "$RED" "$FAIL" "$RST" "$TOTAL"
printf '%s\n\n' "Green = within \$5 of correct value.  Red = engine differs from expected."
