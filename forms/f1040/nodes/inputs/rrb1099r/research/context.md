# RRB-1099-R — Railroad Retirement Board Pension, Annuity, and Retirement Benefits

## Purpose
Reports railroad retirement benefits from the Railroad Retirement Board (RRB). Contains **two distinct income streams** with different tax treatment:
- **SSEB / Tier 1 SS-equivalent** → treated like Social Security → Form 1040 line 6a
- **Non-SSEB / Tier 2 pension** → treated like pension/annuity → Form 1040 lines 5a/5b

## IRS References
- IRS Pub. 575 (2025), "Railroad Retirement Benefits" section
- IRS Pub. 915 (2025), "Tier 1 Railroad Retirement Benefits" section
- IRC §72(d)(1) — Simplified Method cost recovery
- RRB-1099-R Instructions (TY2025)

## Simplified Method Age Table (Pub. 575 Table 1; IRC §72(d)(1)(B)(iv))
| Age at Annuity Start | Expected Months |
|---|---|
| ≤55 | 360 |
| 56–60 | 310 |
| 61–65 | 260 |
| 66–70 | 210 |
| 71+ | 160 |

## Input Schema (per item)
- `box3_sseb_gross` — gross SSEB/Tier 1 SS-equivalent benefit
- `box4_sseb_repaid` — SSEB/Tier 1 benefit repaid to RRB
- `box5_sseb_net` — net SSEB (precomputed by RRB; overrides box3−box4)
- `box6_medicare_premiums` — Medicare Part B premiums (informational only)
- `box7_sseb_withheld` — federal withholding from SSEB/Tier 1
- `box8_tier2_gross` — gross non-SSEB (Tier 2) pension/annuity amount
- `box9_tier2_taxable` — taxable non-SSEB (fallback when SM not applicable)
- `box10_tier2_withheld` — federal withholding from Tier 2
- `box2a_taxable_amount` — SM taxable amount (highest priority override)
- `box5b_employee_contributions` — employee cost in contract for SM cost recovery
- `simplified_method_flag`, `age_at_annuity_start`, `prior_excludable_recovered` — SM fields

## Compute Logic
### SSEB (line 6a)
`netSseb = box5_sseb_net ?? max(0, box3 - box4)` — sum across all items → `line6a_ss_gross`

### Tier 2 Taxable (lines 5a/5b)
Priority: `box2a_taxable_amount` > Simplified Method calc > `box9_tier2_taxable` > `box8_tier2_gross`

**SM calc:** `annualExclusion = min((cost - priorRecovered) / months × 12, gross)` → `taxable = gross - exclusion`

### Withholding (line 25b)
`sum(box7_sseb_withheld + box10_tier2_withheld)` → `line25b_withheld_1099`

## Output Nodes
- `f1040` (lines 5a, 5b, 6a, 25b)

## Key Design Notes
- `box6_medicare_premiums` is parsed but not used in any computation (informational).
- All three Tier 2 taxable priority levels handled in `effectiveTier2Taxable()`.
- `line5a_pension_gross` only emitted when gross > 0; `line5b_pension_taxable` always emitted when Tier 2 items exist.
