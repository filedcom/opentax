# Form 8834 — Qualified Electric Vehicle Credit

## Overview
Computes the old IRC §30 Qualified Electric Vehicle Credit for 2- or 3-wheel and low-speed vehicles. This credit is largely obsolete in TY2025 (applicable vehicles had to be placed in service before December 31, 2005 for the full §30 credit; the 2-/3-wheel vehicle credit under §30D(g) expired after 2013). Carryforward amounts from prior years may still exist. Not the same as the new §30D Clean Vehicle Credit. Routes to Schedule 3 line 6z.

**IRS Form:** 8834
**Drake Screen:** 8834
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/14022

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| f8834s | VehicleItem[] | Yes (min 1) | Vehicles | Array of qualified electric vehicle records | Form 8834 | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| vehicle_description | string | No | Vehicle description | Description of the vehicle (make, model) | Form 8834 Line 1 | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| date_placed_in_service | string (ISO) | No | Date placed in service | Date the vehicle was placed in service | Form 8834 Line 1 | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| cost | number (≥0) | Yes | Cost | Original cost of the vehicle | Form 8834 Line 2 | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| credit_percentage | number (0–1) | No | Credit % | Credit rate (default 10% for both vehicle types) | Form 8834 Line 3; IRC §30 | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| vehicle_type | VehicleType enum | No | Vehicle type | two_three_wheel or low_speed | Form 8834 instructions | https://www.irs.gov/pub/irs-pdf/i8834.pdf |
| original_use | boolean | No | Original use | True if taxpayer was original user of vehicle | IRC §30(d)(1) | https://www.irs.gov/pub/irs-pdf/i8834.pdf |

---

## Calculation Logic

### Step 1 — Original use check
If `original_use = false`: credit = 0 for this vehicle.
Source: IRC §30(d)(1) — https://www.law.cornell.edu/uscode/text/26/30

### Step 2 — Per-vehicle credit
`rate = credit_percentage ?? 10%`
`rawCredit = cost × rate`
`credit = min(rawCredit, cap)` where cap = $2,500 for both vehicle types.
Source: IRC §30 — https://www.irs.gov/pub/irs-pdf/i8834.pdf

### Step 3 — Total credit
`total = Σ vehicleCredit(vehicles)`

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total > 0 | Form 8834 → Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Credit rate (2-/3-wheel and low-speed) | 10% of cost | IRC §30; statutory | https://www.law.cornell.edu/uscode/text/26/30 |
| Maximum credit per vehicle (2-/3-wheel) | $2,500 | IRC §30 (10% × $25,000 cost cap) | https://www.law.cornell.edu/uscode/text/26/30 |
| Maximum credit per vehicle (low-speed) | $2,500 | IRC §30 | https://www.law.cornell.edu/uscode/text/26/30 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (per vehicle)"]
    v["f8834s[]\ncost + vehicle_type + credit_percentage"]
  end
  subgraph node["f8834 (QEV Credit)"]
    vc["vehicleCredit()"]
    tc["totalCredit()"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3\nline6z_general_business_credit"]
  end
  v --> vc --> tc --> s3

---

## Edge Cases & Special Rules

1. **Mostly obsolete for TY2025**: The §30 credit for 2-/3-wheel electric vehicles expired. This form is primarily used to claim prior-year carryforward credits on Form 3800.
2. **Original use required**: If `original_use = false`, no credit. Used vehicles do not qualify.
3. **$2,500 per-vehicle cap**: Regardless of cost, maximum credit is $2,500 per vehicle.
4. **Do not confuse with §30D**: The new Clean Vehicle Credit (Form 8936) is a different credit. Form 8834 covers the old §30 credit for historical vehicles only.
5. **Recapture**: If the vehicle ceases to qualify within 3 years, the credit may be recaptured. Out of scope for this node.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 8834 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8834.pdf | .research/docs/i8834.pdf |
| IRC §30 — Certain Plug-In Electric Vehicles | current | §30 | https://www.law.cornell.edu/uscode/text/26/30 | N/A |
