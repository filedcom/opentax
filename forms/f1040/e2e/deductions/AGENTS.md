# e2e/deductions

Whole-graph contracts for deduction forms: inputs run through
`buildExecutionPlan` + `execute` with the TY2025 `registry`, then lines are
checked. Section map:
[../../nodes/inputs/deductions/AGENTS.md](../../nodes/inputs/deductions/AGENTS.md).

## Files

- `additional/qualified_tips.test.ts` — Schedule 1-A qualified tips.
- `itemized/additional_deductions.test.ts` — also Schedule 1-A (DOB-derived
  senior deduction, overtime and vehicle interest to taxable income), not
  Schedule A, despite the folder.
- `business/form8829/form8829_rented_home.test.ts` — `form_8829` runs before
  `schedule_c` without a cycle and reaches SE, QBI, AGI and Form 1040; mismatches
  fail closed.
- `investments/form4952/` — direct debt, election, 1099-MISC royalty and prior
  carryforward routes; `form4952_direct_debt.test.ts` uses the Form 1098 lender
  copy fixture from `../../2025/pdf/reviews/deductions/mortgage/`.

No e2e coverage here for Schedule A itself, Forms 1098, 8283, 4684, 4562,
8990, 8995/8995-A; their whole-return tests are in
`../../2025/domains/deductions/` and `../../2025/pdf/reviews/deductions/`.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/e2e/deductions/`
