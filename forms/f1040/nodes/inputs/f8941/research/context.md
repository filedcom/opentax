# Form 8941 — Credit for Small Employer Health Insurance Premiums

## Overview
Computes the IRC §45R credit for small employers (≤25 FTEs, avg wages ≤$56,000) who pay health insurance premiums through the SHOP Marketplace. Credit = 50% of premiums (35% for tax-exempt) × phase-out multiplier. Routes to Schedule 3 line 6z.

**IRS Form:** 8941
**Drake Screen:** 8941
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14060

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| fte_count | number (≥0) | Yes | FTE count | Full-time equivalent employee count | Form 8941 Line 1; IRC §45R(d) | https://www.irs.gov/pub/irs-pdf/i8941.pdf |
| average_annual_wages | number (≥0) | Yes | Average wages | Average annual wages per FTE | Form 8941 Line 2; IRC §45R(d)(3) | https://www.irs.gov/pub/irs-pdf/i8941.pdf |
| premiums_paid | number (≥0) | Yes | Premiums paid | Health insurance premiums paid by employer | Form 8941 Line 3; IRC §45R(b) | https://www.irs.gov/pub/irs-pdf/i8941.pdf |
| shop_enrollment | boolean | No | SHOP enrollment | True if employer offers coverage through SHOP Marketplace | IRC §45R(d)(6) | https://www.irs.gov/pub/irs-pdf/i8941.pdf |
| is_tax_exempt | boolean | No | Tax-exempt | True if employer is a tax-exempt organization (35% rate) | IRC §45R(f)(1) | https://www.irs.gov/pub/irs-pdf/i8941.pdf |

---

## Calculation Logic

### Step 1 — Eligibility check
`eligible = fte_count < 25 AND avg_wages < $56,000 AND shop_enrollment ≠ false`
Source: IRC §45R(d); Form 8941 instructions — https://www.irs.gov/pub/irs-pdf/i8941.pdf

### Step 2 — Base credit rate
`rate = is_tax_exempt ? 35% : 50%`
Source: IRC §45R(a),(f)(1) — https://www.irs.gov/pub/irs-pdf/i8941.pdf

### Step 3 — FTE phase-out (10–25 FTEs)
`fteReduction = max(0, min(1, (fte_count − 10) / 15))`

### Step 4 — Wage phase-out ($28,000–$56,000)
`wageReduction = max(0, min(1, (avg_wages − 28,000) / 28,000))`

### Step 5 — Combined multiplier
`multiplier = (1 − fteReduction) × (1 − wageReduction)`
`credit = premiums_paid × rate × multiplier`
Source: IRC §45R(c); Form 8941 Lines 11–12 — https://www.irs.gov/pub/irs-pdf/i8941.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | credit > 0 | Form 8941 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Maximum FTE count | <25 | IRC §45R(d)(1)(A) | https://www.law.cornell.edu/uscode/text/26/45R |
| Maximum average wage | <$56,000 | IRC §45R(d)(3)(B); Rev Proc 2024-40 §3.28 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| FTE phase-out start | 10 FTEs | IRC §45R(c)(2) | https://www.law.cornell.edu/uscode/text/26/45R |
| Wage phase-out start | $28,000 | IRC §45R(c)(2); Rev Proc 2024-40 §3.28 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Credit rate (for-profit) | 50% | IRC §45R(a) | https://www.law.cornell.edu/uscode/text/26/45R |
| Credit rate (tax-exempt) | 35% | IRC §45R(f)(1) | https://www.law.cornell.edu/uscode/text/26/45R |
| SHOP requirement | Required (post-2013) | IRC §45R(d)(6) | https://www.law.cornell.edu/uscode/text/26/45R |
| Maximum credit years | 2 consecutive years | IRC §45R(e)(2) | https://www.law.cornell.edu/uscode/text/26/45R |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    fte["fte_count"]
    wage["average_annual_wages"]
    prem["premiums_paid"]
    shop["shop_enrollment"]
    exempt["is_tax_exempt"]
  end
  subgraph node["f8941 (Small Employer Health Credit)"]
    rate["credit rate (50% or 35%)"]
    fpo["ftePhaseOutReduction()"]
    wpo["wagePhaseOutReduction()"]
    mult["multiplier = (1−fte) × (1−wage)"]
    credit["credit = premiums × rate × mult"]
  end
  subgraph outputs["Downstream"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  fte --> fpo --> mult
  wage --> wpo --> mult
  prem & exempt --> rate
  rate & mult --> credit --> s3
  shop --> credit

---

## Edge Cases & Special Rules

1. **Phase-out is multiplicative**: FTE and wage reductions are independent fractions; the combined multiplier is their product (not sum).
2. **25 FTE boundary**: At exactly 25 FTEs, the FTE phase-out is complete (reduction = 1), and the credit = 0.
3. **$56,000 wage boundary**: At exactly $56,000 average wages, wage phase-out is complete, credit = 0.
4. **SHOP requirement**: After 2013, employer must offer coverage through the SHOP Exchange. If `shop_enrollment = false`, credit = 0.
5. **2-year limit**: The credit can only be claimed for 2 consecutive taxable years. Node does not enforce this.
6. **Wage deduction reduction**: Employer's premium deduction must be reduced by the credit amount (IRC §280C(g) reference).
7. **Tax-exempt employers**: Tax-exempt employers get the credit as a refundable credit against payroll taxes (not Schedule 3); this node routes to Schedule 3 for simplicity — coding agent should verify routing for tax-exempt entities.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8941 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8941.pdf | .research/docs/i8941.pdf |
| IRC §45R — Small Employer Health Insurance Credit | current | §45R(a–f) | https://www.law.cornell.edu/uscode/text/26/45R | N/A |
| Rev Proc 2024-40 (TY2025 wage threshold) | 2024 | §3.28 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
