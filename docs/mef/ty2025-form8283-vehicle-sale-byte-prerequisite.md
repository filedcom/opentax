# TY2025 Form 8283 vehicle acknowledgment byte prerequisites

## Section A material improvement, boxes 5a and 5c (2026-10-01, unrun)

The [2025 Form 1098-C](https://www.irs.gov/pub/irs-prior/f1098c--2025.pdf)
uses box 5a for the donee's promise not to transfer the vehicle before a
material improvement, and box 5c for its intended improvement description.
The [IRS instructions](https://www.irs.gov/instructions/i1098c) require the
acknowledgment within 30 days of contribution and describe a material
improvement as a major repair or addition significantly increasing value,
without additional donor payment. The bounded Section A route now requires
an exact-byte PDF review that identifies the donor, donee, VIN, contribution
and furnishing dates, intended improvement, no-transfer certification, no
additional donor payment, and no goods or services. Native MeF and PDF
preparation check the same linked document ID, SHA-256, and readable PDF page.
A $4,000 full-return case reaches Schedule A and Form 1040; changed bytes
and changed improvement description reject in authored fixtures for the
deferred batch. These remain human assertions about the document. Code does
not extract its printed contents or authenticate the donee signature.

## Section A significant charitable use, boxes 5a and 5c (2026-10-01, unrun)

The [2025 Form 1098-C](https://www.irs.gov/pub/irs-prior/f1098c--2025.pdf)
uses box 5a for the donee's promise not to transfer a vehicle before significant
intervening use and box 5c for the intended use and duration. Its
[instructions](https://www.irs.gov/instructions/i1098c) require the donor
acknowledgment within 30 days of the contribution. The bounded Section A
significant-use route now requires a reviewed exact-PDF-byte record matching
the donor, donee, VIN, contribution/furnishing dates, intended use and
duration, no-transfer certification, and no goods or services. Native MeF and
PDF preparation check the same prepared attachment link, SHA-256 and readable
PDF page. A $4,000 full-return case reaches Schedule A and Form 1040; changed
bytes and use duration reject in authored fixtures for the deferred batch.
The review facts are human assertions; code does not parse the printed
certification or authenticate the donee signature.

## Section A needy-transfer certification (2026-10-01, unrun)

The [2025 Form 1098-C](https://www.irs.gov/pub/irs-prior/f1098c--2025.pdf)
box 5b certifies an intended transfer to a needy individual for significantly
below FMV in direct furtherance of the donee's charitable transportation
purpose. The [IRS instructions](https://www.irs.gov/instructions/i1098c)
require the acknowledgment to be furnished within 30 days of contribution.
The bounded Section A route now requires a separate review of the exact
donee-issued PDF bytes for a greater-than-$500 box 5b claim. The reviewed
source identifies the filer, donee, VIN, contribution and furnishing dates,
box 5b certification, and no-goods-or-services statement. Native bundle and
PDF preparation require the same linked attachment, its reviewed SHA-256,
at least one readable PDF page, and a furnishing date within 30 days. The
existing $4,000 full-return vehicle claim reaches Schedule A and Form 1040;
changed bytes and changed VIN fixtures are authored for the deferred batch.
The content and donee signature are human-review assertions, not extracted
or independently authenticated from the PDF. Other box 5a uses and Section B
vehicle certifications retain their separate evidence boundaries.

## Section A unrelated sale

The [2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
require a contemporaneous donee acknowledgment for a vehicle claim above $500.
For an unrelated-party sale, it must state the sale date, gross proceeds, and
the cap on the donor's deduction. The donee may furnish Form 1098-C Copy B or an
equivalent written acknowledgment within 30 days after the sale.

The standalone `verifyVehicleSaleAcknowledgmentEvidence` helper stages an
exact-byte human review for one Section A sale route. It requires at least one
readable PDF page and checks its SHA-256 against the reviewed digest. The
reviewed vehicle identifier uses the same 1–17 or 19 character rule as the
Section A source, covering identifiers beyond standard 17-character road VINs.
It also joins the reviewed taxpayer, donee name/EIN/address, vehicle identifier,
sale date, gross proceeds,
furnished date, attachment name/description and MeF document ID to the Form 8283
source. It rejects a deduction above FMV or certified proceeds and an
acknowledgment furnished more than 30 days after sale. Positive and
changed-byte, zero-page, identifier-length, amount, owner, and document fixtures
are authored for the bulk test pass.

The Section A unrelated-sale route now requires `vehicle_sale_pdf_review`.
Native preparation links the actual PDF document ID and its SHA-256 to that
review, then verifies its readable bytes, owner, donee, vehicle identifier,
sale date, furnished date, and proceeds. PDF projection repeats the check
against the prepared MeF attachment and XML digest. A changed source, XML, or
PDF therefore cannot be projected as the same prepared return.

The review is still a human assertion. This code does not extract printed
content from Form 1098-C or authenticate the donee's issuer or signature. A
preparer must establish those facts by inspecting Copy B or its equivalent;
the reviewed source alone cannot prove IRS acceptance or issuer authenticity.
