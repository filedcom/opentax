# f8594 — Asset Acquisition Statement Under Section 1060

## Overview
This node captures IRS Form 8594 data. When a group of assets constituting a trade or business is sold or purchased, both buyer and seller must file Form 8594. Assets are allocated to 7 classes using the residual method under IRC Section 1060. The allocation affects the buyer's depreciable basis and the seller's gain/loss recognition. This input node captures the allocation data; gain/loss flows to Schedule D or Form 4797.

**IRS Form:** IRS Form 8594
**Drake Screen:** 8594
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://www.irs.gov/forms-pubs/about-form-8594

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| party_type | enum (seller/buyer) | yes | "Party type" | Whether this taxpayer is the seller or buyer | Form 8594, Part I, line 1 | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| sale_date | string | yes | "Date of sale" | Date of sale/purchase of business assets | Form 8594, Part I, line 2 | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| total_sale_price | number | yes | "Total sale price" | Aggregate fair market value of the transferred assets | Form 8594, Part I, line 3 | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_i | number | no | "Class I — Cash and cash equivalents" | FMV allocated to cash and general deposit accounts | Form 8594, Part II, Class I | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_ii | number | no | "Class II — CDs, US Gov't securities, foreign currency" | FMV allocated to actively traded personal property, CDs, US gov't securities | Form 8594, Part II, Class II | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_iii | number | no | "Class III — Accounts receivable, mortgages" | FMV allocated to assets that the taxpayer marks to market at least annually | Form 8594, Part II, Class III | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_iv | number | no | "Class IV — Inventory" | FMV allocated to inventory-type property | Form 8594, Part II, Class IV | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_v | number | no | "Class V — All other tangible assets" | FMV allocated to all assets not in other classes | Form 8594, Part II, Class V | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_vi | number | no | "Class VI — Section 197 intangibles (except goodwill)" | FMV allocated to all §197 intangibles except goodwill and going concern | Form 8594, Part II, Class VI | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| allocation_class_vii | number | no | "Class VII — Goodwill and going concern" | FMV allocated to goodwill and going concern value | Form 8594, Part II, Class VII | https://www.irs.gov/pub/irs-pdf/f8594.pdf |

---

## Calculation Logic

### Step 1 — Validate total allocation
Sum of all class allocations (I through VII) must equal total_sale_price if all classes are provided.
Source: IRS Form 8594 Instructions, Part II, "The total of the amounts allocated to all classes must equal the total fair market value of the transferred assets." — https://www.irs.gov/pub/irs-pdf/i8594.pdf

### Step 2 — No direct tax computation
Form 8594 is an informational statement of allocation. The actual gain/loss on assets flows through the seller's Schedule D (capital assets) or Form 4797 (business property). This node captures the data for record-keeping; downstream routing is informational.
Source: IRS Form 8594 Instructions, General Instructions — https://www.irs.gov/pub/irs-pdf/i8594.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| (informational) | f1040 | always — foreign_accounts_indicator flag; no monetary routing | Form 8594 Instructions | https://www.irs.gov/pub/irs-pdf/i8594.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| CLASS_COUNT | 7 | Form 8594, Part II (Classes I-VII) | https://www.irs.gov/pub/irs-pdf/f8594.pdf |
| None (no inflation-adjusted constants) | — | — | — |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    party_type
    sale_date
    total_sale_price
    class_allocations["allocation_class_i through _vii"]
  end
  subgraph node["f8594 — Asset Acquisition Statement"]
    validate["validate: sum of classes = total_sale_price"]
  end
  subgraph outputs["Downstream Nodes"]
    note["(informational — no direct tax output)"]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **Both buyer and seller file**: Each party must file their own Form 8594 with their return.
2. **Allocation order matters**: Residual method requires filling classes I-VI before VII (goodwill absorbs the residual).
3. **Amended returns**: If the parties agree to an allocation change after filing, Form 8594 must be amended.
4. **Class VII as residual**: Goodwill and going concern value = total sale price minus all other class allocations.
5. **Partial allocations**: Not all classes need to be populated; unallocated remainder goes to Class VII.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 8594 | 2024 | All parts | https://www.irs.gov/pub/irs-pdf/f8594.pdf | N/A |
| IRS Form 8594 Instructions | 2024 | General Instructions, Part II | https://www.irs.gov/pub/irs-pdf/i8594.pdf | N/A |
| IRC §1060 | — | Applicable rules | https://www.law.cornell.edu/uscode/text/26/1060 | N/A |
