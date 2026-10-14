# f8835 — Form 8835: Renewable Electricity, Refined Coal, and Indian Coal Production Credit

## Overview
Form 8835 computes the production tax credit (PTC) for electricity produced from qualified renewable energy sources (wind, solar, geothermal, biomass, etc.) and sold to an unrelated party during the 10-year period beginning on the facility's placed-in-service date. The PTC is part of the General Business Credit (IRC §45) and flows to Schedule 3 via Form 3800. The Inflation Reduction Act of 2022 (IRA) added bonus credit multipliers for meeting prevailing wage and apprenticeship requirements.

**IRS Form:** 8835
**Drake Screen:** 8835
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** N/A

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| energy_type | EnergyType enum | Yes | Facility records | Type of qualified energy source | IRC §45(d); Form 8835 Part I | https://www.irs.gov/pub/irs-pdf/f8835.pdf |
| kwh_produced | number (nonnegative) | Yes | Metering records | Total kWh produced during the tax year | IRC §45(a)(1); Form 8835 | https://www.irs.gov/pub/irs-pdf/f8835.pdf |
| kwh_sold | number (nonnegative) | Yes | Sales records | kWh of electricity sold to unrelated party | IRC §45(a)(1); Form 8835 | https://www.irs.gov/pub/irs-pdf/f8835.pdf |
| facility_placed_in_service_date | string (YYYY-MM-DD) | Yes | Facility records | Date the qualified facility was first placed in service | IRC §45(a)(2)(A)(ii); Form 8835 | https://www.irs.gov/pub/irs-pdf/f8835.pdf |
| meets_prevailing_wage | boolean | No | Contractor certification | Whether facility meets prevailing wage requirements (IRA 2022) | IRC §45(b)(7); IRA §13101 | https://www.irs.gov/pub/irs-pdf/f8835.pdf |
| meets_apprenticeship | boolean | No | Contractor certification | Whether facility meets apprenticeship requirements (IRA 2022) | IRC §45(b)(8); IRA §13101 | https://www.irs.gov/pub/irs-pdf/f8835.pdf |

---

## Calculation Logic

### Step 1 — Base Credit Rate (TY2025, inflation-adjusted)
TY2025 inflation-adjusted rates per Rev. Proc. 2024-40 (or equivalent):
- Wind (closed-loop / open-loop not applicable to wind): $0.028/kWh
- Solar, geothermal, ocean thermal, wave/tidal: $0.028/kWh
- Closed-loop biomass: $0.028/kWh
- Open-loop biomass, small irrigation power, landfill gas, trash, qualified hydropower, marine/hydrokinetic: $0.014/kWh (half-rate)

Source: IRC §45(a)(1), §45(b)(2); Rev. Proc. 2024-40; https://www.irs.gov/pub/irs-drop/rp-24-40.pdf

### Step 2 — IRA 2022 Wage/Apprenticeship Multiplier
For facilities that begin construction after December 31, 2021:
- If meets_prevailing_wage AND meets_apprenticeship: use 5× multiplier (base rate × 5)
- Otherwise: use 1× base rate (no bonus)

Note: The "5× multiplier" effectively means the rate IS the full rate shown above (e.g., $0.028/kWh).
If wage/apprenticeship NOT met: rate is 1/5th of the inflation-adjusted base.
So: full_rate = $0.028 or $0.014; reduced_rate = full_rate / 5

For simplicity in TY2025:
- Full rate (wage+apprenticeship met): WIND/SOLAR/GEO/BIOMASS_CLOSED = $0.028/kWh
- Full rate (wage+apprenticeship met): BIOMASS_OPEN/HYDRO/LANDFILL/MARINE = $0.014/kWh
- Reduced rate (requirements NOT met): divide above by 5
  - Full-rate types → $0.0056/kWh
  - Half-rate types → $0.0028/kWh

Source: IRC §45(b)(6)-(8); IRA 2022 §13101; https://www.irs.gov/pub/irs-pdf/i8835.pdf

### Step 3 — Credit Computation
credit = kwh_sold × applicable_rate

Source: IRC §45(a); Form 8835 line computation; https://www.irs.gov/pub/irs-pdf/f8835.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | credit > 0 | IRC §38; Schedule 3 line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Full rate — WIND, SOLAR, GEOTHERMAL, BIOMASS_CLOSED | $0.028/kWh | IRC §45(b)(2); Rev. Proc. 2024-40 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Full rate — BIOMASS_OPEN, HYDRO, LANDFILL, MARINE | $0.014/kWh | IRC §45(b)(2) | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf |
| Reduced rate (no wage/apprenticeship) — full-rate types | $0.0056/kWh (= $0.028 / 5) | IRC §45(b)(6) | https://www.irs.gov/pub/irs-pdf/i8835.pdf |
| Reduced rate (no wage/apprenticeship) — half-rate types | $0.0028/kWh (= $0.014 / 5) | IRC §45(b)(6) | https://www.irs.gov/pub/irs-pdf/i8835.pdf |
| Credit period | 10 years from placed-in-service date | IRC §45(a)(2)(A)(ii) | https://www.irs.gov/pub/irs-pdf/i8835.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry"]
    E[energy_type]
    P[kwh_produced]
    K[kwh_sold]
    D[facility_placed_in_service_date]
    W[meets_prevailing_wage]
    A[meets_apprenticeship]
  end
  subgraph node["f8835 Node"]
    C[compute PTC credit]
  end
  subgraph outputs["Downstream"]
    S3[schedule3.line6z_general_business_credit]
  end
  inputs --> node --> outputs
```

---

## Edge Cases & Special Rules

1. **Credit limited to kWh sold (not produced)**: credit is based on kwh_sold, not kwh_produced.
2. **kwh_sold > kwh_produced is invalid**: throw validation error.
3. **10-year credit period**: if the facility has been in service > 10 years, no credit. (Not enforced in engine — tax preparer determines eligibility).
4. **Both wage AND apprenticeship must be met for multiplier**: meeting only one does not give the 5× multiplier.
5. **No credit if kwh_sold = 0**: return empty outputs.
6. **Open-loop biomass gets half-rate**: $0.014/kWh vs $0.028/kWh.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRC §45 | — | Production tax credit | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section45 | — |
| Form 8835 instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i8835.pdf | — |
| Rev. Proc. 2024-40 | 2024 | §3.31 PTC rates | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | — |
| IRA 2022 §13101 | 2022 | Prevailing wage/apprenticeship | https://www.congress.gov/117/plaws/publ169/PLAW-117publ169.pdf | — |
