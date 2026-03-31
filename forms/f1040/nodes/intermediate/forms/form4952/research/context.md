# Form 4952 — Investment Interest Expense Deduction

## Purpose
Limits the deduction for investment interest expense (e.g., margin interest) to net investment income. Any disallowed excess carries forward to future years. Routes deductible amount to **Schedule A line 9**.

## IRS References
- Form 4952 and Instructions (TY2025)
- IRC §163(d) — Limitation on Investment Interest

## Input Schema
- `investment_interest_expense` — current-year investment interest paid (Form 4952 line 1)
- `net_investment_income` — ceiling for deduction; includes interest, ordinary dividends, ST cap gains, and any LT gains/qualified dividends the taxpayer elects to treat as investment income (Form 4952 line 4g election)
- `prior_year_carryforward` — prior-year disallowed interest carried forward (line 2; IRC §163(d)(2))

## Compute Logic
1. `totalInterest = investment_interest_expense + prior_year_carryforward`
2. If total = 0 → `{ outputs: [] }`
3. `deductible = min(totalInterest, net_investment_income)` (Form 4952 line 6; IRC §163(d)(1))
4. If deductible = 0 → `{ outputs: [] }`
5. Routes `deductible` to `scheduleA.line_9_investment_interest`

## Output Nodes
- `scheduleA` (line 9)

## Key Design Notes
- Carryforward is computed externally (prior year disallowed = total - deductible); this node does not expose a carryforward output field.
- `net_investment_income` includes the taxpayer's election to include LT cap gains/qualified dividends — provided pre-computed.
- No inflation-adjusted thresholds — purely the min(interest, NII) rule.
