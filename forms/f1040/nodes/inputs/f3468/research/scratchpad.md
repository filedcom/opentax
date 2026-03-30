# Form 3468 Research Scratchpad

## IRS Form 3468 — Investment Credit (TY2025)

### Statutory Authority
- §47 Rehabilitation Credit
- §48 Energy Credit
- §48C Advanced Energy Project Credit
- §48E Clean Electricity Investment Credit (new post-IRA)

### §47 Rehabilitation Credit
- 20% of qualified rehabilitation expenditures (QREs) for certified historic structures
- Pre-1936 non-historic buildings: 10% rate was repealed by TCJA 2017; not available TY2025
- Certified historic structure = listed on National Register or in certified historic district
- QREs must be "substantial rehabilitation" (exceed greater of $5,000 or adjusted basis)
- Credit claimed over 5-year period (20% per year) under TY2025 rules
- NOTE: For TY2025, the 20% credit is for certified historic structures only; the 10% pre-1936 credit was eliminated

### §48 Energy Credit — TY2025 Rates (post-IRA Inflation Reduction Act)
- Solar energy property (PV): 30% base (may be 6% if prevailing wage/apprenticeship not met on large projects, but for individuals/small projects: 30%)
- Solar illumination/fiber optic solar energy: 30%
- Fuel cell property: 30% (max $1,500 per 0.5 kW of capacity)
- Microturbine property: 10% (max $200 per kW)
- Small wind property (≤100 kW): 30%
- Geothermal heat pump: 10% (base) — 30% if meets energy efficiency requirements
- Combined heat and power (CHP): 10%
- Waste energy recovery property: 20%
- Offshore wind: 30%
- Electrochromic glass: 6% base

### §48C Advanced Energy Project Credit
- 30% of qualified investment in advanced energy property
- Requires DOE certification/allocation
- Includes re-equipping/expanding manufacturing of clean energy components
- Must be allocated under Treasury program

### §48E Clean Electricity Investment Credit
- For energy storage technology and qualified facilities with zero GHG emissions
- 6% base rate (30% if prevailing wage + apprenticeship requirements met)
- Applies to property placed in service after Dec 31, 2024
- Includes standalone energy storage, qualified offshore wind, solar, etc.

### All Credits Route To
- Schedule 3, Line 6z (General Business Credit)

### Key Rules
1. Fuel cell capacity cap: $1,500 per 0.5 kW installed capacity
2. Microturbine cap: $200 per kW of capacity
3. §47 credit is for the QRE amount × rate; claimed ratably over 5 years
4. §48C requires prior DOE allocation — without it, credit is $0
5. All amounts are non-negative dollar inputs
6. Empty inputs → no output (no credit claimed)

### Drake KB Notes
- Drake screen code: 3468
- Input fields map directly to Form 3468 Part I (§47), Part II (§48), Part VI (§48C), Part V (§48E)
- Drake computes the credit; our node collects the raw expenditures/investments

### TY2025 Confirmed Rates
| Property Type | Rate | Cap |
|---|---|---|
| Certified historic rehab (§47) | 20% | none |
| Solar PV (§48) | 30% | none |
| Fiber optic solar (§48) | 30% | none |
| Fuel cell (§48) | 30% | $1,500/0.5kW |
| Microturbine (§48) | 10% | $200/kW |
| Small wind (§48) | 30% | none |
| Geothermal heat pump (§48) | 10% | none |
| CHP (§48) | 10% | none |
| Waste energy recovery (§48) | 20% | none |
| Offshore wind (§48) | 30% | none |
| §48C advanced energy | 30% | none (DOE alloc req'd) |
| §48E clean electricity | 30% | none (PW+A req'd for 30%) |
