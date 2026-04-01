# f8840 — Form 8840: Closer Connection Exception Statement for Aliens

## Overview
Form 8840 is an election/statement filed by a foreign person who meets the Substantial Presence Test (SPT) for the current year but can nevertheless be treated as a nonresident alien by claiming a "closer connection" to a foreign country. Pure disclosure — no tax computation.

**IRS Form:** 8840
**Drake Screen:** 8840
**Node Type:** input (singleton — one per return)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13535

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| country_of_tax_home | string | yes | Country of tax home | Foreign country where the taxpayer maintained their tax home for the entire year | Form 8840 Part II; IRC §7701(b)(3)(B) | https://www.irs.gov/pub/irs-pdf/f8840.pdf |
| days_in_us_current_year | number (nonneg int) | yes | Days in US (current year) | Number of days present in the US during the current tax year | Form 8840 Part I; Reg. §301.7701(b)-1(c) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| days_in_us_prior_year_1 | number (nonneg int) | no | Days in US (prior year 1) | Days present in the US during the first preceding year | Form 8840 Part I; Reg. §301.7701(b)-1(c) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| days_in_us_prior_year_2 | number (nonneg int) | no | Days in US (prior year 2) | Days present in the US during the second preceding year | Form 8840 Part I; Reg. §301.7701(b)-1(c) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| has_applied_for_green_card | boolean | yes | Applied for green card | Whether the taxpayer has applied for lawful permanent resident status | Form 8840 Part II line 3; IRC §7701(b)(3)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| maintained_tax_home_entire_year | boolean | yes | Tax home entire year | Whether the taxpayer maintained a tax home in a foreign country for the entire tax year | Form 8840 Part II line 1; IRC §7701(b)(3)(B)(i) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |

---

## Calculation Logic

### Step 1 — Hard validation
If has_applied_for_green_card is true, the closer connection exception is not available (IRC §7701(b)(3)(B)(ii)). Throw an error.
Source: IRC §7701(b)(3)(B)(ii); Form 8840 instructions

### Step 2 — Disclosure only
Form 8840 is a pure disclosure/election statement. compute() returns empty outputs after validation.
Source: IRC §7701(b)(3)(B); Reg. §301.7701(b)-2; Form 8840 instructions

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Declaration/election only; no downstream computation | IRC §7701(b)(3)(B) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Substantial presence threshold (current year) | 31 days | IRC §7701(b)(3)(A)(i) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| 3-year SPT weighted formula threshold | 183 days | IRC §7701(b)(3)(A)(ii) | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| Filing deadline (no US wage withholding) | June 15 | Form 8840 instructions | https://www.irs.gov/pub/irs-pdf/i8840.pdf |
| Filing deadline (US wage withholding) | April 15 | Form 8840 instructions | https://www.irs.gov/pub/irs-pdf/i8840.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    country_of_tax_home
    days_in_us_current_year
    days_in_us_prior_year_1
    days_in_us_prior_year_2
    has_applied_for_green_card
    maintained_tax_home_entire_year
  end
  subgraph node["f8840 — Form 8840"]
    validate["Validate: no green card application"]
  end
  subgraph outputs["Downstream"]
    NONE["(none — election only)"]
  end
  inputs --> node --> NONE
```

---

## Edge Cases & Special Rules

1. Disqualifier: Cannot claim closer connection if taxpayer applied for lawful permanent resident status (green card) during the current year or any prior year (IRC §7701(b)(3)(B)(ii)).
2. Tax home requirement: Must have maintained a tax home in a foreign country for the ENTIRE current tax year.
3. Substantial presence still required: Taxpayer must actually meet SPT to file 8840 (otherwise nonresident status already applies).
4. Days-counting rules: Exempt days under Form 8843 reduce the SPT count but 8840 records actual calendar presence.
5. Green card holders cannot use this form — only nonimmigrant aliens who pass SPT.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8840 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8840.pdf | f8840.pdf |
| Instructions for Form 8840 | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8840.pdf | i8840.pdf |
| IRC §7701(b)(3)(B) | current | Closer connection exception | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section7701 | — |
| Reg. §301.7701(b)-2 | current | Closer connection | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/section-301.7701(b)-2 | — |
