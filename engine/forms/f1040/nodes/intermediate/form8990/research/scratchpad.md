# Form 8990 — Scratchpad

## Key IRC §163(j) Mechanics (TY2025)

### Limitation Formula (Part I / Section IV)
```
Line 26: ATI × 30%
Line 30: min(line 29, line 5)  = deductible BIE
  where line 29 = line 26 + line 4 (floor plan) + line 25 (BII)
        line 5  = current year BIE + prior disallowed carryforward
Line 31: line 5 - line 30 = disallowed (carryforward to next year)
```

### ATI Computation (Lines 6–22, Section II)
```
Line 6:  tentative taxable income
+ Line 7:  non-business items of loss/deduction
+ Line 8:  BIE (not from pass-through)
+ Line 9:  NOL deduction (§172)
+ Line 10: QBI deduction (§199A)
+ Line 11: depreciation/amortization/depletion (TY after 2024 — reinstated by OBBBA P.L.119-21)
+ Line 12: pass-through loss/deduction items
+ Line 13: other additions (capital loss carrybacks)
+ Line 14: pass-through excess taxable income (Schedule A)
+ Line 15: S-corp excess taxable income (Schedule B)
- Line 17: non-business income/gain
- Line 18: BII (not from pass-through)
- Line 19: pass-through income/gain items
- Line 20: floor plan financing interest expense
- Line 21: other reductions
= Line 22: ATI (floor at zero for individuals/corps; not CFC)
```

### Small Business Exemption (§163(j)(3))
- Average annual gross receipts ≤ $31,000,000 for 3 prior tax years (TY2025 threshold)
- Not a tax shelter (§448(d)(3))
- If exempt → no limitation, form8990 produces no output

### TY2025 Note (P.L. 119-21 "One Big Beautiful Bill")
- ATI add-back for depreciation/amortization/depletion is REINSTATED for TY beginning after 2024
- Line 11 is active again (was suspended for TY2022-2024)

### Output Routing
- Disallowed BIE → schedule1 `biz_interest_disallowed_add_back` (positive; reverses upstream deduction)
- No direct f1040 output — the limitation result flows through Schedule 1

## Edge Cases
1. Small business exempt → no outputs
2. Floor plan interest → fully deductible, NOT counted in limit basis
3. Zero ATI → only floor plan + BII can offset BIE
4. BIE fully within limit → no outputs (no disallowance)
5. Prior year carryforward increases total BIE subject to limit
6. ATI floored at zero (line 22 cannot be negative for non-CFC)
