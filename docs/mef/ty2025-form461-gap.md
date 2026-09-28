# TY2025 Form 461 source-to-filing gap

Status: implementation audit, 2026-09-28. No new test batch, XSD validation,
PDF rendering, IRS business-rule check, or ATS acceptance has run for this gap.

## Filing rule to implement

The [2025 Form 461](https://www.irs.gov/pub/irs-pdf/f461.pdf) has one return-wide
calculation. Lines 2-6 carry the corresponding filed Schedule 1 business,
capital-gain, other-gain, supplemental-income, and farm-income amounts (with
Form 1040 line 7a on line 3). Line 8 includes other business items. Line 9 is
their sum. Lines 10-11 remove the positive nonbusiness income and positive
nonbusiness loss/deduction amounts included above. Line 12 is line 10 less
line 11; line 13 reverses its sign. Line 14 is line 9 plus line 13. Line 15 is
the **single** 2025 threshold, $313,000 or $626,000 for a joint return. Line
16 is line 14 plus line 15. A negative line 16 becomes the positive Schedule 1
line 8p excess-business-loss addback and an identified subsequent-year NOL.

The [2025 instructions](https://www.irs.gov/instructions/i461) also require a
Form 461 if the return-wide net business loss exceeds the threshold **or** any
one of lines 1-8 would report a loss over $156,500. Thus a required Form 461
may have no Schedule 1 line 8p addback. At-risk limits precede passive-activity
limits, which precede Form 461. Capital-loss exclusions and business capital
gain ceilings need sourced line 10/11 adjustments; they cannot be inferred
from the Schedule D total alone.

## Current implementation mismatch

- `nodes/inputs/schedule_c/index.ts` and
  `nodes/intermediate/forms/schedule_f/index.ts` each compare their own net
  loss with the full annual threshold and send only their respective excess.
  `nodes/intermediate/forms/form461/index.ts` then sums the per-source excesses.
  This can apply the threshold more than once and cannot offset a loss in one
  business with a profit in another.
- The Form 461 node accepts only a precomputed excess and emits Schedule 1
  line 8p. It has no underlying signed line 2-14 amounts and cannot apply the
  separate per-line filing trigger.
- `2025/mef/forms/f461.ts` emits only `ExcessBusinessLossAmt`; it cannot
  establish the complete filed 2025 form or reconcile it to the return. The
  registered PDF descriptor likewise cannot demonstrate filled line detail.
- Existing node tests assert precomputed per-source excesses and are not
  evidence of the return-wide rule. They need replacement with cross-source
  cases and a required-form/no-addback case, all in the agreed later batch.

## Required build boundary

1. Collect signed, source-identified amounts for Form 461 lines 2-8 **after**
   the at-risk and passive-activity limits. Reconcile lines 2-6 to the filed
   Schedule 1 and Form 1040 line 7a. Identify what portion of each amount is
   not from a trade or business for lines 10-11, including excluded capital
   losses. Do not accept an unexplained excess amount as a substitute.
2. Compute the lines once for the entire Form 1040 return and both spouses on
   a joint return. Apply the filing trigger and annual threshold once, then
   route only a negative line 16 as a positive Schedule 1 line 8p amount.
3. Reconcile the calculated lines, status, and addback in the MeF builder;
   emit the native TY2025 line-level XML in schema order. Map and visually
   verify the actual 2025 PDF fields. Track the NOL origin separately from a
   current-year deduction.
4. Write source-to-return cases for Schedule C profit offsetting Schedule F
   loss, two losses sharing one threshold, one large line with no overall
   excess, passive/at-risk suspended amounts, and business/nonbusiness capital
   transactions. Execute them only in the agreed full test batch.

Until that build is complete, a registered `IRS461` or a Schedule 1 line 8p
amount is **not** evidence that the Form 461 path is correct or filing ready.
