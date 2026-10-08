# Form 8379 — Injured Spouse Allocation

## Overview
Form 8379 is an allocation and disclosure form — it does not alter tax computation. It is filed when a joint return's refund would be fully or partially applied to one spouse's past-due debts (child support, federal/state taxes, student loans, unemployment compensation). The node captures the injured spouse's share of joint income, payments, deductions, and credits so the IRS can calculate the injured spouse's portion of the refund. This node produces **no tax-computation outputs** (outputNodes is empty).

**IRS Form:** 8379
**Drake Screen:** 8379
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13506

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| injured_spouse_ssn | string | No | Injured spouse SSN | SSN of the spouse who did not incur the debt | Form 8379 Part I Line 1 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_name | string | No | Injured spouse name | Name of the injured spouse | Form 8379 Part I | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_wages | number (≥0) | No | Wages | Injured spouse's share of joint wages (W-2) | Form 8379 Part III Line 10 col (b) | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_se_income | number | No | Self-employment income | Injured spouse's SE income (can be negative — loss) | Form 8379 Part III Line 10 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_other_income | number | No | Other income | Other income attributable to injured spouse | Form 8379 Part III Line 10 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_withholding | number (≥0) | No | Federal withholding | Injured spouse's share of federal income tax withheld | Form 8379 Part III Line 13 col (b) | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_estimated_tax | number (≥0) | No | Estimated tax payments | Injured spouse's share of estimated tax payments | Form 8379 Part III Line 14 col (b) | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_eic | number (≥0) | No | Earned Income Credit | Injured spouse's share of EIC (if both have earned income) | Form 8379 Part III Line 15 col (b) | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_itemized_deductions | number (≥0) | No | Itemized deductions | Injured spouse's share of itemized deductions | Form 8379 Part II Line 5–8 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| itemizes | boolean | No | Itemizes deductions | True if the joint return itemizes; false = standard deduction | Form 8379 Part II | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| injured_spouse_credits | number (≥0) | No | Non-refundable credits | Injured spouse's share of non-refundable credits | Form 8379 Part III Line 16 col (b) | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| debt_type | enum | No | Type of debt | Type of past-due obligation: child_support, federal_tax, state_tax, student_loan, unemployment, other | Form 8379 Part I Line 2 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |
| debt_amount | number (≥0) | No | Debt amount | Total amount of past-due debt subject to offset | Form 8379 Part I Line 2 | https://www.irs.gov/pub/irs-pdf/i8379.pdf |

---

## Calculation Logic

### Step 1 — Allocation only (no computation)
This node performs no tax calculations. It validates and stores the injured spouse's share of joint items. The IRS performs the actual refund allocation calculation after receiving the filed form.
Source: Form 8379 Instructions, "How the IRS figures the injured spouse's share" — https://www.irs.gov/pub/irs-pdf/i8379.pdf

### Step 2 — Schema validation
`inputSchema.parse(rawInput)` validates all fields, then returns `{ outputs: [] }`.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Form 8379 produces no tax-computation outputs | Form 8379 Instructions | https://www.irs.gov/pub/irs-pdf/i8379.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | — | Form 8379 has no inflation-adjusted thresholds | — |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    id["Injured spouse ID"]
    inc["Injured spouse income<br/>(wages, SE, other)"]
    pay["Payments<br/>(withholding, est. tax, EIC)"]
    ded["Deductions & Credits"]
    debt["Debt type & amount"]
  end
  subgraph node["f8379 (Injured Spouse Allocation)"]
    val["validate only<br/>outputs: []"]
  end
  id & inc & pay & ded & debt --> val

---

## Edge Cases & Special Rules

1. **No computation outputs**: This node intentionally produces zero outputs. The IRS uses the filed Form 8379 data to manually compute the refund split.
2. **Community property states**: In AZ, CA, ID, LA, NV, NM, TX, WA, WI — income earned during marriage is considered equally owned by both spouses. The injured spouse's allocation in community property states uses different rules (each spouse's community income = 50% of combined community income). Preparer must handle this manually.
3. **EIC allocation**: If both spouses have earned income, the EIC is allocated to the spouse whose income qualifies. If only one spouse has earned income, 100% goes to that spouse.
4. **Multiple debts**: Only one `debt_type` is captured. If the obligated spouse has multiple debt types, only the primary offset reason is recorded here.
5. **Standard vs. itemized deduction**: If `itemizes = false`, each spouse is allocated half the standard deduction (or all to one spouse if only one qualifies). If `itemizes = true`, deductions are allocated as entered.
6. **Non-refundable credits**: Non-refundable credits are allocated based on who generated the credit. Refundable credits (ACTC, AOTC refundable, net premium tax credit) are allocated to the spouse who contributed to qualifying income/payments.
7. **Processing time**: The IRS typically takes 11–14 weeks to process Form 8379. The node only captures the data for submission.
8. **E-filing**: Form 8379 can be attached to an e-filed return. If the return has already been filed, it can be mailed separately.
9. **Both spouses liable**: If both spouses owe past-due debts, the entire refund may be offset. Filing Form 8379 only protects the injured spouse's share.
10. **No joint liability**: The injured spouse must not be legally liable for the debt. If both signed a joint tax liability, this form does not apply.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8379 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8379.pdf | .research/docs/i8379.pdf |
| IRS FAQ — Injured Spouse | 2024 | All | https://www.irs.gov/taxtopics/tc203 | N/A |
| IRS Pub 504 — Divorced or Separated Individuals | 2024 | Ch. 2 | https://www.irs.gov/pub/irs-pdf/p504.pdf | .research/docs/p504.pdf |
| IRC §6402(c) — Offset for past-due support | current | §6402(c) | https://www.law.cornell.edu/uscode/text/26/6402 | N/A |
