# f8833 — Form 8833: Treaty-Based Return Position Disclosure

## Overview
Form 8833 is a disclosure form filed when a taxpayer takes a return position that relies on a US income tax treaty to override or modify US domestic tax law. It is a pure disclosure — no tax computation. One form per treaty position taken.

**IRS Form:** 8833
**Drake Screen:** 8833
**Node Type:** input (per-item array)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13534

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| treaty_country | string | yes | Treaty country | The US treaty partner country name | Form 8833 line 1a; IRC §6114 | https://www.irs.gov/pub/irs-pdf/f8833.pdf |
| treaty_article | string | yes | Treaty article | Specific article and paragraph of the treaty relied upon | Form 8833 line 1b; IRC §6114 | https://www.irs.gov/pub/irs-pdf/f8833.pdf |
| description_of_position | string | yes | Position description | Nature of the treaty-based return position | Form 8833 line 2; Reg. §301.6114-1 | https://www.irs.gov/pub/irs-pdf/i8833.pdf |
| gross_amount | number (nonneg) | no | Gross amount | Gross amount subject to treaty modification/override | Form 8833 line 3; Reg. §301.6114-1(b) | https://www.irs.gov/pub/irs-pdf/i8833.pdf |
| amount_of_tax_reduction | number (nonneg) | no | Tax reduction | Amount of US tax reduction resulting from treaty position | Form 8833 line 4; Reg. §301.6114-1(b) | https://www.irs.gov/pub/irs-pdf/i8833.pdf |

---

## Calculation Logic

### Step 1 — Disclosure only
Form 8833 is a pure disclosure form. No tax is computed. compute() returns empty outputs.
Source: IRC §6114; Reg. §301.6114-1; Form 8833 instructions (2024 rev.)

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Disclosure only; no downstream computation | IRC §6114 | https://www.irs.gov/pub/irs-pdf/i8833.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Penalty per failure to disclose (individual) | $1,000 | IRC §6712(a) | https://www.irs.gov/pub/irs-pdf/i8833.pdf |
| Penalty per failure to disclose (corporation) | $10,000 | IRC §6712(a) | https://www.irs.gov/pub/irs-pdf/i8833.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    treaty_country
    treaty_article
    description_of_position
    gross_amount
    amount_of_tax_reduction
  end
  subgraph node["f8833 — Form 8833"]
  end
  subgraph outputs["Downstream"]
    NONE["(none — disclosure only)"]
  end
  inputs --> node --> NONE
```

---

## Edge Cases & Special Rules

1. Exception: US persons exempt by treaty from filing who rely on treaty exemption from withholding at source do NOT need to file Form 8833 (Reg. §301.6114-1(c)(1)(i)).
2. Exception: Positions relying on treaty to exempt income from US withholding do not require disclosure if the US person is otherwise filing.
3. Penalty exception: No penalty if reasonable cause shown (IRC §6712(b)).
4. Per-position: One Form 8833 per treaty position (one item per position in the array).
5. Multiple treaty positions for the same country require separate forms.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8833 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8833.pdf | f8833.pdf |
| Instructions for Form 8833 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8833.pdf | i8833.pdf |
| IRC §6114 | current | Treaty-based return positions | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6114 | — |
| IRC §6712 | current | Failure to disclose treaty positions | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section6712 | — |
| Reg. §301.6114-1 | current | Treaty-based return positions | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/section-301.6114-1 | — |
