# f8288 — Form 8288/8288-A: FIRPTA Withholding

## Overview

Under FIRPTA (Foreign Investment in Real Property Tax Act), when a foreign person sells US real property, the buyer must withhold a percentage of the gross sales price and remit it to the IRS using Form 8288. The foreign seller receives Form 8288-A (the withholding statement) and uses it to claim the withheld amount as a credit against their US tax liability on their income tax return (Form 1040-NR or Form 1040 if resident status changed mid-year).

The withheld amount flows to Form 1040 as a payment/credit (similar to federal income tax withholding), reducing tax owed.

**IRS Form:** Form 8288 / Form 8288-A
**Drake Screen:** 8288
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| property_address | string | Yes | Address of US real property | Street address of the US real property sold | Form 8288-A line 5; IRC §1445 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| gross_sales_price | number | Yes | Gross sales price | Total contract price / amount realized on the disposition | Form 8288-A line 6b; Reg. §1.1445-1(b)(2) | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| withholding_rate | WithholdingRate enum | Yes | Withholding rate applied | 0%, 10%, or 15% — determined by property type and price | IRC §1445(a); Reg. §1.1445-2 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| amount_withheld | number | Yes | Amount withheld | Actual amount withheld on the disposition (from Form 8288-A) | Form 8288-A line 8; IRC §1445 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| buyer_name | string | Yes | Name of buyer/transferee | Name of the buyer who withheld the tax | Form 8288-A line 2 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| buyer_tin | string | Yes | TIN of buyer | Buyer's TIN (EIN or SSN) | Form 8288-A line 3 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| disposition_date | string | Yes | Date of disposition | Date the property was transferred (YYYY-MM-DD) | Form 8288-A line 7; IRC §1445 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |

---

## Calculation Logic

### Step 1 — Aggregate withheld amounts
Sum `amount_withheld` across all Form 8288-A items. Each property sold produces one item.

Source: Form 8288-A instructions; each 8288-A is a separate withholding certificate.

### Step 2 — Route to f1040 as withholding credit
The total withheld flows to Form 1040 Line 25b (federal tax withheld from 1099 forms / other withholding). FIRPTA withholding is a credit against tax liability.

Source: Form 1040 instructions, Line 25b — "Federal income tax withheld from Form 1099 and other forms"; Rev. Proc. 2000-35; IRC §1445(e).

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line25b_withheld_1099 | f1040 | amount_withheld > 0 (total across items) | IRC §1445; Form 1040 Line 25b | https://www.irs.gov/instructions/i1040gi |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Standard FIRPTA withholding rate | 15% of gross sales price | IRC §1445(a); Reg. §1.1445-1 | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| Reduced rate — primary residence ≤ $1M | 10% | IRC §1445(b)(8); Reg. §1.1445-2(d)(1)(i) | https://www.irs.gov/pub/irs-pdf/f8288.pdf |
| Zero withholding — primary residence < $300K | 0% | IRC §1445(b)(5); Reg. §1.1445-2(d)(1)(i) | https://www.irs.gov/pub/irs-pdf/f8288.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (per property)"]
    user["property_address, gross_sales_price, withholding_rate, amount_withheld, buyer_name, buyer_tin, disposition_date"]
  end
  subgraph node["f8288"]
    sum["Sum amount_withheld across all items"]
  end
  subgraph outputs["Downstream Nodes"]
    f1040["f1040 (line25b_withheld_1099)"]
  end
  inputs --> node --> f1040
```

---

## Edge Cases & Special Rules

1. **Zero withholding**: If the 0% rate applies (price < $300K, primary residence) or amount_withheld = 0, no output is emitted.
2. **Multiple properties**: Each property sold results in a separate Form 8288-A. All amounts are aggregated to one f1040 output.
3. **10% rate**: Applies when property is used as buyer's primary residence AND gross sales price is ≤ $1,000,000.
4. **15% rate**: Standard rate for all other dispositions.
5. **FIRPTA is a withholding credit**: Functions like income tax withholding — fully creditable against the tax liability.
6. **Negative amounts invalid**: `amount_withheld` and `gross_sales_price` must be non-negative.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8288 | 2024 | All | https://www.irs.gov/pub/irs-pdf/f8288.pdf | f8288.pdf |
| Form 8288-A | 2024 | All | https://www.irs.gov/pub/irs-pdf/f8288a.pdf | f8288a.pdf |
| IRC §1445 | Current | FIRPTA withholding | https://www.law.cornell.edu/uscode/text/26/1445 | N/A |
| Reg. §1.1445-1 | Current | General rules | https://www.ecfr.gov/current/title-26/part-1/section-1.1445-1 | N/A |
| Rev. Proc. 2000-35 | 2000 | FIRPTA procedures | https://www.irs.gov/pub/irs-drop/rp-00-35.pdf | N/A |
