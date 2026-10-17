# docs/ty2025/domains/deductions

TY2025 research for deduction forms: coverage gaps (what is deliberately
blocked), source proofs and checkpoints. Code is in `forms/f1040/`; section
map: [../../../../forms/f1040/nodes/inputs/deductions/AGENTS.md](../../../../forms/f1040/nodes/inputs/deductions/AGENTS.md).

## Folders

- `additional/` — Schedule 1-A bounded filing paths.
- `business/` — cross-form QBI reviews (owned aggregation disclosure, owned
  optional farm, business tips, RPE aggregation checkpoint); `form4562/`,
  `form8829/`, `form8990/` coverage gaps (8990 filing deliberately blocked);
  `form8995/` holds Form 8995 and all `ty2025-form8995a-*` notes.
- `charitable/form8283/` — carryover, FMV-reduction, PDF and vehicle gaps;
  depreciation, natural-resource and donee-disposition proofs.
- `investments/form4952/` — royalty boundary, K-1 code B, PAB AMT, Schedule J
  child, MFJ spouse royalty, Treasury dividend slices.
- `itemized/` — Schedule A PDF field audit. No note for Form 4684.
- `mortgage/form1098/` — refinance, points, payoff/advance, mixed-use and
  mid-month source routes.

## Conventions here

- Gap notes for Forms 4562, 8990 and 8995 positive export carry a `Status:`
  line; keep it in step with the code (e.g. 8990 "remains unfileable").

## Verify

- Notes are not executed; run any test a note cites, e.g.
  `bun test --timeout=1800000 ./forms/f1040/2025/domains/deductions/mortgage/f1098/`.
