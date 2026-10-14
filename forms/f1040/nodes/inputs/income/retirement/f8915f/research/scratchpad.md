# Form 8915-F — Scratchpad

## Purpose
Form 8915-F is the permanent form for qualified disaster retirement plan distributions and repayments. Replaces annual 8915-A through 8915-E forms. Allows taxpayers to spread disaster distributions over 3 years (elect 1/3 per year), waives 10% early withdrawal penalty, and tracks repayments that can offset income or create a credit.

## Fields identified
- disaster_type: string/enum — COVID-19 or other qualified disaster
- distribution_year: year the distribution was taken
- total_distribution: total qualified disaster distribution
- amount_reported_prior_year1: amount of distribution included in income in year 1
- amount_reported_prior_year2: amount included in income in year 2
- repayments_this_year: repayments made during the current tax year
- elect_full_inclusion: boolean — elect to include all income in current year rather than spreading

## Resolved Questions
- [x] What fields? See above
- [x] Where does each flow? — taxable portion to f1040 (line 4b or other income); repayment credit to schedule3
- [x] TY2025 constants? — $100K cap on qualified distributions; 3-year spread default
- [x] Edge cases? — elect_full_inclusion; repayment > reportable creates credit; spreading complete if both prior year amounts match total
- [x] Upstream nodes? — INPUT node

## Sources checked
- [x] Rev Proc 2021-30 — guidance on Form 8915-F
- [x] IRC §72(t)(2)(G) — exception to 10% penalty
- [x] Notice 2020-50 — COVID-19 distributions
- [x] IRS Form 8915-F instructions
