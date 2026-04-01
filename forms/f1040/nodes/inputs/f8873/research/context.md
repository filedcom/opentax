# f8873 — Form 8873: Extraterritorial Income Exclusion

## Overview

Form 8873 allows the exclusion of qualifying "extraterritorial income" from US taxable income. This provision (IRC §114) was enacted as a replacement for the Foreign Sales Corporation (FSC) rules but was found by the WTO to be an illegal export subsidy. It was repealed by the American Jobs Creation Act of 2004 (AJCA 2004, P.L. 108-357, effective for transactions after 2006). By TY2025, this form has extremely limited applicability — only transition relief for certain binding contracts entered into before September 17, 2003 might apply, and only through transition periods that ended for most taxpayers before 2015.

The exclusion amount, if any, reduces income. It flows to Schedule 1 Line 8 as a negative amount (reduction of other income) or more precisely to the "other income" line since it is an exclusion reducing taxable income.

**IRS Form:** Form 8873
**Drake Screen:** 8873
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| qualifying_foreign_trade_income | number | Yes | Qualifying foreign trade income | The qualifying foreign trade income (QFTI) amount that forms the basis for the exclusion | Form 8873 line 52; IRC §941 | https://www.irs.gov/pub/irs-pdf/f8873.pdf |
| extraterritorial_income_excluded | number | Yes | Extraterritorial income exclusion amount | The amount of extraterritorial income excluded from gross income (the actual exclusion) | Form 8873 line 53; IRC §114 | https://www.irs.gov/pub/irs-pdf/f8873.pdf |

---

## Calculation Logic

### Step 1 — Determine exclusion amount
The `extraterritorial_income_excluded` field represents the final exclusion computed on Form 8873. The node does not recompute it — it takes the pre-computed exclusion.

Source: Form 8873 Instructions; IRC §114(a) — gross income does not include extraterritorial income that is qualifying foreign trade income.

### Step 2 — Route to Schedule 1 as negative income
The exclusion reduces income. It flows to Schedule 1 Line 8 "other income" as a negative value (line8z_other). This reduces total additional income.

Source: Form 8873 instructions; Rev. Proc. 2003-66; Schedule 1 Line 8 instructions.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line8z_other (negative of extraterritorial_income_excluded) | schedule1 | extraterritorial_income_excluded > 0 | IRC §114; Schedule 1 Line 8 instructions | https://www.irs.gov/instructions/i1040s1 |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Exclusion rate (qualifying foreign trade income) | Generally 30% of QFTI (as computed on form) | IRC §941(a)(1) | https://www.irs.gov/pub/irs-pdf/f8873.pdf |
| Effective repeal date | After 2006 (AJCA 2004) | P.L. 108-357, §101(d) | N/A |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    user["qualifying_foreign_trade_income, extraterritorial_income_excluded"]
  end
  subgraph node["f8873"]
    compute["Route exclusion as negative income"]
  end
  subgraph outputs["Downstream Nodes"]
    s1["schedule1 (line8z_other, negative)"]
  end
  inputs --> node --> s1
```

---

## Edge Cases & Special Rules

1. **Repeal**: IRC §114 was repealed by AJCA 2004. For TY2025, only extremely rare transition-period contracts may still qualify.
2. **Exclusion is negative income**: The `extraterritorial_income_excluded` flows as a negative amount on Schedule 1, reducing taxable income.
3. **Zero exclusion**: If `extraterritorial_income_excluded` is 0, no output is emitted.
4. **Non-negative constraint**: Both input fields must be non-negative (exclusion cannot create additional income).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8873 | 2006 (last) | All | https://www.irs.gov/pub/irs-pdf/f8873.pdf | f8873.pdf |
| IRC §114 | Repealed 2006 | Extraterritorial income | https://www.law.cornell.edu/uscode/text/26/114 | N/A |
| AJCA 2004 | 2004 | §101 | P.L. 108-357 | N/A |
