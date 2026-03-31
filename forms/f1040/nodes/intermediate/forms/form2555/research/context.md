# Form 2555 — Foreign Earned Income Exclusion

## Purpose
Allows U.S. citizens and resident aliens working abroad to exclude foreign earned income and housing from U.S. taxable income. Routes exclusions to **Schedule 1 line 8d** as negative adjustments.

## IRS References
- Form 2555 and Instructions (TY2025)
- IRC §911 — Citizens or Residents of the United States Living Abroad
- IRS Pub. 54 (2025), Tax Guide for U.S. Citizens Abroad
- Rev. Proc. 2024-40

## TY2025 Constants
- **FEIE limit:** $130,000 (IRC §911(b)(2)(D)(i); Rev. Proc. 2024-40)
- **Physical presence test:** ≥ 330 full days in foreign country in any 12-month period (IRC §911(d)(1)(B))

## Qualification Tests (either satisfies)
1. **Physical presence:** `days_in_foreign_country >= 330`
2. **Bona fide residence:** full-year resident of foreign country (`bona_fide_resident = true`)

## Input Schema
- `foreign_wages` — foreign salary/wages (§911(b)(1))
- `foreign_self_employment_income` — foreign SE income
- `days_in_foreign_country` — for physical presence test
- `bona_fide_resident` — for bona fide residence test
- `foreign_housing_expenses` — taxpayer-paid housing expenses (§911(c)(2)); currently parsed but not directly routed
- `employer_housing_exclusion` — employer-provided housing exclusion (Form 2555 line 44)

## Compute Logic
1. If no foreign income and no employer housing exclusion → `{ outputs: [] }`
2. If neither qualification test met → `{ outputs: [] }`
3. `earnedIncomeExclusion = min(foreign_wages + foreign_SE_income, $130,000)` → `line8d_foreign_earned_income_exclusion`
4. `employer_housing_exclusion` → `line8d_foreign_housing_deduction`

## Output Nodes
- `schedule1` (line 8d — two separate fields: FEIE and housing deduction)

## Key Design Notes
- `foreign_housing_expenses` (taxpayer-paid) is parsed but not currently routed (deferred to future iteration with full §911(c) calculation).
- Exclusion routes as a positive value; Schedule 1 treats `line8d_foreign_earned_income_exclusion` as a reduction to income.
- FEIE limit is statutory; updated annually via Rev. Proc.
