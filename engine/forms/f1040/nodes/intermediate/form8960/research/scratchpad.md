# Form 8960 — Scratchpad

## Key Design Decisions

### Scope: Individuals Only
This node covers Part I (Investment Income), Part II (Investment Expenses), and Part III
(Tax Computation) for individuals only (lines 1–17). Estates/trusts (lines 18–21) are
out of scope.

### Input Field Strategy
The node receives pre-aggregated NII components from upstream nodes:
- `line1_taxable_interest` — from schedule_b / INT node
- `line2_ordinary_dividends` — from schedule_b / DIV node
- `line3_annuities` — manual entry
- `line4a_passive_income` — from Schedule C/E/F passive totals
- `line4b_passive_income_adjustment` — nonpassive adjustments (negative = excludes)
- `line4b_rental_net` — from schedule_e (carry_to_8960=true items)
- `line5a_net_gain` — from Schedule D / form8949
- `line5b_net_gain_adjustment` — non-NIIT gains excluded
- `line7_other_modifications` — catch-all (NOL, §62(a)(1) deductions, etc.)
- `line9a_investment_interest_expense` — from Schedule A line 9
- `line9b_state_local_tax` — state/local taxes allocable to NII
- `line10_additional_modifications` — other deductions
- `magi` — MAGI (typically AGI for individuals; passed in from f1040/general node)
- `filing_status` — determines threshold

### Calculation (lines 12–17)
- Line 8 = NII gross = sum of lines 1–7
- Line 11 = total deductions = sum of lines 9a + 9b + 10
- Line 12 = NII = max(0, line8 - line11)
- Line 13 = MAGI
- Line 14 = threshold per filing status
- Line 15 = MAGI - threshold (can be negative → 0)
- Line 16 = min(line12, line15)  [smaller of NII or MAGI excess]
- Line 17 = line16 × 3.8%

### Output
- Line 17 → schedule2 line 12 (NIIT)

### Why schedule2 line 12?
Form 8960, line 17 flows to Schedule 2 (Form 1040), line 12.
(Not line 11 — that's Additional Medicare Tax from Form 8959.)

## MAGI Threshold Table (TY2025, not indexed)
- MFJ / QSS: $250,000
- Single / HOH: $200,000
- MFS: $125,000
