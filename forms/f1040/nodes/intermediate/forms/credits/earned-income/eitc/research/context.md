# EITC — Earned Income Tax Credit

## Purpose
Refundable credit for low-to-moderate income workers. Phases in with earned income, reaches a maximum, then phases out above an income threshold. Flows to **Form 1040 line 27**.

## IRS References
- Form 1040 Instructions (TY2025), EITC section
- IRC §32 — Earned Income Credit
- Rev. Proc. 2024-40 (TY2025 tables)

## TY2025 Tables (Rev. Proc. 2024-40)
| Children | Max Credit | Phase-in Rate | Phase-in Ends | Phaseout Rate |
|---|---|---|---|---|
| 0 | $649 | 7.65% | $8,490 | 7.65% |
| 1 | $4,328 | 34% | $12,730 | 15.98% |
| 2 | $7,152 | 40% | $17,880 | 21.06% |
| 3+ | $8,046 | 45% | $17,880 | 21.06% |

Investment income limit: **$11,950** (IRC §32(i))

## Input Schema
- `earned_income` — wages + net SE income (after ½ SE tax deduction)
- `agi` — adjusted gross income (phaseout uses higher of earned income or AGI)
- `qualifying_children` — 0, 1, 2, or 3 (3+ treated identically)
- `filing_status` — determines phaseout thresholds (joint filers get higher thresholds)
- `investment_income` — if > $11,950, no EITC

## Compute Logic
1. `clampChildren(n)` — caps at 3
2. Investment income disqualifier: if > $11,950, return 0
3. Must have earned income > 0
4. Income limit check: higher of earned income or AGI vs. income limit table → 0 if exceeded
5. `phaseInCredit(earnedIncome, children)` — `min(rate × earned, maxCredit)`
6. `phaseOutCredit(credit, max(earned, agi), children, isJoint)` — reduce by `rate × excess over threshold`
7. `Math.round(finalCredit)`

## Output Nodes
- `f1040` (line 27)

## Key Design Notes
- Phaseout uses `max(earned_income, agi)` — whichever is higher (prevents gaming via large losses).
- 3+ children all use the same row (3) in all tables.
- Joint filer status = MFJ or QSS.
- Returns 0 and empty outputs when any disqualification condition is met.
