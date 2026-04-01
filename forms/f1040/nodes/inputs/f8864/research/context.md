# f8864 — Form 8864: Biodiesel, Renewable Diesel, or Sustainable Aviation Fuel (SAF) Credits

## Overview
Form 8864 computes credits for producers and blenders of biodiesel, agri-biodiesel, renewable diesel, and sustainable aviation fuel (SAF). Multiple credit types with different rates apply. SAF credit was added by the Inflation Reduction Act of 2022 (IRA 2022). The credits flow to Schedule 3 via General Business Credit (Form 3800).

**IRS Form:** 8864
**Drake Screen:** 8864
**Node Type:** input (singleton)
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| gallons_biodiesel | number (nonnegative) | No | Production records | Gallons of biodiesel (non-agri) used in a qualified mixture | IRC §40A(a)(1); Form 8864 line 1 | https://www.irs.gov/pub/irs-pdf/f8864.pdf |
| gallons_agri_biodiesel | number (nonnegative) | No | Production records | Gallons of agri-biodiesel (e.g., soybean oil) in a qualified mixture | IRC §40A(b)(2); Form 8864 line 2 | https://www.irs.gov/pub/irs-pdf/f8864.pdf |
| gallons_renewable_diesel | number (nonnegative) | No | Production records | Gallons of renewable diesel used in fuel or qualified mixture | IRC §40A(f); Form 8864 line 4 | https://www.irs.gov/pub/irs-pdf/f8864.pdf |
| gallons_saf | number (nonnegative) | No | Production records | Gallons of sustainable aviation fuel sold or used | IRC §40B; Form 8864 Part II | https://www.irs.gov/pub/irs-pdf/f8864.pdf |
| saf_ghg_reduction_percentage | number (nonnegative) | No | Life cycle analysis | SAF lifecycle GHG reduction percentage (must be > 50% for credit) | IRC §40B(b)(2); Form 8864 Part II | https://www.irs.gov/pub/irs-pdf/f8864.pdf |

---

## Calculation Logic

### Step 1 — Biodiesel Mixture Credit
biodiesel_credit = gallons_biodiesel × $1.00/gallon
Source: IRC §40A(a)(1); Form 8864 line 1a; https://www.irs.gov/pub/irs-pdf/f8864.pdf

### Step 2 — Agri-Biodiesel Credit
agri_credit = gallons_agri_biodiesel × $1.10/gallon
Note: Agri-biodiesel gets $1.00 + $0.10 small agri-biodiesel producer credit = $1.10 total
Source: IRC §40A(b)(2), §40A(b)(4); Form 8864 line 2a; https://www.irs.gov/pub/irs-pdf/f8864.pdf

### Step 3 — Renewable Diesel Credit
renewable_diesel_credit = gallons_renewable_diesel × $1.00/gallon
Source: IRC §40A(f); Form 8864 line 4a; https://www.irs.gov/pub/irs-pdf/f8864.pdf

### Step 4 — SAF Credit
Base SAF rate: $1.25/gallon
Bonus: +$0.01/gallon for each percentage point of GHG reduction above 50%
SAF credit per gallon = $1.25 + max(0, saf_ghg_reduction_percentage - 50) × $0.01
saf_credit = gallons_saf × saf_credit_per_gallon
Minimum GHG reduction for eligibility: > 50%
If saf_ghg_reduction_percentage ≤ 50: no SAF credit (return 0)
Maximum: 100% GHG reduction → $1.25 + 50 × $0.01 = $1.75/gallon
Source: IRC §40B(a), §40B(b)(2); Form 8864 Part II; IRA 2022 §13203; https://www.irs.gov/pub/irs-pdf/i8864.pdf

### Step 5 — Total Credit
total_credit = biodiesel_credit + agri_credit + renewable_diesel_credit + saf_credit
Source: Form 8864 line 8; https://www.irs.gov/pub/irs-pdf/f8864.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total_credit > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Biodiesel mixture credit rate | $1.00/gallon | IRC §40A(a)(1) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| Agri-biodiesel credit rate | $1.10/gallon ($1.00 + $0.10) | IRC §40A(b)(2), §40A(b)(4) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| Renewable diesel credit rate | $1.00/gallon | IRC §40A(f) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| SAF base credit rate | $1.25/gallon | IRC §40B(a) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| SAF bonus rate per percentage point | $0.01/gallon/% | IRC §40B(b)(2) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| SAF minimum GHG reduction for eligibility | > 50% | IRC §40B(b)(1) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |
| SAF maximum GHG reduction (credit cap) | 100% → $1.75/gal max | IRC §40B(b)(2) | https://www.irs.gov/pub/irs-pdf/i8864.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    B[gallons_biodiesel]
    A[gallons_agri_biodiesel]
    R[gallons_renewable_diesel]
    S[gallons_saf]
    G[saf_ghg_reduction_percentage]
  end
  subgraph node["f8864 Node"]
    C[compute per-fuel credits]
    T[sum total credit]
  end
  subgraph outputs["Downstream"]
    S3[schedule3.line6z_general_business_credit]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **All fuel fields optional**: a return may have any combination of fuel types.
2. **SAF ineligible if GHG ≤ 50%**: if saf_ghg_reduction_percentage ≤ 50, SAF credit = 0 even with gallons_saf > 0.
3. **SAF GHG capped at 100%**: bonus tops out at 50 percentage points above 50%.
4. **No output if total_credit = 0**: emit nothing if all fuel quantities are zero.
5. **gallons_saf > 0 but no GHG percentage provided**: saf_ghg_reduction_percentage defaults to 0, so SAF credit = 0 (GHG ≤ 50%).
6. **Agri-biodiesel is a subset type**: priced at $1.10/gallon (includes base $1.00 + $0.10 small producer credit); treated separately from regular biodiesel.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §40A | — | Biodiesel/renewable diesel credit | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section40A | — |
| IRC §40B | — | SAF credit (IRA 2022) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section40B | — |
| Form 8864 instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8864.pdf | — |
| IRA 2022 §13203 | 2022 | SAF credit | https://www.congress.gov/117/plaws/publ169/PLAW-117publ169.pdf | — |
