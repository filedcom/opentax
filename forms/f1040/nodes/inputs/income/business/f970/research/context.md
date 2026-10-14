# f970 — Application to Use LIFO Inventory Method

## Overview
Form 970 is filed by a taxpayer to elect the LIFO (Last-In, First-Out) inventory method under IRC §472. It is an informational/election form, not a tax computation. Businesses (typically Schedule C or Schedule F filers) use this form to notify the IRS of their LIFO election in the first year they adopt the method. No direct tax line is produced, but the election affects cost of goods sold calculations on Schedule C or Schedule F.

**IRS Form:** Form 970
**Drake Screen:** LIFO (screen_code 970)
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/17453

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| business_name | string | Yes | Name of business | Name of the business using LIFO | Form 970, Line 1 | https://www.irs.gov/pub/irs-pdf/f970.pdf |
| employer_id | string | Yes | EIN | Employer identification number of the business | Form 970, Line 2 | https://www.irs.gov/pub/irs-pdf/f970.pdf |
| first_year_lifo_elected | number (int) | Yes | Tax year LIFO first used | The tax year in which the LIFO method is first elected | Form 970, Line 3 | https://www.irs.gov/pub/irs-pdf/f970.pdf |
| inventory_method_before | enum | Yes | Method used before LIFO | Inventory valuation method used before LIFO | Form 970, Line 4 | https://www.irs.gov/pub/irs-pdf/f970.pdf |
| goods_to_which_lifo_applies | string | No | Description of goods | Description of the goods to which LIFO applies | Form 970, Line 5 | https://www.irs.gov/pub/irs-pdf/f970.pdf |
| book_value_first_year | number | No | Book value at start of first year | Dollar value of inventory at start of first LIFO year | Form 970, Line 6 | https://www.irs.gov/pub/irs-pdf/f970.pdf |

---

## Calculation Logic

### Step 1 — Election Recording
Form 970 is purely an election/informational form. No tax computation is performed. The node validates the election data and records it. The inventory method change is reflected in Schedule C (line 4, cost of goods sold) or Schedule F (farm income), but the specific COGS impact is captured in those forms, not here.

Source: IRS Form 970 Instructions, p.1 — https://www.irs.gov/pub/irs-pdf/i970.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (none) | — | Administrative election — no downstream tax output | IRC §472; Form 970 Instructions | https://www.irs.gov/pub/irs-pdf/f970.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| None | — | Form 970 is an election form with no numeric thresholds | https://www.irs.gov/pub/irs-pdf/f970.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    business_name
    employer_id
    first_year_lifo_elected
    inventory_method_before
    goods_to_which_lifo_applies
    book_value_first_year
  end
  subgraph node["f970 — LIFO Election"]
    validate[Validate election data]
  end
  subgraph outputs["Downstream"]
    none["(no outputs — administrative election)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **First year only**: Form 970 is filed only in the first year the LIFO method is adopted (IRC §472(d)).
2. **Consistency rule**: Once LIFO is elected, it must be applied consistently for all subsequent years to the same goods (IRC §472(c)).
3. **S corporations and partnerships**: Cannot use LIFO if required to use an accrual method and are publicly traded (IRC §448).
4. **book_value_first_year must be nonnegative** if provided.
5. **first_year_lifo_elected** must be a reasonable tax year (4-digit integer).

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 970 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f970.pdf | .research/docs/f970.pdf |
| IRS Form 970 Instructions | 2025 | All | https://www.irs.gov/pub/irs-pdf/i970.pdf | .research/docs/i970.pdf |
| IRC §472 | — | LIFO election | https://www.law.cornell.edu/uscode/text/26/472 | N/A |
