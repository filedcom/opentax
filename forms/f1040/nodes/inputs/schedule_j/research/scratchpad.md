# Schedule J Research Scratchpad

## Sources
- IRS Instructions for Schedule J (Form 1040) (2025): https://www.irs.gov/instructions/i1040sj
- IRS About Schedule J page: https://www.irs.gov/forms-pubs/about-schedule-j-form-1040
- Rev Proc 2024-40: https://www.irs.gov/pub/irs-drop/rp-24-40.pdf (2025 inflation-adjusted rates)

## Schedule J Field-by-Field Notes (2025 Filing Year = TY2025)

### Part I — Election to Average Farm Income

**Line 1** — Name(s) shown on return + SSN (header fields, not data fields)

**Line 2a** — Elected Farm Income (EFI)
- Amount of taxable income from farming/fishing that taxpayer ELECTS to average
- Must be <= current year taxable income from farming/fishing
- Can be less than 100% of farm income (taxpayer chooses how much to elect)

**Line 2b** — Portion of EFI that is net capital gain from farming/fishing
- Optional field (only if there is farming capital gain within EFI)

**Line 2c** — Smaller of line 2b or unrecaptured §1250 gain from farming/fishing
- Relevant for capital gain tax rate calculation

**Line 3** — Subtract line 2a from Form 1040 line 15 (taxable income minus EFI)
= Non-farm portion of taxable income for 2025

**Line 4** — Tax on line 3 amount (using 2025 rates)
= The "regular" tax on non-farm income only

### Part II — Figure the Tax

For each base year, the pattern is the same:

**2022 Base Year (Lines 5-8):**
- Line 5: Prior year (2022) taxable income (from 2022 return)
- Line 6: Line 5 + (Line 2a / 3)  [2022 income + 1/3 of EFI]
- Line 7: Tax on line 6 using 2022 tax rates
- Line 8: Line 7 - tax on line 5 using 2022 rates = incremental tax for 2022

**2023 Base Year (Lines 9-12):**
- Line 9: Prior year (2023) taxable income
- Line 10: Line 9 + (Line 2a / 3)
- Line 11: Tax on line 10 using 2023 rates
- Line 12: Line 11 - tax on line 9 using 2023 rates = incremental tax for 2023

**2024 Base Year (Lines 13-16):**
- Line 13: Prior year (2024) taxable income
- Line 14: Line 14 + (Line 2a / 3)
- Line 15: Tax on line 14 using 2024 rates
- Line 16: Line 15 - tax on line 13 = incremental tax for 2024

**Line 17** — Sum of lines 8 + 12 + 16 (total incremental base year tax)

**Line 18** — Line 17 ÷ 3  ... Wait, actually per IRS instructions:
  Schedule J line 23 = line 4 + line 17
  (Non-farm tax + sum of base year incremental taxes)

  Actually the IRS instruction source says:
  - Line 17: total from three base year incremental taxes
  - Line 23: final averaged tax → goes to Form 1040, line 16

**Line 23** — Final Schedule J tax → REPLACES Form 1040 line 16

### The Core Math

If taxpayer has:
- 2025 taxable income = TI
- Elected farm income = EFI
- 2022 prior year TI = PY1
- 2023 prior year TI = PY2
- 2024 prior year TI = PY3

Then:
1. Non-farm TI = TI - EFI
2. Tax on non-farm TI at 2025 rates = T_nonfarm
3. For each base year i: incremental tax = tax(PYi + EFI/3, year_i_rates) - tax(PYi, year_i_rates)
4. Total incremental = sum of 3 incremental taxes
5. Schedule J tax = T_nonfarm + total_incremental → goes to Form 1040 line 16

## Key TY2025 Facts
- TY2025 base years: 2022, 2023, 2024
- 2025 standard deduction: $15,000 single, $30,000 MFJ
- Rev Proc 2024-40 governs 2025 inflation-adjusted tax rates
- Schedule J result goes to Form 1040 line 16 (income tax)
- Schedule J is optional — taxpayer elects to use it only if it reduces tax

## What the Node Captures

Since the IRS worksheets compute the actual tax at historical rates (complex multi-year lookups),
the input node captures:
1. All inputs needed to describe the Schedule J election
2. The COMPUTED result (schedule_j_tax) that the taxpayer calculated using IRS worksheets
3. Routes the result to f1040 line 16

The node does NOT need to replicate the full tax rate table lookups for 3+ tax years.
Instead it accepts the pre-computed result, just like a taxpayer would enter on the form.

## Fields for Input Schema

- elected_farm_income: number (EFI - line 2a)
- elected_farm_income_capital_gain: number optional (line 2b - portion that is net cap gain)
- prior_year_taxable_income_py1: number (2022 TI - line 5)
- prior_year_taxable_income_py2: number (2023 TI - line 9)
- prior_year_taxable_income_py3: number (2024 TI - line 13)
- schedule_j_tax: number (line 23 result — what goes to Form 1040 line 16)
