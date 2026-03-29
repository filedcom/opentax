# Form 8995-A — Scratchpad

## Key Facts (TY2025)

### Who uses Form 8995-A vs Form 8995
- Form 8995: simplified, for taxpayers below threshold (or with only REIT/PTP income)
- Form 8995-A: higher-income taxpayers above threshold where W-2/UBIA wage limitation applies

### TY2025 Thresholds (IRC §199A(b)(3)(B))
- Single / MFS: $197,300
- MFJ: $394,600
- Phase-in range is +$100,000 above threshold:
  - Single: $197,300 – $297,300
  - MFJ: $394,600 – $494,600

### Core Calculation (IRC §199A)
1. QBI Component = 20% × QBI (per trade/business)
2. W-2/UBIA Wage Limitation = greater of:
   a. 50% × W-2 wages
   b. 25% × W-2 wages + 2.5% × UBIA of qualified property
3. If taxable income IN phase-in range: limitation is phased in
   - reduction_ratio = (taxable_income - threshold) / 100,000
   - applicable_limitation = greater of (wage_limit, ubia_limit)
   - phase_in_limitation = 20%×QBI - reduction_ratio × (20%×QBI - applicable_limitation)
4. If taxable income ABOVE phase-in range: full limitation applies
5. SSTB phase-out in same range: SSTB QBI/wages/UBIA are reduced
   - SSTB reduction ratio = same as above
   - Adjusted SSTB QBI = SSTB QBI × (1 - reduction_ratio)

### REIT/PTP Component
- 20% × Section 199A dividends (same as form8995)
- Not subject to W-2 wage limitation (REIT dividends)

### Income Cap
- Overall cap = 20% × (taxable_income - net_capital_gain)
- Final deduction = min(qbi_component + reit_component, income_cap)

### Multiple Businesses
- Form 8995-A supports multiple trade/business entries
- Each gets its own QBI/W2/UBIA amounts
- Aggregated for final deduction

## Open Questions
- Does form8995a receive aggregated totals or per-business items?
  - Answer: For this node, we accept aggregated totals (similar to form8995 approach)
  - Simplification: single QBI/W2/UBIA set, with SSTB flag
