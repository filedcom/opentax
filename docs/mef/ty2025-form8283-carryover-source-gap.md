# TY2025 Form 8283 prior-year carryover attachment

The [December 2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
require a completed copy of the previous year's Form 8283 with a current-year
noncash carryover claim, plus a copy of any appraisal that had to accompany
the previous return. They require a separate Form 8283 for each carried gift.
The current Schedule A `capital_gain_property_carryovers` ledger contains
amounts and gift IDs, not those completed prior documents.

`forms/f1040/2025/mef/forms/f8283_carryover_evidence.ts` enforces one narrow
proof contract for a publicly traded securities gift whose previous-year copy
was completed in Section A, whose similar-item total and FMV were no more than
$5,000, and for which no appraisal was required with the 2024 return. It
matches the donation year, gift ID, FMV, basis, prior deductions and taxpayer
against the Schedule A carryover ledger, then requires the exact reviewed PDF
SHA-256, binary-attachment description and MeF document ID. It also records
the reviewer's name/date and the referenced filed 2024 return/workpaper. The
review contract now requires the prior form's donated-property description,
donee address, acquisition and contribution dates, purchase acquisition
method, and valuation method so the native Section A document is not
built from amounts alone. For this purchased-stock capital-gain category, the
acquisition and contribution dates must also establish a holding period of
more than one year, following [2025 Publication 526](https://www.irs.gov/publications/p526).
The retained prior-year PDF description now includes its unique attachment
filename, so two carried gifts can each have an independently identified binary
attachment without weakening the bundle's duplicate-description check.

The public `f8283` input now accepts this reviewed carryover evidence directly.
For one or more distinct purchased, long-held publicly traded securities gifts
with positive refigured carryovers, the MeF path joins every evidence row to
one distinct Schedule A capital-gain carryover row and the actual filer SSN.
It requires distinct gift IDs, prior PDF file names and SHA-256 digests, and
rejects missing or extra Schedule A rows. It requires the 2025 50%
capital-gain election, a complete empty current noncash inventory, no other
prior charitable carryover, itemizing on Form 1040, and a recomputation of
Schedule A lines 11-13 and the itemized total. Each carryover-year electronic
`IRS8283` Section A records the original donee, property, purchase and gift
dates, basis, and valuation method. Its column (h) uses the elected basis
rather than unreduced FMV, and a separate native `FairMarketValueStatement`
explains the original FMV and long-term appreciation removed. Each native form
links its own exact reviewed 2024 completed Form 8283 PDF as a `BinaryAttachment`.
The TY2025 v5.4 `ReturnData1040.xsd` permits unbounded `IRS8283` instances.
The Schedule A and Form 8283 MeF descriptors independently require the same
source and attachment join in the linked pass. Bounded Form 8283 and Schedule A
PDF previews also use the same source reconciliation, including the real filer
identity through their existing instance hooks; they emit one preview page per
carried gift. On 2026-09-29, the five single/multiple-gift route cases and
three evidence cases passed, including the two-attachment return.

This is a wired bounded export route, not verified filing readiness. The code
checks the PDF's SHA-256 and a named human review, but does not parse its
canonical fields or authenticate that the 2024 form was actually filed and
complete. The filed 2024 return and prior deduction workpaper are referenced
assertions. Source values and the PDF must be independently inspected before
use. Section B, required appraisals, pass-through gifts, special carryover
histories, mixed current-year gifts, additional e-file business
rules, and ATS acceptance remain open. The single full test batch, generated
XML XSD validation, and filled-PDF visual check have not run.
