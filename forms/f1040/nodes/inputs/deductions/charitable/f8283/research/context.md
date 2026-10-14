# Form 8283, TY2025

The authoritative source for this implementation is the
[2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283) and the
local TY2025v5.4 `IRS8283.xsd`. This file describes the current build pass, not
verified IRS acceptance.

## Similar-item aggregation build pass (unverified)

The [2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283) define
similar items by general category or type (for example, books, clothing,
jewelry, paintings, or nonpublic stock), not by donee. Multiple positive gifts
now need an explicit `similar_item_group` source category on each item; the
software does not infer it from descriptions. Claimed values before AGI limits
aggregate case-insensitively across Section A, Section B, and all donees. A
group above $5,000 cannot leave a non-exempt item in Section A and requires
Section B qualified-appraisal facts. The separate per-item `IRS8283` documents
emitted by the current MeF builder also meet the distinct donee-document
requirement. Individual Section B items at or below $5,000 are allowed only when
their group exceeds $5,000. A supported Section B group above $500,000 now needs
one shared full appraisal PDF, an explicit statement that it covers all items,
and a binary link on every group document. The multi-donee and boundary cases
are written but unrun.

The declaration itself cannot authenticate that gifts really are similar, that
the PDF covers every item, or that appraiser/donee signatures are valid. Mixed
Section A exemption and ordinary Section B gifts above $500,000 are stopped
pending the exception's treatment. Art, conservation, public securities,
intellectual property, inventory, and other special routes remain outside this
bounded group implementation. A registered Form 8283 PDF descriptor now covers
up to four reconciled current-year Section A election gifts and one standalone
current-year Section B unimproved investment-land election. The Section B PDF
does not reproduce the separately supplied appraiser/donee signatures. Other
routes and filled-PDF visual validation remain open.

## Calculation and document model

- Section A now sends the source claimed amount, or FMV when no reduction is
  stated, with an explicit AGI-limit category to Schedule A. A vehicle claimed
  above $500 requires the donee's certified facts, a contribution date, a VIN,
  and a claimed amount within the supported sale-proceeds, needy-person
  transfer, significant-intervening-use, or material-improvement route. The
  three gross-proceeds exceptions use Section A only when the claimed deduction
  is at most $5,000; larger claims need Section B and a qualified appraisal.
  Ordinary-income-property reductions and AGI ceilings still need source-level
  calculation.
- The 2025 Form 8283 Section A instructions for column (h) require the reduced
  contribution amount, not the unreduced FMV, when the deduction is reduced
  below FMV. The native `IRS8283` now uses the source `deduction_claimed` for
  that column when supplied, including a sale-proceeds-capped vehicle, while
  retaining `fmv` separately for validation. The MeF `FairMarketValueAmt`
  references a separate native `FairMarketValueStatement` in the TY2025
  ReturnData sequence. It gives unreduced FMV, reduction arithmetic, and the
  reason. Certified unrelated-party sale proceeds supply the reason only when
  the claimed deduction exactly equals the lesser of FMV and those proceeds and
  sourced basis is at least FMV, so no appreciation reduction is also due; the
  other supported route is purchased ordinary-income property held no more than
  one year, with acquisition/contribution dates, basis below FMV, and a claimed
  deduction exactly equal to basis. The statement derives the short-term
  appreciation reduction under section 170(e)(1)(A). Voluntary underclaims,
  unverifiable tax classifications, combined vehicle-sale/ordinary-income
  reductions, and other reduction rules are rejected rather than accepted
  through free-text reasons. See the
  [2025 instructions, Section A column (h)](https://www.irs.gov/pub/irs-pdf/i8283.pdf).
- Section B requires separate `fmv` and `deduction_claimed` values. The
  calculation sends the claimed value to Schedule A line 12. Capital-gain
  property is **not** automatically capped at basis. FMV is usually available,
  but specific reductions and percentage limits can apply.
- Ordinary Section B gifts with more than $5,000 claimed now emit one `IRS8283`
  document per property with its property type, acquisition facts,
  qualified-appraiser declaration, and signed donee acknowledgment facts. The
  appraisal itself is generally retained, not attached. For a single-item
  deduction above $500,000, supported equipment, nonpublic securities,
  collectibles, and exception vehicles now require the full qualified appraisal
  as a separate PDF described with the IRS's `Qualified Appraisal` prefix. It
  links to that item's `IRS8283` alongside the signature PDFs. This is not a
  substitute for validating the appraisal's contents or grouping similar items
  across donees. High-value art, conservation/easement and other special
  property types remain stopped pending their extra evidence. A Section B
  vehicle using one of the three gross-proceeds exceptions now requires a
  qualified appraisal, appraiser and donee signature PDF references, a
  donee-issued Form 1098-C or equivalent acknowledgment PDF, and its native
  `ContriVehicleBoatAirplaneStmt`. The statement links to `PropertyInformation`;
  all three binaries link to that item's `IRS8283` document. Section A vehicles
  claimed at $500 or less can include their VIN without a sale acknowledgment.
  For higher Section A vehicle claims on all four supported certification
  routes, a separate native MeF `ContriVehicleBoatAirplaneStmt` is generated
  from the donee facts and linked to the Form 8283 row. The actual donee-issued
  Form 1098-C or equivalent contemporaneous written acknowledgment must also be
  supplied as a PDF `BinaryAttachment` linked to `IRS8283`. The IRS 2025
  instructions explicitly require the copy for vehicle deductions above $500;
  the structured statement is supplemental, not a replacement. The local
  TY2025v5.4 `IRS8283.xsd` permits the binary reference on the form document.
  The local statement schema has `CertifiesVehicleNotTrnsfrInd` for Form 1098-C
  box 5a and `CertifiesDetailedImprvDesc` for box 5c. The use route requires the
  donee's intended activity and duration, and the improvement route requires its
  intended major value-adding work without an additional donor payment. Both
  require the donee's no-transfer-before-completion certification and an
  acknowledgment furnished within 30 days of contribution. These are prospective
  donee certifications, not proof that the eventual work happened.
- The serializer uses an array result for every call so one input can produce an
  optional Section A document and multiple Section B documents without a dual
  return shape.

## Open correctness gates

1. Confirm each contribution's allowed deduction, including ordinary-income
   property reductions and 2025 Schedule A AGI limits, before totaling line 12.
2. Cover remaining special vehicle rules and complete Section B evidence review.
   The donee-issued acknowledgment attachment path for supported Section A and
   exception Section B routes is implemented, but local code cannot authenticate
   PDF provenance or certify that a user-supplied copy matches the donee's
   original.
3. Build required appraisal, photograph, and special statements for high-value
   art, aggregated similar-item gifts over $500,000, certain clothing/household
   items, conservation easements, and pass-through contributions. The supported
   high-value Securities path relies on the entered Section B property type; the
   source model does not independently verify that the security was nonpublicly
   traded.
4. Add PDF field mapping and verify document signatures/receipt facts.
5. Run the requested full test batch, including the new Section B and vehicle
   statement local XSD cases, then resolve failures and rerun the complete
   batch.

The [IRS instructions](https://www.irs.gov/instructions/i8283) explain the
general FMV rule and exceptions for capital-gain property, Section B separate
form requirements, and when a signed appraisal or other attachment must be
submitted with the return. The
[IRS TY2025 MeF PDF guide](https://www.irs.gov/pub/irs-schema/ty2025-recommended-names-and-descriptions-for-pdf-files-by-form.pdf)
recommends `QualifiedAppraisal.pdf` with a description beginning
`Qualified
Appraisal` for deductions above $500,000.
