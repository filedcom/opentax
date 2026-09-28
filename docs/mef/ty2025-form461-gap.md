# TY2025 Form 461 source-to-filing gap

Status: implementation audit, 2026-09-28. No new test batch, XSD validation, PDF
rendering, IRS business-rule check, or ATS acceptance has run for this gap.

Build-first progress: Schedule C and F now pass signed source amounts into one
Form 461 calculation, with a required sourced C/F-only scope review for loss
cases. Unresolved passive losses fail closed. The MeF builder emits native
TY2025 line-level XML, but it is not yet validated in the agreed batch. The
registered PDF descriptor's old `excess_business_loss` mapping was stale. The
current build pass maps the December 2025 one-page AcroForm header and all 14
active numbered lines, accounting for reserved lines 1 and 7. It parses the
bounded C/F filed-form schema and runs the same return reconciliation as the
native document before projecting a page. The mapping and focused cases are
written but unrun; the filled page has not been visually verified.

The former blanket Form 461 PDF preflight has been removed now that the
descriptor projects the bounded C/F form. Unsupported source and
return-reconciliation cases still reject before PDF rendering. The native MeF
route remains subject to the same constraints. Neither route is filing-ready
until the full test, XSD, filled-page and IRS-rule checks run.

The MeF builder now requires pending Form 1040 and Schedule 1, reconciles the
C/F lines and line 8p addback, and rejects nonzero Form 1040 line 7a, Schedule 1
lines 4/5, or unclassified Schedule D/E, Forms 4797/6252/4684, and related
source attachments. These are explicit errors, not zero-filled Form 461 lines.
Other unclassified business items remain outside the bounded source model and
need the preparer's sourced C/F-only review.

The C/F-only input is `general.form461_scope_review`. It requires true
confirmations for `only_schedule_c_and_f_business_items`,
`other_part_i_lines_zero`, `part_ii_adjustments_zero`, and
`post_at_risk_and_passive_limits_confirmed`, plus at least one
`source_document_refs` workpaper reference. A C/F loss without this review, or
an unresolved passive loss reported by either source, produces an explicit node
error. This is an intentionally bounded path, not a general Form 461
implementation for capital gains, Schedule E, or other business items.

## Filing rule to implement

The [2025 Form 461](https://www.irs.gov/pub/irs-pdf/f461.pdf) has one
return-wide calculation. Lines 2-6 carry the corresponding filed Schedule 1
business, capital-gain, other-gain, supplemental-income, and farm-income amounts
(with Form 1040 line 7a on line 3). Line 8 includes other business items. Line 9
is their sum. Lines 10-11 remove the positive nonbusiness income and positive
nonbusiness loss/deduction amounts included above. Line 12 is line 10 less line
11; line 13 reverses its sign. Line 14 is line 9 plus line 13. Line 15 is the
**single** 2025 threshold, $313,000 or $626,000 for a joint return. Line 16 is
line 14 plus line 15. A negative line 16 becomes the positive Schedule 1 line 8p
excess-business-loss addback and an identified subsequent-year NOL.

The [2025 instructions](https://www.irs.gov/instructions/i461) also require a
Form 461 if the return-wide net business loss exceeds the threshold **or** any
one of lines 1-8 would report a loss over $156,500. Thus a required Form 461 may
have no Schedule 1 line 8p addback. At-risk limits precede passive-activity
limits, which precede Form 461. Capital-loss exclusions and business capital
gain ceilings need sourced line 10/11 adjustments; they cannot be inferred from
the Schedule D total alone.

## Historical implementation mismatch, addressed in the bounded C/F route

- Schedule C and F previously applied the threshold separately, so one
  business's profit could not offset another's loss. The current node combines
  signed C/F amounts once before applying the threshold and per-line trigger.
- The former node accepted a precomputed excess without underlying lines. The
  current bounded route calculates lines 2–16 and Schedule 1 line 8p from signed
  C/F inputs after a sourced scope review.
- The former MeF output contained only `ExcessBusinessLossAmt`. The current
  native builder emits the line-level form and checks it against the return. The
  PDF maps the same bounded C/F values, pending filled-page inspection.
- Historical tests for the old excess shortcut are not current evidence. New
  cross-source and required-form/no-addback cases are written but await the
  agreed full batch.

## Required build boundary

1. Collect signed, source-identified amounts for Form 461 lines 2-8 **after**
   the at-risk and passive-activity limits. Reconcile lines 2-6 to the filed
   Schedule 1 and Form 1040 line 7a. Identify what portion of each amount is not
   from a trade or business for lines 10-11, including excluded capital losses.
   Do not accept an unexplained excess amount as a substitute.
2. Compute the lines once for the entire Form 1040 return and both spouses on a
   joint return. Apply the filing trigger and annual threshold once, then route
   only a negative line 16 as a positive Schedule 1 line 8p amount.
3. Reconcile the calculated lines, status, and addback in the MeF builder; emit
   the native TY2025 line-level XML in schema order. Map and visually verify the
   actual 2025 PDF fields. Track the NOL origin separately from a current-year
   deduction.
4. Write source-to-return cases for Schedule C profit offsetting Schedule F
   loss, two losses sharing one threshold, one large line with no overall
   excess, passive/at-risk suspended amounts, and business/nonbusiness capital
   transactions. Execute them only in the agreed full test batch.

Until that build is complete, a registered `IRS461` or a Schedule 1 line 8p
amount is **not** evidence that the Form 461 path is correct or filing ready.
