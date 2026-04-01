# f8917 — Form 8917: Tuition and Fees Deduction

## Overview
Form 8917 allowed taxpayers to deduct qualified tuition and fees paid for higher education for themselves, spouse, or dependents. The deduction was an above-the-line deduction (Schedule 1, Part II). The Consolidated Appropriations Act of 2021 (P.L. 116-260, §104) permanently repealed IRC §222, effective for tax years beginning after December 31, 2020. For TY2025, this deduction is fully expired and produces zero federal tax effect. The node exists for completeness (user data entry / state return reference) but emits no federal output.

**IRS Form:** Form 8917
**Drake Screen:** 8917
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A (no federal effect TY2025)

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| tuition_and_fees_paid | number (nonneg) | No | Total qualified tuition and fees paid | Total qualified education expenses paid to eligible institutions | IRC §222 (repealed); Form 8917 Line 2 | https://www.irs.gov/pub/irs-pdf/f8917.pdf |
| student_name | string | No | Student name | Name of the student (taxpayer, spouse, or dependent) | Form 8917 instructions | https://www.irs.gov/pub/irs-pdf/i8917.pdf |
| student_ssn | string | No | Student SSN | Social Security Number of the student | Form 8917 instructions | https://www.irs.gov/pub/irs-pdf/i8917.pdf |

---

## Calculation Logic

### Step 1 — Deduction is $0 for TY2025
The Consolidated Appropriations Act of 2021 (P.L. 116-260, §104) permanently eliminated the tuition and fees deduction under IRC §222 for tax years after 2020. For TY2025, the compute() function returns no outputs regardless of tuition paid.
Source: P.L. 116-260, §104; Consolidated Appropriations Act, 2021, enacted December 27, 2020.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | (none) | TY2025: deduction expired; no federal output | P.L. 116-260, §104 | https://www.congress.gov/bill/116th-congress/house-bill/133 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Federal deduction amount | $0 (expired) | P.L. 116-260, §104; IRC §222 repealed | https://www.congress.gov/bill/116th-congress/house-bill/133 |
| Prior max deduction (TY2020 and earlier) | $4,000 or $2,000 | IRC §222(b)(2) (historical reference only) | https://www.irs.gov/pub/irs-prior/f8917--2020.pdf |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    A[tuition_and_fees_paid]
    B[student_name]
    C[student_ssn]
  end
  subgraph node["f8917 Node"]
    D[compute: deduction = 0 TY2025]
  end
  subgraph outputs["Downstream Nodes"]
    E[none — deduction expired]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

1. **Deduction fully expired**: The Consolidated Appropriations Act of 2021 repealed IRC §222. No federal deduction exists for TY2025, regardless of tuition paid or income level.
2. **State returns**: Some states (e.g., New York) still allow a tuition deduction. This engine is federal-only; the node captures data for potential state-pass-through but emits no federal output.
3. **Lifetime Learning Credit vs deduction**: Taxpayers who previously took Form 8917 may now qualify for the Lifetime Learning Credit (Form 8863) instead. These are separate computations.
4. **AOTC vs 8917**: American Opportunity Tax Credit (Form 8863) also covers tuition; the 8917 deduction and AOTC/LLC were mutually exclusive. Since 8917 is expired, AOTC/LLC are the only federal education benefit options for TY2025.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| P.L. 116-260, Consolidated Appropriations Act 2021, §104 | 2021 | §104 | https://www.congress.gov/bill/116th-congress/house-bill/133 | N/A |
| Form 8917 (2020, last year filed) | 2020 | All | https://www.irs.gov/pub/irs-prior/f8917--2020.pdf | N/A |
| IRC §222 (repealed) | - | §222 | https://www.law.cornell.edu/uscode/text/26/222 | N/A |
