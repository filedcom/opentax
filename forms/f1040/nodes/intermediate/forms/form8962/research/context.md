# Form 8962 — Premium Tax Credit (PTC)

## Purpose
Reconciles Advance Premium Tax Credits (APTC) against the actual allowable PTC based on household income and size. Net PTC flows to **Schedule 3 line 9** (refundable); excess APTC repayment flows to **2025 Schedule 2 line 1a**.

## IRS References
- [2025 Form 8962](https://www.irs.gov/pub/irs-pdf/f8962.pdf) and [2025 instructions](https://www.irs.gov/instructions/i8962)
- IRC §36B — Refundable Credit for Coverage Under a Qualified Health Plan
- ARP Act §9661 — extended through TY2025 (no 400% FPL cliff)
- IRS 2025 Instructions for Form 8962, Tables 1-1 through 1-3, 2, and 5

## TY2025 Constants
- **FPL (2024 values used for TY2025):** 48 states/DC $15,060 + $5,380 per additional person; Alaska $18,810 + $6,730; Hawaii $17,310 + $6,190.
- **Applicable figure:** 0.0000 through 150% FPL, 0.0200 at 200%, 0.0400 at 250%, 0.0600 at 300%, and 0.0850 at 400% or more. Line 5 drops the fractional percentage and uses 401 above 400% FPL.
- **Repayment limits:** Single $375/$975/$1,625; all other filing statuses $750/$1,950/$3,250, for under 200%, 200–299%, and 300–399% FPL respectively. No cap at 400% or more.

## Applicable Percentage Table
| Line 5 (% FPL) | Applicable figure |
|---|---|
| 100–150 | 0.0000 |
| 151–300 | Rises 0.0004 per whole percentage point, reaching 0.0600 at 300 |
| 301–399 | Rises to 0.0848 at 399, rounded to four decimal places per Table 2 |
| 400 or 401 | 0.0850 |

## Input Schema
- `household_size` — for FPL calculation
- `taxpayer_modified_agi` — Form 8962 line 2a from the return and Worksheet 1-1
- `dependents_modified_agi` — line 2b from dependents who must file because income meets the filing threshold
- `dependent_income_complete` — confirms filing-status facts were supplied for every claimed dependent
- `below_100_fpl_status` — documented Marketplace-estimate or lawful-presence qualification, or reviewed non-applicable-taxpayer status; the Marketplace-estimate route also requires paid APTC
- `mfs_ptc_status` — documented abuse or abandonment exception with the three-year limit, or reviewed no-exception status, identifying whether each policy is family-only or shared with the spouse
- `shared_policy_allocations` — Form 1095-A-derived Part IV rows for Situation 1 divorce, Situation 2 MFS, Situation 3 no APTC, and Situation 4 other shared families, including the other taxpayer, policy, months, and applicable percentage columns. A 1095-A source can carry multiple nonoverlapping `shared_policy_periods` on one policy, including an explicit `family_only` period that uses the full source premium and APTC and a separately supplied coverage-family SLCSP without creating a Part IV row.
- `fpl_region` — contiguous states/DC, Alaska, or Hawaii
- `annual_premium` / `annual_slcsp` / `annual_aptc` — annual totals (when no monthly detail)
- `monthly_premiums` / `monthly_slcsps` / `monthly_aptcs` — monthly arrays (12 elements each; preferred for mid-year coverage changes)

## Compute Logic
1. Compute the regional FPL and whole-number line 5 percentage.
2. Look up the 2025 Table 2 applicable figure and round line 8a contribution to whole dollars.
3. For annual coverage, line 11e is the smaller of enrollment premium or positive SLCSP less contribution. For monthly coverage, compute each covered month with rounded line 8b contribution, then add its line (e) values.
4. Reconcile line 24 PTC with line 25 APTC. A positive difference goes to Schedule 3 line 9; excess APTC is limited by 2025 Table 5 and goes to Schedule 2 line 1a.
5. Retain calculated lines on the Form 8962 MeF document so the attachment and return line agree.

## Output Nodes
- `schedule3` (line 9 — net PTC when owed to taxpayer)
- `schedule2` (line 1a — excess APTC repayment)
- `form8962` (calculated MeF lines and annual/monthly groups)

## Key Design Notes
- Monthly source columns are preserved, including an explicitly all-zero APTC column, and use the monthly MeF branch.
- Annual line 11 is used only when every policy has twelve monthly premium and SLCSP values proving full-year unchanged coverage under IRS line 10. Annual totals alone are rejected; changed monthly amounts use lines 12–23.
- When policies are combined, a monthly policy cannot be mixed with an annual-only policy because the annual-only amounts would disappear from the monthly calculation.
- For multiple covered policies, Form 1095-A routing uses one SLCSP per state per month, adds SLCSP across different states, and rejects missing coverage states or conflicting same-state benchmarks.
- QSEHRA requires monthly affordability and permitted-benefit facts, so both annual and monthly QSEHRA inputs are rejected. MFS family-only policies use explicit exception or no-exception facts; the former claims the PTC and marks Form 8962 line A, while the latter reconciles APTC only. MFS Situation 2 shared policies use monthly Form 1095-A amounts, the statutory 50% allocation, and the separately verified coverage-family SLCSP for exception filers. Situation 1 divorce uses the agreed common percentage or statutory 50% without agreement. Situation 3 no-APTC allocates premiums by the exact ratio of the two coverage-family SLCSP values, uses the taxpayer's own SLCSP, and leaves Part IV columns (f) and (g) blank. Situation 4 uses the agreed common percentage or the enrolled-person ratio without agreement. Ratio-derived Part IV percentages are rounded to two places without rounding the underlying monetary ratio. Zero-percent rows remain on Form 8962. Changing allocation periods, coverage outside stated allocation months, and more than four Part IV rows still stop explicitly.
- Marketplace coverage below 100% of the FPL uses zero applicable contribution only with all facts for the estimated-income or lawful-presence exception. The estimated-income route also checks that APTC was paid. A reviewed non-applicable taxpayer who cannot be claimed as a dependent, has no shared policy, no unlawfully present covered person, no self-employed health-insurance deduction, and no alternative marriage calculation instead reports no PTC, only APTC in the annual or monthly MeF group, and the Table 5 capped repayment; without APTC, Form 8962 is not filed. An unreviewed or special case still stops.
- ARP extension: 400% FPL cliff is eliminated through TY2025; no hard cutoff.
- Both positive and negative scenarios handled in a single `compute()` call (can only emit one of the two outputs).
- SLCSP = Second Lowest Cost Silver Plan (the benchmark plan for credit calculation).
- This is not whole-form support. The new shared-policy cases are written but untested under the build-first workflow. The TY2025v5.4 IRS8962 XML schema permits 99 repeated Part IV groups, so the electronic build carries every row through that limit and marks line 34 No after four rows. This is an inference from the schema plus the 2025 instructions, not an ATS acceptance result. The 2025 PDF descriptor now covers calculated lines, monthly rows, and four Part IV rows using fields inspected on the source form, but it has not had filled-render QA and stops on a fifth allocation because the printable overflow statement is not built. Alternative marriage calculation, QSEHRA and self-employed insurance interactions, and IRS business rules still need a complete audit.
