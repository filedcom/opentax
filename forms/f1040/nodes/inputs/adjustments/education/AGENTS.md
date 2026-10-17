# Adjustments — education inputs

Three education entries; their only targets are `schedule1` and
`agi_aggregator`. Section map: [../AGENTS.md](../AGENTS.md).

| Node | IRS basis | Writes |
| --- | --- | --- |
| [`educator_expenses`](educator_expenses/index.ts) | Sch 1 line 11, IRC §62(a)(2)(D) | `line11_educator_expenses` → `schedule1` and `agi_aggregator` |
| [`f1098e`](f1098e/index.ts) | Form 1098-E, Sch 1 line 21, IRC §221 | `line21_student_loan_interest` → `agi_aggregator` only |
| [`f8917`](f8917/index.ts) | Form 8917, IRC §222 (repealed after 2020) | nothing; `compute()` throws |

## Flow and ordering

- `f1098e` caps box 1 plus ledger interest at $2,500; `computeAdjustedSli` in
  [agi_aggregator](../../../intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts)
  phases it out on AGI before line 21 (`cfg.sliPhaseOut*`, MFS → 0) and
  alone writes the allowed amount to `schedule1`.
- Both builders re-check it with `assert1098EInterestSource`
  ([dom/education/f1098e](../../../../2025/domains/adjustments/education/f1098e/f1098e_source_reconciliation.ts)):
  line 21 without retained source, above it, or a ledger overlapping an
  issued lender copy fails export.

## Traps

- `f1098e` takes two CLI shapes: `f1098e` items (`f1098es`) and
  `student_loan_interest_records` (`unreported_interest_records`: each record
  under $600, borrower TIN equal to student TIN, payment rows summing to
  `interest_paid` with distinct `source_reference`). At least one is
  required. Box 2 changes nothing. A `corrected: true` copy needs distinct
  current/original references and `correction_review_reference`.
- `educator_expenses` needs `filing_status` in its own input; no node
  routes it there. Without `mfj` educator 2 is dropped. Professional
  development counts inside the $300 per-educator cap; hours under 900 zero
  that educator (absent hours are treated as eligible).
- `f8917` parses, then throws; MeF counterpart is rule `F8917-014`
  ([rules](../../../../validation/rules/adjustments/education/f8917.ts)).

## Verify

- `bun test --timeout=1800000 forms/f1040/nodes/inputs/adjustments/education forms/f1040/2025/domains/adjustments/education`
- `bun run bench --form f1040 --year 2025` (cases 08, 23, 37, 41).
