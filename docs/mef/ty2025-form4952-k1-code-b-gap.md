# TY2025 Form 4952 partnership K-1 code B expense slice

The [2025 Partner's Instructions for Schedule K-1 (Form 1065)](https://www.irs.gov/instructions/i1065sk1) direct box 13 code H investment interest to Form 4952 line 1 and box 20 code B investment expenses to line 5. The [2025 Form 4952](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf) subtracts line 5 from investment income before limiting deductible interest.

Box 20 code B is informational for Form 4952 line 5, not a second deduction by itself. The [2025 Form 1065 instructions](https://www.irs.gov/instructions/i1065) say deductions related to portfolio income are separately stated in box 13 codes I or L. The [2025 partner instructions](https://www.irs.gov/instructions/i1065sk1) send box 7 royalty income to Schedule E line 4 and box 13 code I deductions allocable to royalties to Schedule E line 19, identified as "From Schedule K-1 (Form 1065)." Code L generally goes to Schedule A line 16, but the [TY2025 Schedule A line 16 instructions](https://www.irs.gov/instructions/i1040sca) allow only their listed expense classes; the current code B depreciation/depletion assertion does not establish one. The [2025 Schedule E instructions](https://www.irs.gov/instructions/i1040se) describe line 28 nonpassive losses and separately paid unreimbursed partnership expenses, not a generic automatic box 20 code B deduction. Therefore an automatic code B debit to Schedule E would risk double counting a deduction already reflected in another K-1 box or return line.

The K-1 input records a reported code B amount, an allowed depreciation or depletion amount, and a required issuer crosswalk to one identified box 13 code I royalty deduction and property. It can calculate Form 4952 line 5, but the MeF and PDF reconciliation still rejects every positive code B amount until the filed Schedule E deduction and source-document evidence standard are verified. Box 5 income and box 13 code H interest without code B remain on the bounded route.

The royalty/code I subset is now written as a bounded canonical source route. A positive box 7 requires the K-1 EIN and document reference plus owner, royalty-property description, nonpassive portfolio classification, and Form 1099 filing answer. A box 13 code I deduction additionally requires the statement reference, expense kind, and basis and at-risk workpaper references; this narrow path accepts only a fully allowed amount no greater than box 7 gross. The K-1 node creates one Schedule E Part I royalty property with box 7 on line 4 and code I on line 19, labeled "From Schedule K-1 (Form 1065)." It no longer posts box 7 directly to Schedule 1. Schedule E posts the net once to Schedule 1 line 5 and AGI. The native MeF and PDF descriptors match the royalty row back to the same K-1, require one royalty row and its net to equal finalized Schedule 1 line 5, and reject duplicate source keys. This is a direct route, not a fallback or dual API.

The Form 4952 calculator now has a separate `source_k1_royalties` line-4a
input, so a sourced K-1 royalty can be distinguished from a 1099-MISC royalty
and a manually entered investment gross-income amount. The K-1 node deposits
box 7 there only for an affirmed investment property; manual gross income must
exclude it. Positive box 20 code B input now directly requires an issuer
supplement reference linking its whole reported amount, expense kind and
allowed amount to the same box 13 code I statement and Schedule E royalty
property. Equal amounts without that named source link reject. Focused cases
are written but unrun. A separate, not-yet-wired return-level reconciliation
now checks the one K-1 and Schedule E royalty row, the Form 4952 numbered
lines, and the finalized Schedule 1, Schedule A, and Form 1040 amounts.
The export guard remains closed pending the product's source-document
verification standard and verification of that reconciliation in the full batch.

Box 20 code B remains **blocked for export**. The typed issuer crosswalk now
names the same box 13 code I expense, character and royalty property and checks
their reported/allowed amounts, but it is a supplied review assertion, not
authenticated K-1 supplement bytes or proof of the finalized Schedule E row.
The return-level join is written as a standalone guard but is not wired into
XML/PDF export; the chosen evidence standard and full-batch verification must
pass before Form 4952 line 5 can be filed. Other code I losses, multiple royalty properties, mixed
Schedule E Part I/II filings, foreign interactions, and carryovers remain
outside this bounded path. Focused cases are written but tests, typecheck,
XSD, filled-PDF review, and IRS business-rule validation were not run in this
build pass.

## Code B source-evidence audit

The [2025 Form 4952 line 5 instructions](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
require a noninterest expense directly connected to investment income **and**
an allowed deduction on the partner's return; expenses used to determine a
passive-activity result and disallowed miscellaneous itemized deductions cannot
be included. The [2025 partner K-1 instructions](https://www.irs.gov/instructions/i1065sk1)
send box 20 code B to Form 4952 line 5, but box 20 is an information code. The
same instructions separately describe box 13 code I royalty deductions and box
13 code AE portfolio-income deductions; code AE amounts are described as
deductible for taxpayers other than individuals. A code-B amount alone does not
identify which of these, if any, supplies an individual partner's allowed
deduction.

The local calculation fixture has a reported and allowed code-B amount of $350
linked by an asserted issuer crosswalk to a $350 code-I royalty deduction.
Those numbers are test data,
not a taxpayer's issued K-1, supplemental statement, basis workpaper, or filed
deduction. The input's `allowed_deduction_kind` and
`nonpassive_investment_property` flags are assertions. The implemented royalty
route can prove a particular box 13 code I debit reaches Schedule E line 19.
The new issuer crosswalk names the same item, but the code cannot authenticate
the issuer's statement from a caller-supplied reference. Equal numbers or a
common partnership EIN alone would still allow distinct expenses to be
conflated.

To open one code-B filing case, the source must supply and reconcile all of the
following for the same 2025 partnership, partner, and expense:

1. The issued Schedule K-1 box 20 code B amount and its issuer's supplemental
   breakdown, identifying the investment asset/activity, expense type, and
   amount represented by the code-B entry.
2. The separately stated deduction source (for example, the specific box 13
   code I statement if that is what the issuer identifies), with a stable item
   reference that ties the same amount and character to code B. The source must
   distinguish any code AE or other expense that is not an allowed 2025
   individual deduction.
3. The partner-level basis, at-risk, passive/nonpassive, and other limitation
   workpapers showing the exact portion allowed in 2025. The supported amount
   on Form 4952 line 5 cannot exceed either the code-B portion or the allowed
   deduction.
4. The exact filed destination and amount of that allowed deduction, linked by
   the same item reference to the K-1 source and to the generated Schedule E or
   other return row. That reconciliation must prove the deduction was posted
   once and that line 5 is only a limitation input, not another debit.

No issued K-1 supplement, completed limitation workpapers, or authenticated
filed-destination record for the local code-B fixture is present. The existing
MeF/PDF positive-code-B rejection therefore remains necessary. Adding a
destination solely from the asserted `allowed_deduction_amount` would bypass
the [line 5 allowed-deduction condition](https://www.irs.gov/pub/irs-prior/f4952--2025.pdf)
and could double count the return deduction. The direct source model and
line-4a calculation are written, but the filing guard remains active. No test,
typecheck, XSD, PDF-render, or ATS result is claimed.
