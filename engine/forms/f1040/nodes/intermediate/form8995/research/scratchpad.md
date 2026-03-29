# Form 8995 — Scratchpad

## Purpose
Computes the §199A QBI deduction (simplified, 20% of net QBI, capped at 20% of taxable income minus net capital gain) for taxpayers at or below the income threshold.

## Inputs received (from upstream nodes)
- `qbi_from_schedule_c` — from schedule_c (sole proprietorship net profit)
- `qbi` — from schedule_e (rental/pass-through QBI)
- `w2_wages` — from schedule_e (informational, not used in simplified calc)
- `unadjusted_basis` — from schedule_e (informational, not used in simplified calc)
- `line6_sec199a_dividends` — from f1099div (REIT section 199A dividends)
- `taxable_income` — via executor merge (Form 1040 taxable income before QBI deduction)
- `net_capital_gain` — via executor merge (for income limitation denominator)
- `qbi_loss_carryforward` — prior year loss carryforward (reduces current QBI)
- `reit_loss_carryforward` — prior year REIT/PTP loss carryforward

## Fields / lines identified
- Line 1c: per-business QBI (from schedule_c and schedule_e)
- Line 2: total of Line 1c (all trades/businesses)
- Line 3: QBI loss carryforward from prior year
- Line 4: net QBI = Line 2 + Line 3
- Line 5: 20% × max(0, Line 4)
- Line 6: qualified REIT dividends/PTP income
- Line 7: REIT/PTP loss carryforward from prior year
- Line 8: net REIT/PTP = Line 6 + Line 7
- Line 9: 20% × max(0, Line 8)
- Line 10: Line 5 + Line 9 (total before income limit)
- Line 11: taxable income (before QBI deduction)
- Line 12: net capital gain
- Line 13: 20% × max(0, Line 11 - Line 12)
- Line 15: min(Line 10, Line 13) = QBI deduction → Form 1040 line 13
- Line 16: QBI loss carryforward out (if Line 4 < 0)
- Line 17: REIT/PTP loss carryforward out (if Line 8 < 0)

## Open Questions
- [x] Q: What upstream nodes feed into this form?
  Answer: schedule_c (qbi_from_schedule_c), schedule_e (qbi, w2_wages, unadjusted_basis), f1099div (line6_sec199a_dividends)
- [x] Q: What calculations does this form perform?
  Answer: Aggregates QBI, applies 20% rate, income limitation, outputs deduction to f1040 line 13
- [x] Q: What does this form output to downstream nodes?
  Answer: f1040.line13_qbi_deduction
- [x] Q: What are the TY2025 constants?
  Answer: 20% rate; threshold $197,300 single / $394,600 MFJ (thresholds not enforced here — upstream handles routing)
- [x] Q: What edge cases exist?
  Answer: Net loss → carryforward; income limitation can zero out deduction; w2_wages/UBIA ignored in simplified form

## Sources to check
- [x] Drake KB article (screen code 8995) — searched; routing logic confirmed in upstream nodes
- [x] IRS form 8995 instructions — read in full (.research/docs/i8995.pdf)
- [x] Rev Proc for TY2025 constants — confirmed $197,300/$394,600 via f1099div constants
