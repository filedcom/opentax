# TY2026 interest income: 1099-INT to the return

Source: pinned [2026 draft Schedule B](corpus/draft/f1040sb.pdf) and its
[August 2026 draft instructions](corpus/draft/i1040sb.pdf). The instruction
PDF is recorded by URL, byte count, SHA-256, and retrieval time in
`corpus/manifest.json`. Recheck the final instructions and MeF v4 or later
before calling this an accepted return path.

## Calculation and attachment contract

| Source fact or election | Existing route | TY2026 work to complete |
| --- | --- | --- |
| 1099-INT boxes 1, 3, 10, taxable bond premium election, nominee/accrued-interest/OID adjustments | `f1099int` → `schedule_b` → AGI line 2b and 1040 line 2b | The source emits gross payer and labeled adjustment data; the 2026 Schedule B node reconciles it. Its draft PDF fills the printed schedule and continuation pages. Finish MeF and the public input route for filing and disclosures. |
| Box 8 less box 13 tax-exempt bond premium | `f1099int` → 1040 line 2a and AGI Social Security worksheet input | Verify gross and net tax-exempt amounts and any 1099-OID or 1099-DIV contributions before calculating Social Security taxability. |
| Box 2 early-withdrawal penalty | `f1099int` → Schedule 1 line 18 and AGI adjustments | Both destinations now receive box 2; test line 10, AGI, tax, and printed Schedule 1 in the registered graph. |
| Box 4 federal withholding | `f1099int` → 1040 line 25b | Reconcile all 1099 withholding, line 25d, and refund or balance. |
| Box 9 private-activity bond interest | `f1099int` → Form 6251 line 2g; Form 4952 when investment property is affirmed | Audit 2026 AMT fields, source restrictions, and tax feedback before registering this route. |
| Box 6 foreign tax | `f1099int` → Form 1116 with verified foreign-source interest and IRS country code | Finish 2026 credit, Schedule 3, and 1040 line 20; map the attachment to the selected MeF schema. |
| Affirmed investment-property interest | `f1099int` → Form 4952 | Finish 2026 investment-interest limitation, Schedule A deduction, and NIIT expense interactions. |
| Taxable interest as investment income | `schedule_b` → Form 8960 → 2026 Schedule 2 line 6 → 1040 line 23 | The Form 8960 line-6 route is registered and tested. Verify above-threshold interest returns from source facts and the Form 8960 attachment. |

The [2026 draft instructions](corpus/draft/i1040sb.pdf) require Schedule B
for interest or dividends over $1,500 and for several other cases, including
seller-financed mortgage interest, nominee or accrued-interest adjustments,
amortizable bond premium, savings-bond exclusion, and foreign accounts or
trusts. Part III must be answered when its conditions apply. The current
TY2025 `schedule_b` node calculates interest totals but lacks Part III and
separate adjustment rows. The dedicated TY2026 node now accepts those facts,
determines the modeled filing triggers, and emits separate adjustment rows.
It is registered, but there is no product input path for 1099-INT or Schedule B
disclosures yet. A temporary test graph proves wages plus interest through
AGI, NIIT, Schedule 2, and Form 1040. The TY2026 public input must wait until
the remaining Form 6251, Form 1116, Form 4952, disclosure, and attachment
branches cannot silently strand data.

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
