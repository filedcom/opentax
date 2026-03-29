# Schedule D — Scratchpad

## Purpose
Aggregate capital gains and losses from upstream nodes (f8949 transactions, f1099div distributions, f1099c COD property) and compute the net capital gain or loss for Form 1040.

## Inputs received (from upstream nodes)

| Source | Field | Description |
|--------|-------|-------------|
| f8949 | `transaction` | Individual transaction objects; accumulates to array via executor merge |
| f1099div | `line13_cap_gain_distrib` | Total cap gain distributions (box 2a) → Schedule D line 13 |
| f1099div | `box2c_qsbs` | QSBS (Section 1202) portion of distributions (box 2c) — informational |
| f1099c | `cod_property_fmv` | FMV of property in COD disposition; can accumulate to array |
| f1099c | `cod_debt_cancelled` | Cancelled debt amount for corresponding property; parallel to fmv |
| d_screen | `capital_loss_carryover` | Computed carryforward from d_screen — for next year |
| (optional) | `filing_status` | Determines MFS loss limit ($1,500) vs standard ($3,000) |

## Fields / lines identified

**Part I — Short-Term:**
- Line 1a: Aggregate totals (basis reported, no adjustments) — NOT from individual tx
- Line 1b: Form 8949 Box A/G transactions (basis reported, adjustments)
- Line 2:  Form 8949 Box B/H transactions (no basis reported)
- Line 3:  Form 8949 Box C/I transactions (no 1099-B)
- Lines 1b/2/3 → aggregated from `transaction` objects based on `part`
- Line 4: Other ST gains (Forms 4684, 6252, 6781, 8824) — not in scope
- Line 5: K-1 ST gains/losses — not in scope
- Line 6: ST capital loss carryover — not in scope (d_screen handles this)
- **Line 7: Net ST = stTxGain (sum of ST transaction gain_loss)**

**Part II — Long-Term:**
- Lines 8b/9/10 → aggregated from LT `transaction` objects
- Line 11: Other LT gains (Form 4797 Part I, Forms 2439, 6252, etc.) → includes COD property gain
- Line 12: K-1 LT gains/losses — not in scope
- **Line 13: Capital gain distributions = `line13_cap_gain_distrib`**
- Line 14: LT capital loss carryover — not in scope
- **Line 15: Net LT = ltTxGain + ltCodGain + line13**

**Part III — Summary:**
- **Line 16: Total = line7 + line15**
- **Line 17: Both lines 15 AND 16 > 0? → routes to line 18**
- **Line 18: 28% Rate Gain Worksheet** (if line 17 = Yes and collectibles/QOF gain exists)
- **Line 21: Capital loss deduction = max(lossLimit, line16) when line16 < 0**
- **f1040 line 7a = line16 if >= 0, else line21**

## Open Questions
- [x] Q: What upstream nodes feed into this form? → f8949, f1099div, f1099c, d_screen
- [x] Q: What calculations does this form perform? → Aggregate ST/LT gains, apply loss limit, output to f1040
- [x] Q: What does this form output to downstream nodes? → f1040 (line7_capital_gain), rate_28_gain_worksheet (collectibles)
- [x] Q: What are the TY2025 constants? → $3,000 standard loss limit; $1,500 MFS
- [x] Q: What edge cases exist? → MFS loss limit; line17 gate for preferential rates; zero/negative net

## Sources to check
- [x] Drake KB article — Drake screen code "D" confirmed in screens.json
- [x] IRS Form 1040 Schedule D (TY2025) — .research/docs/f1040sd.pdf
- [x] IRS Instructions for Schedule D (TY2025) — .research/docs/i1040sd.pdf
- [x] Upstream node code — d_screen, f8949, f1099div, f1099c reviewed
- [x] Executor merge behavior — executor.ts reviewed (accumulation pattern confirmed)
