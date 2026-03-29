# Form 461 — Scratchpad

## Research Notes

### Drake Screen
- screen_code: "461", form: "461", description: "Limitation on Business Losses"

### IRS Instructions (TY2025)
Source: https://www.irs.gov/pub/irs-pdf/i461.pdf (Dec 10, 2025)

#### Who Must File
- Noncorporate taxpayers where net losses from all trades/businesses > $313,000 ($626,000 MFJ)
- OR would report a loss > $156,500 on any one of Form 461 lines 1–8

#### Thresholds (Rev. Proc. 2024-40, Sec. 2.32)
- Single/MFS/HOH/QSS: $313,000
- MFJ: $626,000

#### Form Structure
**Part I — Total Income/Loss Items**
- Line 1: blank
- Line 2: Business income/loss from Schedule 1 line 3 (schedule_c)
- Line 3: Capital gains/losses from Form 1040 line 7a (schedule_d) — losses excluded from total deductions
- Line 4: Other gains/losses from Schedule 1 line 4
- Line 5: Supplemental income/loss from Schedule 1 line 5 (schedule_e)
- Line 6: Farm income/loss from Schedule 1 line 6 (schedule_f)
- Line 7: blank
- Line 8: Other trade/business income/loss not on lines 1–7
- Line 9: Combine lines 1–8 (total business income/loss)

**Part II — Adjustment for Non-Business Amounts**
- Line 10: Non-business income/gain included in lines 1–8
- Line 11: Non-business losses/deductions included in lines 1–8 (entered as positive)
- Line 12: Line 10 minus Line 11 (net non-business adjustment)

**Part III — Limitation on Losses**
- Line 13: Threshold amount ($313,000 single, $626,000 MFJ)
- Line 14: Line 9 + Line 12 (total business income/loss after adjustment)
- Line 15: If line 14 >= 0 or line 14 >= -threshold: no excess. If line 14 < -threshold: excess = |line 14| - threshold
- Line 16: Excess business loss (positive, reported as "other income" on Schedule 1 line 8p with "ELA" notation)

### Key Design Decision
schedule_c already computes threshold check and sends pre-computed `excess_business_loss` to form461.
form461 receives individual stream inputs from multiple upstream nodes (schedule_c, schedule_e, schedule_f)
and must aggregate them to compute the full Form 461.

However — looking at schedule_c code: it does the EBL check itself and sends the pre-computed excess.
This is a "shortcut" pattern: the upstream does the heavy lifting and sends only the excess.

Given the current architecture (schedule_c sends pre-computed excess), form461 acts as:
1. An aggregator of excess business losses from multiple sources
2. Routes the total to schedule1 line 8p (other income)

### Output
- Schedule 1, Line 8p: excess business loss as positive "other income" (with ELA notation)
- This is an NOL carryforward for subsequent years (Form 172) — informational only in current year

### Accumulation Pattern
Like schedule_d's `transaction` field, form461 likely accumulates `excess_business_loss`
from multiple upstream nodes (schedule_c, schedule_e, schedule_f).
