# TY2026 Forms 4137 and 8919 wage/FICA contract

The pinned [2026 Form 4137](../corpus/draft/f4137.pdf) and [2026 Form
8919](../corpus/draft/f8919.pdf) each include their instructions in the draft
PDF. Separate instruction URLs are unnecessary for these two products. Both
forms calculate employee Social Security and Medicare tax, but their income
and evidence routes differ. Preserve taxpayer/spouse identity, employer or
firm identity, W-2 evidence and continuation rows through calculation, PDF
and MeF.

## Form 4137: unreported tips

| Printed lines | Source, calculation and destination |
| --- | --- |
| 1–4 | One row per employer, including EIN, total cash/charge tips received and reported. W-2 box 8 allocated tips are included unless records prove a lower unreported amount. Sum all employers, including continuation rows. Line 4 is received minus reported tips and flows to 2026 Form 1040 line 1c/AGI. Keep W-2 box 1 reported tips out of this extra income. |
| 5–6 | Remove tips under the per-employer $20 monthly reporting threshold from the FICA base, but retain them in line 4 income. Line 6 also feeds Form 8959 line 2 when Additional Medicare Tax applies. |
| 7–10 | Use the printed 2026 Social Security wage base **$184,500**. Line 8 combines W-2 boxes 3 and 7 and applicable RRTA compensation; line 10 is the smaller of line 6 (with the stated government-employee comparison adjustment) or remaining wage base. Reconcile the same recipient's Form 8919 line 8 so the base is shared once. |
| 11–13 | Apply 6.2% Social Security and 1.45% Medicare, then combine. The draft Form 4137 line 13 says Schedule 2 **line 5**, but the pinned [2026 Schedule 2](../corpus/draft/f1040s2.pdf) prints Form 4137 on **line 16a**. The current 2026 graph uses 16a; its Form 4137 PDF remains to build. Treat the cross-reference as a source conflict and recheck final forms/instructions before filing. |

The 2026 draft requires a separate Form 4137 for each spouse with unreported
tips. Its printed instructions allow a statement or additional first-page
rows when there are more than five employers, with lines 2–13 completed on
only one form per recipient. Unreported tips can also be relevant to the
2026 Schedule 1-A qualified-tip deduction, subject to its independent
occupation, source and eligibility rules.

## Form 8919: employee wages without FICA withholding

| Printed lines | Source, calculation and destination |
| --- | --- |
| 1–5 | One line per firm with name, federal ID, **reason code A, C, G or H**, applicable IRS determination date, 1099-MISC/NEC checkbox and wages omitted from W-2. Code G requires Form SS-8 filed separately by the return date; code H concerns wages also reported on 1099-MISC/NEC and does not require SS-8. Preserve the original 1099/W-2 source IDs so the wages enter income once. |
| 6 | Sum all firms/continuation forms and report the wages on 2026 Form 1040 line 1g/AGI. Include this amount on Form 8959 line 3 when required. |
| 7–10 | Use the same **$184,500** wage base. Line 8 includes W-2 boxes 3 and 7, applicable RRTA compensation **and Form 4137 line 10 tips**; line 10 caps these 8919 wages at the remaining base. |
| 11–13 | Apply 6.2% and 1.45%; report line 13 on 2026 Schedule 2 line 16b, then Schedule 2 line 21 and 1040 line 23. Keep a separate Form 8919 per spouse and continue firm rows beyond five, with the calculation totals on only one form. |

Form 8919 does not replace Schedule C/SE for genuine independent-contractor
income and does not calculate tax on unreported tips; Form 4137 owns the
latter. The 2026 draft no longer prints reason codes B, D, E or F.

## Current code boundary (October 15)

- The [2026 Form 4137 adapter](../../../forms/f1040/2026/inputs/form4137.ts)
  reuses the current shared employer, allocated-tip diary, monthly reporting
  and payroll calculation with a 2026 policy. It connects W-2 evidence, income,
  Schedule 1-A qualification, Schedule 2 line 16a and Form 8959 line 2.
  Its owner-keyed line 10 feeds Form 8919 before that form computes line 8.
  Form 4137 PDF/MeF components remain unfinished; the historical prototype PDF
  is not the current implementation.
- The [2026 Form 8919 adapter](../../../forms/f1040/2026/inputs/form8919.ts)
  reuses the shared per-firm A/C/G/H evidence checks and payroll arithmetic.
  The shared 2025 node retains its original input and destinations. The 2026
  adapter derives each firm's wages from identified NEC/MISC or payment records,
  checks owner/payer identity, same-firm W-2 evidence for H and dated SS-8/IRS
  records for A/C/G. Duplicate documents and underlying wage payments fail.
  Separately documented payments without an information return may supplement a
  firm's 1099 amount; they are reconciled before rounding the firm's wages.
- The focused [employee payment intake](../../../forms/f1040/2026/inputs/employee-payments.ts)
  accepts NEC box 1a or MISC box 3 wages with payment-ledger reconciliation and
  box 4 withholding. Corrected forms, positive cash-tip/overtime detail, NEC
  excess golden parachute and other reportable boxes need their remaining
  source owners. This is not complete generic NEC/MISC source support.
- The internal source graph routes Form 8919 line 6 to Form 1040 line 1g and
  AGI once, tax to Schedule 2 line 16b, withholding to line 25b and Medicare
  wages to Form 8959 line 3. Earned-income and Schedule SE payroll records are
  emitted, but their receiving 2026 calculations remain unfinished. The public
  filing registry is not enabled.
- The [2026 Form 8919 PDF component](../../../forms/f1040/2026/pdf/form8919.ts)
  verifies the pinned draft hash and all 40 fields, recalculates sources and
  checks destination amounts and filer identity. It renders a separate form
  per recipient and additional first-page copies beyond five firms, with totals
  only on each recipient's first page. The one-point line 7 dummy field remains
  empty because $184,500 is preprinted. Output is static and marked draft.
- Both 2026 MeF serializers, current XSD/rule validation and the complete return
  bundle remain to build. Existing 2025 XML names do not establish 2026 parity.

## Remaining acceptance

1. Resolve the final Form 4137 line 13/Schedule 2 cross-reference and recheck
   final forms, wage base, reason codes and dependent-form instructions. Pin
   revised sources and record hashes before adopting them.
2. Complete source corrections, substitute/missing W-2 handling, railroad and
   statutory-employee exceptions, noncash tips, full NEC/MISC source ownership
   and their Schedule 1-A branches. Connect receiving Schedule SE and credit
   calculations; do not treat emitted pending records as completed routes.
3. Build Form 4137 PDF/continuations and complete the combined return bundle.
   Map both current `IRS4137`/`IRS8919` documents, supporting attachments and
   active reject rules. Validate taxpayer-only, spouse-only and joint outputs.
4. Retain the existing source, owner, A/C/G/H, rounding, same-payment overlap,
   five/more-than-five PDF and Form 4137/8919 wage-base tests. Extend them to
   the remaining source cases and full XML/ATS evidence, preserving 2025
   regressions on shared logic.

This contract maps the filing work; calculation and draft PDF milestones do
not establish complete 2026 filing readiness.
