# f8611 — Form 8611: Recapture of Low-Income Housing Credit

## Overview

Form 8611 computes the recapture of previously claimed low-income housing tax credits (LIHTC) under IRC §42 when a building that was allocated credits is disposed of or no longer meets credit requirements before the end of its 15-year compliance period. The recaptured amount (plus interest) routes to Schedule 2 as additional tax.

**IRS Form:** Form 8611 (Rev. December 2021)
**Drake Screen:** 8611
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A — no Drake KB article found

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| original_credit_amount | number (nonnegative) | Yes | Form 8611 line 1 — Original credit | Total LIHTC claimed for this building in the credit year | IRC §42(j)(1); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |
| year_credit_first_claimed | number (int, 4-digit) | Yes | Form 8611 — Year credit first claimed | Tax year in which the LIHTC was first claimed for this building | IRC §42(j)(2); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |
| year_of_recapture_event | number (int, 4-digit) | Yes | Form 8611 — Year of recapture event | Current tax year in which the recapture event occurred | IRC §42(j)(1); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |
| recapture_event_type | RecaptureEventType enum | Yes | Form 8611 — Event type | Type of event triggering recapture | IRC §42(j)(1)(A)-(C); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |
| applicable_fraction | number (0-1) | No | Form 8611 — Applicable fraction | Fraction of units in the building that are low-income; affects recapture amount | IRC §42(j)(3); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |
| prior_recapture_amounts | number (nonnegative) | No | Form 8611 line — Prior recapture | Sum of recapture amounts from prior years for this building | IRC §42(j)(5)(A); Form 8611 | https://www.irs.gov/pub/irs-pdf/f8611.pdf |

---

## Calculation Logic

### Step 1 — Compute Years Held
years_held = year_of_recapture_event − year_credit_first_claimed
Source: IRC §42(j)(2); Form 8611

### Step 2 — Determine if Recapture Applies
If years_held ≥ 15: no recapture (credit fully vested). Return empty outputs.
Source: IRC §42(j)(2)(A) — 15-year recapture period

### Step 3 — Compute Recapture Fraction
The recapture fraction (accelerated_portion) represents how much of the credit must be paid back based on the number of years the building was held in compliance. Under IRC §42(j)(2)(B), the fraction that accelerates:

recapture_fraction = (15 - years_held) / 15

This means:
- Year 0 (disposed immediately): 15/15 = 100% recaptured
- Year 1: 14/15 ≈ 93.3%
- Year 5: 10/15 ≈ 66.7%
- Year 10: 5/15 ≈ 33.3%
- Year 14: 1/15 ≈ 6.7%
- Year 15+: 0% (no recapture)

Source: IRC §42(j)(2)(B); Treas. Reg. §1.42-4

### Step 4 — Apply Applicable Fraction
adjusted_credit = original_credit_amount × (applicable_fraction ?? 1.0)
If applicable_fraction is not provided, assume 1.0 (100% low-income).
Source: IRC §42(j)(3); Form 8611

### Step 5 — Compute Gross Recapture
gross_recapture = adjusted_credit × recapture_fraction
Source: IRC §42(j)(1); Form 8611

### Step 6 — Subtract Prior Recapture Amounts
net_recapture = max(0, gross_recapture − (prior_recapture_amounts ?? 0))
Source: IRC §42(j)(5)(A); Form 8611

### Step 7 — Route to Schedule 2
The net_recapture amount routes to Schedule 2 line 10 (recapture of low-income housing credit).
Note: Schedule 2 currently lacks a dedicated line10_lihtc_recapture field; it will be added when this node is implemented.
Source: IRC §42(j); Schedule 2 line 10; Form 8611 instructions

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line10_lihtc_recapture | schedule2 | net_recapture > 0 | IRC §42(j); Schedule 2 line 10 | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| RECAPTURE_PERIOD_YEARS | 15 | IRC §42(j)(2)(A) | https://www.law.cornell.edu/uscode/text/26/42 |
| DEFAULT_APPLICABLE_FRACTION | 1.0 | IRC §42(j)(3) | https://www.law.cornell.edu/uscode/text/26/42 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Form 8611)"]
    A[original_credit_amount]
    B[year_credit_first_claimed]
    C[year_of_recapture_event]
    D[recapture_event_type]
    E[applicable_fraction]
    F[prior_recapture_amounts]
  end
  subgraph node["f8611 Node"]
    G[years_held = C - B]
    H[if years_held >= 15: no recapture]
    I[recapture_fraction = (15 - years_held) / 15]
    J[adjusted_credit = A × E]
    K[gross_recapture = J × I]
    L[net_recapture = max(0, K - F)]
  end
  subgraph outputs["Downstream Nodes"]
    M[schedule2: line10_lihtc_recapture]
  end
  B --> G
  C --> G
  G --> H
  G --> I
  A --> J
  E --> J
  J --> K
  I --> K
  K --> L
  F --> L
  L --> M
```

---

## Edge Cases & Special Rules

1. **15-year safe harbor**: If building held 15+ years from first credit claim, no recapture applies.
2. **Year 0 disposition**: If disposed in the same year credit was first claimed (years_held = 0), 100% recapture.
3. **Applicable fraction = 1.0 default**: If all units are low-income and fraction is omitted, use 1.0.
4. **Prior recapture reduces liability**: Prior years' recapture amounts are subtracted to prevent double recovery.
5. **Noncompliance vs. disposition**: Recapture event type affects the nature but not the amount calculation in this simplified model.
6. **Interest**: Form 8611 also computes interest on the recaptured amount. The engine captures the recapture amount; interest computation is outside scope.
7. **Multiple buildings**: Each building gets its own Form 8611. Users submit multiple items, each computing independently.
8. **year_of_recapture_event must be >= year_credit_first_claimed**: Validation error if not.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §42(j) | Current | §42(j)(1)-(5) | https://www.law.cornell.edu/uscode/text/26/42 | N/A |
| Form 8611 (Rev. 12/2021) | 2021 | All lines | https://www.irs.gov/pub/irs-pdf/f8611.pdf | N/A |
| Treas. Reg. §1.42-4 | Current | All | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/section-1.42-4 | N/A |
