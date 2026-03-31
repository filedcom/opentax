# Form 7206 — Self-Employed Health Insurance Deduction

## Purpose
Computes the above-the-line deduction for health insurance premiums paid by self-employed individuals (and eligible LTC premiums). Routes to **Schedule 1 line 17**.

## IRS References
- Form 7206 and Instructions (TY2025)
- IRC §162(l) — Special Rules for Health Insurance Costs of Self-Employed Individuals
- IRC §213(d)(10) — Eligible Long-Term Care Premiums
- Rev. Proc. 2024-40 (TY2025 LTC age limits)

## TY2025 LTC Premium Age-Based Limits (IRC §213(d)(10))
| Age | Limit |
|---|---|
| ≤40 | $480 |
| 41–50 | $900 |
| 51–60 | $1,800 |
| 61–70 | $4,810 |
| 71+ | $6,020 |

## Input Schema
- `se_net_profit` — net SE profit (cap: deduction cannot exceed SE profit)
- `health_insurance_premiums` — medical/dental/vision premiums (cannot include employer-subsidized premiums)
- `ltc_premiums` / `taxpayer_age` — LTC premiums for taxpayer + age for cap lookup
- `ltc_premiums_spouse` / `spouse_age` — LTC premiums for spouse + age
- `premium_tax_credit` — PTC received (reduces deduction; IRC §162(l)(2)(B))

## Compute Logic
1. `eligibleLtcTaxpayer = min(ltc_premiums, ltcLimit(taxpayer_age))`
2. `eligibleLtcSpouse = min(ltc_premiums_spouse, ltcLimit(spouse_age))`
3. `eligible = health_premiums + eligibleLtcTaxpayer + eligibleLtcSpouse`
4. `afterPtc = max(0, eligible - premium_tax_credit)`
5. `deduction = min(afterPtc, se_net_profit)` (cannot create SE loss)
6. Routes to `schedule1.line17_se_health_insurance`

## Output Nodes
- `schedule1` (line 17)

## Key Design Notes
- Deduction is capped at SE net profit — cannot generate a loss from self-employment.
- PTC reduction applied before the SE profit cap.
- LTC limits use first-match in age bracket array (sequential, not reversed).
