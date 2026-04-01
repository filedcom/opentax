# f8978 — Form 8978: Partner's Additional Reporting Year Tax

## Overview

Form 8978 is used by partners (other than pass-through partners) who receive Form 8986 from a BBA (Bipartisan Budget Act) partnership after a partnership audit. When a partnership elects out of paying the imputed underpayment itself (under IRC §6226), it passes the adjustment to its partners. Each partner uses Form 8978 to re-figure their tax for the reviewed year and any intervening years, paying the resulting additional tax in the current (adjustment) year. The additional tax routes to Schedule 2 as an additional tax.

**IRS Form:** Form 8978
**Drake Screen:** 8978
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A — no Drake KB article found

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| reviewed_tax_year | number (int, 4-digit year) | Yes | Form 8986 line 1 — Reviewed year | The tax year under examination for the partnership audit | IRC §6226; Reg. §301.6226-3 | https://www.irs.gov/pub/irs-pdf/f8978.pdf |
| positive_adjustments_share | number (nonnegative) | No | Form 8986 — Partner's share of positive adjustments | Partner's share of the imputed underpayment adjustments (increases to income/decreases to deductions) | IRC §6226(b)(1); Reg. §301.6226-3(b) | https://www.irs.gov/pub/irs-pdf/f8978.pdf |
| negative_adjustments_share | number (nonnegative) | No | Form 8986 — Partner's share of negative adjustments | Partner's share of decreases (may reduce tax liability for intervening years) | IRC §6226(b)(2); Reg. §301.6226-3(c) | https://www.irs.gov/pub/irs-pdf/f8978.pdf |
| partner_tax_rate | number (nonneg, 0-1) | No | Applicable marginal rate | Partner's applicable tax rate for re-figuring the reviewed year tax. If omitted, use simplified rate of 37% (top marginal rate) per §6226(b)(4). | IRC §6226(b)(4); Reg. §301.6226-3(d) | https://www.law.cornell.edu/uscode/text/26/6226 |
| intervening_year_adjustments | number | No | Form 8986 — Intervening year tax changes | Net tax effect of adjustments to tax attributes (carryforwards, basis) in years between the reviewed year and current year | IRC §6226(b)(2); Reg. §301.6226-3(e) | https://www.irs.gov/pub/irs-pdf/f8978.pdf |

---

## Calculation Logic

### Step 1 — Reviewed Year Tax Increase
reviewed_year_additional_tax = positive_adjustments_share × partner_tax_rate
If partner_tax_rate is not provided, default to 0.37 (37% — top marginal rate).
Source: IRC §6226(b)(1); Reg. §301.6226-3(b)(1); https://www.law.cornell.edu/uscode/text/26/6226

### Step 2 — Intervening Year Adjustments
intervening_adjustment = intervening_year_adjustments (can be positive or negative)
Negative values reduce the total additional tax (but total cannot go below zero).
Source: IRC §6226(b)(2); Reg. §301.6226-3(e)

### Step 3 — Net Additional Tax
additional_tax = max(0, reviewed_year_additional_tax + intervening_adjustment − negative_adjustments_effect)
negative_adjustments_effect = negative_adjustments_share × partner_tax_rate
Source: IRC §6226(b); Reg. §301.6226-3

### Step 4 — Route to Schedule 2
The additional tax amount routes to Schedule 2 as an additional tax item.
Source: Form 8978 instructions; Schedule 2 line 17z (other additional taxes)

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line17z_other_additional_taxes | schedule2 | additional_tax > 0 | IRC §6226; Schedule 2 Part II | https://www.irs.gov/pub/irs-pdf/f1040s2.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| DEFAULT_TAX_RATE | 0.37 (37%) | IRC §6226(b)(4); top marginal rate | https://www.law.cornell.edu/uscode/text/26/6226 |
| MIN_REVIEWED_YEAR | 2018 | BBA regime effective for tax years beginning after 12/31/2017 | IRC §6226 |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Form 8978 / Form 8986)"]
    A[reviewed_tax_year]
    B[positive_adjustments_share]
    C[negative_adjustments_share]
    D[partner_tax_rate]
    E[intervening_year_adjustments]
  end
  subgraph node["f8978 Node"]
    F[reviewed_year_tax = positive × rate]
    G[negative_effect = negative × rate]
    H[additional_tax = max(0, reviewed + intervening - negative_effect)]
  end
  subgraph outputs["Downstream Nodes"]
    I[schedule2: line17z_other_additional_taxes]
  end
  B --> F
  D --> F
  C --> G
  D --> G
  F --> H
  G --> H
  E --> H
  H --> I
```

---

## Edge Cases & Special Rules

1. **Default tax rate**: If partner_tax_rate is not provided, use 37% (top marginal rate) as a simplified conservative default.
2. **Reviewed year validation**: reviewed_tax_year must be a 4-digit year ≥ 2018 (BBA regime). Older partnerships used TEFRA, not Form 8978.
3. **Negative total**: If negative adjustments exceed positive adjustments, the net is zero (floor at 0) — cannot generate a refund via this form.
4. **Both adjustments zero**: If positive_adjustments_share and negative_adjustments_share are both zero/absent and intervening_year_adjustments is also zero, no output.
5. **Intervening year adjustments can be negative**: A negative intervening_year_adjustments value (e.g., additional deductions carried forward) reduces the total tax.
6. **Cannot amend reviewed year**: Partners use Form 8978 in the current year to pay the tax — they do not amend the reviewed year return.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §6226 | Current | §6226(a)-(b) | https://www.law.cornell.edu/uscode/text/26/6226 | N/A |
| Form 8978 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8978.pdf | N/A |
| Form 8986 | 2024 | All lines | https://www.irs.gov/pub/irs-pdf/f8986.pdf | N/A |
| Reg. §301.6226-3 | Current | (b)-(e) | https://www.ecfr.gov/current/title-26/chapter-I/subchapter-F/part-301/section-301.6226-3 | N/A |
