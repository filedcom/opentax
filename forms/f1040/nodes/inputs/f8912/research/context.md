# f8912 — Form 8912: Credit to Holders of Tax Credit Bonds

## Overview

Form 8912 allows holders of specified tax credit bonds to claim a nonrefundable credit. The credit equals the face amount of the bond multiplied by the credit rate set at issuance multiplied by the fraction of the year the bond was held. The credit is includible in gross income. It routes to Schedule 3 as a nonrefundable credit.

**IRS Form:** Form 8912 (Rev. December 2024)
**Drake Screen:** 8912
**Node Type:** input (per-bond array)
**Tax Year:** 2025
**Drake Reference:** N/A — no Drake KB article found

---

## Input Fields

Per-bond item (one per bond position held during the year):

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| bond_type | BondType enum | Yes | Part I/II — Bond type | Type of qualified tax credit bond | IRC §54A-54F, §1397E | https://www.irs.gov/pub/irs-pdf/f8912.pdf |
| face_amount | number (nonnegative) | Yes | Column (b) — Face amount | Face amount of the bond held | IRC §54A(b)(2) | https://www.irs.gov/pub/irs-pdf/f8912.pdf |
| credit_rate | number (nonneg, 0-1) | Yes | Column (c) — Credit rate | Applicable credit rate as set by IRS at issuance | IRC §54A(b)(3) | https://www.irs.gov/pub/irs-pdf/f8912.pdf |
| holding_period_days | number (nonnegative) | Yes | Column (d) — Days held | Number of days the bond was held during the tax year | IRC §54A(b)(4) | https://www.irs.gov/pub/irs-pdf/f8912.pdf |
| total_days_in_period | number (positive) | Yes | Column (e) — Total days | Total days in the tax year (365 or 366) | IRC §54A(b)(4) | https://www.irs.gov/pub/irs-pdf/f8912.pdf |

---

## Calculation Logic

### Step 1 — Compute Per-Bond Credit
credit_per_bond = face_amount × credit_rate × (holding_period_days / total_days_in_period)
Source: IRC §54A(b), Form 8912 instructions; https://www.irs.gov/pub/irs-pdf/i8912.pdf

### Step 2 — Sum All Bond Credits
total_credit = sum of credit_per_bond for all bond items
Source: Form 8912 line totals

### Step 3 — Income Inclusion Note
The credit amount is includible in gross income (treated as interest income) under IRC §54A(f). This node does NOT generate income inclusion — that is handled upstream by the data entry system.
Source: IRC §54A(f), https://www.law.cornell.edu/uscode/text/26/54A

### Step 4 — Route to Schedule 3
Total credit flows to schedule3 line6z_general_business_credit.
Note: Form 8912 nonrefundable credits technically go to Schedule 3 line 6z (Other nonrefundable credits / Form 3800 equivalent path). Some instructions indicate direct entry on Schedule 3 line 6z.
Source: Schedule 3 Part I; Form 8912 instructions

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total_credit > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Bond types (enum) | CREB, NEW_CREB, QECB, QZAB, QSCB, BAB_DIRECT | IRC §54A-54F, §1397E | https://www.law.cornell.edu/uscode/text/26/54A |
| Credit rate | Set by IRS/Treasury at issuance; varies by bond | IRC §54A(b)(3) | N/A |
| Income inclusion required | Yes — credit is gross income | IRC §54A(f) | https://www.law.cornell.edu/uscode/text/26/54A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Form 8912 — per bond)"]
    A[bond_type]
    B[face_amount]
    C[credit_rate]
    D[holding_period_days]
    E[total_days_in_period]
  end
  subgraph node["f8912 Node"]
    F[credit = face × rate × days/total_days]
    G[Sum all bonds]
  end
  subgraph outputs["Downstream Nodes"]
    H[schedule3: line6z_general_business_credit]
  end
  B --> F
  C --> F
  D --> F
  E --> F
  F --> G
  G --> H
```

---

## Edge Cases & Special Rules

1. **Partial year holding**: holding_period_days < total_days_in_period — the formula automatically prorates the credit.
2. **Full year holding**: holding_period_days = total_days_in_period — credit = face × rate.
3. **Zero credit rate**: If credit_rate = 0, credit = 0, no output.
4. **Multiple bonds**: Each bond item is calculated independently, then summed.
5. **Income inclusion**: The credit amount must be included in gross income — not computed here but must be noted in data entry.
6. **Bond program expiration**: Most tax credit bond programs were repealed by TCJA (P.L. 115-97, 2017) for bonds issued after 12/31/2017. Existing bonds issued before that date continue to generate credits. Form 8912 (Rev. 12/2024) still exists for legacy bond holders.
7. **total_days_in_period must be > 0**: Validation error if zero to prevent division by zero.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §54A | 2008 (repealed 2017 for new issuances) | §54A(a)-(f) | https://www.law.cornell.edu/uscode/text/26/54A | N/A |
| Form 8912 (Rev. 12/2024) | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8912.pdf | N/A |
| Form 8912 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8912.pdf | N/A |
