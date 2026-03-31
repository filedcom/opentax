# f5695 (Form 5695) — Scratchpad

## Purpose
Input node that collects taxpayer-entered cost data for residential energy credits and passes it
unchanged to the `form5695` intermediate node for all credit computation.

## Architecture — two-node split
- **f5695 (this node, input)**: Pure pass-through. Validates nonnegative costs and routes every
  field verbatim to `form5695`. No credit math here.
- **form5695 (intermediate)**: Owns all credit computation. Applies §25C and §25D rates, dollar
  caps, and sub-limits. Emits `line5_residential_energy` to Schedule 3.

## Fields confirmed (from index.ts)
### Part I — Residential Clean Energy Credit (IRC §25D)
- solar_electric_cost (§25D(a)(1)) — solar electric panels
- solar_water_heater_cost (§25D(a)(2)) — solar water heating
- fuel_cell_cost (§25D(a)(3)) — fuel cell property
- small_wind_cost (§25D(a)(4)) — small wind energy
- geothermal_cost (§25D(a)(5)) — geothermal heat pumps
- battery_storage_cost (§25D(a)(7)) — battery storage (added by IRA 2022, effective TY2023+)

### Part II — Energy Efficient Home Improvement Credit (IRC §25C)
- windows_cost (§25C(a)(1)(A)) — windows/skylights; $600 sub-limit
- exterior_doors_cost (§25C(a)(1)(B)) — exterior doors; $250/door, $500 total
- exterior_doors_count — integer count; needed for per-door $250 cap
- insulation_cost (§25C(a)(1)(C)) — insulation/air sealing; no sub-limit (only annual cap)
- hvac_cost (§25C(a)(2)) — central A/C, heat pumps; $600 combined with water heaters
- water_heater_cost (§25C(a)(2)) — water heaters; combined with HVAC in $600 sub-limit
- biomass_cost (§25C(a)(2)) — biomass stoves/boilers; $2,000 separate sub-limit, NOT in $1,200 cap
- energy_audit_cost (§25C(a)(3)) — home energy audits; $150 sub-limit

## Routing
- All 14 fields pass to form5695 (intermediate)
- form5695 → Schedule 3 line 5 (line5_residential_energy)

## TY2025 Constants (from form5695/index.ts)
- Part I rate: 30% (§25D), no annual dollar cap
- Part II rate: 30% (§25C post-IRA 2022)
- Part II annual cap: $1,200 (windows + doors + insulation + HVAC/WH + audit combined)
- Windows/skylights sub-limit: $600
- Doors per-door sub-limit: $250; total doors cap: $500
- HVAC + water heater combined sub-limit: $600
- Biomass sub-limit: $2,000 (exempt from $1,200 annual cap)
- Energy audit sub-limit: $150

## Open Questions — RESOLVED
- [x] Q: Drake screen code for Form 5695? → screens.json confirms: "5695"
- [x] Q: What fields does this node capture? → All 14 listed above
- [x] Q: Where does each field flow? → All to form5695 (intermediate)
- [x] Q: TY2025 constants? → Form5695 intermediate node has all of them
- [x] Q: Dollar caps per category for Part II (§25C)? → Confirmed above
- [x] Q: Battery storage treatment for TY2025? → Treated same as other Part I costs; IRA 2022 added §25D(a)(7), effective for property placed in service after 12/31/2022

## Sources used
- forms/f1040/nodes/inputs/f5695/index.ts (implementation, all fields and schema)
- forms/f1040/nodes/intermediate/form5695/index.ts (all constants, caps, and routing)
- forms/f1040/nodes/inputs/f5695/index.test.ts (routing tests)
- forms/f1040/nodes/inputs/screens.json (Drake screen code = "5695")
- forms/f1040/nodes/intermediate/schedule3/index.ts (confirms line5_residential_energy target)
