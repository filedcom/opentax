# f8965 — Form 8965: Health Coverage Exemptions

## Overview
Form 8965 was used for tax years 2014–2018 to claim exemptions from the individual shared responsibility payment (individual health coverage mandate) under ACA §5000A. The Tax Cuts and Jobs Act of 2017 (TCJA §11081) reduced the individual mandate penalty to $0 starting tax year 2019. Form 8965 is **no longer required for federal returns for TY2019 and later**. For TY2025, there is no federal individual mandate penalty.

However, Drake's HC screen is still displayed because:
1. Legacy/amended returns (pre-2019 years)
2. State-level mandates (MA, NJ, CA, DC, RI, VT) that use similar exemption concepts
3. Informational data entry workflows

For TY2025 federal purposes, this node stores exemption data but produces no federal tax output.

**IRS Form:** Form 8965
**Drake Screen:** HC
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (form obsolete for TY2025 federal)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| coverage_exemption_type | enum (CoverageExemptionType) | Yes | Part I | Type of coverage exemption being claimed | Form 8965 Part I; §5000A(e) | https://www.irs.gov/pub/irs-pdf/f8965.pdf |
| exemption_certificate_number | string | No | Part I, Col C | Marketplace-issued exemption certificate number (for marketplace exemptions) | Form 8965 Part I, Col C | https://www.irs.gov/pub/irs-pdf/f8965.pdf |
| months_without_coverage | array of boolean (12 elements) | No | Part II | Whether each month of the year had no qualifying coverage | Form 8965 Part II | https://www.irs.gov/pub/irs-pdf/f8965.pdf |
| household_income_below_threshold | boolean | No | Part III | True if household income is below filing threshold | Form 8965 Part III, Line 7; §5000A(e)(2) | https://www.irs.gov/pub/irs-pdf/f8965.pdf |

---

## Calculation Logic

### Step 1 — Legacy stub
No federal tax computation for TY2025. The individual mandate penalty is $0 (TCJA §11081, effective TY2019). Parse and store data only.
Source: TCJA §11081 (P.L. 115-97), effective for months beginning after December 31, 2018.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | (none) | Federal mandate penalty eliminated TY2019+ (TCJA §11081); no federal routing | TCJA §11081; Rev. Proc. 2019-44 | https://www.irs.gov/pub/irs-drop/rp-19-44.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Individual mandate penalty | $0 | TCJA §11081 (P.L. 115-97); effective TY2019 | https://www.congress.gov/bill/115th-congress/house-bill/1/text |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    F8965["Form 8965 fields"]
  end
  subgraph node["f8965 Node"]
    validate["Validate & parse (legacy stub)"]
  end
  subgraph outputs["Downstream"]
    none["(no federal outputs — penalty eliminated)"]
  end
  F8965 --> validate --> none
```

---

## Edge Cases & Special Rules

- For TY2025, the federal individual mandate penalty is permanently $0 per TCJA §11081.
- State mandates (MA, NJ, CA, DC, RI, VT) may still require exemption data; those are handled at the state level, not by this federal node.
- `exemption_certificate_number` is only applicable for marketplace-issued exemptions.
- `months_without_coverage` is an array of 12 booleans representing Jan–Dec.
- Even when all fields are populated, this node produces no federal output for TY2025.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 8965 | 2018 | Health Coverage Exemptions (last required year) | https://www.irs.gov/pub/irs-pdf/f8965.pdf | f8965.pdf |
| TCJA §11081 (P.L. 115-97) | 2017 | Individual Mandate Penalty = $0 effective TY2019 | https://www.congress.gov/bill/115th-congress/house-bill/1/text | N/A |
| IRC §5000A | — | Individual Shared Responsibility Payment | https://www.law.cornell.edu/uscode/text/26/5000A | N/A |
