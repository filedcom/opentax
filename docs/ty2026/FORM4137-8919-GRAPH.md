# TY2026 Forms 4137 and 8919 wage/FICA contract

The pinned [2026 Form 4137](corpus/draft/f4137.pdf) and [2026 Form
8919](corpus/draft/f8919.pdf) each include their instructions in the draft
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
| 11–13 | Apply 6.2% Social Security and 1.45% Medicare, then combine. The draft Form 4137 line 13 says Schedule 2 **line 5**, but the pinned [2026 Schedule 2](corpus/draft/f1040s2.pdf) prints Form 4137 on **line 16a**. The current graph/PDF uses 16a. Treat the cross-reference as a source conflict and recheck final forms/instructions before filing. |

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

## Current code boundary

- The shared [Form 4137 node](../../forms/f1040/nodes/intermediate/forms/form4137/index.ts)
  is in the 2026 registry, sends tips to 1040 line 1c and tax to Schedule 2
  line 16a, and exposes tip sources to Schedule 1-A. The [2026 PDF
  builder](https://github.com/filedcom/opentax/blob/2ed64bdd639597466a903200bfee189d38a65e7f/forms/f1040/2026/pdf/f4137.ts) renders separate recipient
  forms and employer continuations. Check its line 8 W-2/RRTA base, $20
  month evidence, government-employee exception and Form 8959 handoff
  against the embedded instructions. Its [draft field
  inventory](pdf-fields-f4137.csv) includes all widgets.
- The shared [Form 8919 node](../../forms/f1040/nodes/intermediate/forms/form8919/index.ts)
  is **not** registered in the 2026 registry. It accepts a single aggregate
  `wages` amount and reason code A–H, has no per-firm evidence, and still
  outputs the TY2025 Schedule 2 line 6 key. Its reason-code definitions do
  not match the printed 2026 A/C/G/H descriptions; simply switching the
  tax year would be wrong. Its Form 1040 line 1g output and Schedule SE
  wage-base handoff also need 2026 graph review.
- TY2025 PDF and MeF descriptors exist for both forms, but TY2026 has no
  Form 8919 PDF or MeF implementation. The 2025 XML names, spouse document
  handling and continuation representation require current XSD/rule checks.

## Build order and acceptance

1. Resolve the final Form 4137 line 13/Schedule 2 cross-reference and
   confirm the final 2026 wage base, reason codes, Form 8959 and Schedule
   1-A handoffs. Pin any revised source and record its hash.
2. Build owner-keyed W-2/1099/employer and firm ledgers. Apply Form 4137
   line 10 before Form 8919 line 8, then Form 8959. Reconcile 1040 lines
   1c/1g, Schedule 2 lines 16a/16b and the Social Security wage base.
3. Replace Form 8919's aggregate/reason-code input with the printed
   per-firm rows and evidence. Register the validated 2026 route and add
   its PDF/continuation; audit Form 4137's existing 2026 PDF against the
   complete widget inventory.
4. Map both current `IRS4137`/`IRS8919` MeF documents, statement/binary
   attachments and active reject rules. Validate full XML and PDFs for
   taxpayer-only, spouse-only and both-spouse cases.
5. Test exactly five and more-than-five employers/firms, allocated tips,
   monthly sub-$20 tips, government-only Medicare tips, code G SS-8, code H
   duplicate 1099/W-2, Form 4137 plus 8919 wage-base coordination, and
   Form 8959 thresholds. Preserve TY2025 regressions on reused logic.

This contract maps the filing work; the current 2026 slice is incomplete,
especially for Form 8919 and MeF.
