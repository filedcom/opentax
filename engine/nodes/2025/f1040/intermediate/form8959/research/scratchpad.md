# Form 8959 Scratchpad

## IRS Instructions Key Points (TY2025)

### Rate
0.9% (0.009) on excess income above threshold

### Thresholds (not indexed for inflation)
- MFJ: $250,000
- MFS: $125,000
- Single, HOH, QSS: $200,000

### Parts

**Part I — Medicare Wages & Tips**
- Line 1: W-2 box 5 (medicare_wages from upstream)
- Line 2: Unreported tips from Form 4137 line 6
- Line 3: Wages from Form 8919 line 6
- Line 4: Sum of lines 1-3
- Line 5: Threshold for filing status
- Line 6: Excess (line 4 - line 5), min 0
- Line 7: Line 6 × 0.9% = Part I AMT

**Part II — SE Income**
- Line 8: SE income from Schedule SE Part I line 6
- Line 9: Wages from line 4 (Part I)
- Line 10: Threshold minus line 9 (min 0) = reduced threshold
- Line 11: Excess SE income (line 8 - line 10), min 0
- Line 12: Min(line 8, line 11) [handles negative SE — can't go below zero]
- Line 13: Line 12 × 0.9% = Part II AMT

**Part III — RRTA Compensation**
- Line 14: RRTA compensation + tips (W-2 box 14)
- Line 15: Threshold for filing status (same as Part I)
- Line 16: Excess (line 14 - line 15), min 0
- Line 17: Line 16 × 0.9% = Part III AMT

**Part IV — Total**
- Line 18: Lines 7 + 13 + 17 → Schedule 2 line 11

**Part V — Withholding Reconciliation**
- Line 19: Medicare withheld (W-2 box 6 total, including codes B+N)
- Line 23: Additional Medicare Tax withheld from RRTA (W-2 box 14 "Medicare")
- Line 24: Total withheld → Form 1040 line 25c

### Key rules
- SE income loss doesn't count (negative SE → zero for Part II)
- RRTA threshold NOT reduced by wages (separate pools)
- Wages DO reduce the SE income threshold
- Withholding goes to F1040 line 25c (combined with regular Medicare withholding)

### Upstream sources
- medicare_wages: from W2 node (box 5 sum)
- medicare_withheld: from W2 node (box 6 sum)
- unreported_tips: from Form 4137 (line 6)
- wages_8919: from Form 8919 (line 6)
- se_income: from Schedule SE (Part I line 6)
- rrta_wages: from W2 node (box 14 RRTA, if applicable)
- filing_status: from general node

### Output routing
- line18_total → schedule2 (line11_additional_medicare)
- medicare_withheld → f1040 (line25c — but this is already handled by W2 node?)

Wait: W2 node sends box6 to form8959 as medicare_withheld.
Form 8959 should reconcile and send total to f1040 line 25c.
But checking W2 node — it does NOT send box6 directly to f1040.
It only sends to form8959. So form8959 must route to f1040 line 25c.

Actually re-reading W2 node: medicareOutput() sends box5 and box6 to form8959.
The withholding (box6) needs to flow to f1040 line 25c via form8959.
