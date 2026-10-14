# f2120 — Form 2120: Multiple Support Declaration

## Overview
Form 2120 is used when two or more persons together provide more than 50% of another person's support, but no single person provides more than 50% alone. It allows one eligible person to claim the dependency exemption/deduction when all other eligible persons sign agreements not to claim. This is an informational/administrative node — it captures the declaration data but does not directly compute tax amounts.

**IRS Form:** Form 2120
**Drake Screen:** 2120
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/Form-2120

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| dependent_name | string | No | Line 1: Name of person supported | Full name of the person for whom support is being claimed | Form 2120, Line 1 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |
| dependent_ssn | string | No | Line 1: SSN | Social Security Number of the person supported | Form 2120, Line 1 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |
| calendar_year | number (4-digit) | No | Tax year | Calendar year of the support declaration | Form 2120 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |
| claiming_taxpayer_name | string | No | Signing taxpayer name | Name of taxpayer claiming the exemption/deduction | Form 2120 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |
| claiming_taxpayer_ssn | string | No | Signing taxpayer SSN | SSN of taxpayer claiming the exemption/deduction | Form 2120 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |
| providing_party_names | string[] | No | Other providers | Names of other persons who provided support but agree not to claim | Form 2120 | https://www.irs.gov/pub/irs-pdf/f2120.pdf |

---

## Calculation Logic

### Step 1 — Pass-through capture
Form 2120 does not perform tax computations. It captures the multiple support declaration data for filing purposes. No outputs are emitted.
Source: IRS Form 2120 Instructions — https://www.irs.gov/pub/irs-pdf/f2120.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | None | Informational only — no tax routing | Form 2120 Instructions | https://www.irs.gov/pub/irs-pdf/f2120.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | N/A | Form 2120 is administrative — no TY2025 constants | N/A |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    dependent_name
    dependent_ssn
    calendar_year
    claiming_taxpayer_name
    providing_party_names
  end
  subgraph node["f2120 — Form 2120"]
  end
  subgraph outputs["Downstream Nodes"]
    none["(none — administrative form)"]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

- Each person must have provided more than 10% of the dependent's total support. Source: IRC §152(d)(3).
- The total support provided by all persons combined must exceed 50% of the dependent's total support. Source: IRC §152(d)(3).
- All other eligible contributors must sign separate Form 2120 declarations agreeing not to claim the dependent. Source: Form 2120 Instructions.
- Only one taxpayer may claim the dependency exemption/deduction per tax year for a given dependent. Source: IRC §152(d)(3).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 2120 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f2120.pdf | .research/docs/f2120.pdf |
| IRC §152(d)(3) | Current | Multiple support | https://www.law.cornell.edu/uscode/text/26/152 | N/A |
