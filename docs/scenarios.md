# 10 Common Tax Scenarios — TY2025

> All math is verified against the engine's bracket tables, SE constants, and
> QDCGTW thresholds from `forms/f1040/nodes/config/2025.ts`.
> No rounding is applied — values match JS floating-point output.

---

## Scenario 1: Single W-2 earner, moderate income

**Input:**
- Filing status: Single
- W-2: wages $75,000, fed withheld $11,000

**Computation:**
```
AGI                = $75,000
Standard deduction = $15,000 (Single)
Taxable income     = $75,000 − $15,000 = $60,000

Tax (Single brackets):
  $11,925 × 10%                         = $1,192.50  (base)
  ($48,475 − $11,925) × 12% = $36,550 × 12% = $4,386.00
  ($60,000 − $48,475) × 22% = $11,525 × 22% = $2,535.50
  Total                                  = $8,114.00

  — or via bracket lookup:
  bracket.base = $5,578.50 (22% bracket, over $48,475)
  $5,578.50 + ($60,000 − $48,475) × 0.22 = $5,578.50 + $2,535.50 = $8,114.00
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 75,000 |
| line11_agi | 75,000 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 60,000 |
| line16_income_tax | 8,114 |
| line24_total_tax | 8,114 |
| line25a_w2_withheld | 11,000 |
| line33_total_payments | 11,000 |
| line35a_refund | **2,886** |

---

## Scenario 2: MFJ, single earner, moderate income

**Input:**
- Filing status: MFJ
- W-2: wages $120,000, fed withheld $13,000

**Computation:**
```
AGI                = $120,000
Standard deduction = $30,000 (MFJ)
Taxable income     = $120,000 − $30,000 = $90,000

Tax (MFJ brackets):
  $90,000 is in 12% bracket ($23,850–$96,950)
  bracket.base = $2,385
  $2,385 + ($90,000 − $23,850) × 0.12 = $2,385 + $66,150 × 0.12
  = $2,385 + $7,938 = $10,323
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 120,000 |
| line11_agi | 120,000 |
| line12a_standard_deduction | 30,000 |
| line15_taxable_income | 90,000 |
| line16_income_tax | 10,323 |
| line24_total_tax | 10,323 |
| line25a_w2_withheld | 13,000 |
| line33_total_payments | 13,000 |
| line35a_refund | **2,677** |

---

## Scenario 3: MFJ, dual earners

**Input:**
- Filing status: MFJ
- W-2 #1: wages $85,000, fed withheld $10,200
- W-2 #2: wages $65,000, fed withheld $7,800

**Computation:**
```
Total wages        = $85,000 + $65,000 = $150,000
AGI                = $150,000
Standard deduction = $30,000 (MFJ)
Taxable income     = $150,000 − $30,000 = $120,000

Tax (MFJ brackets):
  $120,000 is in 22% bracket ($96,950–$206,700)
  bracket.base = $11,157
  $11,157 + ($120,000 − $96,950) × 0.22 = $11,157 + $23,050 × 0.22
  = $11,157 + $5,071 = $16,228
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 150,000 |
| line11_agi | 150,000 |
| line12a_standard_deduction | 30,000 |
| line15_taxable_income | 120,000 |
| line16_income_tax | 16,228 |
| line24_total_tax | 16,228 |
| line25a_w2_withheld | 18,000 |
| line33_total_payments | 18,000 |
| line35a_refund | **1,772** |

---

## Scenario 4: Single, W-2 plus interest income

**Input:**
- Filing status: Single
- W-2: wages $65,000, fed withheld $8,000
- 1099-INT: box1 interest $1,200

**Computation:**
```
Wages              = $65,000
Taxable interest   = $1,200
AGI                = $65,000 + $1,200 = $66,200
Standard deduction = $15,000 (Single)
Taxable income     = $66,200 − $15,000 = $51,200

Tax (Single brackets):
  $51,200 is in 22% bracket ($48,475–$103,350)
  bracket.base = $5,578.50
  $5,578.50 + ($51,200 − $48,475) × 0.22 = $5,578.50 + $2,725 × 0.22
  = $5,578.50 + $599.50 = $6,178
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 65,000 |
| line2b_taxable_interest | 1,200 |
| line11_agi | 66,200 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 51,200 |
| line16_income_tax | 6,178 |
| line24_total_tax | 6,178 |
| line25a_w2_withheld | 8,000 |
| line33_total_payments | 8,000 |
| line35a_refund | **1,822** |

---

## Scenario 5: Single, W-2 plus qualified dividends (QDCGTW applies)

**Input:**
- Filing status: Single
- W-2: wages $70,000, fed withheld $9,000
- 1099-DIV: ordinary dividends $3,000, qualified dividends $2,500

**Computation:**
```
Wages              = $70,000
Ordinary dividends = $3,000
AGI                = $70,000 + $3,000 = $73,000
Standard deduction = $15,000 (Single)
Taxable income     = $73,000 − $15,000 = $58,000

── Regular tax (for comparison) ──
  bracket.base = $5,578.50 (22% bracket)
  $5,578.50 + ($58,000 − $48,475) × 0.22 = $5,578.50 + $9,525 × 0.22
  = $5,578.50 + $2,095.50 = $7,674

── QDCGT Worksheet (qualified_dividends = $2,500, net_capital_gain = $0) ──
  pref_income    = min($2,500, $58,000) = $2,500
  ordinary       = $58,000 − $2,500 = $55,500
  zero_ceiling   = $48,350 (Single)
  twenty_floor   = $533,400 (Single)

  in_zero        = max(0, min($58,000, $48,350) − $55,500)
                 = max(0, $48,350 − $55,500) = $0
  remaining      = $2,500 − $0 = $2,500
  avail_fifteen  = max(0, $533,400 − max($55,500, $48,350))
                 = $533,400 − $55,500 = $477,900
  in_fifteen     = min($2,500, $477,900) = $2,500
  in_twenty      = $0
  pref_tax       = $2,500 × 0.15 = $375

  ordinary_tax   = taxFromBrackets($55,500, Single)
                 = $5,578.50 + ($55,500 − $48,475) × 0.22
                 = $5,578.50 + $7,025 × 0.22
                 = $5,578.50 + $1,545.50 = $7,124

  QDCGT tax      = $375 + $7,124 = $7,499

Tax savings from QDCGTW: $7,674 − $7,499 = $175
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 70,000 |
| line3a_qualified_dividends | 2,500 |
| line3b_ordinary_dividends | 3,000 |
| line11_agi | 73,000 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 58,000 |
| line16_income_tax | 7,499 |
| line24_total_tax | 7,499 |
| line25a_w2_withheld | 9,000 |
| line33_total_payments | 9,000 |
| line35a_refund | **1,501** |

---

## Scenario 6: Head of Household, W-2 only

**Input:**
- Filing status: HOH
- W-2: wages $52,000, fed withheld $4,200

**Computation:**
```
AGI                = $52,000
Standard deduction = $22,500 (HOH)
Taxable income     = $52,000 − $22,500 = $29,500

Tax (HOH brackets):
  $29,500 is in 12% bracket ($17,000–$64,850)
  bracket.base = $1,700
  $1,700 + ($29,500 − $17,000) × 0.12 = $1,700 + $12,500 × 0.12
  = $1,700 + $1,500 = $3,200
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 52,000 |
| line11_agi | 52,000 |
| line12a_standard_deduction | 22,500 |
| line15_taxable_income | 29,500 |
| line16_income_tax | 3,200 |
| line24_total_tax | 3,200 |
| line25a_w2_withheld | 4,200 |
| line33_total_payments | 4,200 |
| line35a_refund | **1,000** |

---

## Scenario 7: Single, self-employed (Schedule C), no W-2

**Input:**
- Filing status: Single
- Schedule C: gross receipts $80,000, no expenses → net profit $80,000

**Computation:**
```
── Self-Employment Tax (Schedule SE) ──
  Net profit               = $80,000
  Net SE earnings (×0.9235)= $80,000 × 0.9235 = $73,880
  (≥ $400 threshold → SE tax applies)

  SS wage base remaining   = $176,100 − $0 (no W-2) = $176,100
  SS tax                   = min($73,880, $176,100) × 0.124
                           = $73,880 × 0.124 = $9,161.12
  Medicare tax             = $73,880 × 0.029 = $2,142.52
  Total SE tax             = $9,161.12 + $2,142.52 = $11,303.64
  SE deduction (50%)       = $11,303.64 × 0.50 = $5,651.82

── AGI ──
  Gross income             = $80,000 (Schedule C line 31)
  Adjustments              = $5,651.82 (SE deduction, Schedule 1 line 15)
  AGI                      = $80,000 − $5,651.82 = $74,348.18

── Taxable Income ──
  Standard deduction       = $15,000 (Single)
  Taxable income           = $74,348.18 − $15,000 = $59,348.18

── Income Tax (Single brackets) ──
  $59,348.18 is in 22% bracket ($48,475–$103,350)
  bracket.base = $5,578.50
  $5,578.50 + ($59,348.18 − $48,475) × 0.22
  = $5,578.50 + $10,873.18 × 0.22
  = $5,578.50 + $2,392.0996 = $7,970.5996

── Total Tax ──
  Income tax (line 16)     = $7,970.5996
  SE tax via Schedule 2    = $11,303.64
  Total tax (line 24)      = $7,970.5996 + $11,303.64 = $19,274.2396

  Payments                 = $0
  Amount owed              = $19,274.2396
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line11_agi | 74,348.18 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 59,348.18 |
| line16_income_tax | 7,970.5996 |
| line17_additional_taxes | 11,303.64 |
| line24_total_tax | 19,274.2396 |
| line33_total_payments | 0 |
| line37_amount_owed | **19,274.2396** |

---

## Scenario 8: MFJ, higher income, single W-2

**Input:**
- Filing status: MFJ
- W-2: wages $200,000, fed withheld $32,000

**Computation:**
```
AGI                = $200,000
Standard deduction = $30,000 (MFJ)
Taxable income     = $200,000 − $30,000 = $170,000

Tax (MFJ brackets):
  $170,000 is in 22% bracket ($96,950–$206,700)
  bracket.base = $11,157
  $11,157 + ($170,000 − $96,950) × 0.22 = $11,157 + $73,050 × 0.22
  = $11,157 + $16,071 = $27,228
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 200,000 |
| line11_agi | 200,000 |
| line12a_standard_deduction | 30,000 |
| line15_taxable_income | 170,000 |
| line16_income_tax | 27,228 |
| line24_total_tax | 27,228 |
| line25a_w2_withheld | 32,000 |
| line33_total_payments | 32,000 |
| line35a_refund | **4,772** |

---

## Scenario 9: Married Filing Separately, W-2 only

**Input:**
- Filing status: MFS
- W-2: wages $80,000, fed withheld $10,400

**Computation:**
```
AGI                = $80,000
Standard deduction = $15,000 (MFS)
Taxable income     = $80,000 − $15,000 = $65,000

Tax (MFS brackets):
  $65,000 is in 22% bracket ($48,475–$103,350)
  bracket.base = $5,578.50
  $5,578.50 + ($65,000 − $48,475) × 0.22 = $5,578.50 + $16,525 × 0.22
  = $5,578.50 + $3,635.50 = $9,214
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 80,000 |
| line11_agi | 80,000 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 65,000 |
| line16_income_tax | 9,214 |
| line24_total_tax | 9,214 |
| line25a_w2_withheld | 10,400 |
| line33_total_payments | 10,400 |
| line35a_refund | **1,186** |

---

## Scenario 10: Single, higher income, W-2 (24% bracket)

**Input:**
- Filing status: Single
- W-2: wages $140,000, fed withheld $24,000

**Computation:**
```
AGI                = $140,000
Standard deduction = $15,000 (Single)
Taxable income     = $140,000 − $15,000 = $125,000

Tax (Single brackets):
  $125,000 is in 24% bracket ($103,350–$197,300)
  bracket.base = $17,651
  $17,651 + ($125,000 − $103,350) × 0.24 = $17,651 + $21,650 × 0.24
  = $17,651 + $5,196 = $22,847
```

**Expected F1040 outputs:**
| Line | Value |
|------|-------|
| line1a_wages | 140,000 |
| line11_agi | 140,000 |
| line12a_standard_deduction | 15,000 |
| line15_taxable_income | 125,000 |
| line16_income_tax | 22,847 |
| line24_total_tax | 22,847 |
| line25a_w2_withheld | 24,000 |
| line33_total_payments | 24,000 |
| line35a_refund | **1,153** |

---

## Summary

| # | Filing | Income Source | Gross Income | Taxable | Tax | Withheld | Refund / (Owed) |
|---|--------|-------------|-------------|---------|-----|----------|----------------|
| 1 | Single | W-2 $75K | 75,000 | 60,000 | 8,114 | 11,000 | 2,886 |
| 2 | MFJ | W-2 $120K | 120,000 | 90,000 | 10,323 | 13,000 | 2,677 |
| 3 | MFJ | 2×W-2 $150K | 150,000 | 120,000 | 16,228 | 18,000 | 1,772 |
| 4 | Single | W-2 + INT | 66,200 | 51,200 | 6,178 | 8,000 | 1,822 |
| 5 | Single | W-2 + QDIV | 73,000 | 58,000 | 7,499 | 9,000 | 1,501 |
| 6 | HOH | W-2 $52K | 52,000 | 29,500 | 3,200 | 4,200 | 1,000 |
| 7 | Single | Sched C $80K | 80,000 | 59,348.18 | 19,274.24* | 0 | (19,274.24) |
| 8 | MFJ | W-2 $200K | 200,000 | 170,000 | 27,228 | 32,000 | 4,772 |
| 9 | MFS | W-2 $80K | 80,000 | 65,000 | 9,214 | 10,400 | 1,186 |
| 10 | Single | W-2 $140K | 140,000 | 125,000 | 22,847 | 24,000 | 1,153 |

\* Scenario 7 total tax includes $7,970.60 income tax + $11,303.64 SE tax = $19,274.24

---

## Constants Used

All from `forms/f1040/nodes/config/2025.ts` (Rev. Proc. 2024-40):

- **Standard Deduction:** Single $15,000 · MFJ $30,000 · MFS $15,000 · HOH $22,500
- **SS Wage Base:** $176,100
- **SE Net Earnings Multiplier:** 0.9235
- **SS Rate:** 12.4% · Medicare Rate: 2.9%
- **QDCGT Zero Ceiling (Single):** $48,350
- **QDCGT Twenty Floor (Single):** $533,400
