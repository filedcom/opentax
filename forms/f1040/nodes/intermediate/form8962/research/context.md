# Form 8962 — Premium Tax Credit (PTC)

## Purpose
Reconciles Advance Premium Tax Credits (APTC) against the actual allowable PTC based on household income and size. Net PTC flows to **Schedule 3 line 9** (refundable); excess APTC repayment flows to **Schedule 2 line 2**.

## IRS References
- Form 8962 and Instructions (TY2025)
- IRC §36B — Refundable Credit for Coverage Under a Qualified Health Plan
- ARP Act §9661 — extended through TY2025 (no 400% FPL cliff)
- Rev. Proc. 2024-xx (TY2025 applicable percentage table)

## TY2025 Constants
- **FPL base (2024):** $15,060; increment per person: $5,380
- **Applicable contribution table:** linear interpolation within brackets; above 400% FPL = 8.5% (ARP extension through TY2025)

## Applicable Percentage Table
| Income (% FPL) | Min Contrib | Max Contrib |
|---|---|---|
| 100–133% | 2.0% | 2.0% |
| 133–150% | 3.0% | 4.0% |
| 150–200% | 4.0% | 6.0% |
| 200–250% | 6.0% | 8.5% |
| 250–400% | 8.5% | 8.5% |
| 400%+ | 8.5% | 8.5% |

## Input Schema
- `household_size` — for FPL calculation
- `household_income` — MAGI for PTC
- `annual_premium` / `annual_slcsp` / `annual_aptc` — annual totals (when no monthly detail)
- `monthly_premiums` / `monthly_slcsps` / `monthly_aptcs` — monthly arrays (12 elements each; preferred for mid-year coverage changes)

## Compute Logic
1. `fpl = $15,060 + $5,380 × (size - 1)`
2. `incomePct = (income / fpl) × 100`
3. `contrib = applicableContributionPct(incomePct)` — interpolated within bracket
4. If below 100% FPL: `contrib = Infinity` → no PTC; repay APTC
5. `applicablePremium = income × contrib`
6. `maxPtc = max(0, slcsp - applicablePremium)`
7. `allowedPtc = min(maxPtc, actualPremium)`
8. `netPtc = allowedPtc - aptc`
9. If `netPtc >= 0` → emit `schedule3.line9_premium_tax_credit = round(netPtc)`
10. If `netPtc < 0` → emit `schedule2.line2_excess_advance_premium = round(-netPtc)`

## Output Nodes
- `schedule3` (line 9 — net PTC when owed to taxpayer)
- `schedule2` (line 2 — excess APTC repayment)

## Key Design Notes
- Monthly arrays take priority over annual totals.
- ARP extension: 400% FPL cliff is eliminated through TY2025; no hard cutoff.
- Both positive and negative scenarios handled in a single `compute()` call (can only emit one of the two outputs).
- SLCSP = Second Lowest Cost Silver Plan (the benchmark plan for credit calculation).
