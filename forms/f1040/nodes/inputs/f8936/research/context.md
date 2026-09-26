# Form 8936 — Clean Vehicle Credits

## Overview
Computes provisional personal Clean Vehicle Credit amounts under IRC §30D (new vehicles, up to $7,500) and IRC §25E (previously owned vehicles, up to $4,000 or 30% of sale price). Routes to Schedule 3 line 6f or 6m. This is not a complete Form 8936 filing path: IRS8936, Schedule A, dealer transfers, tax-liability limits, and business-credit reconciliation remain open.

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
| vehicle_year, vehicle_make, vehicle_model | number, string, string | Required to compute | Vehicle identity | Schedule A line 1a-1c | 2025 Schedule A | https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf |
| placed_in_service_date | string (ISO) | Required to compute | Service date | Must be in 2025 | Schedule A line 3 | https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf |
| acquisition_date | string (ISO) | Required to compute | Acquisition date | Date of binding contract and payment; no credit after 2025-09-30 | Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| seller_report_received | boolean | Required to compute | Seller report | Confirms the required seller report was received | Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| transferred_to_dealer, transferred_amount | boolean, number | Election and amount when transferred | Dealer transfer | Transfer must be reconciled on Form 8936 and Schedule A, not claimed again on Schedule 3 | Schedule A line 4a | https://www.irs.gov/instructions/i8936 |
| resold_within_30_days, acquired_for_use_not_resale | boolean, boolean | Required to compute | Vehicle use | Rejects resale within 30 days or purchase for resale | Schedule A Parts II/IV | https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf |
| claimed_as_dependent, claimed_prev_owned_credit_last_3_years | boolean, boolean | Previously owned | Prior claim/dependent | Rejects barred previously owned claims | Schedule A Part IV | https://www.irs.gov/pub/irs-prior/f8936sa--2025.pdf |
| purchased_from_dealer, previously_owned_first_eligible_transfer | boolean, boolean | Previously owned | Dealer/transfer | Both required for the previously owned credit | Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| is_new_vehicle | boolean | No | New vehicle | True = new (§30D, $7,500 max); false = used (§25E, $4,000 max) | IRC §30D / §25E | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| credit_amount | number (≥0) | No | Credit amount | Pre-determined credit from IRS certification (new vehicles) | Form 8936 Line 4 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| sale_price | number (≥0) | No | Sale price | Sale price (used vehicles; must be ≤$25,000) | IRC §25E(b)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| msrp | number (≥0) | No | MSRP | Manufacturer's suggested retail price (new vehicle cap check) | IRC §30D(f)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| vehicle_type | "suv_van_truck" or "other" | No | Vehicle type | Determines MSRP cap: $80,000 (SUV/van/truck) or $55,000 (other) | IRC §30D(f)(1) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| business_use_pct | number (0–1) | No | Business use % | Business use fraction (reduces personal credit proportionally) | Form 8936 | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| modified_agi | number (≥0) | No | Modified AGI | MAGI for income limit test | IRC §30D(f)(10); §25E(b)(2) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| prior_year_modified_agi | number (≥0) | When current-year MAGI is over limit | Prior-year MAGI | Alternate income-limit test | Form 8936 Part I | https://www.irs.gov/instructions/i8936 |
| filing_status | FilingStatus enum | No | Filing status | Determines income limit: MFJ $300k, HOH $225k, Single $150k | IRC §30D(f)(10) | https://www.irs.gov/pub/irs-pdf/i8936.pdf |
| prior_year_filing_status | FilingStatus enum | When current-year MAGI is over limit | Prior-year filing status | Uses the prior year's threshold for a status change | Form 8936 Part I | https://www.irs.gov/instructions/i8936 |

---

## Calculation Logic

### Step 1 — New vehicle credit (§30D)
- If acquired after 2025-09-30: credit = 0
- If both current-year and prior-year MAGI exceed their own filing-status limits: credit = 0
- If `msrp > MSRP cap` ($80k SUV or $55k other): credit = 0
- `credit = min(credit_amount, $7,500) × (1 − business_use_pct)`
Source: IRC §30D(a),(f)(1),(f)(10) — https://www.irs.gov/pub/irs-pdf/i8936.pdf

### Step 2 — Used vehicle credit (§25E)
- If acquired after 2025-09-30: credit = 0
- If both current-year and prior-year MAGI exceed the lower used-vehicle limits: credit = 0
- If `sale_price > $25,000`: credit = 0
- `credit = min(sale_price × 30%, $4,000)`; 2025 Schedule A Part IV has no business-use percentage split
Source: IRC §25E(a),(b) — https://www.irs.gov/pub/irs-pdf/i8936.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6f_clean_vehicle_credit | schedule3 | New personal credit > 0 | Form 8936 line 13 → Schedule 3 line 6f | https://www.irs.gov/pub/irs-prior/f8936--2025.pdf |
| line6m_prev_owned_clean_vehicle_credit | schedule3 | Previously owned credit > 0 | Form 8936 line 18 → Schedule 3 line 6m | https://www.irs.gov/pub/irs-prior/f8936--2025.pdf |

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
| Previously owned income limit — MFJ / QSS | $150,000 | 2025 Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| Previously owned income limit — HOH | $112,500 | 2025 Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| Previously owned income limit — Single / MFS | $75,000 | 2025 Form 8936 instructions | https://www.irs.gov/instructions/i8936 |
| Last eligible acquisition date | 2025-09-30 | 2025 Form 8936 instructions | https://www.irs.gov/instructions/i8936 |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry (per vehicle)"]
    v["f8936s[]\nacquisition date + current/prior MAGI\nis_new_vehicle + credit_amount/sale_price"]
  end
  subgraph node["f8936 (Clean Vehicle Credit)"]
    nc["computeNewVehicleCredit()"]
    uc["computeUsedVehicleCredit()"]
  end
  subgraph outputs["Downstream"]
    s3["schedule3\nline6f or line6m"]
  end
  v --> nc & uc --> s3

---

## Edge Cases & Special Rules

1. **Income test uses prior OR current year MAGI**: Each year uses its own filing-status threshold. If current-year MAGI exceeds its threshold, the node requires prior-year MAGI and status instead of silently assuming ineligibility.
2. **VIN required for IRS processing**: VIN is captured but not yet required or serialized. This is an open filing gap, not a verified return path.
3. **Dealer transfer (point-of-sale)**: Transferred amounts are not also routed to Schedule 3. An unregistered Schedule A builder captures the transfer election and amount; Form 8936 and any Schedule 2 line 1b repayment are still missing.
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
