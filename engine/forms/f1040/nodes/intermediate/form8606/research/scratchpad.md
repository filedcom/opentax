# Form 8606 — Scratchpad

## Key Findings from IRS Instructions (TY2025)

### Drake Screen
- Screen code: `8606` (alias: `ROTH`)

### Three Parts

**Part I — Nondeductible Traditional IRA Contributions + Distributions**
- Line 1: nondeductible contributions this year
- Line 2: prior basis (from prior year Form 8606)
- Line 3: total basis = line 1 + line 2
- Line 6: total value of all traditional IRAs at year-end (including outstanding rollovers)
- Line 7: total distributions from traditional IRAs this year
- Line 8: conversion amounts (to Roth)
- Line 9: total of lines 6 + 7 + 8 (denominator)
- Line 10: nontaxable portion = line 3 / line 9 × (line 7 + line 8) [basis ratio]
- Line 11: nontaxable portion of conversions (= line 10 × line 8 / (line 7 + line 8))
- Line 12: nontaxable portion of distributions (= line 10 - line 11)
- Line 13: taxable portion of traditional IRA distributions = line 7 - line 12
- Line 14: remaining basis = line 3 - line 10 (carried forward)
- Line 15a: total traditional IRA distributions (for regular taxable calc)
- Line 15b: qualified disaster distributions subset
- Line 15c: taxable amount (= line 15a - line 15b)

Simplified for our node (no 15b/15c disaster complexity):
- nontaxable_ratio = basis / (year_end_value + distributions + conversions)
- nontaxable_amount = nontaxable_ratio × (distributions + conversions)
- taxable_distributions = distributions - nontaxable_of_distributions
- remaining_basis = basis - nontaxable_amount

**Part II — Conversions from Traditional IRA to Roth IRA**
- Line 16: total conversions (from line 8 if Part I done, else gross)
- Line 17: basis in conversions (nontaxable portion)
- Line 18: taxable conversion = line 16 - line 17
- Routes to f1040 line 4b (if > 0) as taxable IRA income

**Part III — Distributions from Roth IRAs**
- Line 19: total Roth IRA distributions
- Line 20: qualified first-time homebuyer expenses (up to $10,000)
- Line 21: subtract qualified distributions (line 20)
- Line 22: basis in regular Roth contributions
- Line 23: basis in conversions/rollovers
- Line 24: total Roth basis (22 + 23... actually prior basis tracking)
- Line 25a: total Roth distributions
- Line 25b: qualified disaster subset
- Line 25c: taxable Roth distributions = 25a - 25b

Simplified: Roth distributions are taxable only if they exceed total Roth basis
- roth_taxable = max(0, roth_distribution - roth_basis_contributions - roth_basis_conversions)

### Upstream Inputs (from f1099r)
- `roth_distribution` — Roth IRA distribution amount (when exclude_8606_roth=true)
- `distribution_code` — distribution code
- `roth_conversion` — Roth conversion amount (when rollover_code=C)

### Downstream Outputs
- f1040: line4b_ira_taxable (taxable traditional IRA / Roth conversion income)
- No schedule1 routing needed for this form (income flows through f1040 line 4b)

### Basis Ratio Formula (Part I, Lines 9-12)
denominator = year_end_value + total_distributions + total_conversions
nontaxable_ratio = basis / denominator (capped at 1.0)
nontaxable_amount = nontaxable_ratio × (total_distributions + total_conversions)
taxable_traditional = total_distributions - (nontaxable_amount × total_distributions/(total_distributions+total_conversions))

### What this node receives
Since f1099r routes:
- `roth_conversion` for rollover_code=C items
- `roth_distribution` for exclude_8606_roth=true items (Roth qualified/nonqualified)

For the traditional IRA nondeductible basis tracking, the user inputs:
- nondeductible contributions this year
- prior basis
- year-end IRA value
- total traditional IRA distributions (from 1099-R)
- total Roth distributions (from 1099-R)

### Output routing
- Taxable traditional IRA distributions → f1040 line4b_ira_taxable
- Taxable Roth conversions → f1040 line4b_ira_taxable
- Taxable Roth distributions → f1040 line4b_ira_taxable
