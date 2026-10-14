# f8275 — Form 8275: Disclosure Statement

## Overview
Form 8275 is used to disclose items or positions that are not otherwise adequately disclosed on a tax return to avoid accuracy-related penalties under IRC §6662. Form 8275-R is the companion form for positions contrary to Treasury Regulations. Both are informational — they document the taxpayer's disclosed position but do not compute tax amounts.

**IRS Form:** Form 8275 (also 8275-R for regulation positions)
**Drake Screen:** 8275
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/Form-8275

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| disclosure_type | enum (position/regulation) | No | Form type selector | Whether disclosing a return position (8275) or a position contrary to regulations (8275-R) | Form 8275/8275-R | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| form_or_schedule | string | No | Part I, Col A: Form/Schedule | Form or schedule where the item appears (e.g., "Schedule C", "1040") | Form 8275, Part I | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| line_number | string | No | Part I, Col B: Line No. | Line number on the form/schedule where the item appears | Form 8275, Part I | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| item_description | string | No | Part I, Col C: Description | Description of the disclosed item or position | Form 8275, Part I | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| amount | number | No | Part I, Col D: Amount | Dollar amount of the disclosed item | Form 8275, Part I | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| information_summary | string | No | Part II: Detailed Explanation | Detailed explanation of the disclosed item or position | Form 8275, Part II | https://www.irs.gov/pub/irs-pdf/f8275.pdf |
| revenue_ruling | string | No | Part I, Col E: Rev. Rul./Reg. | Revenue ruling or regulation number (8275-R) | Form 8275/8275-R, Part I | https://www.irs.gov/pub/irs-pdf/f8275.pdf |

---

## Calculation Logic

### Step 1 — Pass-through capture
Form 8275 does not perform tax computations. It captures disclosure data for recordkeeping and penalty-avoidance purposes. No outputs are emitted.
Source: IRS Form 8275 Instructions — https://www.irs.gov/pub/irs-pdf/i8275.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | None | Informational only — no tax routing | Form 8275 Instructions | https://www.irs.gov/pub/irs-pdf/i8275.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | N/A | Form 8275 is administrative — no TY2025 constants | N/A |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    disclosure_type
    form_or_schedule
    line_number
    item_description
    amount
    information_summary
  end
  subgraph node["f8275 — Form 8275"]
  end
  subgraph outputs["Downstream Nodes"]
    none["(none — administrative form)"]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

- Form 8275 is for positions NOT contrary to Treasury Regulations; Form 8275-R is for positions that ARE contrary to regulations. The disclosure_type enum differentiates these. Source: Form 8275 Instructions, p.1.
- Disclosure on Form 8275 can avoid the 20% accuracy-related penalty under IRC §6662(d)(2)(B)(ii) if the position has a reasonable basis. Source: IRC §6662.
- The amount field may be zero or absent for pure position disclosures (no dollar amount involved). Source: Form 8275, Part I.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8275 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8275.pdf | .research/docs/f8275.pdf |
| Form 8275 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8275.pdf | .research/docs/i8275.pdf |
| IRC §6662 | Current | Accuracy-related penalty | https://www.law.cornell.edu/uscode/text/26/6662 | N/A |
