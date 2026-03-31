# Form 8862 — Information to Claim Certain Credits After Disallowance

## Overview
Filed when a taxpayer's EITC, CTC/ACTC, or AOTC was disallowed by the IRS in a prior year and the taxpayer is reclaiming the credit. This node signals eligibility restoration to the downstream credit nodes (eitc, f8812, f8863) by emitting a `form8862_filed: true` flag to each claimed credit node.

**IRS Form:** 8862
**Drake Screen:** 8862
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14025

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| claim_eitc | boolean | No | Reclaim EITC | True to reclaim the Earned Income Tax Credit | Form 8862 Part I | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| claim_ctc | boolean | No | Reclaim CTC/ACTC | True to reclaim Child Tax Credit / Additional CTC (Form 8812) | Form 8862 Part III | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| claim_aotc | boolean | No | Reclaim AOTC | True to reclaim American Opportunity Tax Credit (Form 8863) | Form 8862 Part IV | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| eitc_disallowed_year | number (int) | No | EITC disallowance year | Tax year in which EITC was disallowed | Form 8862 Part II Line 1 | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| ctc_disallowed_year | number (int) | No | CTC disallowance year | Tax year in which CTC/ACTC was disallowed | Form 8862 Part III | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| aotc_disallowed_year | number (int) | No | AOTC disallowance year | Tax year in which AOTC was disallowed | Form 8862 Part IV | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| eitc_qualifying_children_count | number (0–3) | No | EITC children count | Number of qualifying children for EITC reclaim (Part II) | Form 8862 Part II | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| ctc_qualifying_children_count | number (int) | No | CTC children count | Number of qualifying children for CTC reclaim (Part III) | Form 8862 Part III | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| aotc_student_count | number (int) | No | AOTC student count | Number of students for AOTC reclaim (Part IV) | Form 8862 Part IV | https://www.irs.gov/pub/irs-pdf/i8862.pdf |

---

## Calculation Logic

### Step 1 — Emit EITC eligibility restoration
If `claim_eitc = true`: emit `{ nodeType: eitc, fields: { form8862_filed: true } }`
Source: Form 8862 Part II; IRC §32(k)(2) — https://www.irs.gov/pub/irs-pdf/i8862.pdf

### Step 2 — Emit CTC/ACTC eligibility restoration
If `claim_ctc = true`: emit `{ nodeType: f8812, fields: { form8862_filed: true } }`
Source: Form 8862 Part III; IRC §24(g)(2) — https://www.irs.gov/pub/irs-pdf/i8862.pdf

### Step 3 — Emit AOTC eligibility restoration
If `claim_aotc = true`: emit `{ nodeType: f8863, fields: { form8862_filed: true } }`
Source: Form 8862 Part IV; IRC §25A(b)(4) — https://www.irs.gov/pub/irs-pdf/i8862.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| form8862_filed: true | eitc | claim_eitc = true | IRC §32(k)(2) | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| form8862_filed: true | f8812 | claim_ctc = true | IRC §24(g)(2) | https://www.irs.gov/pub/irs-pdf/i8862.pdf |
| form8862_filed: true | f8863 | claim_aotc = true | IRC §25A(b)(4) | https://www.irs.gov/pub/irs-pdf/i8862.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| EITC — ban period after reckless/intentional disregard | 2 years | IRC §32(k)(1)(B)(i) | https://www.law.cornell.edu/uscode/text/26/32 |
| EITC — ban period after fraud | 10 years | IRC §32(k)(1)(B)(ii) | https://www.law.cornell.edu/uscode/text/26/32 |
| CTC — ban period after reckless/intentional disregard | 2 years | IRC §24(g)(1) | https://www.law.cornell.edu/uscode/text/26/24 |
| CTC — ban period after fraud | 10 years | IRC §24(g)(1) | https://www.law.cornell.edu/uscode/text/26/24 |
| AOTC — ban period after reckless/intentional disregard | 2 years | IRC §25A(b)(4) | https://www.law.cornell.edu/uscode/text/26/25A |
| AOTC — ban period after fraud | 10 years | IRC §25A(b)(4) | https://www.law.cornell.edu/uscode/text/26/25A |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    eitc_flag["claim_eitc + disallowance year"]
    ctc_flag["claim_ctc + disallowance year"]
    aotc_flag["claim_aotc + disallowance year"]
  end
  subgraph node["f8862 (Credits After Disallowance)"]
    emit["emit form8862_filed: true\nfor each claimed credit"]
  end
  subgraph outputs["Downstream Nodes"]
    eitc_node["eitc\nform8862_filed"]
    f8812_node["f8812\nform8862_filed"]
    f8863_node["f8863\nform8862_filed"]
  end
  eitc_flag --> emit --> eitc_node
  ctc_flag --> emit --> f8812_node
  aotc_flag --> emit --> f8863_node

---

## Edge Cases & Special Rules

1. **Ban periods**: During a 2-year ban (reckless) or 10-year ban (fraud), Form 8862 cannot be filed to reclaim the credit — the IRS will reject it. Preparer must verify the ban has expired.
2. **All three credits independent**: A taxpayer can reclaim one, two, or all three credits on the same Form 8862. Each is handled independently.
3. **EITC child count (0–3)**: Capped at 3 even if taxpayer has more qualifying children; EITC caps at 3 qualifying children.
4. **Form not needed for first-time claimants**: Form 8862 is ONLY for taxpayers whose credit was previously disallowed. First-time EITC/CTC/AOTC claimants do not file this form.
5. **Signal-only outputs**: This node emits only boolean flags to downstream credit nodes. The actual credit computation remains in those nodes.
6. **AOTC lifetime limit**: Even with Form 8862, the AOTC can only be claimed 4 times per student lifetime. The form does not override this rule.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8862 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8862.pdf | .research/docs/i8862.pdf |
| IRC §32(k) — Denial of EITC for prior disallowance | current | §32(k) | https://www.law.cornell.edu/uscode/text/26/32 | N/A |
| IRC §24(g) — Denial of CTC for prior disallowance | current | §24(g) | https://www.law.cornell.edu/uscode/text/26/24 | N/A |
| IRC §25A(b)(4) — Denial of AOTC for prior disallowance | current | §25A(b)(4) | https://www.law.cornell.edu/uscode/text/26/25A | N/A |
