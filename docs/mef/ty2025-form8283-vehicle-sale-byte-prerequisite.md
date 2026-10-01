# TY2025 Form 8283 vehicle sale acknowledgment byte prerequisite

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

This is a **staged prerequisite**, not a current export gate. The helper does
not extract text from the PDF or authenticate its issuer or signature; a
reviewer must inspect the actual Copy B or equivalent before asserting that its
contents match. The current native/PDF vehicle route continues to use its
existing source and attachment checks. Wiring the byte review into both exports
requires one direct public source slot and the validated attachment byte
carrier; that broader change remains open.
