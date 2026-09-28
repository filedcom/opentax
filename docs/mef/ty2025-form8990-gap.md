# TY2025 Form 8990 coverage gap

Status: audit only. Do not treat the registered `IRS8990` builder as a
supported native MeF filing path. No test, local XSD, filled-PDF, or IRS ATS
validation was run for this audit.

## Native schema mismatch

The checked-in TY2025 v5.4 `Shared/IRS8990/IRS8990.xsd` uses ordered form
lines, including `CYBusIntExpnsBfr163jLmtAmt` (line 1),
`CfwdPrevDsallwIntExpenseAmt` (line 2),
`FlrPlanFinancingIntExpnsAmt` (line 4), `TaxableIncomeAmt` (line 6),
`DeprecAmortzDpltnDedTakenAmt` (line 11),
`CYBusinessInterestIncomeAmt` (line 23), and
`DisallowedBusInterestExpnsAmt` (line 31). None of the seven tags in
`forms/f1040/2025/mef/forms/f8990.ts` is a direct child of `IRS8990` in
that schema. `avg_gross_receipts` is an exemption-test input, not a field
on the [2025 Form 8990](https://www.irs.gov/pub/irs-pdf/f8990.pdf).

## Why a tag-only replacement is unsafe

1. `forms/f1040/nodes/intermediate/forms/form8990/index.ts` never emits a
   `form8990` print-field output. It returns an add-back to Schedule 1 and
   the AGI aggregator only when it computes disallowed interest. The MeF
   builder therefore does not receive reconciled lines 5, 16, 21-22,
   25-26, or 29-31.
2. The calculator treats omitted `tentative_taxable_income` and other ATI
   components as zero, but the [2025 instructions](https://www.irs.gov/pub/irs-pdf/i8990.pdf)
   require a taxable-income and business-allocation calculation. Zero cannot
   stand in for a missing source without potentially changing the limit.
3. The form distinguishes current-year interest expense, prior disallowed
   carryforward, partner excess interest treated as paid/accrued, and floor
   plan financing interest on lines 1-5. The node has no named partnership
   Schedule A rows or S-corporation Schedule B rows, but it sums generic
   rental carryforwards into its total and cannot prove their line-3 or
   Schedule A treatment.
4. Part II adjusted taxable income uses additions and reductions on lines
   7-21. The node has only a few aggregate inputs. It cannot establish that
   nonbusiness items, pass-through items, and other additions/reductions are
   absent, nor can it emit their schedules when present.
5. The current MeF builder reads raw input keys, not calculated `ati`,
   `allowed`, or `disallowed` values. Renaming its seven tags would produce
   a syntactically different but unreconciled Form 8990. The PDF descriptor
   also maps raw amounts without the calculated line-level record.

## Smallest safe rebuild boundary

Use a nonexempt individual with one directly operated, non-pass-through
trade or business, no floor-plan interest, no prior disallowed interest,
and no Schedule A/B excess items. Require source-backed current business
interest expense, tentative taxable income, every applicable ATI adjustment
or explicit zero/nonapplicability facts, and current business interest
income. Calculate and retain individual lines 1-31, check that the
business-schedule deduction and add-back reconcile, then serialize native
XSD fields and fill the matching PDF. Model partnership and S-corporation
excess-item tables separately; do not use the old flat builder as a
compatibility fallback.

Before claiming coverage, write positive and negative source-to-line tests,
calculation-to-XML tests, local XSD cases, PDF field/render checks, and IRS
business-rule/ATS cases for the agreed single full batch.
