# f8820 — Form 8820: Orphan Drug Credit

## Overview
Form 8820 computes the Orphan Drug Credit for qualified clinical testing expenses incurred for drugs designated by the FDA as orphan drugs (for rare diseases affecting fewer than 200,000 people in the US). The credit is 25% of qualified clinical testing expenses (reduced to 25% from prior 50% rate under TCJA). It is part of the General Business Credit (GBC, Form 3800, IRC §38). The credit flows to Schedule 3 via the GBC aggregation. The taxpayer must reduce otherwise-deductible clinical testing expenses by the credit amount (basis reduction rule). Small biotech companies (qualifying small business taxpayers) may receive a refundable version, but for simplicity in this engine the standard 25% rate is used.

**IRS Form:** Form 8820
**Drake Screen:** 8820 / DRUG
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| qualified_clinical_testing_expenses | number (nonneg) | No | Qualified clinical testing expenses | Clinical testing expenses for FDA-designated orphan drugs, per IRC §45C(b) | IRC §45C(b); Form 8820 Line 1 | https://www.irs.gov/pub/irs-pdf/f8820.pdf |
| is_small_biotech | boolean | No | Small biotech company? | Whether the taxpayer is a qualified small biotech company (may affect refundability) | IRC §45C(c)(2); Form 8820 instructions | https://www.irs.gov/pub/irs-pdf/i8820.pdf |

---

## Calculation Logic

### Step 1 — Compute credit
Credit = qualified_clinical_testing_expenses × 0.25 (25% rate per IRC §45C(a) as amended by TCJA P.L. 115-97, §13401).
Source: IRC §45C(a); Form 8820 Line 2.

### Step 2 — Route to General Business Credit (Schedule 3)
The Orphan Drug Credit is a component of the General Business Credit (IRC §38). It is aggregated into Form 3800. In this engine, it routes directly to schedule3.line6z_general_business_credit.
Source: IRC §38(b); Form 8820 instructions; Schedule 3 line 6z.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | credit > 0 | IRC §45C; IRC §38; Form 8820 | https://www.irs.gov/pub/irs-pdf/f8820.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Credit rate | 25% | IRC §45C(a); TCJA P.L. 115-97 §13401 | https://www.law.cornell.edu/uscode/text/26/45C |
| Part of General Business Credit | Yes (IRC §38) | IRC §38(b)(20) | https://www.law.cornell.edu/uscode/text/26/38 |
| Basis reduction | Must reduce expense deduction by credit amount | IRC §280C(b) | https://www.law.cornell.edu/uscode/text/26/280C |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    A[qualified_clinical_testing_expenses]
    B[is_small_biotech]
  end
  subgraph node["f8820 Node"]
    C[credit = expenses × 0.25]
  end
  subgraph outputs["Downstream Nodes"]
    D[schedule3: line6z_general_business_credit]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

1. **25% rate (post-TCJA)**: Prior to TCJA (P.L. 115-97, §13401), the rate was 50%. For TY2017 and after, the rate is 25% per IRC §45C(a). TY2025 uses 25%.
2. **Zero expenses**: If qualified_clinical_testing_expenses is 0 or absent, credit is $0 and no output is emitted.
3. **Basis reduction**: The taxpayer must reduce the otherwise-deductible testing expenses by the credit amount under IRC §280C(b). This engine doesn't model the basis reduction directly (it occurs within the business expense computation, not in this node).
4. **FDA designation required**: Expenses qualify only for drugs with active FDA orphan drug designation at the time of testing. This node trusts the input — no validation of FDA designation.
5. **GBC carryforward**: Unused GBC (including Orphan Drug Credit) may be carried back 1 year and forward 20 years. Carryforward tracking is outside this node's scope.
6. **Small biotech**: IRC §45C(c)(2) provided a higher rate for small biotech companies in prior law. Post-TCJA, this distinction is less material at the federal level. The is_small_biotech flag is captured for completeness but does not change the 25% rate calculation in TY2025.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8820 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f8820.pdf | N/A |
| Form 8820 Instructions | 2025 | All | https://www.irs.gov/pub/irs-pdf/i8820.pdf | N/A |
| IRC §45C | - | §45C | https://www.law.cornell.edu/uscode/text/26/45C | N/A |
| IRC §38 | - | §38(b)(20) | https://www.law.cornell.edu/uscode/text/26/38 | N/A |
| IRC §280C(b) | - | §280C(b) | https://www.law.cornell.edu/uscode/text/26/280C | N/A |
| TCJA P.L. 115-97, §13401 | 2017 | §13401 | https://www.congress.gov/bill/115th-congress/house-bill/1 | N/A |
| Rev. Proc. 2024-40 | 2024 | TY2025 constants | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | N/A |
