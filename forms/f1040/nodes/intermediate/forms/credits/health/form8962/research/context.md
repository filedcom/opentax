# Form 8962 — Premium Tax Credit (PTC)

## Purpose

Reconciles Advance Premium Tax Credits (APTC) against the actual allowable PTC
based on household income and size. Net PTC flows to **Schedule 3 line 9**
(refundable); excess APTC repayment flows to **2025 Schedule 2 line 1a**.

## IRS References

- [2025 Form 8962](https://www.irs.gov/pub/irs-pdf/f8962.pdf) and
  [2025 instructions](https://www.irs.gov/instructions/i8962)
- IRC §36B — Refundable Credit for Coverage Under a Qualified Health Plan
- ARP Act §9661 — extended through TY2025 (no 400% FPL cliff)
- IRS 2025 Instructions for Form 8962, Tables 1-1 through 1-3, 2, and 5

## TY2025 Constants

- **FPL (2024 values used for TY2025):** 48 states/DC $15,060 + $5,380 per
  additional person; Alaska $18,810 + $6,730; Hawaii $17,310 + $6,190.
- **Applicable figure:** 0.0000 through 150% FPL, 0.0200 at 200%, 0.0400 at
  250%, 0.0600 at 300%, and 0.0850 at 400% or more. Line 5 drops the fractional
  percentage and uses 401 above 400% FPL.
- **Repayment limits:** Single $375/$975/$1,625; all other filing statuses
  $750/$1,950/$3,250, for under 200%, 200–299%, and 300–399% FPL respectively.
  No cap at 400% or more.

## Applicable Percentage Table

| Line 5 (% FPL) | Applicable figure                                                  |
| -------------- | ------------------------------------------------------------------ |
| 100–150        | 0.0000                                                             |
| 151–300        | Rises 0.0004 per whole percentage point, reaching 0.0600 at 300    |
| 301–399        | Rises to 0.0848 at 399, rounded to four decimal places per Table 2 |
| 400 or 401     | 0.0850                                                             |

## Input Schema

- `household_size` — for FPL calculation
- `taxpayer_modified_agi` — Form 8962 line 2a from the return and Worksheet 1-1
- `dependents_modified_agi` — line 2b from dependents who must file because
  income meets the filing threshold
- `dependent_income_complete` — confirms filing-status facts were supplied for
  every claimed dependent
- `below_100_fpl_status` — documented Marketplace-estimate or lawful-presence
  qualification, or reviewed non-applicable-taxpayer status; the
  Marketplace-estimate route also requires paid APTC
- `mfs_ptc_status` — documented abuse or abandonment exception with the
  three-year limit, or reviewed no-exception status, identifying whether each
  policy is family-only or shared with the spouse
- `shared_policy_allocations` — Form 1095-A-derived Part IV rows for Situation 1
  divorce, Situation 2 MFS, Situation 3 no APTC, and Situation 4 other shared
  families, including the other taxpayer, policy, months, and applicable
  percentage columns. A 1095-A source can carry multiple nonoverlapping
  `shared_policy_periods` on one policy, including an explicit `family_only`
  period that uses the full source premium and APTC and a separately supplied
  coverage-family SLCSP without creating a Part IV row.
- `fpl_region` — contiguous states/DC, Alaska, or Hawaii
- `annual_premium` / `annual_slcsp` / `annual_aptc` — annual totals (when no
  monthly detail)
- `monthly_premiums` / `monthly_slcsps` / `monthly_aptcs` — monthly arrays (12
  elements each; preferred for mid-year coverage changes)

## Compute Logic

1. Compute the regional FPL and whole-number line 5 percentage.
2. Look up the 2025 Table 2 applicable figure and round line 8a contribution to
   whole dollars.
3. For annual coverage, line 11e is the smaller of enrollment premium or
   positive SLCSP less contribution. For monthly coverage, compute each covered
   month with rounded line 8b contribution, then add its line (e) values.
4. Reconcile line 24 PTC with line 25 APTC. A positive difference goes to
   Schedule 3 line 9; excess APTC is limited by 2025 Table 5 and goes to
   Schedule 2 line 1a.
5. Retain calculated lines on the Form 8962 MeF document so the attachment and
   return line agree.

## Output Nodes

- `schedule3` (line 9 — net PTC when owed to taxpayer)
- `schedule2` (line 1a — excess APTC repayment)
- `form8962` (calculated MeF lines and annual/monthly groups)

## Key Design Notes

- Monthly source columns are preserved, including an explicitly all-zero APTC
  column, and use the monthly MeF branch.
- Annual line 11 is used only when every policy has twelve monthly premium and
  SLCSP values proving full-year unchanged coverage under IRS line 10. The Form
  8962 node also rejects a claimed line-11 flag if the supplied aggregate
  monthly premium or SLCSP changes or any enrollment-premium month is zero.
  Annual totals alone cannot prove eligibility and require separately verified
  line-10 facts; changed monthly amounts use lines 12–23. See the
  [2025 Form 8962 line 10 instructions](https://www.irs.gov/instructions/i8962).
- When policies are combined, a monthly policy cannot be mixed with an
  annual-only policy because the annual-only amounts would disappear from the
  monthly calculation.
- For multiple covered policies, Form 1095-A routing uses one SLCSP per state
  per month, adds SLCSP across different states, and rejects missing coverage
  states or conflicting same-state benchmarks.
- The 2025 Form 8962 line 10 instructions require a correct monthly SLCSP
  determination when no APTC was paid, even if column B reports a positive
  amount. Form 1095-A now requires a month-specific Marketplace tool/contact
  determination for every covered zero-APTC month. Known coverage-family changes
  or moves can be declared as review periods with a reported-to- Marketplace
  flag; an unreported period needs a determination for every covered month.
  Corrected rows record the Marketplace source, and change/move corrections must
  match an unreported review period. A reported change uses the reported SLCSP
  unless an independent error is identified. These facts cannot be inferred
  solely from Form 1095-A policy amounts, so undeclared changes remain a
  source-intake and verification requirement. See
  [Form 8962 instructions](https://www.irs.gov/instructions/i8962) and
  [Publication 974](https://www.irs.gov/pub/irs-pdf/p974.pdf), “Determining the
  Premium for the Applicable SLCSP.”
- QSEHRA calculation takes the employer's annual permitted benefit plus 12
  explicit monthly notice facts (null for months without QSEHRA): self-only
  SLCSP, self-only permitted benefit for Worksheet N, and the actual permitted
  benefit for Worksheet Q. The monthly benefits must total the annual amount.
  Affordable months have zero PTC; otherwise the tentative credit is reduced,
  but not below zero. The source can carry both annual 1095-A totals and monthly
  columns, but each annual amount must reconcile to the twelve monthly amounts.
  When full-year unchanged coverage proves Form 8962 line 10 eligibility, the
  annual line 11 calculation follows
  [2025 Publication 974](https://www.irs.gov/publications/p974) Worksheet N for
  wholly affordable QSEHRA months, Worksheet Q Parts I-II for a uniform
  unaffordable benefit, or Worksheet Q Part III for mixed
  affordability/benefits. In each case the non-QSEHRA months retain their annual
  line 11 share. Otherwise monthly lines 12–23 apply Worksheet N/Q to each
  month. No form is filed when both final PTC and APTC are zero. This does not
  make an annual-only Form 1095-A policy distributable across months when
  another policy has monthly columns; the absent monthly source must still be
  obtained. MFS family-only policies use explicit exception or no-exception
  facts; the former claims the PTC and marks Form 8962 line A, while the latter
  reconciles APTC only. MFS Situation 2 shared policies use monthly Form 1095-A
  amounts, the statutory 50% allocation, and the separately verified
  coverage-family SLCSP for exception filers. Situation 1 divorce uses the
  agreed common percentage or statutory 50% without agreement. Situation 3
  no-APTC allocates premiums by the exact ratio of the two coverage-family SLCSP
  values, uses the taxpayer's own SLCSP, and leaves Part IV columns (f) and (g)
  blank. Situation 4 uses the agreed common percentage or the enrolled-person
  ratio without agreement. Ratio-derived Part IV percentages are rounded to two
  places without rounding the underlying monetary ratio. Zero-percent rows
  remain on Form 8962.
- Marketplace coverage below 100% of the FPL uses zero applicable contribution
  only with all facts for the estimated-income or lawful-presence exception. The
  estimated-income route also checks that APTC was paid. A reviewed
  non-applicable taxpayer who cannot be claimed as a dependent, has no shared
  policy, no unlawfully present covered person, no self-employed
  health-insurance deduction, and no alternative marriage calculation instead
  reports no PTC, only APTC in the annual or monthly MeF group, and the Table 5
  capped repayment; without APTC, Form 8962 is not filed. An unreviewed or
  special case still stops.
- ARP extension: 400% FPL cliff is eliminated through TY2025; no hard cutoff.
- Both positive and negative scenarios handled in a single `compute()` call (can
  only emit one of the two outputs).
- SLCSP = Second Lowest Cost Silver Plan (the benchmark plan for credit
  calculation).
- This is not whole-form support. The new shared-policy and QSEHRA
  monthly/annual cases are written but untested under the build-first workflow.
  The TY2025v5.4 IRS8962 XML schema permits 99 repeated Part IV groups, so the
  electronic build carries every row through that limit and marks line 34 No
  after four rows. This is an inference from the schema plus the 2025
  instructions, not an ATS acceptance result. The 2025 PDF descriptor covers
  calculated lines, monthly rows, four Part IV rows, and both Part V marriage
  groups using fields inspected on the 2025 source form. The Part V line 35/36
  family size, monthly contribution, start month, and stop month fields are
  f2_29 through f2_36. An election checks line 9 Yes and line 10 No even without
  a Part IV allocation; incomplete Part V source facts stop. Under Publication
  974 Worksheets II/IV, the alternative monthly contribution carries through
  every month from the reported start through stop month, even when an
  intervening 1095-A month has no enrollment premium. Its credit remains zero in
  that gap, while Form 8962 column (c) and the PDF keep the contribution. For
  allocation five onward, the PDF builder appends paginated statement pages and
  marks line 34 No. A page-decoration hook writes the QSEHRA label in the
  first-page top margin. These generated pages have not had filled-render QA.
  The alternative year-of-marriage election now names each spouse's Form 1095-A
  policy numbers, and owner-tagged corrected/allocated monthly policy rows feed
  Worksheets II/IV directly. It rejects a missing, duplicate, mismatched, or
  unassigned policy rather than accepting manually entered worksheet arrays.
  This is a breaking replacement of the prior monthly worksheet input shape.
  Pre-marriage rows reconcile premiums, SLCSP, and APTC to the aggregated 1095-A
  columns before Part V is emitted. The Form 1095-A source now requires the
  marriage month alongside spouse-owned policies and carries it to Form 8962 for
  an equality check. Through the wedding month, same-state SLCSP is grouped
  separately by spouse because they have separate coverage families; from the
  first full married month it is grouped by state for the joint family. This
  follows the 2025 Form 8962 instructions under “Marriage in 2025” and
  Publication 974 Worksheets II/IV. The annual aggregate SLCSP derives from
  those monthly amounts after each 1095-A annual total is checked against its
  reported monthly rows. Conflicting SLCSP amounts within a spouse/state or the
  post-marriage joint family still stop pending corrected coverage-family facts.
  Source-to-PDF rendering, self-employed insurance interactions, and IRS
  business rules still need a complete audit.

## Self-employed insurance interaction, 2025 Pub. 974

- Publication 974, pp. 49-51, Worksheets W/X are now represented as pure,
  pre-AGI calculations. Worksheet W takes Form 1095-A policy/month-linked
  specified premiums and attributable APTC, a separately established
  nonspecified-premium deduction, and verified business earnings, Schedule 1
  lines 15/16, and Form 2555 facts. It computes lines 1-3, 13-17, and 19.
  Worksheet X takes Form 1040 income, tax-exempt interest, nontaxable Social
  Security, Form 2555, other Schedule 1 adjustments, filing-required dependent
  MAGI, FPL region/size, and filing status. It computes provisional household
  income, repayment limit, and maximum deduction through line 31. Their narrowly
  supported filing route is described below; broader source shapes remain
  calculation-only.
- Publication 974, pp. 52-53, Steps 2-6 now have a pure local iterative route
  when all twelve Marketplace premium months are specified and reconcile to Form
  8962 monthly premiums/APTC. It computes Form 8962 PTC from each trial
  deduction's MAGI, refigures the deduction, and stops only when both PTC and
  deduction change by less than $1.00. It stops without a result if the policy
  facts do not reconcile, PTC is unavailable, or 100 steps cannot converge. The
  result contains the Step 4 Form 8962 fields and Step 5 final deduction.
  Form 7206 routes the supported deduction to Schedule 1, AGI, and QBI and
  deposits a reconciliation record at Form 8962. The ordinary 1095-A path must
  reproduce every named policy/month premium and APTC plus all twelve aggregate
  premium/SLCSP/APTC rows. The AGI path independently audits the single
  Schedule C business earned income against Worksheet W, Form 1040 line 9,
  tax-exempt interest, nontaxable Social Security, Form 2555 addback, Schedule 1
  adjustments excluding line 17, and the final line 17 amount, so offsetting
  raw Worksheet X errors cannot hide behind an equal MAGI. Filing facts, MAGI
  within the IRS <$1 convergence tolerance, and exact final whole-dollar PTC
  must also match, or Form 8962 stops. The AGI-to-8962 graph thus has no
  backward edge. The raw PTC shortcut has been removed. Both simplified SEHI and
  Form 7206 require explicit Marketplace-overlap review; only the verified
  full-year Form 7206 route proceeds on positive overlap. This is a narrow
  supported path, not completion of GAP-8962. It also requires verified absence
  of other SE-income sources, Form 2555 amounts, LTC premiums, and nonspecified
  premium deductions. The 2025 Form 7206 instructions permit the Form 1040
  deduction worksheet in this one-source case, so MeF/PDF omit Form 7206 only
  for this marked route while retaining Schedule 1 and Form 8962. Partial-year
  specified coverage, multiple establishing businesses, the special Form
  8582/8814/8815/IRA/student-loan adjustments, and household statuses beyond
  single/joint also remain outside the pure W/X slice.
- Form 8962 line 10 and Publication 974 SLCSP instructions require a corrected
  Marketplace-determined benchmark after an unreported move or coverage-family
  change. That reason now has to match the review period even with zero APTC;
  the same correction also satisfies the separate no-APTC determination rule.
