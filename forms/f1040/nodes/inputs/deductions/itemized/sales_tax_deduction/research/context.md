# Sales Tax Deduction — State & Local General Sales Tax Deduction Worksheet

## Overview

The Sales Tax Deduction Worksheet allows taxpayers to elect to deduct state and local general sales taxes instead of state and local income taxes on Schedule A, Line 5b. Two methods exist: (1) actual receipts, or (2) IRS Optional Sales Tax Tables (Publication 600). Major purchase sales taxes (car, boat, aircraft, home) can be added on top of the table amount.

The deductible amount flows to Schedule A as a SALT (state and local taxes) item, subject to the combined $10,000/$5,000 (MFS) SALT cap under TCJA §11042.

**IRS Form:** No standalone form — uses Schedule A Line 5b with IRS Pub. 600 optional table
**Drake Screen:** STAX
**Node Type:** input (singleton)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13012

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| `method` | `SalesTaxMethod` enum (`"actual"` \| `"table"`) | Yes | Actual receipts vs. IRS Optional Tables | Determines which calculation method is used. | IRC §164(b)(5)(H) | https://www.irs.gov/instructions/i1040sca |
| `actual_sales_tax_paid` | `number` (nonnegative) | If method = "actual" | Total sales tax from receipts | Total actual general sales taxes paid during 2025, substantiated by receipts. Required when method = "actual". | IRC §164(b)(5)(A) | https://www.irs.gov/instructions/i1040sca |
| `table_amount` | `number` (nonnegative) | If method = "table" | IRS table lookup amount | The amount from the IRS Optional Sales Tax Tables (Pub. 600) based on state, filing status, income, and exemptions. Required when method = "table". | IRC §164(b)(5)(H); Pub. 600 | https://www.irs.gov/pub/irs-pdf/p600.pdf |
| `major_purchase_tax` | `number` (nonnegative) | No | Sales tax on major purchases | Actual sales tax paid on major purchases (motor vehicle, boat, aircraft, home, building materials). Added to table amount only; NOT added to actual method (already included). | IRC §164(b)(5)(F) | https://www.irs.gov/instructions/i1040sca |

---

## Calculation Logic

### Step 1 — Compute base sales tax amount
If method = "actual":
```
base = actual_sales_tax_paid
```

If method = "table":
```
base = table_amount + (major_purchase_tax ?? 0)
```

Source: IRC §164(b)(5); Schedule A Instructions, Line 5b

### Step 2 — Route to Schedule A
The computed base amount flows to `schedule_a.line_5a_tax_amount` (Schedule A Line 5a, sales tax election). Schedule A applies the $10,000 SALT cap combining line 5 + line 6.

Source: IRC §164(b)(5); Schedule A Line 5b; TCJA §11042

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| `line_5a_tax_amount` | `schedule_a` | Always when base > 0 | IRC §164(b)(5); Schedule A Line 5a (sales tax election) | https://www.irs.gov/pub/irs-pdf/f1040sa.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| SALT cap (Single/MFJ/HOH/QSS) | $10,000 | TCJA §11042; IRC §164(b)(6) | https://www.irs.gov/instructions/i1040sca |
| SALT cap (MFS) | $5,000 | TCJA §11042; IRC §164(b)(6) | https://www.irs.gov/instructions/i1040sca |

Note: The SALT cap is applied by Schedule A, not by this node. This node only passes the raw sales tax amount.

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    METHOD["method: actual | table"]
    ACTUAL["actual_sales_tax_paid"]
    TABLE["table_amount"]
    MAJOR["major_purchase_tax"]
  end
  subgraph node["sales_tax_deduction"]
    CALC["base = actual OR (table + major)"]
  end
  subgraph outputs["Downstream Nodes"]
    SA["schedule_a.line_5a_tax_amount"]
  end
  METHOD --> CALC
  ACTUAL --> CALC
  TABLE --> CALC
  MAJOR --> CALC
  CALC -->|"base > 0"| SA
```

---

## Edge Cases & Special Rules

1. **Mutual exclusion: income tax vs. sales tax.** Taxpayers elect to deduct EITHER state/local income taxes (Schedule A Line 5a) OR general sales taxes (Line 5b) — not both. The `sales_tax_deduction` node handles the sales tax election. The income tax amount is entered in schedule_a directly.

2. **Major purchase tax: table method only.** The `major_purchase_tax` add-on applies ONLY to the table method. If method = "actual", all actual taxes (including major purchases) should already be included in `actual_sales_tax_paid`.

3. **SALT cap applied downstream.** The $10,000/$5,000 cap on state/local taxes is applied by Schedule A (combining property taxes + income/sales taxes). This node passes the raw sales tax amount without capping.

4. **Zero output for zero amounts.** If the computed base is zero, no output is emitted.

5. **Table amount pre-computed.** The `table_amount` field expects the taxpayer to have already looked up the IRS Optional Sales Tax Table (Pub. 600) value for their state, income, and exemptions. This node does not perform the table lookup itself.

6. **Foreign income/sales tax.** General sales taxes paid to a foreign country can also be deducted under the sales tax election. They would be included in the actual_sales_tax_paid amount.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §164(b)(5) — Election to deduct general sales taxes | Current | §164(b)(5) | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164 | N/A |
| TCJA P.L. 115-97 §11042 — SALT limitation | 2017 | §11042 | https://congress.gov/115/plaws/publ97/PLAW-115publ97.pdf | N/A |
| Schedule A (Form 1040) Instructions | 2025 | Line 5b (general sales taxes) | https://www.irs.gov/instructions/i1040sca | N/A |
| IRS Publication 600 (Optional State Sales Tax Tables) | 2025 | All | https://www.irs.gov/pub/irs-pdf/p600.pdf | N/A |
| Drake Software KB — STAX Screen | Current | STAX entry screen | https://kb.drakesoftware.com/Site/Browse/13012 | N/A |
