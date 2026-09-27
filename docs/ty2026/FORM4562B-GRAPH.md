# TY2026 Form 4562-B amortization contract

Depreciable assets and section 179 elections remain on
[Form 4562](FORM4562-GRAPH.md); reconcile asset basis and activity expense
between the two attachments before routing either deduction downstream.

Source: pinned [December 2026 draft Form 4562-B](corpus/draft/f4562b.pdf),
SHA-256 `16c23110b7ad4483b47f20269807566177881234b0fd9b7679cd648a169f7bf6`,
retrieved 2026-09-27 from the IRS draft directory. The [2026 Schedule E](corpus/draft/i1040se.pdf)
and [Schedule F](corpus/draft/i1040sf.pdf) instructions explicitly direct
2026 amortization to Form 4562-B, which replaces Form 4562 Part VI. The
current draft directory does not provide a verified 2026 Form 4562-B
instruction booklet. Do not infer amortization periods or elections from the
blank form or TY2025 code.

## Form fields and graph contract

| Printed field | Required source and calculation |
| --- | --- |
| Header | Return owner name/ID and the business or activity to which this form relates. Tie the attachment to a Schedule C, E, F, or other supported source activity by stable ID. Separate owner/activity forms when required by current instructions and MeF. |
| Line 1(a)–(e) | For each cost beginning amortization in 2026: allowed cost description, begin date, amortizable basis, applicable Code section, and period or percentage. Keep the acquisition/payment/placed-in-service evidence and election record; do not replace the row with a total. |
| Line 1(f) | 2026 amortization for each row, calculated using that asset's source-backed rule and dates. Sum after per-row rounding according to final instructions. |
| Line 2 | Amortization on costs that began before 2026, carried from each asset's prior-year basis and accumulated deductions. Reconcile opening balances to TY2025 evidence. |
| Line 3 | Sum line 1(f) and line 2; route each activity's supported amount into its expense destination exactly once. Schedule E and F need explicit links; other business sources need their own audit. |

The draft prints one form page with many line-1 rows. Inventory the AcroForm
widgets and design continuation statements for costs beyond the printed rows.
Render the finished attachment and inspect both an in-year and prior-year
asset case. A total-only input cannot prove the printed basis, Code section,
period, or election.

## Build order and acceptance

1. Obtain the current 2026 instructions or another final IRS authority for
   each amortization class and election before coding the formula. Record
   basis, begin date, period, Code section, prior deductions, and origin year
   per asset. Distinguish an amortization expense from Form 4562 depreciation
   and §179 expense so downstream forms cannot claim the same basis twice.
2. Add an activity-keyed calculation and carryforward ledger, then wire
   Form 4562-B line 3 into its Schedule C/E/F source activity. Check
   applicable business-interest, passive, at-risk, QBI, and excess-business-
   loss calculations after amortization has reduced that activity's profit.
3. Build the pinned PDF field map and row/continuation layout. Compare the
   rendered line 1–3 amounts to the activity ledger and return totals.
4. Obtain the authorized current TY2026 MeF XSD/business rules. Confirm
   Form 4562-B support, XML element names, attachment references, and any
   statement requirements; validate a complete return with both current-
   year and prior-year amortization. The May v1 package is a research baseline.
5. [TY2026 ATS scenario 12](ATS-SCENARIO-12.md) includes a $10,000 §195
   start-up-cost row with January 1, 2026 amortization start and $667 line 3
   routed to Schedule C Part V/line 27b. Use it as the first-year case and
   add a continuing-asset case. Run TY2025 regression on Form 4562.

This is a source and implementation plan. The form remains outside the
registered TY2026 calculation, PDF, and MeF product until those checks pass.
