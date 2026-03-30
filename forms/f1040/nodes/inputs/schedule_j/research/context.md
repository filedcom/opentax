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

## How It Flows to Form 1040

- Schedule J line 23 → Form 1040 line 16 (income tax)
- This REPLACES the regular tax computation (qualified dividends/capital gain worksheet or tax tables)
- The f1040 output node field is `line16_income_tax` (to be added)

## Computation Architecture

The engine captures the taxpayer's completed Schedule J inputs and routes the pre-computed
`schedule_j_tax` (line 23) directly to `f1040.line16_income_tax`. The actual multi-year tax
table lookups are done offline (by the taxpayer using IRS worksheets), consistent with how
other complex IRS worksheets are handled in this engine.

## Sources
- IRS Instructions for Schedule J (Form 1040) (2025): https://www.irs.gov/instructions/i1040sj
- IRS About Schedule J: https://www.irs.gov/forms-pubs/about-schedule-j-form-1040
- Rev Proc 2024-40 (2025 inflation-adjusted items): https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
- TurboTax Schedule J explainer: https://turbotax.intuit.com/tax-tips/small-business-taxes/what-is-schedule-j-income-averaging-for-farmers-and-fishermen/amp/L3VdZ5xD1
