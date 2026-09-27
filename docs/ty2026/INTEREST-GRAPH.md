# TY2026 interest income: 1099-INT/OID to the return

Source: pinned [2026 draft Schedule B](corpus/draft/f1040sb.pdf) and its
[August 2026 draft instructions](corpus/draft/i1040sb.pdf). The instruction
PDF is recorded by URL, byte count, SHA-256, and retrieval time in
`corpus/manifest.json`. Recheck the final instructions and MeF v4 or later
before calling this an accepted return path.

## Calculation and attachment contract

| Source fact or election | Existing route | TY2026 work to complete |
| --- | --- | --- |
| 1099-INT boxes 1, 3, 10, taxable bond premium election, nominee/accrued-interest/OID adjustments | `f1099int` → `schedule_b` → AGI line 2b and 1040 line 2b | The source emits gross payer and labeled adjustment data; the 2026 Schedule B node reconciles it. Its draft PDF fills the printed schedule and continuation pages. The public input now accepts these facts and Part III disclosure answers; MeF remains. |
| Box 8 less box 13 tax-exempt bond premium | `f1099int` → 1040 line 2a and AGI Social Security worksheet input | 1099-DIV box 12 accumulates with this amount; SSA/RRB benefits now use it in the registered 2026 taxability calculation. 1099-OID remains. |
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

## Form 1099-OID source boundary

The IRS [current Form 1099-OID](corpus/authorities/f1099oid--2024.pdf)
and [combined 1099-INT/OID instructions](corpus/authorities/i1099int--2024.pdf)
are January 2024 continuous-use revisions; the matching [Form 1099-INT](corpus/authorities/f1099int--2024.pdf)
is pinned too. Their hashes are in the manifest. A form's reporting threshold
does not decide whether accrued OID is taxable. Preserve payer, account,
recipient, instrument/CUSIP, covered status, acquisition/disposition dates,
issue terms, prior-year basis and election history; reconcile a 1099-INT
and 1099-OID for the same instrument without doubling stated interest.

| OID source | Required 2026 handoff |
| --- | --- |
| Boxes 1 and 8, box 6 acquisition premium | Calculate taxable OID by instrument/year and premium method. Box 8 Treasury OID can be **negative** for TIPS deflation; do not constrain it to nonnegative or clamp the net at zero before reconciling the obligation. A covered-security form can report OID **already net** of acquisition premium or report gross OID and a separate box 6 amount; subtracting box 6 in both cases duplicates the adjustment. Send federal taxable amount to Schedule B/1040 line 2b, with Treasury state exemption preserved separately. Adjust basis to prevent the accrued OID from being taxed again on sale. |
| Box 2 stated interest and box 10 bond premium | Box 2 is separate from OID, can instead appear on 1099-INT, and may be tax exempt when paired with box 11. Apply box 10 premium to the correct interest under the instrument/election and reporting method; it does not mechanically reduce Treasury OID box 8. Route taxable stated interest to Schedule B once. |
| Box 3 penalty; box 4 federal withholding | Route the penalty to 2026 Schedule 1 line 18 and AGI; preserve the gross interest before the penalty. Reconcile box 4 once to 1040 line 25b. |
| Box 5 market discount; box 7 instrument | Determine elected current inclusion versus ordinary income on disposition, and reconcile broker proceeds/basis and Form 8949/Schedule D. Do not treat box 5 as merely informational for every holder. |
| Box 9 REMIC investment expenses | The current IRS instructions say the amount is **not deductible**; retain it for source disclosure and do not feed Schedule A or Form 4952 as an expense. |
| Box 11 tax-exempt OID; boxes 12–14 state data | Route tax-exempt OID to 1040 line 2a and the Social Security taxability worksheet. Only the **specified private-activity-bond portion** is an AMT preference for Form 6251 line 2g, after bond-type and adjustment evidence; box 11 alone does not establish it. State withholding is box **14**, while 12 is state name and 13 state payer ID. Preserve separate states and FATCA flag. |

The shared [`f1099oid` node](../../forms/f1040/nodes/inputs/f1099oid/index.ts)
is **not registered** in the focused TY2026 graph. It accepts only
nonnegative box 8, always subtracts box 6 from box 1, subtracts box 10
from box 8, routes **all** box 11 tax-exempt OID to Form 6251, does not
send box 11 to 1040 line 2a/SSA, ignores box 3, box 5 and box 9,
and mislabels box 12 as state tax. The shared `schedule_b` route has no
instrument-level basis or cash/accrual reconciliation. Register this input
only after the correct source classification, Schedule B, Schedule 1,
AMT, Form 4952, withholding, PDF and selected current MeF paths are wired.
Tests need net-versus-gross box 6, negative TIPS box 8, Treasury premium,
tax-exempt non-PAB versus PAB OID, early penalty, nominee interest,
market-discount election and a later bond sale with basis adjusted for
prior-year OID.

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
