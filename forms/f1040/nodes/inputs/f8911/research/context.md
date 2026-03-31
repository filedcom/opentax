# Form 8911 — Alternative Fuel Vehicle Refueling Property Credit

## Overview
Computes the IRC §30C credit for qualifying alternative fuel vehicle refueling property (EV charging stations, hydrogen, natural gas, propane). TY2025: 30% of cost. Business portion: capped at $100,000 per location → Schedule 3 line 6z. Personal portion: capped at $1,000 → Schedule 3 line 6b.

**IRS Form:** 8911
**Drake Screen:** 8911
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14045

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| cost | number (≥0) | Yes | Property cost | Total cost of qualifying refueling property placed in service | Form 8911 Line 1 | https://www.irs.gov/pub/irs-pdf/i8911.pdf |
| business_use_pct | number (0–1) | No | Business use % | Percentage of business use (remainder = personal) | Form 8911 | https://www.irs.gov/pub/irs-pdf/i8911.pdf |
| fuel_type | FuelType enum | No | Fuel type | electric_charging, hydrogen, natural_gas, or propane | Form 8911; IRC §30C(c) | https://www.irs.gov/pub/irs-pdf/i8911.pdf |
| num_locations | number (int, ≥1) | No | Locations | Number of locations (for business cap; default 1) | Form 8911; IRC §30C(b) | https://www.irs.gov/pub/irs-pdf/i8911.pdf |

---

## Calculation Logic

### Step 1 — Business credit
`businessCost = cost × business_use_pct`
`rawBusiness = businessCost × 30%`
`businessCredit = min(rawBusiness, $100,000 × num_locations)`
Source: IRC §30C(b)(1) — https://www.irs.gov/pub/irs-pdf/i8911.pdf

### Step 2 — Personal credit
`personalPct = 1 − business_use_pct`
`personalCost = cost × personalPct`
`personalCredit = min(personalCost × 30%, $1,000)`
Source: IRC §30C(b)(2) — https://www.irs.gov/pub/irs-pdf/i8911.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | businessCredit > 0 | Form 8911 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |
| line6b_alt_fuel_vehicle_refueling | schedule3 | personalCredit > 0 | Form 8911 Line 19 → Schedule 3 Line 6b | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Credit rate | 30% of cost | IRC §30C(a); IRA expanded | https://www.law.cornell.edu/uscode/text/26/30C |
| Business credit cap per location | $100,000 | IRC §30C(b)(1); IRA §13404 | https://www.law.cornell.edu/uscode/text/26/30C |
| Personal credit cap | $1,000 | IRC §30C(b)(2) | https://www.law.cornell.edu/uscode/text/26/30C |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    cost["cost"]
    biz["business_use_pct"]
    loc["num_locations"]
  end
  subgraph node["f8911 (Alt Fuel Refueling Credit)"]
    bc["businessCredit()"]
    pc["personalCredit()"]
  end
  subgraph outputs["Downstream"]
    s3z["schedule3 line6z (business)"]
    s3b["schedule3 line6b (personal)"]
  end
  cost & biz & loc --> bc --> s3z
  cost & biz --> pc --> s3b

---

## Edge Cases & Special Rules

1. **100% personal**: If `business_use_pct = 0` (or undefined), entire credit is personal, capped at $1,000.
2. **100% business**: If `business_use_pct = 1`, entire credit is business, capped at $100,000 per location.
3. **Rural/low-income area requirement (IRA)**: IRA §13404 requires the property to be in a low-income community or non-urban area. Node does not enforce eligibility.
4. **Multiple locations**: `num_locations` multiplies the business cap ($100,000 × locations).
5. **IRA expansion**: Pre-IRA, business cap was $30,000 and personal was $1,000. IRA increased to $100,000 for business property placed in service after 12/31/2022.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8911 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8911.pdf | .research/docs/i8911.pdf |
| IRC §30C — Alternative Fuel Vehicle Refueling Property | current | §30C(a–b) | https://www.law.cornell.edu/uscode/text/26/30C | N/A |
