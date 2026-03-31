# Form 8936 — Clean Vehicle Credits

## Overview
Computes the Clean Vehicle Credit under IRC §30D (new vehicles, up to $7,500) and IRC §25E (used vehicles, up to $4,000 or 30% of sale price). Routes to Schedule 3 line 6d. Income limits apply. One item per qualifying vehicle.

**IRS Form:** 8936
**Drake Screen:** 8936
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14050

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| f8936s | VehicleItem[] | Yes | Vehicles | Array of qualifying clean vehicle records | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| vehicle_description | string | No | Vehicle description | Make, model, year | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| vin | string | No | VIN | Vehicle Identification Number | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| purchase_date | string (ISO) | No | Purchase date | Date vehicle was purchased | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| is_new_vehicle | boolean | No | New vehicle | True = new (§30D, $7,500 max); false = used (§25E, $4,000 max) | IRC §30D / §25E | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| credit_amount | number (≥0) | No | Credit amount | Pre-determined credit from IRS certification (new vehicles) | Form 8936 Line 4 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| sale_price | number (≥0) | No | Sale price | Sale price (used vehicles; must be ≤$25,000) | IRC §25E(b)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| msrp | number (≥0) | No | MSRP | Manufacturer's suggested retail price (new vehicle cap check) | IRC §30D(f)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| vehicle_type | "suv_van_truck" or "other" | No | Vehicle type | Determines MSRP cap: $80,000 (SUV/van/truck) or $55,000 (other) | IRC §30D(f)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| business_use_pct | number (0–1) | No | Business use % | Business use fraction (reduces personal credit proportionally) | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| modified_agi | number (≥0) | No | Modified AGI | MAGI for income limit test | IRC §30D(f)(10); §25E(b)(2) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| filing_status | FilingStatus enum | No | Filing status | Determines income limit: MFJ $300k, HOH $225k, Single $150k | IRC §30D(f)(10) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |

---

## Calculation Logic

### Step 1 — New vehicle credit (§30D)
- If `modified_agi > income_limit`: credit = 0
- If `msrp > MSRP cap` ($80k SUV or $55k other): credit = 0
- `credit = min(credit_amount, $7,500) × (1 − business_use_pct)`
Source: IRC §30D(a),(f)(1),(f)(10) — https://www.irs.gov/pub/irs-pdf/i8936.pdf

### Step 2 — Used vehicle credit (§25E)
- If `modified_agi > income_limit`: credit = 0
- If `sale_price > $25,000`: credit = 0
- `credit = min(sale_price × 30%, $4,000) × (1 − business_use_pct)`
Source: IRC §25E(a),(b) — https://www.irs.gov/pub/irs-pdf/i8936.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6d_clean_vehicle_credit | schedule3 | credit > 0 | Form 8936 → Schedule 3 Line 6d | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| New vehicle max credit | $7,500 | IRC §30D(a); IRA §13401 | https://www.law.cornell.edu/uscode/text/26/30D |
| Used vehicle max credit | $4,000 | IRC §25E(a); IRA §13402 | https://www.law.cornell.edu/uscode/text/26/25E |
| Used vehicle credit rate | 30% of sale price | IRC §25E(a) | https://www.law.cornell.edu/uscode/text/26/25E |
| Used vehicle price cap | $25,000 | IRC §25E(b)(1) | https://www.law.cornell.edu/uscode/text/26/25E |
| MSRP cap — SUV/van/pickup | $80,000 | IRC §30D(f)(1)(B) | https://www.law.cornell.edu/uscode/text/26/30D |
| MSRP cap — other vehicles | $55,000 | IRC §30D(f)(1)(A) | https://www.law.cornell.edu/uscode/text/26/30D |
| Income limit — MFJ / QSS | $300,000 | IRC §30D(f)(10)(A)(i); Rev Proc 2024-40 | https://www.law.cornell.edu/uscode/text/26/30D |
| Income limit — HOH | $225,000 | IRC §30D(f)(10)(A)(ii) | https://www.law.cornell.edu/uscode/text/26/30D |
| Income limit — Single / MFS | $150,000 | IRC §30D(f)(10)(A)(iii) | https://www.law.cornell.edu/uscode/text/26/30D |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (per vehicle)"]
    v["f8936s[]\nis_new_vehicle + credit_amount/sale_price\nmsrp + modified_agi + filing_status"]
  end
  subgraph node["f8936 (Clean Vehicle Credit)"]
    nc["computeNewVehicleCredit()"]
    uc["computeUsedVehicleCredit()"]
  end
  subgraph outputs["Downstream"]
    s3["schedule3\nline6d_clean_vehicle_credit"]
  end
  v --> nc & uc --> s3

---

## Edge Cases & Special Rules

1. **Income test uses prior OR current year MAGI**: Taxpayer may use either prior year or current year MAGI, whichever is lower. Node accepts `modified_agi` and tests against limit.
2. **VIN required for IRS processing**: VIN is captured for IRS matching but not used in credit computation.
3. **Dealer transfer (point-of-sale)**: Starting TY2024, dealers can apply the credit at point-of-sale. This node handles the traditional tax-return credit path.
4. **Used vehicle — once per vehicle**: A vehicle can only qualify for the §25E credit once in its lifetime.
5. **Business use split**: Business use reduces the personal credit proportionally. Business portion should be claimed on Form 3800.
6. **No longer needs separate f8936_input**: The input and intermediate nodes were merged into f8936 (input) + form8936 (intermediate). The old f8936_input node is deleted.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8936 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8936.pdf | .research/docs/i8936.pdf |
| IRC §30D — Clean Vehicle Credit | current | §30D(a),(f) | https://www.law.cornell.edu/uscode/text/26/30D | N/A |
| IRC §25E — Previously-Owned Clean Vehicles | current | §25E(a–b) | https://www.law.cornell.edu/uscode/text/26/25E | N/A |
| Rev Proc 2024-40 | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
