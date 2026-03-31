# Form 8882 — Credit for Employer-Provided Child Care Facilities and Services

## Overview
Computes the IRC §45F credit for employers who provide or contract for qualified child care facilities or resource/referral services for employees. Credit = 25% of qualified child care expenses + 10% of resource/referral expenses, capped at $150,000/year. Routes to Schedule 3 line 6z.

**IRS Form:** 8882
**Drake Screen:** 8882
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14036

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| qualified_childcare_expenses | number (≥0) | No | Child care expenses | Amounts paid or incurred for qualified child care facility (Lines 1–3) | Form 8882 Lines 1–3; IRC §45F(b) | https://www.irs.gov/pub/irs-pdf/i8882.pdf |
| resource_referral_expenses | number (≥0) | No | Resource/referral expenses | Amounts paid to qualified child care resource and referral organizations (Line 4) | Form 8882 Line 4; IRC §45F(c) | https://www.irs.gov/pub/irs-pdf/i8882.pdf |

---

## Calculation Logic

### Step 1 — Facility credit
`facilityCredit = qualified_childcare_expenses × 25%`
Source: IRC §45F(a)(1); Form 8882 Line 5 — https://www.irs.gov/pub/irs-pdf/i8882.pdf

### Step 2 — Resource/referral credit
`referralCredit = resource_referral_expenses × 10%`
Source: IRC §45F(a)(2); Form 8882 Line 6 — https://www.irs.gov/pub/irs-pdf/i8882.pdf

### Step 3 — Total credit (capped)
`total = min(facilityCredit + referralCredit, $150,000)`
Source: IRC §45F(b)(2); Form 8882 Line 7 — https://www.irs.gov/pub/irs-pdf/i8882.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total > 0 | Form 8882 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Child care facility credit rate | 25% | IRC §45F(a)(1); statutory | https://www.law.cornell.edu/uscode/text/26/45F |
| Resource/referral credit rate | 10% | IRC §45F(a)(2); statutory | https://www.law.cornell.edu/uscode/text/26/45F |
| Annual credit cap | $150,000 | IRC §45F(b)(2); statutory | https://www.law.cornell.edu/uscode/text/26/45F |
| Recapture period | 10 years | IRC §45F(d)(2); statutory | https://www.law.cornell.edu/uscode/text/26/45F |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    cc["qualified_childcare_expenses"]
    rr["resource_referral_expenses"]
  end
  subgraph node["f8882 (Employer Child Care Credit)"]
    fc["facilityCredit = expenses × 25%"]
    rc["referralCredit = expenses × 10%"]
    tot["min(fc + rc, $150,000)"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  cc --> fc --> tot
  rr --> rc --> tot
  tot --> s3

---

## Edge Cases & Special Rules

1. **$150,000 annual cap**: The combined facility + referral credit cannot exceed $150,000 per year regardless of expenses.
2. **Qualified child care facility**: Must be primarily used for providing child care to employees' children; cannot be used predominantly by highly-compensated employees (IRC §45F(c)(1)).
3. **10-year recapture**: If the facility ceases to be a qualified child care facility within 10 years, the credit is recaptured on a sliding scale. Not tracked by this node.
4. **Wage deduction reduction**: The employer's wage/expense deduction must be reduced by the credit amount taken (IRC §280C(a) analogy — see IRC §45F(f)).
5. **Contracted facility**: Amounts paid to contract with a third-party child care facility also qualify (not just employer-operated facilities).
6. **Qualified resource/referral organizations**: Must be organizations that provide information about child care to employees. The 10% rate applies only to these organizations, not to child care facilities.
7. **Non-refundable**: Excess carries forward via Form 3800.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8882 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8882.pdf | .research/docs/i8882.pdf |
| IRC §45F — Employer-Provided Child Care Credit | current | §45F(a–f) | https://www.law.cornell.edu/uscode/text/26/45F | N/A |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
