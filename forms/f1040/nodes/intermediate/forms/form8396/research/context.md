# Form 8396 — Mortgage Interest Credit

## Purpose
Nonrefundable credit for homeowners who received a **Mortgage Credit Certificate (MCC)** from a state or local government. Credit = mortgage interest paid × MCC rate, capped at $2,000 when rate > 20%. Routes to **Schedule 3 line 6f**.

## IRS References
- Form 8396 and Instructions (TY2025)
- IRC §25 — Interest on Certain Home Mortgages
- IRC §25(a)(2) — $2,000 cap when MCC rate > 20%
- IRC §25(e)(1) — 3-year carryforward

## TY2025 Constants
- **High-rate cap:** $2,000 (when MCC rate > 20%)
- **High-rate threshold:** 20%

## Input Schema
- `mortgage_interest_paid` — interest paid on certified indebtedness (Form 8396 line 1; from Form 1098)
- `mcc_rate` — credit rate on the MCC (e.g., 0.20 = 20%)
- `prior_year_credit_carryforward` — unused prior-year credits (up to 3 years; IRC §25(e)(1))

## Compute Logic
1. If `mortgage_interest = 0` and `carryforward = 0` → `{ outputs: [] }`
2. `tentative = mortgage_interest × mcc_rate`
3. If `mcc_rate > 0.20`: `capped = min(tentative, $2,000)`; else `capped = tentative`
4. `total = capped + carryforward`
5. If `total ≤ 0` → `{ outputs: [] }`
6. Routes to `schedule3.line6f_mortgage_interest_credit`

## Output Nodes
- `schedule3` (line 6f)

## Key Design Notes
- The allowed credit **reduces deductible mortgage interest** on Schedule A (not computed here — handled at Schedule A level).
- MCC rate stored as a decimal (0.20 = 20%), not percentage points.
- Carryforward is from prior years; the engine does not compute the current-year unused portion (that's the difference between allowed and tax liability).
