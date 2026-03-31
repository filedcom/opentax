# Form 7207 — Advanced Manufacturing Production Credit

## Overview
This node captures qualified advanced manufacturing component production data and computes the credit under IRC §45X (created by IRA §13502). The credit is non-refundable and flows to Schedule 3 line 6z (general business credit → Form 3800). Eligible components include solar modules, solar cells, wind energy components, inverters, battery modules, and certain critical minerals.

**IRS Form:** 7207
**Drake Screen:** 7207
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/Site/Browse/13532

---

## Input Fields

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| components | ComponentEntry[] | No | Components | Array of manufactured component records | IRC §45X(a) | https://www.irs.gov/pub/irs-pdf/i7207.pdf |
| components[].component_type | ComponentType (enum) | Yes | Component Type | Type of eligible component (see enum table below) | IRC §45X(b–c) | https://www.irs.gov/pub/irs-pdf/i7207.pdf |
| components[].quantity | number (≥0) | Yes | Quantity | Watts of capacity (power components), Wh (battery), or production cost in $ (critical minerals) | Form 7207 Line 1–13 | https://www.irs.gov/pub/irs-pdf/i7207.pdf |
| components[].credit_rate_override | number (≥0) | No | Rate Override | Override for phased-down rate (2030+) or IRS corrections | IRC §45X(b)(3) phase-down | https://www.irs.gov/pub/irs-pdf/i7207.pdf |

**ComponentType enum values:**

| Enum Value | Component | Credit Rate | Unit | IRC §45X Subsection |
|------------|-----------|-------------|------|---------------------|
| solar_module | Solar module | $0.07/W | W capacity | §45X(b)(1)(A) |
| solar_cell | Solar cell | $0.04/W | W capacity | §45X(b)(1)(B) |
| thin_film_solar_cell | Thin-film solar cell | $0.04/W | W capacity | §45X(b)(1)(B) |
| wind_blade | Wind turbine blade | $0.02/W | W nameplate | §45X(b)(1)(C)(i) |
| wind_nacelle | Wind nacelle | $0.05/W | W nameplate | §45X(b)(1)(C)(ii) |
| wind_tower | Wind tower | $0.03/W | W nameplate | §45X(b)(1)(C)(iii) |
| wind_offshore_foundation | Offshore wind foundation | $0.04/W | W nameplate | §45X(b)(1)(C)(iv) |
| inverter_central_over_1mw | Central inverter >1 MW | $0.0025/W | W AC | §45X(b)(1)(D)(i) |
| inverter_central_under_1mw | Central inverter ≤1 MW | $0.0025/W | W AC | §45X(b)(1)(D)(i) |
| inverter_string | String inverter | $0.0015/W | W AC | §45X(b)(1)(D)(ii) |
| inverter_micro_under_65w | Microinverter ≤65 W | $0.002/W | W AC | §45X(b)(1)(D)(iii) |
| inverter_micro_over_65w | Microinverter >65 W | $0.002/W | W AC | §45X(b)(1)(D)(iii) |
| inverter_gamut | Gamut inverter | $0.0015/W | W AC | §45X(b)(1)(D)(iv) |
| battery_module | Battery module (grid-scale) | $0.0035/Wh | Wh capacity | §45X(b)(1)(E) |
| critical_mineral_other | Critical mineral (other) | 10% of cost | $ cost | §45X(b)(2) |

---

## Calculation Logic

### Step 1 — Per-component credit
For each component entry:
`credit = quantity × (credit_rate_override ?? CREDIT_RATES[component_type])`
Critical minerals: `credit = production_cost × 0.10`
Source: IRC §45X(a)(1) — https://www.law.cornell.edu/uscode/text/26/45X

### Step 2 — Total credit
`total = Σ componentCredit(entries)`
Source: Form 7207 total line — https://www.irs.gov/pub/irs-pdf/i7207.pdf

### Step 3 — Route to general business credit
If total > 0, emit to Schedule 3 line 6z.
Source: Form 7207 Line 14 → Schedule 3 Line 6z → Form 3800 — https://www.irs.gov/pub/irs-pdf/i7207.pdf

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| line6z_general_business_credit | schedule3 | total credit > 0 | Form 7207 Line 14; Schedule 3 Line 6z | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf |

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Solar module credit rate | $0.07/W | IRC §45X(b)(1)(A); statutory (no CPI adj) | https://www.law.cornell.edu/uscode/text/26/45X |
| Solar cell / thin-film credit rate | $0.04/W | IRC §45X(b)(1)(B) | https://www.law.cornell.edu/uscode/text/26/45X |
| Wind blade credit rate | $0.02/W | IRC §45X(b)(1)(C)(i) | https://www.law.cornell.edu/uscode/text/26/45X |
| Wind nacelle credit rate | $0.05/W | IRC §45X(b)(1)(C)(ii) | https://www.law.cornell.edu/uscode/text/26/45X |
| Wind tower credit rate | $0.03/W | IRC §45X(b)(1)(C)(iii) | https://www.law.cornell.edu/uscode/text/26/45X |
| Wind offshore foundation credit rate | $0.04/W | IRC §45X(b)(1)(C)(iv) | https://www.law.cornell.edu/uscode/text/26/45X |
| Central inverter credit rate (>1MW) | $0.0025/W | IRC §45X(b)(1)(D)(i) | https://www.law.cornell.edu/uscode/text/26/45X |
| String inverter credit rate | $0.0015/W | IRC §45X(b)(1)(D)(ii) | https://www.law.cornell.edu/uscode/text/26/45X |
| Microinverter credit rate | $0.002/W | IRC §45X(b)(1)(D)(iii) | https://www.law.cornell.edu/uscode/text/26/45X |
| Gamut inverter credit rate | $0.0015/W | IRC §45X(b)(1)(D)(iv) | https://www.law.cornell.edu/uscode/text/26/45X |
| Battery module credit rate | $0.0035/Wh | IRC §45X(b)(1)(E) | https://www.law.cornell.edu/uscode/text/26/45X |
| Critical mineral credit rate | 10% of production cost | IRC §45X(b)(2) | https://www.law.cornell.edu/uscode/text/26/45X |
| Phase-down: 2030 | 75% of full rate | IRC §45X(b)(3)(A) | https://www.law.cornell.edu/uscode/text/26/45X |
| Phase-down: 2031 | 50% of full rate | IRC §45X(b)(3)(B) | https://www.law.cornell.edu/uscode/text/26/45X |
| Phase-down: 2032 | 25% of full rate | IRC §45X(b)(3)(C) | https://www.law.cornell.edu/uscode/text/26/45X |
| Phase-down: 2033+ | 0% (credit expires) | IRC §45X(b)(3)(D) | https://www.law.cornell.edu/uscode/text/26/45X |

---

## Data Flow Diagram

flowchart LR
  subgraph inputs["Data Entry"]
    comp["components[]<br/>component_type + quantity"]
  end
  subgraph node["f7207 (Adv. Mfg. Production Credit)"]
    cc["componentCredit()<br/>quantity × rate"]
    tc["totalCredit()<br/>sum all entries"]
  end
  subgraph outputs["Downstream Nodes"]
    s3["schedule3<br/>line6z_general_business_credit"]
  end
  comp --> cc --> tc --> s3

---

## Edge Cases & Special Rules

1. **Empty components**: If `components` is empty or undefined, total credit is 0 — no output emitted.
2. **Phase-down (2030–2032)**: Use `credit_rate_override` to apply the phased-down rate. TY2025 uses full rates; no override needed for TY2025.
3. **Domestic content requirement**: IRC §45X requires components to be produced in the US. The node does not enforce eligibility — preparer responsibility.
4. **Solar module vs. solar cell**: A manufacturer may claim either the solar module rate ($0.07/W) or the solar cell rate ($0.04/W) for the cells within a module, but not both (IRC §45X(b)(1)(A)–(B) anti-double-dipping rule).
5. **Wind nameplate vs. rated capacity**: Wind components use nameplate capacity (W) not rated output. Use the turbine's nameplate plate, not AC output.
6. **Battery Wh vs. kWh**: Quantity for battery_module is in Wh (not kWh). A 100 kWh system = 100,000 Wh.
7. **Critical minerals — production cost basis**: For `critical_mineral_other`, quantity represents the dollar value of production costs (not weight). Credit = 10% × costs.
8. **Related-party rule**: Sales to related parties may not qualify. Preparer responsibility.
9. **Non-refundable general business credit**: Excess credit carries back 1 year, forward 20 years per Form 3800 rules. Node only emits to Schedule 3.
10. **New in TY2025**: Final regulations TD 10024 (Jan 2025) clarify critical mineral definitions and domestic content tracking requirements.

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Form 7207 Instructions | 2024 | All | https://www.irs.gov/pub/irs-pdf/i7207.pdf | .research/docs/i7207.pdf |
| IRC §45X — Advanced Manufacturing Production Credit | current | §45X(a–c) | https://www.law.cornell.edu/uscode/text/26/45X | N/A |
| IRA §13502 (creating §45X) | 2022 | §13502 | https://www.congress.gov/bill/117th-congress/house-bill/5376/text | N/A |
| Final Regulations TD 10024 | 2025 | All | https://www.irs.gov/pub/irs-drop/td-10024.pdf | .research/docs/td-10024.pdf |
| Rev Proc 2024-40 (TY2025 inflation adjustments) | 2024 | §3 | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | .research/docs/rp-24-40.pdf |
