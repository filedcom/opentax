# Form 5695 (Intermediate) — Residential Energy Credits

## Purpose
Intermediate node that aggregates Part I (Residential Clean Energy Credit, §25D) and Part II (Energy Efficient Home Improvement Credit, §25C) and routes the total to **Schedule 3 line 5**.

## IRS References
- Form 5695 and Instructions (TY2025)
- IRC §25C — Energy Efficient Home Improvement Credit
- IRC §25D — Residential Clean Energy Credit
- Rev. Proc. 2024-40

## TY2025 Constants

### Part I — §25D (Residential Clean Energy)
- Credit rate: **30%**
- Fuel cell cap: **$1,000/kW** capacity (§25D(b)(1))
- Battery storage minimum capacity: **3 kWh** (§25D(d)(7))

### Part II — §25C (Energy Efficient Home Improvement)
- Credit rate: **30%**
- Annual cap (standard items): **$1,200**
- Per-item cap (windows, central AC, gas WH, furnace, panelboard): **$600**
- Exterior doors: **$250/door**, max **$500** total
- Energy audit: **$150** cap
- Heat pump + heat pump WH + biomass combined: **$2,000** cap (separate from $1,200)

## Input Schema
Part I fields: `solar_electric_cost`, `solar_water_heater_cost`, `fuel_cell_cost`, `fuel_cell_kw_capacity`, `fuel_cell_home_in_us`, `fuel_cell_home_address`, `fuel_cell_joint_occupancy`, `small_wind_cost`, `geothermal_cost`, `battery_storage_cost`, `battery_storage_kwh_capacity`, `prior_year_carryforward`, `part_i_home_address`, `part_i_tax_limit`

Part II fields: `windows_cost`, `exterior_doors_cost`, `exterior_doors_count`, `insulation_cost`, `central_ac_cost`, `gas_water_heater_cost`, `furnace_boiler_cost`, `panelboard_cost`, `heat_pump_cost`, `heat_pump_water_heater_cost`, `biomass_cost`, `energy_audit_cost`, `part_ii_tax_limit`

For MeF Section A, use `part_ii_section_a` with explicit eligibility answers, a main-home address, and per-door/per-window `{ cost, qmid }` entries. This path calculates line 19c separately from lines 19d-19g, then applies the $500 line 19h limit. The old flat cost fields remain temporarily for the PDF path and are rejected by MeF. More than three doors or four windows produce an `AdditionalQMIDStatement.pdf` in `buildMefBundle`; XML-only output rejects those claims.

For MeF Section B, use `part_ii_section_b` with explicit line 21a/21b answers, one to four home addresses, and QMID/cost pairs for central AC, water heaters, furnace/boiler, heat pump, heat pump water heater, and biomass stove/boiler. The single-item fields hold the first unit; `other_central_air_conditioners`, `other_furnaces_or_boilers`, `other_heat_pumps`, `other_heat_pump_water_heaters`, and `other_biomass_stoves_or_boilers` hold additional units, while `water_heaters` holds all units. The exporter selects the most expensive QMID rows, reports the remaining costs on lines 22b, 23b, 24b, 29b, 29d, and 29f, and includes each remaining QMID/cost in `AdditionalQMIDStatement.pdf` through `buildMefBundle`. XML-only output rejects claims requiring that PDF. The panelboard entry requires cost, one or two QMIDs, enabled-property codes, installation years, and explicit 200-amp/NEC and qualification assertions. Current-year enabled-property codes must match property in the same claim. A qualifying home energy audit uses the separate `part_ii_energy_audit` entry and can stand alone without line 21 property answers. Flat Section B totals remain temporarily for the PDF path and are rejected by MeF.

## Compute Logic
### Part I
- Battery: disqualified if `kwh_capacity < 3`
- Fuel cell: require explicit main-home address and occupancy answer, require capacity of at least 0.5 kW in half-kW increments, then compute `min(cost × 30%, kwCapacity × $1,000)`
- Other items: `cost × 30%`
- Add prior-year carryforward
- Limit each part separately to its explicit tax-liability worksheet result; missing limits are rejected for positive credits

### Part II
- Standard items each capped individually, then sum capped at $1,200
- Heat pump + heat pump WH + biomass combined, capped at $2,000 (independent of $1,200 cap)
- Total Part II = capped standard + heat pump/biomass

### Final
`partI` → `schedule3.line5a_residential_clean_energy`; `partII` → `schedule3.line5b_energy_efficient_home`. Schedule 3 adds both to the Form 1040 nonrefundable credit total.

## Output Nodes
- `schedule3` (lines 5a and 5b)

## Key Design Notes
- This is the **intermediate** form5695 node (aggregates from input f5695 node data).
- The $2,000 heat pump/biomass cap is **additive** to the $1,200 standard cap.
- `exterior_doors_count` used to compute `count × $250` per-door cap before applying $500 total cap.
