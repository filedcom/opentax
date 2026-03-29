# Form 8889 — Scratchpad

## Drake Screen
- Screen code: `8889` (alias: `HSA`)
- filed_tax_node_type_code: `form8889`

## Key IRS Rules (TY 2025)

### Contribution Limits (IRC §223(b))
- Self-only HDHP: $4,300
- Family HDHP: $8,550
- Catch-up (age 55+, not enrolled in Medicare): +$1,000

### Part I — Contributions & Deduction
1. Coverage type determines annual limit
2. Taxpayer contributions + employer contributions (W-2 Box 12 Code W) <= annual limit
3. Personal deduction = taxpayer contributions (not employer)
4. Excess contributions → form5329 Part VII (excess_hsa)

### Part II — Distributions
- Line 14a: Total distributions (from 1099-SA)
- Line 14b: Qualified medical expenses (excludable)
- Line 15: Taxable distributions = 14a - 14b (subject to income + 20% penalty)
- Line 17: Qualified HSA funding distributions (from IRA) — not subject to penalty
- Line 19: Amount subject to 20% additional tax
- Line 20: 20% additional tax → Schedule 2 Line 17b

### Output Routing
- Deduction (Part I result): Schedule 1 Line 13
- Non-qualified distributions (taxable): Schedule 1 Line 8z (other income)
- 20% penalty: Schedule 2 Line 17b (new field: line17b_hsa_penalty)
- Excess contributions: form5329 excess_hsa

## Upstream Inputs
- `employer_hsa_contributions`: from W-2 Box 12 Code W (via w2 node)
- Direct input fields: coverage_type, taxpayer_contributions, distributions, qualified_expenses, age_55_or_older

## Notes
- Employer contributions reduce the available personal contribution limit
- If taxpayer + employer contributions > limit → excess → form5329
- Qualified distributions: no tax, no penalty
- Non-qualified distributions: ordinary income + 20% penalty (with exceptions)
- Exceptions to 20% penalty: death, disability, Medicare enrollment, etc.
