# qsehra — Qualified Small Employer Health Reimbursement Arrangement

## Overview
A QSEHRA is an employer-funded health reimbursement arrangement available to
small employers (< 50 full-time equivalent employees). The QSEHRA amount offered
affects the Premium Tax Credit (Form 8962) — it reduces or eliminates PTC
eligibility for months the employee has Minimum Essential Coverage (MEC).
If excluded from gross income (employee has MEC), QSEHRA is not income.
If NOT excluded (no MEC), QSEHRA amounts received are included in gross income.

**IRS Form:** Form 1040 (QSE screen)
**Drake Screen:** QSE
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com (screen QSE)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| qsehra_amount_offered | number (nonneg) | Yes | QSEHRA amount offered | Annual QSEHRA amount offered by employer for TY2025 | IRC §9831(d)(1); Notice 2017-67 | https://www.irs.gov/pub/irs-drop/n-17-67.pdf |
| qsehra_amount_received | number (nonneg) | Yes | QSEHRA amount received | Actual amount reimbursed/received during 2025 | IRC §9831(d); Notice 2017-67 | https://www.irs.gov/pub/irs-drop/n-17-67.pdf |
| has_minimum_essential_coverage | boolean | Yes | Has MEC | True if the employee had Minimum Essential Coverage for the year | IRC §5000A(f); IRC §9831(d)(2)(B) | https://www.irs.gov/pub/irs-drop/n-17-67.pdf |
| is_self_only_coverage | boolean | Yes | Self-only coverage | True if the QSEHRA is for self-only (vs. family) — determines contribution limit | IRC §9831(d)(3)(A); Rev Proc 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

---

## Calculation Logic

### Step 1 — Determine if QSEHRA amount is included in gross income
If `has_minimum_essential_coverage` is false:
  → QSEHRA amounts received = gross income → route to f1040 line 1a (other wages)
  → No PTC available for those months (no MEC = not eligible for PTC)
If `has_minimum_essential_coverage` is true:
  → QSEHRA is excluded from gross income (not taxable)
  → PTC reduction applies: QSEHRA reduces PTC via Form 8962
Source: IRC §9831(d)(2)(B); Notice 2017-67 §IV.B

### Step 2 — PTC Reduction (if has MEC)
When the employee has MEC and received a QSEHRA:
  → The QSEHRA amount offered reduces the PTC
  → Route `qsehra_amount_offered` to form8962 as `qsehra_amount_offered`
Source: IRC §36B(c)(2)(C)(iv); Notice 2017-67 §IV.C

### Step 3 — No PTC at all (no MEC)
If no MEC, no PTC is available for months without MEC. This node just sends
the received amount to f1040 as other income, and does not route to form8962.
Source: IRC §36B(c)(1)(A) — must have MEC to claim PTC

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| qsehra_amount_offered | form8962 | has_minimum_essential_coverage = true AND qsehra_amount_offered > 0 | IRC §36B(c)(2)(C)(iv); Notice 2017-67 | https://www.irs.gov/pub/irs-drop/n-17-67.pdf |
| line1a_wages (other income) | f1040 | has_minimum_essential_coverage = false AND qsehra_amount_received > 0 | IRC §9831(d)(2)(B) | https://www.irs.gov/pub/irs-drop/n-17-67.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| QSEHRA self-only annual limit (2025) | $6,350 | Rev Proc 2024-40 §3.25 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| QSEHRA family annual limit (2025) | $12,800 | Rev Proc 2024-40 §3.25 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (QSE screen)"]
    qsehra_amount_offered
    qsehra_amount_received
    has_minimum_essential_coverage
    is_self_only_coverage
  end
  subgraph node["qsehra Node"]
    mec_check["has MEC?"]
    limit_check["amount vs limit"]
  end
  subgraph outputs["Downstream Nodes"]
    form8962["form8962 qsehra_amount_offered (reduces PTC)"]
    f1040_income["f1040 line1a_wages (if no MEC: amount received = gross income)"]
  end
  inputs --> node --> mec_check
  mec_check -- "has MEC" --> form8962
  mec_check -- "no MEC" --> f1040_income
```

---

## Edge Cases & Special Rules

1. **No MEC + QSEHRA received = gross income**: If no MEC, QSEHRA amounts received are included in gross income and taxable (IRC §9831(d)(2)(B)). Route to f1040 line 1a as other income.
2. **Annual limit excess**: QSEHRA cannot exceed the statutory limit ($6,350 single, $12,800 family for 2025). If offered amount exceeds the limit, only the limit matters for PTC reduction; the excess is taxable income.
3. **PTC reduction**: The PTC reduction is dollar-for-dollar by the QSEHRA amount offered (not received) per IRC §36B(c)(2)(C)(iv). This node passes the offered amount to form8962.
4. **Affordability test**: If the QSEHRA amount offered ≥ the "floor" (9.02% of household income for 2025 per Rev Proc 2024-40), the employee is ineligible for PTC. This affordability check is done within form8962, not in this input node.
5. **QSEHRA = 0**: If no QSEHRA offered or received, no output emitted.
6. **Partial year MEC**: If MEC was only for part of the year, a monthly allocation applies. This node handles the annual total and passes it to form8962 which handles monthly detail.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Notice 2017-67 | 2017 | §IV.B, §IV.C | https://www.irs.gov/pub/irs-drop/n-17-67.pdf | N/A |
| IRC §9831(d) | current | QSEHRA definition | https://uscode.house.gov | N/A |
| IRC §36B(c)(2)(C)(iv) | current | PTC reduction for QSEHRA | https://uscode.house.gov | N/A |
| Rev Proc 2024-40 | 2024 | §3.25 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |
