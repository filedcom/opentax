# Form 4137 — Scratchpad

## Research Notes

### Drake Screen
- screen_code: "4137"
- form: "4137"
- description: "Social Security and Medicare Tax On Unreported Tip Income"

### PDF Source
- f4137.pdf downloaded from https://www.irs.gov/pub/irs-pdf/f4137.pdf
- TY2025 form confirmed

### Form 4137 Line-by-Line Logic

```
Line 1: Per-employer table (name, EIN, total tips received, tips reported)
Line 2: Sum of col(c) — total tips received
Line 3: Sum of col(d) — total tips reported to employer
Line 4: Line 2 - Line 3 = unreported tips → income on Form 1040 line 1c
Line 5: Tips not required to report (< $20/month) — NOT subject to SS/Medicare
Line 6: Line 4 - Line 5 = unreported tips subject to Medicare tax
Line 7: SS wage base = $176,100 (hardcoded)
Line 8: W-2 boxes 3+7 total (SS wages + SS tips already reported)
Line 9: max(0, Line 7 - Line 8) = room left under SS wage base
Line 10: min(Line 6, Line 9) = unreported tips subject to SS tax
Line 11: Line 10 × 0.062 = SS tax on unreported tips
Line 12: Line 6 × 0.0145 = Medicare tax on unreported tips
Line 13: Line 11 + Line 12 → Schedule 2 line 5
```

### Key Notes
- Line 4 also goes to Form 1040 line 1c (tip income)
- Line 6 also feeds Form 8959 line 2 (if required)
- Allocated tips from W-2 box 8 are treated as unreported unless taxpayer has records showing less
- W2 node sends `allocated_tips` to form4137

### Input Sources
- W2 node → allocated_tips (W-2 box 8 total)
- Screen 4137 direct user input:
  - total_tips_received (all employers, col c)
  - reported_tips (all employers, col d)
  - sub_$20_tips (line 5)
  - ss_wages_from_w2 (boxes 3+7, line 8)

### Output Routing
- f1040 line1c ← unreported_tip_income (line 4)
- schedule2 line5 ← unreported_tip_tax (line 13)
- form8959 line2 ← medicare_subject_tips (line 6, if filing form8959)

### TY2025 Constants
- SS_WAGE_BASE = 176_100
- SS_RATE = 0.062
- MEDICARE_RATE = 0.0145
