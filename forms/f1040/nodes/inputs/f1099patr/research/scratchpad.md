# f1099patr Research Scratchpad

## Key Findings from Implementation

### Source: index.ts (existing implementation)
- Node type: `f1099patr`
- Arrays of items (`f1099patrs`), min 1 item
- Output nodes: `schedule1`, `f1040`

### Box-by-Box Analysis

| Box | Field name | Routes to | Condition |
|-----|-----------|-----------|-----------|
| 1 | box1_patronage_dividends | schedule1.line8z_other_income | trade_or_business !== true |
| 2 | box2_nonpatronage_distributions | schedule1.line8z_other_income | trade_or_business !== true |
| 3 | box3_per_unit_retain | schedule1.line8z_other_income | trade_or_business !== true |
| 4 | box4_federal_withheld | f1040.line25b_withheld_1099 | total > 0 |
| 5 | box5_redeemed_nonqualified | (none currently) | informational |
| 6 | box6_dpad | (none) | expired after 2017 |
| 7 | box7_qualified_payments | (none) | informational for §199A (Form 8995/8995-A) |
| 8 | box8_qualified_written_notice | (none) | informational |
| 9 | box9_section199a_deduction | (none) | cooperative-level deduction, informational |

### Business vs. Non-Business Routing
- `trade_or_business: true` → boxes 1/2/3 do NOT route to Schedule 1 other income
  → they route to Schedule C or Schedule F in the full implementation (not yet implemented)
- `trade_or_business: false` (or omitted) → routes to Schedule 1 line 8z

### Aggregation
- All non-business boxes 1+2+3 summed into a single schedule1 output
- All box4 withheld summed into a single f1040 output

### IRC References
- §1385 — Amounts included in patron's gross income
- §1388 — Definitions (patronage dividends, per-unit retain allocations)
- §199A(g) — Cooperative-level deduction for qualified cooperative dividends
- §199A(b)(7) — Reduction of §199A deduction for cooperative distributions
- DPAD (§199(a)) — Expired 12/31/2017; box 6 is legacy

### IRS Form References
- Form 1099-PATR instructions (IRS): https://www.irs.gov/instructions/i1099patr
- Pub. 225 (Farmer's Tax Guide) covers cooperative distributions for farmers
- Pub. 334 (Tax Guide for Small Business)

### Drake Screen
- Drake uses screen "99P" for 1099-PATR entries

### TY2025 Constants
- No inflation-adjusted thresholds apply to this form directly
- §199A thresholds ($197,300 single / $394,600 MFJ) apply downstream in Form 8995/8995-A, not in this node
- No backup withholding rate change for TY2025 (rate = 24% — statutory)

## Gaps / Open Questions
1. Box 5 (redeemed nonqualified): does it have a current-year output? Currently schema captures it but no routing in compute().
2. Box 9 (§199A(g) deduction): needs routing to Form 8995 or 8995-A when implemented.
3. Business income routing (Schedule C / Schedule F) is deferred — node currently only handles non-business items.
