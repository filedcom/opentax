# Form 8283, TY2025

The authoritative source for this implementation is the
[2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283) and the
local TY2025v5.4 `IRS8283.xsd`. This file describes the current build pass, not
verified IRS acceptance.

## Calculation and document model

- Section A currently sends reported FMV to Schedule A line 12 for nonvehicle
  gifts. For vehicles, it sends `deduction_claimed` when supplied. A vehicle
  claimed above $500 requires the donee's certified facts, a contribution date,
  a VIN, and a claimed amount within the supported sale-proceeds or needy-person
  transfer route. Significant use, material improvement, and other special
  routes remain unsupported. Ordinary-income-property reductions and AGI
  ceilings still need source-level calculation.
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
  vehicle claims on the supported sale-proceeds and needy-person transfer
  routes, a separate native MeF `ContriVehicleBoatAirplaneStmt` is generated
  from the donee facts and linked to the Form 8283 row. The actual donee-issued
  Form 1098-C or equivalent contemporaneous written acknowledgment must also
  be supplied as a PDF `BinaryAttachment` linked to `IRS8283`. The IRS 2025
  instructions explicitly require the copy for vehicle deductions above $500;
  the structured statement is supplemental, not a replacement. The local
  TY2025v5.4 `IRS8283.xsd` permits the binary reference on the form document.
- The serializer uses an array result for every call so one input can produce an
  optional Section A document and multiple Section B documents without a dual
  return shape.

## Open correctness gates

1. Confirm each contribution's allowed deduction, including ordinary-income
   property reductions and 2025 Schedule A AGI limits, before totaling line 12.
2. Cover the other vehicle certification routes and Section B vehicles. The
   donee-issued acknowledgment attachment path for supported Section A routes
   is implemented, but local code cannot authenticate PDF provenance or certify
   that a user-supplied copy matches the donee's original.
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
