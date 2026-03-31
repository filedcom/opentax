# Schedule R — Credit for the Elderly or the Disabled

## Purpose
Calculates the nonrefundable credit for taxpayers who are age 65+ or permanently and totally disabled. Credit flows to **Schedule 3 line 6d**.

## IRS References
- Schedule R and Instructions (TY2025)
- IRC §22 — Credit for the Elderly and the Permanently and Totally Disabled
- Rev. Proc. 2024-40 (TY2025 — these amounts are statutory, not inflation-adjusted)

## TY2025 Base Amounts (IRC §22(c)(2)(A))
| Filing Status | Initial Amount |
|---|---|
| Single / HOH | $5,000 |
| MFJ (both qualify) | $7,500 |
| MFJ (one qualifies) | $5,000 |
| MFS | $3,750 |
| QSS | $7,500 |

## TY2025 AGI Phaseout Thresholds (IRC §22(d)(1))
| Filing Status | Threshold |
|---|---|
| Single / HOH | $7,500 |
| MFJ / QSS | $10,000 |
| MFS | $5,000 |

## Input Schema
- `filing_status` — `FilingStatus` enum
- `taxpayer_age_65_or_older` / `spouse_age_65_or_older` — age qualification
- `taxpayer_disabled` / `spouse_disabled` — disability qualification
- `taxpayer_disability_income` / `spouse_disability_income` — disability income for cap (under-65 disabled only)
- `agi` — AGI for phaseout
- `nontaxable_ssa` / `nontaxable_pension` / `nontaxable_va` — nontaxable benefit reductions

## Compute Logic (5 steps)
1. **`initialAmount`** — determine base by filing status and qualification (age or disability)
2. **`capByDisabilityIncome`** — if qualifying via disability (not age), cap initial amount at disability income
3. **`reduceByNontaxableBenefits`** — subtract nontaxable SSA + pension + VA benefits
4. **`agiPhaseout`** — reduce by 50% of AGI excess over threshold
5. **Final credit** = `round(amount × 15% × 100) / 100`

## Output Nodes
- `schedule3` (line 6d)

## Key Design Notes
- MFJ logic: `tQual && sQual → $7,500`; `tQual XOR sQual → $5,000`; neither → $0.
- Disability income cap only applies to taxpayers who qualify **solely via disability** (not age 65+).
- Returns `{ outputs: [] }` when credit is 0 (no output emitted).
- Credit is rounded to 2 decimal places (cents).
