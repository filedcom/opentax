# f5695 Input — Form 5695 (Residential Energy Credits)

## Overview
Pass-through input node that collects taxpayer-entered cost data for residential energy property and passes it to the `form5695` intermediate node for credit computation. Captures costs for both:
- **Part I — Residential Clean Energy Credit (IRC §25D):** 30% credit, no dollar cap (except fuel cell), carries forward
- **Part II — Energy Efficient Home Improvement Credit (IRC §25C):** 30% credit, per-category annual caps, no carryforward

**IRS Form:** Form 5695
**Drake Screen:** `5695`
**Node Type:** input
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/kb/Drake-Tax/12298.htm

---

## Input Fields

### Part I — Residential Clean Energy Credit (IRC §25D)

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| solar_electric_cost | number (nonneg) | no | Form 5695 Line 1 | Qualified solar electric (photovoltaic) property costs | §25D(a)(1); Instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| solar_water_heater_cost | number (nonneg) | no | Form 5695 Line 2 | Solar water heating property costs (must be SRCC-certified; ≥50% solar energy) | §25D(a)(2); Instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| fuel_cell_cost | number (nonneg) | no | Form 5695 Line 8 | Qualified fuel cell property costs (main home only; ≥0.5 kW; >30% efficiency) | §25D(a)(5); Instructions p.3 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| fuel_cell_kw_capacity | number (nonneg) | no | Form 5695 Line 10 | Fuel cell kilowatt capacity — used to compute $500/½-kW dollar cap | §25D(b)(1); Form 5695 Line 10 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| small_wind_cost | number (nonneg) | no | Form 5695 Line 3 | Qualified small wind energy property costs (≤100 kW turbines) | §25D(a)(3); Instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| geothermal_cost | number (nonneg) | no | Form 5695 Line 4 | Qualified geothermal heat pump property costs (must meet Energy Star at time of purchase) | §25D(a)(4); Instructions p.3 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| battery_storage_cost | number (nonneg) | no | Form 5695 Line 5b | Qualified battery storage technology costs | §25D(d)(7); Instructions p.3 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| battery_storage_kwh_capacity | number (nonneg) | no | Form 5695 Line 5a (checkbox gated) | Battery storage capacity in kWh — must be ≥3 kWh to qualify; form5695 uses this to gate the credit | §25D(d)(7); Form 5695 Line 5a | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| prior_year_carryforward | number (nonneg) | no | Form 5695 Line 12 | Unused §25D credit carried forward from prior year | §25D(c); Instructions p.4 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |

### Part II — Energy Efficient Home Improvement Credit (IRC §25C)

| Field | Type | Required | Source / Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | -------------- | ----------- | ------------- | --- |
| insulation_cost | number (nonneg) | no | Form 5695 Line 18a | Insulation/air sealing material or system (must meet 2021 IECC) — annual cap $1,200 | §25C(c)(1); Instructions p.6 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| exterior_doors_cost | number (nonneg) | no | Form 5695 Lines 19a/19d/19e | Total cost of qualifying Energy Star-certified exterior doors — cap $250/door, $500 total | §25C(c)(2)(A); Instructions p.6 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| exterior_doors_count | integer (nonneg) | no | Form 5695 Lines 19a–19e | Number of qualifying exterior doors (used to apply per-door $250 cap correctly) | §25C(b)(3)(B); Instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| windows_cost | number (nonneg) | no | Form 5695 Lines 20a/20b | Cost of Energy Star-certified windows and skylights — annual cap $600 | §25C(c)(2)(B); Instructions p.6 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| central_ac_cost | number (nonneg) | no | Form 5695 Line 22a/22b | Central air conditioner costs (must meet highest CEE efficiency tier) — cap $600 | §25C(d)(1); Instructions p.6–7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| gas_water_heater_cost | number (nonneg) | no | Form 5695 Line 23a/23b | Natural gas, propane, or oil water heater costs (highest CEE tier) — cap $600 | §25C(d)(2); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| furnace_boiler_cost | number (nonneg) | no | Form 5695 Line 24a/24b | Gas/propane/oil furnace or hot water boiler costs (highest CEE tier) — cap $600 | §25C(d)(3); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| panelboard_cost | number (nonneg) | no | Form 5695 Line 25c | Enabling property (panelboards, subpanelboards, branch circuits, feeders ≥200 amp) — cap $600 | §25C(d)(5); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| heat_pump_cost | number (nonneg) | no | Form 5695 Lines 29a/29b | Electric or natural gas heat pump costs (highest CEE tier) — part of $2,000 combined cap | §25C(d)(4); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| heat_pump_water_heater_cost | number (nonneg) | no | Form 5695 Lines 29c/29d | Heat pump water heater costs (highest CEE tier) — part of $2,000 combined cap | §25C(d)(4); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| biomass_cost | number (nonneg) | no | Form 5695 Lines 29e/29f | Biomass stove or boiler costs (≥75% thermal efficiency HHV basis) — part of $2,000 combined cap | §25C(d)(6); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| energy_audit_cost | number (nonneg) | no | Form 5695 Line 26b | Home energy audit by Qualified Home Energy Auditor — cap $150 | §25C(b)(4); Instructions p.5 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |

---

## Calculation Logic

This is a **pass-through input node** — no credit calculations happen here. All fields are forwarded to `form5695` (intermediate node) which owns all credit computation logic.

### Step 1 — Validate input
Parse and validate all fields using Zod schema. All fields are optional and nonnegative. `exterior_doors_count` must be a nonneg integer.

### Step 2 — Forward to form5695
Build a fields object from defined input fields and emit a single output to `form5695`.

Source: CLAUDE.md — input nodes forward to intermediate nodes; intermediate nodes own calculation logic.

---

## Output Routing

| Output Field | Destination Node | Condition | IRS Reference | URL |
| ------------ | ---------------- | --------- | ------------- | --- |
| All defined input fields (pass-through) | form5695 | At least one cost field or prior_year_carryforward is defined | IRC §25C, §25D; Form 5695 | https://www.irs.gov/pub/irs-pdf/f5695.pdf |
| (none) | — | All fields undefined / empty input | — | — |

---

## Constants & Thresholds (Tax Year 2025)

All constants are statutory (not CPI-indexed). Rev Proc 2024-40 contains no §25C/§25D adjustments.

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| §25D credit rate | 30% | §25D(a); IRS Instructions p.2 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25D fuel cell cap | $500 per ½ kW (= $1,000/kW) | §25D(b)(1); Form 5695 Line 10 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25D battery storage minimum capacity | 3 kWh | §25D(d)(7); Form 5695 Line 5a | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25D termination | Dec 31, 2025 | §25D(g); Instructions p.1 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25D carryforward | Unlimited (year-by-year) | §25D(c); Instructions p.4 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C credit rate | 30% | §25C(a) as amended by IRA 2022 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C overall annual cap (non-heat-pump items) | $1,200 | §25C(b)(1)(A) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C per-item cap (AC, water heater, furnace, panelboard, windows) | $600 each | §25C(b)(1)(B); §25C(b)(3) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C exterior door cap (per door) | $250 | §25C(b)(3)(B)(i) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C exterior door cap (all doors) | $500 total | §25C(b)(3)(B)(ii) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C heat pump + biomass combined cap | $2,000 | §25C(b)(2) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C home energy audit cap | $150 | §25C(b)(4) | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C biomass minimum thermal efficiency | 75% (HHV) | §25C(d)(6); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C enabling property minimum amperage | 200 amps | §25C(d)(5); Instructions p.7 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C termination | Dec 31, 2025 | §25C(g) as amended by IRA 2022 | https://www.irs.gov/pub/irs-pdf/i5695.pdf |
| §25C no carryforward | $0 (credit lost if unused) | §25C(b)(1) provides only an annual dollar limit; unlike §25D(c), §25C contains no carryforward provision | https://www.irs.gov/pub/irs-pdf/i5695.pdf |

---

## Data Flow Diagram

```
flowchart LR
  subgraph inputs["Data Entry (Taxpayer)"]
    A[solar_electric_cost\nsolar_water_heater_cost\nfuel_cell_cost\nfuel_cell_kw_capacity\nsmall_wind_cost\ngeothermal_cost\nbattery_storage_cost\nprior_year_carryforward]
    B[insulation_cost\nexterior_doors_cost\nexterior_doors_count\nwindows_cost\ncentral_ac_cost\ngas_water_heater_cost\nfurnace_boiler_cost\npanelboard_cost\nheat_pump_cost\nheat_pump_water_heater_cost\nbiomass_cost\nenergy_audit_cost]
  end
  subgraph node["f5695 (input)"]
    C[pass-through\nno computation]
  end
  subgraph outputs["Downstream"]
    D[form5695\nintermediate node]
  end
  A --> C
  B --> C
  C -->|all defined fields| D
```

---

## Edge Cases & Special Rules

1. **Fuel cell kW capacity cap:** The §25D credit for fuel cell property is capped at `kW_capacity × $1,000` (i.e., $500 per ½ kW). `fuel_cell_kw_capacity` must be provided alongside `fuel_cell_cost` for the cap to be applied correctly in form5695.

2. **Battery storage 3 kWh threshold:** Battery storage costs only qualify if the battery has ≥3 kWh capacity. The input node captures the cost but the ≥3 kWh eligibility check is enforced in form5695 (or ideally via a `battery_storage_qualifies` flag — see gap note below).

3. **HVAC split into separate caps:** §25C applies separate $600 caps to central AC, gas/oil water heaters, and gas/oil furnaces/boilers. The original implementation had a single `hvac_cost` field — the updated schema splits these into `central_ac_cost`, `gas_water_heater_cost`, and `furnace_boiler_cost`.

4. **Heat pump vs. gas water heater:** Heat pump water heaters fall under the $2,000 combined heat-pump/biomass cap (§25C(b)(2)); gas/oil water heaters fall under the $600 per-item cap (§25C(b)(1)). Must be separate fields.

5. **Enabling property (panelboard):** Only qualifies if installed to enable a separate qualifying §25C improvement in the same year (or prior year under consecutive-year safe harbor). The input node captures the cost; form5695 enforces the condition.

6. **Exterior doors count:** The per-door cap of $250 (max $500 total) requires knowing whether costs are for 1, 2, or 3+ doors. `exterior_doors_count` is needed to compute per-door allocation correctly.

7. **All fields optional:** A taxpayer may have only Part I costs, only Part II costs, or both. Empty input (no fields provided) should produce no output.

8. **Prior year carryforward:** Only applies to §25D (Part I). There is no carryforward for §25C (Part II).

9. **Subsidized financing:** Federal/state/local energy subsidies reduce the qualifying cost basis before computing either credit (§25C(g)(2); §25D(e)(1); Instructions p.2 "Subsidized Energy Financing"). Not modeled at the input node level.

---

## Implementation Gap: Schema Update Needed

The current `index.ts` has a simplified schema that should be updated to match the above:

| Current field | Issue | Should be |
|---|---|---|
| `hvac_cost` | Lumps AC + furnace + heat pump (different caps) | Split into `central_ac_cost`, `gas_water_heater_cost`, `furnace_boiler_cost`, `heat_pump_cost`, `heat_pump_water_heater_cost` |
| `water_heater_cost` | Lumps gas water heater + heat pump water heater (different caps) | Split into `gas_water_heater_cost` and `heat_pump_water_heater_cost` |
| missing | No fuel cell kW capacity field | Add `fuel_cell_kw_capacity` |
| missing | No panelboard/enabling property field | Add `panelboard_cost` |
| missing | No prior year carryforward | Add `prior_year_carryforward` |
| missing | No heat pump cost (separate from water heater) | Add `heat_pump_cost` |

---

## Sources

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| IRS Form 5695 | 2025 | All | https://www.irs.gov/pub/irs-pdf/f5695.pdf | .research/docs/f5695.pdf |
| IRS Instructions for Form 5695 | 2025 (pub. Jan 22, 2026) | All | https://www.irs.gov/pub/irs-pdf/i5695.pdf | .research/docs/i5695.pdf |
| Schedule 3 (Form 1040) | 2025 | Lines 5a, 5b | https://www.irs.gov/pub/irs-pdf/f1040s3.pdf | .research/docs/f1040s3.pdf |
| Drake KB — Form 5695 Residential Energy Credits | 2024 | Screen 5695 | https://kb.drakesoftware.com/kb/Drake-Tax/12298.htm | N/A |
| IRC §25C (as amended by IRA 2022) | 2022– | All | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section25C | N/A |
| IRC §25D | 2022– | All | https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section25D | N/A |
| Rev Proc 2024-40 | 2024 | N/A (no §25C/§25D constants) | https://www.irs.gov/irb/2024-45_IRB | N/A |
