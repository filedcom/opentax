# f8828 — Form 8828: Recapture of Federal Mortgage Subsidy

## Overview
Form 8828 computes the recapture tax owed when a taxpayer sells a home within 9 years of obtaining a federally subsidized mortgage (tax-exempt bond financing). If income rose above threshold and there was a gain on sale, the taxpayer must repay a portion of the federal mortgage subsidy benefit. The recapture amount flows to Schedule 2 line 10 as an additional tax.

**IRS Form:** 8828
**Drake Screen:** 8828
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| original_loan_amount | number (nonnegative) | Yes | Loan amount from mortgage docs | Original federally subsidized mortgage loan amount | IRC §143(m); Form 8828 line 2 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| subsidy_rate | number (nonnegative) | Yes | From bond issuer | Federally subsidized interest rate benefit (as decimal, e.g. 0.06) | IRC §143(m)(2); Form 8828 line 3 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| holding_period_years | number (nonnegative) | Yes | Date of sale – date of mortgage | Number of complete years home was held (1–9) | IRC §143(m)(4); Form 8828 line 4 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| gain_on_sale | number (nonnegative) | Yes | Settlement statement / Form 4797 | Realized gain on sale of federally subsidized home | IRC §143(m)(5); Form 8828 line 7 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| modified_agi | number (nonnegative) | Yes | Taxpayer's MAGI | Modified adjusted gross income for recapture computation | IRC §143(m)(3); Form 8828 line 8 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| repayment_income_limit | number (nonnegative) | Yes | HUD table (from bond issuer) | Repayment income limit from bond issuer per IRC §143(f) | IRC §143(m)(3)(A); Form 8828 line 9 | https://www.irs.gov/pub/irs-pdf/f8828.pdf |
| family_size | number (positive integer) | Yes | Taxpayer records | Family size for HUD table lookup (already reflected in repayment_income_limit) | IRC §143(f)(6); Form 8828 line 9 instructions | https://www.irs.gov/pub/irs-pdf/i8828.pdf |

---

## Calculation Logic

### Step 1 — Federally Subsidized Amount (Line 5)
The maximum potential recapture amount before holding period and income adjustments.
federally_subsidized_amount = original_loan_amount × subsidy_rate × 6.25%
Source: IRC §143(m)(2); Form 8828 instructions line 5; https://www.irs.gov/pub/irs-pdf/i8828.pdf

### Step 2 — Holding Period Percentage (Line 6)
Based on the year of disposition (year home was sold relative to the mortgage origination year).
- Year 1: 20%
- Year 2: 40%
- Year 3: 60%
- Year 4: 80%
- Year 5: 100%
- Year 6: 80%
- Year 7: 60%
- Year 8: 40%
- Year 9: 20%
- Year 10+: 0% (no recapture applies)
Source: IRC §143(m)(4); Form 8828 instructions line 6 table; https://www.irs.gov/pub/irs-pdf/i8828.pdf

### Step 3 — Adjusted Recapture Amount (Line 6)
adjusted_recapture = federally_subsidized_amount × holding_period_percentage
Source: IRC §143(m)(4); Form 8828 line 6; https://www.irs.gov/pub/irs-pdf/i8828.pdf

### Step 4 — Income Percentage (Line 10)
income_percentage is based on the ratio of (modified_agi - repayment_income_limit) to repayment_income_limit.
If modified_agi ≤ repayment_income_limit: income_percentage = 0% (no recapture)
If modified_agi ≥ 1.25 × repayment_income_limit: income_percentage = 50%
Otherwise: income_percentage = ((modified_agi / repayment_income_limit) - 1) × 100%  (linear from 0% at limit to 50% at 125% of limit)

Actual IRS computation: income_percentage = min(50%, max(0, (modified_agi - repayment_income_limit) / repayment_income_limit × 100%))
Note: The IRS table maps this to one of 5 percentage points (0%, 20%, 40%, 50%), but for computation purposes use the formula.
Source: IRC §143(m)(3); Form 8828 instructions line 10; https://www.irs.gov/pub/irs-pdf/i8828.pdf

### Step 5 — Recapture Tax (Line 12)
recapture_tax = min(adjusted_recapture × income_percentage, 50% × gain_on_sale)
If income_percentage = 0 or gain_on_sale = 0: recapture_tax = 0
Source: IRC §143(m)(5); Form 8828 line 11, line 12; https://www.irs.gov/pub/irs-pdf/i8828.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line10_recapture_tax | schedule2 | recapture_tax > 0 | IRC §143(m); Schedule 2 line 10 | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Subsidy factor | 6.25% of (loan × rate) | IRC §143(m)(2) | https://www.irs.gov/pub/irs-pdf/i8828.pdf |
| Max income percentage | 50% | IRC §143(m)(3) | https://www.irs.gov/pub/irs-pdf/i8828.pdf |
| Max holding years | 9 years | IRC §143(m)(4) | https://www.irs.gov/pub/irs-pdf/i8828.pdf |
| Max recapture cap | 50% of gain | IRC §143(m)(5) | https://www.irs.gov/pub/irs-pdf/i8828.pdf |
| Income percentage threshold | 125% of repayment limit → 50% | IRC §143(m)(3)(B) | https://www.irs.gov/pub/irs-pdf/i8828.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    F[original_loan_amount]
    S[subsidy_rate]
    H[holding_period_years]
    G[gain_on_sale]
    M[modified_agi]
    R[repayment_income_limit]
  end
  subgraph node["f8828 Node"]
    C[compute recapture tax]
  end
  subgraph outputs["Downstream"]
    S2[schedule2.line10_recapture_tax]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **No recapture if holding period ≥ 10 years**: holding_period_years ≥ 10 → recapture = 0, no output emitted.
2. **No recapture if modified_agi ≤ repayment_income_limit**: income_percentage = 0 → no recapture.
3. **No recapture if gain_on_sale = 0 or loss**: gain_on_sale = 0 → no recapture (50% × 0 = 0).
4. **Recapture capped at 50% of gain**: min() cap applies even if formula yields higher.
5. **Year 1 means sold in the 1st year**: holding_period_years = 1 → 20%.
6. **Year 5 is peak (100%)**: maximum holding period percentage.
7. **Income between 100%–125% of limit produces 0%–50%**: linear interpolation.
8. **At exactly 125% or above income limit → 50% income percentage** (maximum).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §143(m) | — | Recapture of subsidy | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section143 | — |
| Form 8828 instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8828.pdf | — |
| Schedule 2 | 2024 | Line 10 | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf | — |
