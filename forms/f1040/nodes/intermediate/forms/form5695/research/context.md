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
Part I fields: `solar_electric_cost`, `solar_water_heater_cost`, `fuel_cell_cost`, `fuel_cell_kw_capacity`, `small_wind_cost`, `geothermal_cost`, `battery_storage_cost`, `battery_storage_kwh_capacity`, `prior_year_carryforward`

Part II fields: `windows_cost`, `exterior_doors_cost`, `exterior_doors_count`, `insulation_cost`, `central_ac_cost`, `gas_water_heater_cost`, `furnace_boiler_cost`, `panelboard_cost`, `heat_pump_cost`, `heat_pump_water_heater_cost`, `biomass_cost`, `energy_audit_cost`

## Compute Logic
### Part I
- Battery: disqualified if `kwh_capacity < 3`
- Fuel cell: `min(cost × 30%, kwCapacity × $1,000)`
- Other items: `cost × 30%`
- Add prior-year carryforward

### Part II
- Standard items each capped individually, then sum capped at $1,200
- Heat pump + heat pump WH + biomass combined, capped at $2,000 (independent of $1,200 cap)
- Total Part II = capped standard + heat pump/biomass

### Final
`total = partI + partII` → `schedule3.line5_residential_energy`

## Output Nodes
- `schedule3` (line 5)

## Key Design Notes
- This is the **intermediate** form5695 node (aggregates from input f5695 node data).
- The $2,000 heat pump/biomass cap is **additive** to the $1,200 standard cap.
- `exterior_doors_count` used to compute `count × $250` per-door cap before applying $500 total cap.
