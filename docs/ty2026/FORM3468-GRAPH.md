# TY2026 Form 3468 investment-credit source and facility ledger

Snapshot: September 27, 2026. The IRS [product page](https://www.irs.gov/forms-pubs/about-form-3468)
currently serves [2025 Form 3468](corpus/authorities/f3468--2025.pdf)
and [2025 instructions](corpus/authorities/i3468--2025.pdf), pinned as
comparators with [321 PDF fields](pdf-fields-f3468.csv). No 2026 Form 3468
revision is pinned. [Notice 2026-15](corpus/authorities/n26-15--2026.pdf)
adds prohibited-foreign-entity/material-assistance guidance for applicable
energy credits. The IRS [September 2026 correction](https://www.irs.gov/forms-pubs/correction-to-the-2025-instructions-for-form-3468-of-the-applicability-of-the-35-rate-on-line-1c-in-part-iv-advanced-manufacturing-investment-credit-under-section-48d)
clarifies Part IV's 35% §48D rate for qualified property placed in service
after 2025, including a 2025 fiscal-year filer. Use this evidence to plan
the 2026 graph, then refresh final form/instructions and current MeF before
filing.

## Source ownership and order

Create a record per **property/facility/project**, not one aggregate credit
number. Carry owner/TIN, activity, investment basis, construction and
service dates, location/coordinates, IRS pre-filing registration, capacity,
technology, recapture history and any related credit claim. Determine
eligibility and required proof before applying a percentage. Shared data
with [Form 8835](FORM8826-8835-STATEMENTS.md), [Form 7207](GENERAL-BUSINESS-CREDIT-GRAPH.md),
[Form 7220](corpus/authorities/f7220--2025.pdf) and
[Schedule A (Form 3800)](corpus/authorities/f3800a--2025.pdf) needs the same
facility/credit identity so one benefit is not claimed twice.

| Printed 2025 comparator part | TY2026 calculation and filing decision |
| --- | --- |
| Part I | Property/facility type and location, registration, owner, construction/service dates, increased-credit, domestic content, energy community, low-income bonus, capacity and other qualifying answers. Derive these from evidence; retain PWA/7220 and certification statement links. |
| Part II §§48A/48B | Advanced coal and gasification credit and Form 3800 Part III line 1a. Preserve project allocation and service-year facts; verify 2026 availability. |
| Part III §48C | Advanced energy project basis, DOE allocation, PWA rate, pass-through amount and Form 3800 Part III line 1d. Validate the allocation; attach Form 7220 when required. |
| Part IV §48D | Advanced manufacturing facility investment, 25% for pre-2026 service and 35% otherwise under corrected instructions, cooperative amount and Form 3800 Part III line 1o. Keep the placed-service date distinct from tax-year start and record elective-payment evidence. |
| Part V §48E | Clean electricity facility and energy storage, base/increased rates, domestic/energy-community/low-income bonuses, subsidized financing, phaseout and Form 3800 Part III line 1v. Apply Notice 2026-15 PFE/material-assistance gates when construction dates make them relevant. |
| Part VI §48 | Geothermal, solar, fuel cell, microturbine, CHP, small wind, waste heat, geothermal heat pump, storage, biogas, microgrid, qualified facility and hydrogen property; complete the separate Section A–N calculations, bond reductions and Form 3800 Part III line 4a. Verify construction/service sunsets and PFE status per property. |
| Part VII §47 | Certified historic rehabilitation per building and owner, five-year credit distribution/related-party and recapture history, then Form 3800 Part III line 4k. |

For Parts III–VI, track the election of elective payment or transfer and
the amount retained for the return. A transfer needs the signed Form 3800
Schedule A and registration link; an elected payment needs the applicable
return and MeF evidence. Form 4255 recapture must be driven by the same
asset/credit ledger if disposition or a cessation event occurs. Feed the
**allowed** Form 3800 credit to Schedule 3 line 6a only after tax,
limitation, passive-credit and carryforward calculations.

## Current code boundary

The shared [`f3468` input](../../forms/f1040/nodes/inputs/f3468/index.ts)
has one flat basis number per selected technology, hard-coded TY2025 rates,
no facility or registration identity, no construction/service-date gates,
no DOE/bonus/PFE/bond/transfer/elective-payment ledger, and no printed
Part IV §48D calculation. It also treats rehabilitation as a single 20%
amount rather than a building-level five-year filing record. It emits its
aggregate directly to TY2025 Schedule 3 line 6a and has no TY2025 PDF/MeF
serializer in the inventories. This node is a computational lead, not a
TY2026 Form 3468 filing route.

## Build and acceptance

1. Obtain 2026 Form 3468/instructions and current MeF XSD/rules; diff each
   Part I–VII line, rate, election and attachment against the pinned 2025
   comparator and current IRS post-release updates. Record any 2026 PFE
   guidance changes after Notice 2026-15.
2. Introduce facility/project/asset records, derive the applicable credit
   section and source evidence, and calculate each printed line. Reconcile
   each section total to the distinct Form 3800 Part III row with origin
   year, passive status and election/transfer state.
3. Build complete multi-copy PDF and current `IRS3468` or successor MeF
   documents with Form 7220, domestic-content, certification, registration,
   transfer and other required binary/statement links. Verify current XSD
   order, cardinality and active rules before full-return ATS testing.
4. Test two facilities with different credit types, 2025/2026 service-date
   §48D rate, PWA qualification and failure, each bonus, bond reduction,
   PFE/material assistance, DOE allocation, elective payment, transfer,
   pass-through-only credit, passive limit, recapture and prior-year
   carryforward. Retain TY2025 regression cases.
