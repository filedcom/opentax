# f8896 — Form 8896: Low Sulfur Diesel Fuel Production Credit

## Overview

Form 8896 allows qualified small business refiners to claim a production credit for producing ultra-low sulfur diesel (ULSD) fuel — diesel with sulfur content at or below 15 parts per million. The credit is part of the General Business Credit (IRC §38) and flows via Form 3800 to Schedule 3 line 6z.

**IMPORTANT — TY2025 Status:** This credit is effectively defunct for TY2025. Under IRC §45H, qualified capital costs had to be incurred on or before December 31, 2009. No new credits can be generated after that date. However, carryforward amounts from prior years via Form 3800 may still appear on returns. The node captures the credit computed for informational completeness and carryforward tracing, but notes that TY2025 production would not qualify unless prior certifications exist.

**IRS Form:** Form 8896
**Drake Screen:** 8896
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A — no Drake KB article found

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| gallons_ulsd_produced | number (nonnegative) | No | Line 1 — Gallons of ULSD produced | Total gallons of qualified low sulfur diesel fuel produced during the tax year | IRC §45H(a); Form 8896 Line 1 | https://www.irs.gov/pub/irs-pdf/f8896.pdf |
| qualified_capital_costs | number (nonnegative) | No | Line 2 — Qualified capital costs | Total qualified costs incurred at the refinery for EPA sulfur compliance | IRC §45H(b)(1); Form 8896 Line 2 | https://www.irs.gov/pub/irs-pdf/f8896.pdf |
| refinery_capacity_barrels_per_day | number (nonnegative) | No | Refinery capacity (bbl/day) | Average daily domestic refinery run; must be ≤205,000 bbl/day to qualify | IRC §45H(c)(1)(A) | https://www.law.cornell.edu/uscode/text/26/45H |
| prior_year_credits_claimed | number (nonnegative) | No | Line 3 — Prior credits | Aggregate credits previously claimed under §45H for this facility | IRC §45H(b)(1); Form 8896 Line 3 | https://www.irs.gov/pub/irs-pdf/f8896.pdf |

---

## Calculation Logic

### Step 1 — Eligibility Check
Refinery must be a "small business refiner": average daily domestic refinery run ≤ 205,000 barrels/day for the period ending December 31, 2002.
Source: IRC §45H(c)(1)(A), https://www.law.cornell.edu/uscode/text/26/45H

### Step 2 — Compute Base Credit
credit_before_cap = gallons_ulsd_produced × $0.05 (5 cents per gallon)
Source: IRC §45H(a), https://www.law.cornell.edu/uscode/text/26/45H

### Step 3 — Compute Capital Costs Limitation
capital_costs_cap = (qualified_capital_costs × 0.25) − prior_year_credits_claimed
The credit cannot exceed 25% of qualified capital costs, reduced by prior credits.
Source: IRC §45H(b)(1), https://www.law.cornell.edu/uscode/text/26/45H

### Step 4 — Apply Limitation
credit = min(credit_before_cap, max(0, capital_costs_cap))
Source: IRC §45H(b)(1), https://www.law.cornell.edu/uscode/text/26/45H

### Step 5 — Route to Schedule 3
The credit flows as a general business credit via Form 3800. In the engine, it routes directly to schedule3 line6z_general_business_credit.
Source: IRC §38; Schedule 3 line 6z

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | credit > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| CREDIT_RATE_PER_GALLON | $0.05 (5 cents) | IRC §45H(a) | https://www.law.cornell.edu/uscode/text/26/45H |
| MAX_REFINERY_CAPACITY_BARRELS | 205,000 bbl/day | IRC §45H(c)(1)(A) | https://www.law.cornell.edu/uscode/text/26/45H |
| CAPITAL_COSTS_CAP_RATE | 25% (0.25) | IRC §45H(b)(1) | https://www.law.cornell.edu/uscode/text/26/45H |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Form 8896)"]
    A[gallons_ulsd_produced]
    B[qualified_capital_costs]
    C[refinery_capacity_barrels_per_day]
    D[prior_year_credits_claimed]
  end
  subgraph node["f8896 Node"]
    E[Eligibility check: capacity ≤ 205,000 bbl/day]
    F[Base credit: gallons × $0.05]
    G[Capital costs cap: costs × 25% - prior credits]
    H[Credit = min(base, cap)]
  end
  subgraph outputs["Downstream Nodes"]
    I[schedule3: line6z_general_business_credit]
  end
  A --> F
  B --> G
  C --> E
  D --> G
  E --> H
  F --> H
  G --> H
  H --> I
```

---

## Edge Cases & Special Rules

1. **TY2025 credit expiration**: Qualified capital costs had to be incurred by December 31, 2009 (IRC §45H). The engine accepts the input for completeness (carryforward scenarios) but the credit amount will zero out if no valid gallons are produced under a prior certification.
2. **Capacity check**: If refinery_capacity_barrels_per_day > 205,000, the refiner is NOT a small business refiner and no credit is allowed. The node throws an error.
3. **Capital costs cap can be zero**: If prior_year_credits_claimed ≥ qualified_capital_costs × 0.25, no additional credit is available.
4. **Zero gallons**: If gallons_ulsd_produced = 0, credit = 0, no output.
5. **Missing optional fields**: If qualified_capital_costs or prior_year_credits_claimed are absent, the capital costs limitation cannot be enforced — treat as no limitation (credit_before_cap is used).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §45H | Current | §45H(a)-(c) | https://www.law.cornell.edu/uscode/text/26/45H | N/A |
| Form 8896 (Rev. 12/2019) | 2019 | All lines | https://www.irs.gov/pub/irs-pdf/f8896.pdf | N/A |
| IRC §38 (General Business Credit) | Current | §38 | https://www.law.cornell.edu/uscode/text/26/38 | N/A |
