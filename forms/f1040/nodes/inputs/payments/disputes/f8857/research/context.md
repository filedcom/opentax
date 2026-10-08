# f8857 — Form 8857: Request for Innocent Spouse Relief

## Overview
Form 8857 is used to request relief from joint and several liability for tax, interest, and penalties on a joint return. Three types of relief are available: innocent spouse relief (IRC §6015(b)), separation of liability (IRC §6015(c)), and equitable relief (IRC §6015(f)). This is primarily an informational/administrative node — it captures the request details but does not directly compute tax amounts on the return.

**IRS Form:** Form 8857
**Drake Screen:** 8857
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/Form-8857

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| relief_type | enum | No | Part I: Type of relief | Type of innocent spouse relief requested | Form 8857, Part I | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| tax_years | number[] | No | Part I: Tax years | Tax years for which relief is requested | Form 8857, Part I | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| erroneous_items | string[] | No | Part III | Description of erroneous items attributable to the other spouse | Form 8857, Part III | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| knowledge_indicator | boolean | No | Part II, Q12 | Whether the taxpayer knew or had reason to know of the understatement | Form 8857, Part II | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| economic_hardship | boolean | No | Part II, Q14 | Whether paying the tax would cause economic hardship | Form 8857, Part II | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| requesting_spouse_name | string | No | Part I | Name of the requesting spouse | Form 8857, Part I | https://www.irs.gov/pub/irs-pdf/f8857.pdf |
| requesting_spouse_ssn | string | No | Part I | SSN of the requesting spouse | Form 8857, Part I | https://www.irs.gov/pub/irs-pdf/f8857.pdf |

---

## Calculation Logic

### Step 1 — Pass-through capture
Form 8857 does not perform tax computations. It captures the innocent spouse relief request data for filing purposes. No outputs are emitted.
Source: IRS Form 8857 Instructions — https://www.irs.gov/pub/irs-pdf/i8857.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | None | Informational only — no tax routing | Form 8857 Instructions | https://www.irs.gov/pub/irs-pdf/i8857.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | N/A | Form 8857 is administrative — no TY2025 constants | N/A |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    relief_type
    tax_years
    erroneous_items
    knowledge_indicator
    economic_hardship
    requesting_spouse_name
  end
  subgraph node["f8857 — Form 8857"]
  end
  subgraph outputs["Downstream Nodes"]
    none["(none — administrative form)"]
  end
  inputs --> node --> outputs

---

## Edge Cases & Special Rules

- Innocent spouse relief (IRC §6015(b)) applies when there was an understatement of tax due to erroneous items of the other spouse and the requesting spouse did not know or have reason to know. Source: IRC §6015(b).
- Separation of liability (IRC §6015(c)) requires the spouses to be divorced, legally separated, or living apart for at least 12 months. Source: IRC §6015(c).
- Equitable relief (IRC §6015(f)) is the fallback when neither (b) nor (c) apply, based on all facts and circumstances. Source: IRC §6015(f).
- Form 8857 must generally be filed within 2 years of the first IRS collection action. Source: Form 8857 Instructions.
- The form must be submitted separately from the return — it is not attached to the 1040. Source: Form 8857 Instructions.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8857 | 2024 | All parts | https://www.irs.gov/pub/irs-pdf/f8857.pdf | .research/docs/f8857.pdf |
| Form 8857 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8857.pdf | .research/docs/i8857.pdf |
| IRC §6015 | Current | Innocent spouse relief | https://www.law.cornell.edu/uscode/text/26/6015 | N/A |
