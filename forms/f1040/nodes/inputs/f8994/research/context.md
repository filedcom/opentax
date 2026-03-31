# Form 8994 — Employer Credit for Paid Family and Medical Leave (IRC §45S)

## Purpose
Allows eligible employers to claim a credit equal to a percentage of wages paid to qualifying employees during Family and Medical Leave Act (FMLA) leave. Credit flows to **Schedule 3 line 6z** (general business credit).

## IRS References
- Form 8994 and Instructions (TY2025)
- IRC §45S — Employer Credit for Paid Family and Medical Leave
- Rev. Proc. 2024-40 (TY2025 parameters)

## TY2025 Constants
- **Base rate:** 12.5% (when wage replacement = 50%)
- **Rate increment:** +0.25% per percentage point above 50%
- **Maximum rate:** 25% (when wage replacement = 100%)
- **Minimum wage replacement:** 50% to qualify

## Input Schema
- `employees[]` — per-employee data:
  - `fmla_wages` — wages paid during leave
  - `wage_replacement_pct` — fraction of normal wages paid (0.50–1.00)
  - `weeks_leave` — optional, informational

## Compute Logic
1. `creditRate(wagePct)` — returns 0 if < 50%; else `min(12.5% + (points above 50%) × 0.25%, 25%)`
2. `employeeCredit(e)` — `round(fmla_wages × creditRate)`
3. `totalCredit(employees)` — sum across all employees
4. Emit `{ line6z_general_business_credit: credit }` to Schedule 3 if credit > 0

## Output Nodes
- `schedule3` (line 6z)

## Key Design Notes
- `wage_replacement_pct` is stored as a decimal (0.50 = 50%), not percentage points.
- `pointsAbove50 = round((wagePct - 0.50) × 100)` — uses `Math.round` to handle float precision.
- Credit is rounded to whole dollars via `Math.round`.
