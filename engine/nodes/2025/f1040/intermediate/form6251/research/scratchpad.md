# Form 6251 — Scratchpad

## TY2025 Key Constants (from IRS Instructions Jan 8, 2026)

### Exemption Amounts (Line 5 Worksheet)
| Filing Status | Exemption | Phase-out Starts |
|---|---|---|
| Single / HOH | $88,100 | $626,350 |
| MFJ / QSS | $137,000 | $1,252,700 |
| MFS | $68,500 | $626,350 |

### Exemption Completely Phased Out (Line 4 thresholds for zero exemption)
| Filing Status | Zero Threshold |
|---|---|
| Single / HOH | $978,750 ($626,350 + 4 × $88,100) |
| MFJ / QSS | $1,800,700 ($1,252,700 + 4 × $137,000) |
| MFS | $900,350 ($626,350 + 4 × $68,500) |

Phase-out rate: 25% of (AMTI − phase-out start), reduces exemption until 0.

### AMT Rate Brackets (Line 7)
- 26% on first $239,100 of taxable excess (line 6)
- 28% on taxable excess above $239,100
- MFS threshold: $119,550

Breakeven (where 28% bracket savings apply):
Line 6 ≤ $239,100 → tax = line6 × 0.26
Line 6 > $239,100 → tax = $239,100 × 0.26 + (line6 − $239,100) × 0.28
                        = line6 × 0.28 − $239,100 × 0.02
                        = line6 × 0.28 − $4,782
(MFS: line6 × 0.28 − $2,391)

## Form 6251 Line Flow

### Part I — AMTI
- Line 1a: Reg tax income minus Schedule 1-A line 37 adjustment
- Line 1b: Schedule 1-A adjustment
- Lines 2a–2t, 3: Adjustments and preference items
- Line 4: AMTI = sum of lines 1 through 3

### Part II — Compute AMT
- Line 5: Exemption (from worksheet or table)
- Line 6: max(0, line4 − line5)  ← taxable excess
- Line 7: Tentative minimum tax = f(line6, filing status) using 26%/28% rates
           OR Part III if capital gains apply
- Line 8: AMTFTC (foreign tax credit for AMT)
- Line 9: line7 − line8 (tentative min tax net of AMTFTC)
- Line 10: Regular tax (from Form 1040 line 16 minus Form 4972 tax)
- Line 11: AMT = max(0, line9 − line10) → Schedule 2 Line 1

## Scope Decision for Implementation
Form 6251 is extremely complex (30+ lines, multiple worksheets). This implementation
covers the core practical cases:

1. AMTI inputs (adjustments from upstream) as pre-computed net adjustments
2. Exemption calculation with phase-out
3. 26%/28% rate brackets (no capital gains special rate in Part III for now)
4. Regular tax offset
5. Output: AMT liability to schedule2

## What's excluded (marked for future)
- Part III (capital gains rates) — requires AMT Schedule D
- ISO exercise adjustment (line 2i) — tracked as iso_adjustment input
- Depreciation adjustment (line 2l) — tracked as depreciation_adjustment input
- NOL (line 2f) — tracked as nol_adjustment input
- AMTFTC (line 8) — tracked as amtftc input
