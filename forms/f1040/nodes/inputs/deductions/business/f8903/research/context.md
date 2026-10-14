# f8903 — Domestic Production Activities Deduction (DPAD) — LEGACY

## Overview
**IMPORTANT: This form was REPEALED by the Tax Cuts and Jobs Act (TCJA) of 2017, effective for tax years beginning after December 31, 2017. It is NOT applicable for TY2018 or later federal returns.**

This node is a LEGACY node provided for:
1. Amended returns for tax years 2017 and earlier (pre-TCJA)
2. State returns — some states maintained their own DPAD after federal repeal

IRS Form 8903 captured the Domestic Production Activities Deduction (DPAD) under IRC Section 199, which allowed a deduction of 9% (6% for oil/gas) of the lesser of: qualified production activities income (QPAI) or adjusted gross income. The deduction was limited to 50% of W-2 wages allocable to domestic production activities.

**IRS Form:** IRS Form 8903 (HISTORICAL — repealed for TY2018+)
**Drake Screen:** 8903
**Node Type:** input (legacy)
**Tax Year:** 2017 and prior only (TCJA §13305 repealed IRC §199 for TY2018+)
**Drake Reference:** https://www.irs.gov/forms-pubs/about-form-8903

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| qualified_production_activities_income | number | yes | "Qualified production activities income (QPAI)" | Net income from domestic production activities | Form 8903, line 6 | https://www.irs.gov/pub/irs-prior/f8903--2017.pdf |
| form_w2_wages | number | yes | "W-2 wages from domestic production activities" | W-2 wages paid to employees for domestic production | Form 8903, line 17 | https://www.irs.gov/pub/irs-prior/f8903--2017.pdf |
| adjusted_gross_income | number | no | "Adjusted gross income" | AGI used for the DPAD limitation | Form 8903, line 15 | https://www.irs.gov/pub/irs-prior/f8903--2017.pdf |
| deduction_rate | number | no | "Deduction rate (%)" | 9% standard rate (6% for oil/gas/geothermal); default 9% | Form 8903, line 7; IRC §199(a)(1) | https://www.irs.gov/pub/irs-prior/f8903--2017.pdf |
| oil_gas_rate | boolean | no | "Use 3% oil/gas rate (pre-2010 transition)" | If true, applies 6% rate instead of 9% | IRC §199(d)(9) | N/A |

---

## Calculation Logic

### Step 1 — Compute tentative DPAD
tentative_deduction = deduction_rate × min(qualified_production_activities_income, adjusted_gross_income)
Source: IRC §199(a)(1), Form 8903 Instructions, line 7 — https://www.irs.gov/pub/irs-prior/i8903--2017.pdf

### Step 2 — Apply W-2 wage limitation
w2_limit = 0.50 × form_w2_wages
Source: IRC §199(b)(1), Form 8903 Instructions, line 17 — https://www.irs.gov/pub/irs-prior/i8903--2017.pdf

### Step 3 — Compute final DPAD
computed_deduction = min(tentative_deduction, w2_limit)
Source: IRC §199(b)(1), Form 8903 line 18 — https://www.irs.gov/pub/irs-prior/i8903--2017.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| computed_deduction | schedule1 | computed_deduction > 0 (pre-2018 amended returns only) | Form 8903, line 18 → Schedule 1, line 35 (historical) | https://www.irs.gov/pub/irs-prior/i8903--2017.pdf |

---

## Constants & Thresholds (Tax Year 2017 — last applicable year)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| STANDARD_DEDUCTION_RATE | 0.09 | IRC §199(a)(1) | https://www.law.cornell.edu/uscode/text/26/199 |
| OIL_GAS_DEDUCTION_RATE | 0.06 | IRC §199(d)(9) | https://www.law.cornell.edu/uscode/text/26/199 |
| W2_WAGE_LIMITATION_RATE | 0.50 | IRC §199(b)(1) | https://www.law.cornell.edu/uscode/text/26/199 |
| REPEAL_EFFECTIVE_DATE | TY2018 | TCJA §13305, P.L. 115-97 | https://www.congress.gov/bill/115th-congress/house-bill/1/text |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    qpai["qualified_production_activities_income"]
    w2wages["form_w2_wages"]
    agi["adjusted_gross_income"]
    rate["deduction_rate (9% default)"]
  end
  subgraph node["f8903 — DPAD (LEGACY TY2017-)"]
    step1["tentative = rate × min(QPAI, AGI)"]
    step2["w2_limit = 50% × W-2 wages"]
    step3["deduction = min(tentative, w2_limit)"]
  end
  subgraph outputs["Downstream Nodes"]
    schedule1["schedule1 (line24h_dpad, if > 0)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **REPEALED**: This deduction does not apply for TY2018 and later. Drake may show the screen for amended prior-year returns only.
2. **Oil/gas rate**: Before full repeal, oil/gas producers used a 6% rate (not 9%).
3. **W-2 wage limit**: The deduction cannot exceed 50% of W-2 wages paid for domestic production activities.
4. **Zero QPAI**: If qualified production activities income is zero or negative, the deduction is zero.
5. **AGI limit**: The deduction cannot exceed the taxpayer's AGI (modified for certain items).
6. **State conformity**: Some states did NOT conform to TCJA repeal and may still allow DPAD; this node is for federal use only.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 8903 (2017) | 2017 | All | https://www.irs.gov/pub/irs-prior/f8903--2017.pdf | N/A |
| IRS Form 8903 Instructions (2017) | 2017 | General Instructions | https://www.irs.gov/pub/irs-prior/i8903--2017.pdf | N/A |
| IRC §199 (repealed) | — | §199(a)(1), §199(b)(1) | https://www.law.cornell.edu/uscode/text/26/199 | N/A |
| TCJA §13305 (P.L. 115-97) | 2017 | §13305 | https://www.congress.gov/bill/115th-congress/house-bill/1/text | N/A |
