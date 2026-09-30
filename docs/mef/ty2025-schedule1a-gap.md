# TY2025 Schedule 1-A bounded filing paths

Sources:
[2025 Schedule 1-A](https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf),
[2025 Form 1040 instructions, including Schedule 1-A](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf),
[IRS list of qualifying tipped occupations](https://www.irs.gov/forms-pubs/occupations-that-customarily-and-regularly-received-tips-on-or-before-dec-31-2024),
and checked-in v5.4 `Common/IRS1040Schedule1A/IRS1040Schedule1A.xsd`.

The `schedule1a` node computes a combined deduction and sends it to Form 1040
line 13b. MeF includes bounded senior-only and single-employer W-2-box-7 tips
routes plus reviewed W-2-box-14 FLSA overtime and vehicle-interest routes in the Schedule 1-A
descriptor after Schedule 1 and before Schedule 2. Form 1040's positive-line-13b guard opens
only when that source review is present and the second pass has exactly one
attached Schedule 1-A. The descriptor independently rejects unsupported
components and reconciles line 38 to line 13b. All four routes have a
two-page PDF field map and inspected synthetic full-return packets.

## Source and line blockers

- Part I lines 1–3 use Form 1040 line 11b plus Puerto Rico excluded income, Form
  2555 lines 45/50, and Form 4563 line 15. The node receives `magi` from the AGI
  aggregator, and the senior-only route requires a source-referenced review that
  all those adjustments are zero. Positive exclusions still need their own
  source routes; `magi` cannot be assumed to be line 3 without this review.
- Part II now has one source-backed route: one W-2 box 7 tips record with a
  published three-digit tipped occupation code, box 5 Medicare wages at or
  below $176,100, a valid timely employment SSN, and reviewed zero Part I
  exclusions. It fills lines 4a/4c, 6/7, 9–13 as applicable, and line 38,
  with source-graph and Form 1040 reconciliation. It rejects a second qualified
  tips record, Form 4137, mixed senior/overtime/vehicle claims, high box 5
  wages, and an occupation code outside the IRS list. Form 4070 or employer
  statement alternatives, multiple employers or occupations, special wage-base
  handling, self-employment tips, and combined Schedule 1-A branches remain open.
- Part III now supports employer-identified `FLSA Overtime Premium` in W-2
  box 14 when a source-referenced review confirms the employee is covered and
  nonexempt under the FLSA and that the premium is included in box 1. The W-2
  node carries employee SSN, employer EIN, premium, box 1 wages, and the review
  reference into Schedule 1-A. Multiple employers and both spouses can be
  summed, with duplicate employee/employer pairs rejected. Native and PDF
  outputs fill lines 14a–21 as applicable and line 38; the filer, AGI, and
  deduction reconcile to Form 1040. Raw taxpayer-entered overtime totals are
  rejected at the public input schema. Payroll-method calculations when box 14
  lacks the premium, deferred W-2 amounts, Forms 1099-NEC/MISC, mixed
  Schedule 1-A claims, and authenticated employer evidence remain open.
- Part IV now has a reviewed 2025 purchase-loan route for one or two new,
  qualifying US-assembled passenger vehicles. Each record needs a borrower
  SSN, VIN, 2025 origination/purchase dates, lender and document references,
  first-lien and personal-use confirmations, eligible vehicle facts, whole-
  dollar interest, and a source-referenced review that no interest was deducted
  elsewhere. Bare VIN/interest assertions, positive Schedule C/E/F amounts,
  mixed Schedule 1-A claims, and more than two VINs are rejected. The native
  v5.4 schema permits up to 50 groups, but more than two needs an attached
  statement that is not yet implemented. Refinance, inherited-obligor, mixed
  business-use interest, document authentication, and cross-schedule deduction
  reconciliation remain open.
- Part V's senior-only descriptor now computes per-person lines 36a/36b and
  intermediate lines 32–35. Its zero-exclusion review does not establish the
  positive Part I exclusion paths or authenticate the underlying documents.

The v5.4 XSD has distinct elements for these source lines and Part VI line 38.
The registered senior-only MeF descriptor
requires an explicit source-referenced review that there was no section 933
Puerto Rico exclusion and no Form 2555 or Form 4563 filing. It uses the AGI
calculated upstream, rejects any tips, overtime, or vehicle claim, computes
the Part V phaseout and each spouse's line 36 amount, and emits Part I lines
1/3 plus Part V lines 32-37 and Part VI line 38 in native XSD order. It checks
the filing status, each claimed senior's SSN/age/timely employment-valid SSN
facts, AGI, and the senior/total deduction against the pending Form 1040 lines
11b and 13b, and rejects a conflicting Form 2555/4563 pending source. Positive Part I
exclusions remain unsupported. These references are review evidence, not
independent authentication of the underlying taxpayer documents.

The source, document, return integration, and PDF field-map cases are written.
The official 2025 two-page AcroForm was inspected: page 1 fields
`f1_03`, `f1_08`, and `f1_09` correspond to lines 1, 2e, and 3; page 2
fields `f2_15` through `f2_23` correspond to lines 31 through 38. The
registered PDF descriptor projects a supported worksheet after the
same MeF source/return reconciliation, and Form 1040's PDF line 13b opens only
when that page's line 38 matches. Other Part II/III/IV sources remain open.
The `joint-senior-schedule1a` fixture now exercises the real source graph,
Form 1040 join, native TY2025 v5.4 XML, and four-page filled PDF. A PDF build
initially found that Form 6251 read a nonexistent calculated `line37_senior`
from the Schedule 1-A source slot. Its PDF projector now reads the finalized
Form 1040 senior amount and requires the Schedule 1-A source to reconcile
before subtracting it from Form 6251 line 1a. The regenerated `v39` packet
prints both spouses on Schedule 1-A page 1, $160,000 on Part I lines 1/3,
$5,400 for each spouse in Part V, and $10,800 on line 38 and Form 1040 line
13b. All four pages were visually inspected and the full-return XML passed the
local XSD. The remaining positive Part I exclusions, other Part II sources,
other Part III/IV sources, source authentication, IRS business rules,
and ATS acceptance remain open.
The source commit `89b972c6` passed the complete `deno task test` run at
8,932/8,932 with zero failures; the log is retained at
`.state/research/ty2025-full-test-schedule1a-pdf.log`.

The `single-w2-qualified-tips-schedule1a` fixture uses one $30,000 W-2 with
$5,000 box 7 tips, TTOC 102, box 5 Medicare wages below the wage base,
timely employment-valid taxpayer SSN facts, and reviewed zero Part I
exclusions. Its source graph reports $5,000 on Form 1040 line 13b, $9,250
taxable income, $928 tax, and a $1,572 refund. The native Schedule 1-A
emits $5,000 on lines 4a, 4c, 6, 7, 13, and 38 and passes local TY2025 v5.4
full-return XSD. All four pages of the `v41` PDF were rendered and inspected:
Part II prints those amounts and zero on line 4b; line 8 prints $30,000 MAGI,
line 9 prints the $150,000 threshold, lines 10–12 are blank, and
Form 1040 line 13b prints $5,000. The page review and SHA-256 are in the
[filled-PDF notes](ty2025-filled-pdf-review-2026-09-29.md). This is a
synthetic source check; payer-issued bytes and IRS business-rule acceptance
remain open.
Source commit `46d7d080` passed `deno task test` at 8,938/8,938 with zero
failures; retain `.state/research/ty2025-full-test-schedule1a-tips.log`.

The `single-two-w2-flsa-overtime-schedule1a` fixture uses two $50,000/$30,000
W-2s with separately identified $3,000/$1,000 FLSA overtime premiums and
source-referenced covered/nonexempt and box-1-inclusion reviews. Its graph
reports $80,000 AGI, $4,000 on Form 1040 line 13b, $60,250 taxable income,
$8,175 tax, and $175 owed. Native Schedule 1-A prints $4,000 on lines
14a/14c/15/21/38 and zero on line 14b; the full return passes local TY2025
v5.4 XSD. All four pages of the `v42` PDF were rendered and inspected; the
amounts, filer identity, and blank unrelated parts agree with the source,
graph, and XML. The [filled-PDF notes](ty2025-filled-pdf-review-2026-09-29.md)
retain the page review and SHA-256. Source references are review assertions;
payer-issued W-2 and payroll bytes, IRS business rules, and ATS acceptance
remain open.
Source commit `b2182cc1` passed `deno task test` at 8,947/8,947 with zero
failures; retain `.state/research/ty2025-full-test-schedule1a-overtime.log`.

The `single-reviewed-car-loan-schedule1a` fixture has a synthetic $80,000 W-2
and one reviewed 2025 purchase loan with $4,000 interest, a VIN, lender and
purchase references, vehicle eligibility facts, and a zero-interest-deducted-
elsewhere review. The graph reports $80,000 AGI, $4,000 on Form 1040 line
13b, $60,250 taxable income, $8,175 tax, and $175 owed. Native Schedule 1-A
prints the VIN, zero on line 22(ii), $4,000 on lines 22(iii)/23/24/30/38,
and passes local TY2025 v5.4 full-return XSD. All four pages of the `v43`
PDF were rendered and inspected; the Part IV rows, filer identity, and Form
1040 totals agree with the source, graph, and XML. The [filled-PDF notes](ty2025-filled-pdf-review-2026-09-29.md)
retain the page review and SHA-256. The references are review assertions,
not authentication of the underlying lender or purchase documents. IRS
business rules and ATS acceptance remain open.
