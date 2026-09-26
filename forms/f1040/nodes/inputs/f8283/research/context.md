# Form 8283, TY2025

The authoritative source for this implementation is the
[2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283) and the
local TY2025v5.4 `IRS8283.xsd`. This file describes the current build pass, not
verified IRS acceptance.

## Calculation and document model

- Section A currently sends reported FMV to Schedule A line 12 for nonvehicle
  gifts. For vehicles, it sends `deduction_claimed` when supplied. A vehicle
  claimed above $500 requires the donee's certified unrelated-party sale facts,
  a contribution and sale date, a VIN, and a claimed amount no greater than FMV
  or gross sale proceeds. This covers only the gross-sale-proceeds route, not
  significant use, material improvement, needy-individual, or other special
  routes. Ordinary-income-property reductions and AGI ceilings still need
  source-level calculation.
- Section B requires separate `fmv` and `deduction_claimed` values. The
  calculation sends the claimed value to Schedule A line 12. Capital-gain
  property is **not** automatically capped at basis. FMV is usually available,
  but specific reductions and percentage limits can apply.
- Ordinary Section B gifts with more than $5,000 claimed now emit one `IRS8283`
  document per property with its property type, acquisition facts,
  qualified-appraiser declaration, and signed donee acknowledgment facts. The
  appraisal itself is generally retained, not attached. The model rejects
  high-value art, Section B vehicles, and gifts above $500,000 until their
  attachment requirements are implemented. Section A vehicles claimed at $500 or
  less can include their VIN without a sale acknowledgment. For higher Section A
  vehicle claims on the sale-proceeds route, a separate native MeF
  `ContriVehicleBoatAirplaneStmt` is generated from the donee facts and linked
  to the Form 8283 row. This structured statement is not verified as a
  substitute for attaching the actual donee-provided Form 1098-C or written
  acknowledgment.
- The serializer uses an array result for every call so one input can produce an
  optional Section A document and multiple Section B documents without a dual
  return shape.

## Open correctness gates

1. Confirm each contribution's allowed deduction, including ordinary-income
   property reductions and 2025 Schedule A AGI limits, before totaling line 12.
2. Verify whether IRS business rules require the actual donee-issued Form 1098-C
   or written acknowledgment as a binary attachment in addition to the native
   vehicle statement. Build that attachment path if required, and cover the
   other vehicle certification routes and Section B vehicles.
3. Build required appraisal, photograph, and special statements for high-value
   art, gifts over $500,000, certain clothing/household items, conservation
   easements, and pass-through contributions.
4. Add PDF field mapping and verify document signatures/receipt facts.
5. Run the requested full test batch, including the new Section B and vehicle
   statement local XSD cases, then resolve failures and rerun the complete
   batch.

The [IRS instructions](https://www.irs.gov/instructions/i8283) explain the
general FMV rule and exceptions for capital-gain property, Section B separate
form requirements, and when a signed appraisal or other attachment must be
submitted with the return.
