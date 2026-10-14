# Form 3468 — Investment Credit: Implementation Context

## Overview
Form 3468 collects investment credit data from taxpayers. All credit components route to Schedule 3, Line 6z (General Business Credit). This is a singleton input node.

## Credit Components & Schema Fields

### Part I — §47 Rehabilitation Credit
| Field | Description | Rate |
|---|---|---|
| `rehab_certified_historic_qre` | QREs for certified historic structures | 20% |

### Part II — §48 Energy Credit
| Field | Description | Rate | Cap |
|---|---|---|---|
| `solar_energy_property_basis` | Solar energy (PV) property cost basis | 30% | none |
| `fiber_optic_solar_basis` | Fiber optic solar energy property | 30% | none |
| `fuel_cell_property_basis` | Fuel cell property cost basis | 30% | none |
| `fuel_cell_capacity_kw` | Fuel cell capacity in kW (for cap calculation) | — | $1,500/0.5kW |
| `microturbine_property_basis` | Microturbine property cost basis | 10% | none |
| `microturbine_capacity_kw` | Microturbine capacity in kW (for cap calculation) | — | $200/kW |
| `small_wind_property_basis` | Small wind energy property | 30% | none |
| `geothermal_heat_pump_basis` | Geothermal heat pump property | 10% | none |
| `chp_property_basis` | Combined heat and power property | 10% | none |
| `waste_energy_recovery_basis` | Waste energy recovery property | 20% | none |
| `offshore_wind_basis` | Offshore wind facility property | 30% | none |

### Part V — §48C Advanced Energy Project Credit
| Field | Description | Rate |
|---|---|---|
| `advanced_energy_project_basis` | Qualified investment (DOE allocation required) | 30% |
| `advanced_energy_project_has_doe_allocation` | Boolean: DOE allocation confirmed | — |

### Part VI — §48E Clean Electricity Investment Credit
| Field | Description | Rate |
|---|---|---|
| `clean_electricity_basis` | Qualified investment in clean electricity property | 30% |

## Computation Rules

### §47 Rehabilitation Credit
```
credit = rehab_certified_historic_qre × 0.20
```

### §48 Energy Credit — Per Component
```
solar_credit          = solar_energy_property_basis × 0.30
fiber_optic_credit    = fiber_optic_solar_basis × 0.30
fuel_cell_credit      = min(fuel_cell_property_basis × 0.30, fuel_cell_capacity_kw / 0.5 × 1500)
microturbine_credit   = min(microturbine_property_basis × 0.10, microturbine_capacity_kw × 200)
small_wind_credit     = small_wind_property_basis × 0.30
geothermal_credit     = geothermal_heat_pump_basis × 0.10
chp_credit            = chp_property_basis × 0.10
waste_energy_credit   = waste_energy_recovery_basis × 0.20
offshore_wind_credit  = offshore_wind_basis × 0.30
```

Note: If capacity field is absent for fuel cell or microturbine, no cap is applied (cap = Infinity).

### §48C Advanced Energy Project
```
credit = advanced_energy_project_has_doe_allocation ? advanced_energy_project_basis × 0.30 : 0
```

### §48E Clean Electricity
```
credit = clean_electricity_basis × 0.30
```

### Total Investment Credit
```
total = sum of all component credits
```
Routes to: `schedule3.line6z_general_business_credit`

## Edge Cases
1. All fields optional — if all absent/zero, no output produced
2. Fuel cell cap: if `fuel_cell_capacity_kw` not provided, apply rate only (no cap)
3. Microturbine cap: if `microturbine_capacity_kw` not provided, apply rate only (no cap)
4. §48C: if `advanced_energy_project_has_doe_allocation` is false or absent, credit = 0
5. Total = 0 → no schedule3 output
6. Each field independently optional; only present/nonzero values contribute

## Routing
- Single output: `schedule3` with `line6z_general_business_credit = total_credit`
- No output if total credit = 0

## TY2025 Constants
```
REHAB_HISTORIC_RATE       = 0.20
SOLAR_RATE                = 0.30
FIBER_OPTIC_SOLAR_RATE    = 0.30
FUEL_CELL_RATE            = 0.30
FUEL_CELL_CAP_PER_HALF_KW = 1500   // $1,500 per 0.5 kW
MICROTURBINE_RATE         = 0.10
MICROTURBINE_CAP_PER_KW   = 200    // $200 per kW
SMALL_WIND_RATE           = 0.30
GEOTHERMAL_HEAT_PUMP_RATE = 0.10
CHP_RATE                  = 0.10
WASTE_ENERGY_RATE         = 0.20
OFFSHORE_WIND_RATE        = 0.30
ADVANCED_ENERGY_RATE      = 0.30
CLEAN_ELECTRICITY_RATE    = 0.30
```
