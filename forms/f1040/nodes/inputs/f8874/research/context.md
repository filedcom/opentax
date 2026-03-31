# Form 8874 — New Markets Credit

## Overview
Computes the New Markets Credit under IRC §45D for qualified equity investments (QEIs) in Community Development Entities (CDEs). The credit spans 7 years: 5% of QEI for credit years 1–3 and 6% for credit years 4–7 (total 39% over 7 years). Routes to Schedule 3 line 6z. The node accepts either pre-computed credit amounts or raw investment amounts.

**IRS Form:** 8874
**Drake Screen:** 8874
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14030

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| credit_years_1_to_3 | number (≥0) | No | Credit (yrs 1–3) | Pre-computed credit amount for QEIs in credit years 1–3 (investment × 5%) | Form 8874 Part I | https://www.irs.gov/pub/irs-pdf/i8874.pdf |
| credit_years_4_to_7 | number (≥0) | No | Credit (yrs 4–7) | Pre-computed credit amount for QEIs in credit years 4–7 (investment × 6%) | Form 8874 Part I | https://www.irs.gov/pub/irs-pdf/i8874.pdf |
| investment_amount_early | number (≥0) | No | QEI (yrs 1–3) | Raw QEI amount in credit years 1–3; node applies 5% rate | Form 8874 Part I | https://www.irs.gov/pub/irs-pdf/i8874.pdf |
| investment_amount_later | number (≥0) | No | QEI (yrs 4–7) | Raw QEI amount in credit years 4–7; node applies 6% rate | Form 8874 Part I | https://www.irs.gov/pub/irs-pdf/i8874.pdf |
| prior_year_carryforward | number (≥0) | No | Carryforward | Unused New Markets Credit carried forward from prior years | Form 8874 Part II | https://www.irs.gov/pub/irs-pdf/i8874.pdf |

---

## Calculation Logic

### Step 1 — Current-year credit from pre-computed amounts
`directCredit = (credit_years_1_to_3 ?? 0) + (credit_years_4_to_7 ?? 0)`

### Step 2 — Current-year credit from raw investment amounts
`computedCredit = (investment_amount_early ?? 0) × 5% + (investment_amount_later ?? 0) × 6%`

### Step 3 — Total current-year credit
`currentYearCredit = directCredit + computedCredit`

### Step 4 — Add carryforward
`totalCredit = currentYearCredit + (prior_year_carryforward ?? 0)`
Source: Form 8874 Line 7 — https://www.irs.gov/pub/irs-pdf/i8874.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total > 0 | Form 8874 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Credit rate — years 1–3 of credit period | 5% of QEI | IRC §45D(a)(2)(A); statutory | https://www.law.cornell.edu/uscode/text/26/45D |
| Credit rate — years 4–7 of credit period | 6% of QEI | IRC §45D(a)(2)(B); statutory | https://www.law.cornell.edu/uscode/text/26/45D |
| Total credit over 7 years | 39% of QEI | IRC §45D(a); statutory | https://www.law.cornell.edu/uscode/text/26/45D |
| Credit period | 7 years | IRC §45D(a)(1); statutory | https://www.law.cornell.edu/uscode/text/26/45D |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    early["credit_years_1_to_3 or\ninvestment_amount_early"]
    later["credit_years_4_to_7 or\ninvestment_amount_later"]
    cf["prior_year_carryforward"]
  end
  subgraph node["f8874 (New Markets Credit)"]
    cur["computeCurrentYearCredit()"]
    tot["totalCredit()"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  early & later --> cur --> tot
  cf --> tot --> s3

---

## Edge Cases & Special Rules

1. **Dual input modes**: Node accepts either pre-computed credit amounts OR raw investment amounts. If both are provided for the same period, they stack (additive) — preparer should provide only one or the other per period.
2. **Credit year tracking**: The "credit year" is determined from when the QEI was originally made, not the current tax year. Years 1–3 use 5%; years 4–7 use 6%.
3. **CDE allocation requirement**: QEIs must be certified by a CDE (Community Development Entity) — not enforced by this node.
4. **7-year recapture period**: If the CDE fails the qualifying low-income community business requirements, the credit is recaptured. Not enforced in this node.
5. **Non-refundable**: Excess credit carries back 1 year, forward 20 years via Form 3800.
6. **Carryforward**: `prior_year_carryforward` adds to the current-year credit for routing to Schedule 3.
7. **No annual investment cap**: IRC §45D does not impose a per-taxpayer annual cap on QEI amounts.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8874 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8874.pdf | .research/docs/i8874.pdf |
| IRC §45D — New Markets Tax Credit | current | §45D(a–c) | https://www.law.cornell.edu/uscode/text/26/45D | N/A |
| Rev Proc 2024-40 (TY2025 adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
