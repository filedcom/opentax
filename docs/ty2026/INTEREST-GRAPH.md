# TY2026 interest income: 1099-INT to the return

Source: pinned [2026 draft Schedule B](corpus/draft/f1040sb.pdf) and its
[August 2026 draft instructions](corpus/draft/i1040sb.pdf). The instruction
PDF is recorded by URL, byte count, SHA-256, and retrieval time in
`corpus/manifest.json`. Recheck the final instructions and MeF v4 or later
before calling this an accepted return path.

## Calculation and attachment contract

| Source fact or election | Existing route | TY2026 work to complete |
| --- | --- | --- |
| 1099-INT boxes 1, 3, 10, taxable bond premium election, nominee/accrued-interest/OID adjustments | `f1099int` → `schedule_b` → AGI line 2b and 1040 line 2b | The source emits gross payer and labeled adjustment data; the 2026 Schedule B node reconciles it. Its draft PDF fills the printed schedule and continuation pages. The public input now accepts these facts and Part III disclosure answers; MeF remains. |
| Box 8 less box 13 tax-exempt bond premium | `f1099int` → 1040 line 2a and AGI Social Security worksheet input | 1099-DIV box 12 now accumulates with this amount in the registered 2026 graph; 1099-OID and public SSA-1099 routes remain. |
| Box 2 early-withdrawal penalty | `f1099int` → Schedule 1 line 18 and AGI adjustments | A registered graph now reaches 1040 line 10 and AGI; its five-page 1040/Schedule 1/Schedule B PDF passes. MeF remains open. |
| Box 4 federal withholding | `f1099int` → 1040 line 25b | Reconcile all 1099 withholding, line 25d, and refund or balance. |
| Box 9 private-activity bond interest | `f1099int` → Form 6251 line 2g; Form 4952 when investment property is affirmed | The registered source reaches Form 6251, Schedule 2, Form 1040, and a six-page PDF when AMT is due. The Form 4952 branch still fails explicitly. |
| Box 6 foreign tax | `f1099int` → Form 1116 with verified foreign-source interest and IRS country code | TY2026 public input emits a diagnostic before routing this branch. Finish 2026 credit, Schedule 3, and 1040 line 20; map the attachment to the selected MeF schema. |
| Affirmed investment-property interest | `f1099int` → Form 4952 | TY2026 public input emits a diagnostic before routing this branch. Finish 2026 investment-interest limitation, Schedule A deduction, and NIIT expense interactions. |
| Taxable interest as investment income | `schedule_b` → Form 8960 → 2026 Schedule 2 line 6 → 1040 line 23 | The Form 8960 line-6 route is registered and tested. Verify above-threshold interest returns from source facts and the Form 8960 attachment. |

The [2026 draft instructions](corpus/draft/i1040sb.pdf) require Schedule B
for interest or dividends over $1,500 and for several other cases, including
seller-financed mortgage interest, nominee or accrued-interest adjustments,
amortizable bond premium, savings-bond exclusion, and foreign accounts or
trusts. Part III must be answered when its conditions apply. The current
TY2025 `schedule_b` node calculates interest totals but lacks Part III and
separate adjustment rows. The dedicated TY2026 node now accepts those facts,
determines the modeled filing triggers, and emits separate adjustment rows.
It is registered, and TY2026 now exposes 1099-INT and Schedule B Part III
answers in the input surface. A registered graph proves interest, early
withdrawal, withholding, AGI, and the combined PDF. Foreign tax and
investment-property cases fail explicitly before routing. Treasury bond
premium requires an affirmed amortization election for TY2026 so the shared
source cannot silently deduct it. Private-activity-bond interest uses the
registered Form 6251 route, verified from 1099-INT through Schedule 2,
Form 1040, and the draft PDF.
The full MeF, Form 1116, and Form 4952 paths remain.

## Implementation sequence

1. Add TY2026 Schedule B input facts for foreign accounts/trusts, seller
   financing, and adjustment disclosures. Define a filing decision from the
   draft instruction triggers. Make the existing Schedule B calculator emit
   complete row/detail data or a clear diagnostic for an unsupported case.
2. Audit and register `f1099int`, `schedule_b`, Schedule 1, Form 6251,
   Form 1116, and Form 4952 with the required 2026 routes. Reconcile each
   source amount to AGI, the final 1040, and Form 8960; handle multiple
   payers and withholding accumulation.
3. Build 2026 Schedule 1, Form 6251, Form 1116, Form 4952, and
   Form 8960 PDF descriptors from their pinned drafts. Check whether each
   attachment is actually filed, render sample pages, and inspect disclosure
   text and Part III checkboxes.
4. Map the same outputs to the selected current 2026 MeF package. Validate
   base interest, nominee/bond-premium, PAB/AMT, foreign-tax, NIIT, and
   foreign-account cases against its XSD and applicable business rules. Add
   TY2025 regression fixtures for shared-node changes.
