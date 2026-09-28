# TY2025 Form 4562 coverage gap

Status: bounded build-first implementation, not filing ready. Do not treat the
registered `IRS4562` builder or PDF descriptor as a fully supported filing path.
No test, XSD, PDF render, or IRS ATS validation has run yet.

Build-first progress: the invalid flat XML serializer has been replaced with the
TY2025 native section 179 line and elected-property sequence. A new direct
`form4562.asset` source accepts one fully elected, nonlisted Schedule C asset,
requires source references and the taxpayer-level business-income limit, and
computes lines 1-13 and 22. The MeF builder requires an exact Schedule C
activity reference and line-13 depreciation reconciliation. Older aggregate
inputs from Schedule E and K-1 sources now fail explicitly; they are not a
fallback. The PDF descriptor has since been replaced with the bounded Part I
mapping described below, but filled-page appearance and validation are still
unverified. No tests, XSD validation, PDF rendering, or ATS acceptance has run
for this new path.

The MeF builder now also checks line 11 against the filed sole Schedule C profit
recomputed without this asset's section 179 deduction. This narrower route
requires an active, all-at-risk business, no employee wages, no other
business-income attachments, no home-office adjustment, and no separate Schedule
C passthrough amounts or WOTC reduction. A referenced workpaper or an entered
income amount alone no longer establishes the active-income limit. Employee
wages and other businesses can contribute to the legal limit, but their
combination is outside this route until sourced reconciliation exists.

This first path is limited to a 2025 asset whose entire cost is elected under
section 179, with 100% business use, bonus election out, no listed property, no
other depreciation assets on the return, no prior-year section 179 carryover,
and no married-filing-separately allocation. The Schedule C input must already
include the computed Form 4562 line 22 amount on its line 13; Form 4562 does not
add a second deduction to Schedule 1. Residual-basis MACRS, bonus depreciation,
listed property, multiple assets or activities, pass-through elections, and the
other asset classes remain unsupported.

## Bounded TY2025 PDF mapping (build-first, unrendered)

The [official 2025 Form 4562](https://www.irs.gov/pub/irs-prior/f4562--2025.pdf)
has three pages. Its canonical AcroForm positions put page-1 lines 1-5 in
`f1_4`–`f1_8`, the single elected-property row 6(a)-(c) in
`Table_Ln6.BodyRow1.f1_9`–`f1_11`, lines 8-13 in `f1_16`–`f1_21`, and Part IV
line 22 in page-2 `f2_2`. The rebuilt descriptor fills those fields, the filer
name/identifying number, and the business activity. It leaves line 7 and Parts
II, III, V, and VI blank because the only accepted asset is nonlisted, fully
elected under section 179, with no other depreciation. It no longer prints raw
bonus *basis* as line-14 allowance or generic MACRS values in a 19a row.

Before projecting any active PDF, it parses the finalized `filedForm4562Schema`
and runs the same asset, Schedule C line-13, active-business-income, and Form
1040/Schedule 1 source checks as the native MeF builder. Aggregate-only inputs
and unmatched filed lines therefore fail closed. Focused field-path,
source-reconciliation, and missing-source cases are written but unrun. The
cached form's AcroForm tree was inspected read-only; no filled PDF or visual
appearance was rendered in this build pass.

## Source and schema check

- The checked-in TY2025 v5.4 `IRS4562.xsd` starts with optional
  `BusinessOrActivityTxt`, then Part I lines 1-13, Part II lines 14-16, Part III
  nested GDS/ADS rows, Part IV totals, and Parts V-VI. Its corresponding native
  fields include `Section179ExpenseDeductionAmt` (line 12),
  `SpecialAllowanceAmt` (line 14), and `MACRSDedForAstInSrvcBfrPYAmt` (line 17).
  The original flat serializer used non-native direct children; it has been
  replaced with the Part I sequence, but local XSD validation is still pending.
- The [2025 Form 4562](https://www.irs.gov/pub/irs-pdf/f4562.pdf) distinguishes
  cost, elected cost, current deduction, and next-year carryover on lines 2,
  6-13; line 14 is the _allowance_, not its qualifying basis; and Part III
  requires property-class rows rather than one flat basis/period/year trio. The
  [2025 instructions](https://www.irs.gov/pub/irs-pdf/i4562.pdf) put
  pass-through section 179 amounts on line 6 with the relevant Schedule K-1
  source, and require the taxpayer-level business-income limit on line 11.

## Original audited mismatch

The points below describe the pre-rebuild code and explain why its aggregate
route was replaced. They are retained as the original audit record.

1. `forms/f1040/nodes/intermediate/forms/form4562/index.ts` computes one
   combined deduction and routes it to Schedule 1, an AGI aggregator, and
   Form 6251. It never returns a `form4562` print-field output. The MeF
   descriptor consequently receives raw pending inputs, not a reconciled version
   of lines 1-22.
2. The node accepts one `section_179_cost` and `section_179_elected`, but no
   asset description, K-1 provenance per amount, activity identifier, or
   per-business allocation. The instructions permit a summary election and
   separate activity forms, but a combined amount cannot be assigned to the
   correct form or line 6 property row from these inputs.
3. `computeSection179` allows an elected amount to exceed the supplied cost and
   allows a positive deduction without a supplied nonnegative business income
   limit. It adds upstream K-1 amounts, direct election, and carryover before
   applying a single cap, while the printed lines 8-13 require distinct
   tentative deduction, carryover, allowed deduction, and next-year carryover.
   Mapping this aggregate to line 12 would hide those gaps.
4. Bonus inputs are qualifying _basis_ and election flags. The node computes the
   actual allowance but does not expose it to the serializer. Mapping either
   basis to `SpecialAllowanceAmt` would overstate line 14.
5. The one MACRS basis/period/year input lacks a property class, asset-level
   service date for the current year, and convention/method for many rows. The
   node can calculate selected rates, but the form's nested GDS and ADS rows
   cannot be reconstructed for a general return. Prior depreciation needs its
   separate line 17, not a current-year 19a row.
6. `forms/f1040/2025/pdf/forms/f4562.ts` maps raw bonus basis into a line-14
   field and multiple generic MACRS inputs into one 19a row. Its comments also
   shift the official Part I line numbers. It needs an independently verified
   2025 AcroForm mapping after the print fields are defined.

## Remaining safe rebuild

The first source path now covers one fully elected nonlisted Schedule C asset
with no residual MACRS or bonus basis, and reconciles the deduction to that
activity's Schedule C line 13. It still needs the single full test batch, local
XSD validation, and a visually checked filled PDF. The next asset path needs
separate source facts for residual basis, MACRS class/convention, and bonus
eligibility. K-1 passthrough, multiple assets or activities, listed property,
and ADS remain outside the bounded path until their source and allocation models
exist. The old flat XML builder is not a fallback.

Before claiming this form, add source-to-calculation, calculation-to-MeF,
negative missing-source, local XSD, and filled-PDF cases, then include them in
the agreed single full batch and IRS business-rule/ATS gates.
