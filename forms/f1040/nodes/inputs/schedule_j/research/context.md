# Schedule J: Income Averaging for Farmers and Fishermen — Context Summary

## What Schedule J Is

Schedule J (Form 1040) allows farmers and fishermen to elect income averaging — spreading
current-year farm/fishing income over the three prior tax years (base years) to reduce their
overall tax. This benefits taxpayers whose farm income spikes in a high-income year while
their prior years had lower (or zero) income that did not fully utilize lower tax brackets.

## How It Works

1. **Elect Farm Income (EFI):** The taxpayer chooses how much of their current-year taxable
   farm/fishing income to "average." This amount (line 2a) can be any amount up to their
   total farm taxable income.

2. **Non-farm tax:** Tax is computed normally on (current taxable income − EFI) using current
   year rates (line 4).

3. **Distribute EFI across 3 base years:** EFI/3 is added to each base year's taxable income.
   The incremental tax (tax with EFI/3 added vs. tax without) is computed using that base year's
   historical tax rates.

4. **Sum incremental taxes:** The three incremental base-year taxes are summed (line 17).

5. **Total Schedule J tax:** Line 23 = non-farm tax (line 4) + sum of incremental taxes (line 17).
   This replaces the regular tax on Form 1040 line 16.

## TY2025 Specifics

- **Base years:** 2022, 2023, 2024
- **Standard deductions (2025):** $15,000 single, $30,000 MFJ (Rev Proc 2024-40)
- **Rate tables:** Rev Proc 2024-40 governs 2025 rates; prior years use their own Rev Procs
- **Schedule J result → Form 1040 line 16** (replaces the normal tax computation entirely)

## All Fields

| Field | IRS Line | Description |
|---|---|---|
| elected_farm_income | Line 2a | Amount of current-year farm/fishing taxable income elected for averaging |
| elected_farm_income_capital_gain | Line 2b | Portion of EFI that is net capital gain from farming/fishing (optional) |
| prior_year_taxable_income_py1 | Line 5 | 2022 taxable income (base year 1) |
| prior_year_taxable_income_py2 | Line 9 | 2023 taxable income (base year 2) |
| prior_year_taxable_income_py3 | Line 13 | 2024 taxable income (base year 3) |
| schedule_j_tax | Line 23 | Computed Schedule J tax (taxpayer calculates using IRS worksheets) |

## Filing status

Active Schedule J elections currently fail closed. The supplied `schedule_j_tax` is
not reconciled to the three base-year tax worksheets, so it must not be routed
to Form 1040 line 16 as if verified. The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
also require line 10 tax to be refigured without Schedule J.

## Computation Architecture

The input schema captures Schedule J facts, but the graph has no source-backed
2022-2024 base-year tax computation or reconciliation of line 23. The preparatory
input node therefore throws for a nonzero elected farm income rather than
emitting an unverified tax amount. Future work must calculate or verify lines
4, 8, 12, 16, and 19-23, including prior-year Schedule J use and special-rate
worksheets, then route Form 1040 line 16 and the Form 6251 non-Schedule-J refigure.

## Sources
- IRS Instructions for Schedule J (Form 1040) (2025): https://www.irs.gov/instructions/i1040sj
- IRS About Schedule J: https://www.irs.gov/forms-pubs/about-schedule-j-form-1040
- Rev Proc 2024-40 (2025 inflation-adjusted items): https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
- TurboTax Schedule J explainer: https://turbotax.intuit.com/tax-tips/small-business-taxes/what-is-schedule-j-income-averaging-for-farmers-and-fishermen/amp/L3VdZ5xD1
