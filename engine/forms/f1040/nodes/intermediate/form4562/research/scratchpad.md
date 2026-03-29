# Form 4562 Scratchpad

## Key findings from IRS instructions (TY2025)

### Section 179 (Part I)
- Line 1: Maximum §179 deduction = $2,500,000 (TY2025, per P.L. 119-21 / "One Big Beautiful Bill Act")
- Line 2: Total cost of §179 property placed in service
- Line 3: Phase-out threshold = $4,000,000 — reduction is dollar-for-dollar above this
- Line 5: Business income limitation (taxable income from active trade/business)
- Line 12: Allowable §179 = min(line 11, line 5), then capped by business income
- Line 13: Carryover of disallowed §179 to 2026
- SUV §179 limit = $31,300 (TY2025)

### Special Depreciation Allowance (Part II)
- Property acquired AFTER Jan 19, 2025: 100% bonus (or elect 40%)
- Property acquired Sept 27, 2017 – Jan 20, 2025: 40% bonus (60% for long-production/aircraft)
- No bonus for: listed property ≤50% business use, ADS-elected property

### MACRS (Part III)
- GDS: 200DB → SL switchover; half-year convention by default; mid-quarter if >40% basis in Q4
- Property classes: 3, 5, 7, 10, 15, 20, 25, 27.5, 39, 50 years
- ADS uses straight-line over class life

### Output routing
- §179 deduction + depreciation → Schedule C line 13, Schedule E line 19, Schedule F
- AMT adjustment → Form 6251 (150DB vs 200DB difference)
- Carryover §179 → informational (no downstream node)
- Form 4562 is an INTERMEDIATE node — it receives section_179_deduction from schedule_e
  and MACRS/bonus inputs from schedule_c/schedule_e/schedule_f
- Final depreciation total routes to schedule1 (via business forms)

## Architecture decision
Form 4562 as implemented in this engine is the intermediate aggregation node.
It receives pre-computed depreciation amounts from upstream input nodes
(schedule_c, schedule_e, schedule_f) and applies:
1. §179 election with phase-out and business income limit
2. Bonus depreciation percentage
3. MACRS table lookup
4. Aggregates total depreciation deduction

The output goes to schedule1 (line 3/17 via upstream business forms) and form6251 for AMT.

## What schedule_e sends to form4562
- `section_179_deduction`: total §179 from real estate professional (activity_type=C) properties

## What schedule_c likely sends (not yet implemented routing)
- line_13_depreciation: pre-computed depreciation on schedule_c

## TY2025 constants confirmed
- §179 limit: $2,500,000
- Phase-out starts: $4,000,000
- SUV §179 cap: $31,300
- Bonus (pre-Jan 20): 40% (60% long-production/aircraft)
- Bonus (post-Jan 19): 100% (or elect 40%)
