# Form 6781 — Gains and Losses From Section 1256 Contracts and Straddles

## Purpose
Applies the 60/40 rule to Section 1256 contracts (regulated futures contracts, foreign currency contracts, non-equity options). 60% of net gain/loss = long-term; 40% = short-term, regardless of actual holding period. Routes to **Schedule D**.

## IRS References
- Form 6781 and Instructions (TY2025)
- IRC §1256 — Section 1256 Contracts Marked to Market
- IRC §1256(a)(3) — 60/40 rule
- IRC §1256(f)(2) — 3-year loss carryback

## TY2025 Constants
- Long-term portion: **60%** (IRC §1256(a)(3)(A))
- Short-term portion: **40%** (IRC §1256(a)(3)(B))
- Wash sale rules do NOT apply (IRC §1256(f)(1))

## Input Schema
- `net_section_1256_gain` — aggregate mark-to-market gain/loss for the year (Form 6781 line 4); can be negative
- `prior_year_loss_carryover` — prior-year §1256 net loss carryback/carryforward applied to current year (line 5; IRC §1256(f)(2)); reduces current-year net

## Compute Logic
1. `net = net_section_1256_gain - prior_year_loss_carryover`
2. If `net = 0` → `{ outputs: [] }`
3. `ltAmount = net × 0.60` → `schedule_d.line_11_form2439`
4. `stAmount = net × 0.40` → `schedule_d.line_1a_proceeds` (cost = 0)

## Output Nodes
- `schedule_d` (line 11 for LT portion, line 1a for ST portion)

## Key Design Notes
- Both `ltAmount` and `stAmount` can be negative (losses).
- Negative amounts on `line_1a_proceeds` represent short-term capital losses.
- §1256 contracts are marked-to-market at year-end, so gains/losses are recognized annually regardless of whether positions are closed.
- `prior_year_loss_carryover` is nonnegative (always a positive number representing the prior loss).
