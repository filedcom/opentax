# TY2025 Form 8283 prior-year carryover attachment

The
[December 2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
require a completed copy of the previous year's Form 8283 with a current-year
noncash carryover claim, plus a copy of any appraisal that had to accompany the
previous return. They require a separate Form 8283 for each carried gift. The
current Schedule A `capital_gain_property_carryovers` ledger contains amounts
and gift IDs, not those completed prior documents.

`forms/f1040/2025/mef/forms/deductions/charitable/f8283/f8283_carryover_evidence.ts` enforces one narrow
proof contract for a publicly traded securities gift whose previous-year copy
was completed in Section A and for which no appraisal was required with the 2024
return. For a gift or similar-item total above $5,000, a separate reviewed
exchange quotation now identifies the ticker, exchange, shares, per-share FMV,
donation-day quote, and source record; its multiplication must equal the prior
form's FMV, and the ticker must appear in the prior property description. This
extends the exact prior-PDF-to-Schedule-A-to-native/PDF path to exchange-listed
stock above $5,000. The
[2024 Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2024.pdf)
and [2025 instructions](https://www.irs.gov/instructions/i8283) both place
publicly traded securities of any amount in Section A. The quote review is a
source assertion; quote bytes and exchange authenticity are not independently
verified. The binding matches the donation year, gift ID, FMV, basis, prior
deductions and taxpayer against the Schedule A carryover ledger, then requires
the exact reviewed PDF SHA-256, binary-attachment description and MeF document
ID. It also records the reviewer's name/date and the referenced filed 2024
return/workpaper. The review contract now requires the prior form's
donated-property description, donee address, acquisition and contribution dates,
purchase acquisition method, and valuation method so the native Section A
document is not built from amounts alone. For this purchased-stock capital-gain
category, the acquisition and contribution dates must also establish a holding
period of more than one year, following
[2025 Publication 526](https://www.irs.gov/publications/p526). The retained
prior-year PDF description now includes its unique attachment filename, so two
carried gifts can each have an independently identified binary attachment
without weakening the bundle's duplicate-description check.

The public `f8283` input now accepts this reviewed carryover evidence directly.
For one or more distinct purchased, long-held publicly traded securities gifts
with positive refigured carryovers, the MeF path joins every evidence row to one
distinct Schedule A capital-gain carryover row and the actual filer SSN. It
requires distinct gift IDs, prior PDF file names and SHA-256 digests, and
rejects missing or extra Schedule A rows. It requires the 2025 50% capital-gain
election, a complete empty current noncash inventory, no other prior charitable
carryover, itemizing on Form 1040, and a recomputation of Schedule A lines 11-13
and the itemized total. Each carryover-year electronic `IRS8283` Section A
records the original donee, property, purchase and gift dates, basis, and
valuation method. Its column (h) uses the elected basis rather than unreduced
FMV, and a separate native `FairMarketValueStatement` explains the original FMV
and long-term appreciation removed. Each native form links its own exact
reviewed 2024 completed Form 8283 PDF as a `BinaryAttachment`. The TY2025 v5.4
`ReturnData1040.xsd` permits unbounded `IRS8283` instances. The Schedule A and
Form 8283 MeF descriptors independently require the same source and attachment
join in the linked pass. Bounded Form 8283 and Schedule A PDF previews also use
the same source reconciliation, including the real filer identity through their
existing instance hooks; they emit one preview page per carried gift. On
2026-09-29, the five single/multiple-gift route cases and three evidence cases
passed, including the two-attachment return.

This is a wired bounded export route, not verified filing readiness. The code
checks the PDF's SHA-256 and a named human review, but does not parse its
canonical fields or authenticate that the 2024 form was actually filed and
complete. The filed 2024 return and prior deduction workpaper are referenced
assertions. Source values and the PDF must be independently inspected before
use. Section B, required appraisals, pass-through gifts, special carryover
histories, mixed current-year gifts, additional e-file business rules, and ATS
acceptance remain open. The one-gift and two-gift synthetic bundles passed the
local TY2025 v5.4 Return1040 XSD on 2026-09-30, including their distinct native
Form 8283, statement, and prior-PDF references. The single full test batch and
filled-PDF visual check have not run. XSD success does not establish that the
synthetic blank prior PDFs represent actually filed 2024 forms.

## Prior Section B artwork and appraisal prerequisite

The [2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
require the completed previous-year Form 8283 for a noncash carryover and a copy
of any appraisal that had to accompany that return. A distinct standalone source
check now covers one purchased long-held artwork gift made in 2024, originally
claimed at its $20,000-or-more appraised FMV, with a partial 2024 deduction and
a 2025 30%-category capital-gain-property carryover. It joins the gift ID, year,
FMV, basis, previous deduction, and taxpayer to the Schedule A carryover row;
requires reviewed prior Section B signatures and an appraisal recorded as
attached to the 2024 return; and hashes the two distinct retained PDF copies
separately. Positive, changed-byte, changed-amount, ownership, and
missing-appraisal-review fixtures are authored for the deferred batch.

This is an evidence prerequisite, not an active Section B carryover filing
route. The reviewed fields and purported 2024 attachment are assertions; the PDF
contents, appraiser qualification, 2024 filing, and amount previously deducted
are not independently authenticated. Native Form 8283 and PDF export remain
limited to the bounded Section A securities carryover route above.

The public `f8283.carryover_evidence` input now accepts a tagged
`purchased_artwork` Section B source alongside the existing
`publicly_traded_securities` Section A source. A dedicated Section B review
joins both exact prior PDF byte hashes to the submitted MeF attachment
descriptions and distinct binary document IDs, after matching the gift,
taxpayer, appraisal review, and Schedule A carryover row. Positive and changed
description/document-ID fixtures are authored for the deferred batch. Section B
native and PDF export explicitly reject this source. The reviewed source now
requires the prior form's property description, physical condition, purchase
method, appraiser name, tax ID, address and signature date, plus the donee's
name, EIN, address, receipt date, unrelated-use answer and signature. The
donee/date and appraiser ID are cross-checked, and review flags assert those
printable fields match the exact prior-form PDF and appraisal. The positive
fixture and altered donee, appraiser-ID and PDF-review fixtures are authored for
the deferred batch. This supplies the printable-fact prerequisite, but the
current executor has no authenticated accepted 2024 return or IRS acknowledgment
to verify the claimed prior filing. No current-year Section B filing is claimed
by accepting the source contract.

The Section B source contract now requires separate byte-hashed copies of the
filed 2024 return and its purported IRS acceptance notice, reviewed 2024
taxpayer/year/reference, the filed Schedule A line 12 noncash amount, and a
review that this artwork was the sole 2024 noncash gift. The filed line 12 must
equal the prior deduction carried into the 2025 ledger. All four retained source
files have distinct references, names, hashes, and review dates; changed bytes,
owner, and deduction amount are rejected. The filed return and acknowledgment
are retained evidence, not 2025 MeF attachments. Only the prior Form 8283 and
required appraisal are checked against distinct proposed MeF PDF attachment IDs.

The retained acknowledgment prerequisite now parses the exact hashed XML copy
and requires an IRS `Acknowledgement` with `Accepted` status, TY2024 Form 1040,
the reviewed submission ID, and the same taxpayer TIN. A matched hash alone no
longer permits a receipt, rejected return, different year, different submission,
or different taxpayer. Positive and altered-field cases are authored for the
deferred bulk pass. The
[IRS MeF acknowledgment guide](https://www.irs.gov/pub/irs-pdf/p4164.pdf)
distinguishes an accepted acknowledgment from a submission status record. This
structural check cannot authenticate the XML's IRS origin or prove that the
separately retained PDF is the accepted submission, so Section B carryover
export remains closed.

The staged Section B source now also requires an exact byte-hashed copy of the
retained 2024 MeF Return XML. Its bounded content check requires a 2024 Form
1040 for the same taxpayer, one Section B artwork Form 8283 with matching
property, FMV, basis, original deduction, appraiser and donee details, and a
Schedule A noncash line 12 equal to the amount deducted in 2024. Changed
taxpayer, Schedule A, value, basis, donee EIN, and appraiser EIN are rejected
even if the altered XML is given a matching new SHA-256 claim. The prior form,
appraisal, filed return PDF, XML, and acknowledgment remain five distinct
reviewed source files. The XML content join does not prove that these bytes were
transmitted under the accepted acknowledgment's submission ID: the ordinary
acknowledgment does not carry a digest of the accepted Return XML, and no
trusted transmitter archive is connected. Section B export therefore remains
closed.

A separate staged return review checks this one-gift, primary-owner case against
the complete finalized 2025 Schedule A capital-gain election ledger. It
recomputes lines 11–13, requires the refigured basis less the 2024 deduction to
be fully deductible on line 13, and matches the Form 1040 itemized total. The
fixture uses a $30,000 artwork FMV, $20,000 basis, $15,000 prior deduction, and
$5,000 current carryover; changed current Schedule A and Form 1040 amounts are
rejected. This review is not called by filing output. The acceptance notice is
only checked against a reviewer-entered hash and claimed status; no trusted IRS
submission or transcript is available to authenticate it or to verify the
filed-return PDF contents. Native Form 8283 and PDF export remain closed for
Section B carryovers.
