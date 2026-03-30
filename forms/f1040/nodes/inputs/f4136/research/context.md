# Form 4136 — Credit for Federal Tax Paid on Fuels

## Overview
- **Form**: 4136
- **IRC**: §§ 6421, 6427
- **Purpose**: Credit for federal excise tax paid on fuels used for qualifying purposes
- **Type**: Input singleton (one form per return)
- **Drake screen**: 4136

## TY2025 Credit Rates

| Fuel Type | Use Purpose | Rate (per gallon) | Refundable? |
|-----------|-------------|-------------------|-------------|
| Gasoline | Off-highway business | $0.184 | No |
| Gasoline | Farming | $0.184 | Yes |
| Diesel | Off-highway business | $0.244 | No |
| Diesel | Farming | $0.244 | Yes |
| Aviation gasoline | Non-commercial aviation | $0.194 | No |
| Aviation gasoline | Farming | $0.194 | Yes |
| Kerosene | Off-highway business | $0.244 | No |
| Kerosene | Farming | $0.244 | Yes |
| Kerosene (aviation) | Non-commercial aviation | $0.219 | No |
| LPG (liquefied petroleum gas) | Off-highway business | $0.183 | No |
| CNG (compressed natural gas) | Off-highway business | $0.183 | No |

## Routing Rules

### Nonrefundable Credit
- Uses: off-highway business, non-commercial aviation
- Route: `schedule3.line6z_general_business_credit`

### Refundable Credit
- Uses: farming (all fuel types)
- Route: `f1040.line35_fuel_tax_credit` (new field needed)

## Schema Design

### Input fields (gallons by fuel type × use purpose)
```
gasoline_offhighway_gallons: number (≥0)
gasoline_farming_gallons: number (≥0)
diesel_offhighway_gallons: number (≥0)
diesel_farming_gallons: number (≥0)
aviation_gas_noncommercial_gallons: number (≥0)
aviation_gas_farming_gallons: number (≥0)
kerosene_offhighway_gallons: number (≥0)
kerosene_farming_gallons: number (≥0)
kerosene_aviation_gallons: number (≥0)
lpg_offhighway_gallons: number (≥0)
cng_offhighway_gallons: number (≥0)
```

## Output Nodes
- `schedule3` (nonrefundable credit → line6z_general_business_credit)
- `f1040` (refundable credit → line35_fuel_tax_credit)

## Validation Rules
- All gallon inputs must be nonnegative
- At least one gallon field must be nonzero (or all zero → no outputs)
- Credit amounts rounded to 2 decimal places

## Hard Rules
- Cannot claim credit for fuel used in highway vehicles (taxable use)
- Cannot claim commercial aviation kerosene credit here
- Farming use is REFUNDABLE regardless of tax liability
- Off-highway business use reduces tax liability but not below zero (nonrefundable)
