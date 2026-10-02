# TY2025 W-2G source and attachment boundary

The [2025 IRS Publication 525](https://www.irs.gov/publications/p525) directs
Form W-2G box 1 gambling winnings to Schedule 1 line 8b and box 4 federal
withholding to Form 1040 line 25c. The
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) require
attaching W-2G when federal tax was withheld. Box 7 is additional winnings from
identical wagers, not a separate noncash-prize amount to add to box 1.

The source node now routes box 1 to Schedule 1 line 8b and AGI, and box 4 to
Form 1040 line 25c. Schedule 1 native XML uses the TY2025
`GamblingReportableWinningAmt` tag, and its PDF maps to the verified line 8b
field. Wrongly numbered legacy W-2G box keys are rejected by the strict source
schema, with no compatibility alias.

Every positive winnings or withholding row now needs a named payer, valid EIN,
and distinct issued-copy reference before the graph sums amounts. A repeated
identified payer/winner transaction rejects even when its reference or box 1
amount changes. Final native and PDF preflight parse the same source schema;
a non-withheld $1,000 winnings fixture reaches Schedule 1 line 8b and Form
1040 line 8, and both exports reject a removed payer EIN or source reference.
Sparse zero-only W-2G rows remain informational. Non-withheld rows do not
require an attached payer PDF; their issuer origin and any two distinct copies
without a shared transaction identifier still need external verification.

Withheld W-2G now has a bounded native `IRSW2G` route. The source requires the
2025 payer-issued form reference, payer name/control/EIN and structured US
address, winner name/SSN/address matching the taxpayer or the spouse on a joint
return, and the IRS standard/nonstandard code. Each positive-withholding source
creates one native document; Form 1040 line 25c must cover the sourced
withholding and the linked document IDs must match the withheld forms. This is
direct structured source input, not an alias for the old free-text payer
address. Missing or contradictory facts reject export. A no-withholding W-2G can
still report box 1 income without the attachment. The PDF packet now prints
the 2023 continuous-use Form W-2G recipient Copy B for each withheld source,
using the same payer and winner facts as the native document and requiring
the combined withholding to fit Form 1040 line 25c. This generated display
does not authenticate or replace a payer-issued or signed copy. A
source-to-return case now checks $10,000 of winnings
and $2,400 of withholding through Schedule 1, Form 1040 line 25c, and the
native `IRSW2G`; the full return passes the local TY2025 v5.4 XSD.
The shared source schema rejects duplicate payer-copy references before graph
calculation or native export. The five-page `v65` packet has a visually
inspected W-2G Copy B page and checked Form 1040/Schedule 1 amounts; its
full return passes local TY2025 v5.4 XSD. Authentication of the issued copy,
required signature when applicable, IRS business rules, and ATS acceptance
remain open, so this is not a filing-readiness claim.

The withheld route now also requires `issued_copy_attachment_file_name` and
`issued_copy_pdf_sha256` for every payer-issued W-2G source. The prepared MeF
bundle must contain a readable PDF with that exact filename and SHA-256; each
withheld source must use a distinct attachment file. The bytes are included in
the return archive alongside the native `IRSW2G`, so a changed, missing, or
swapped PDF blocks export. The generated Copy B remains a printable display
and does not substitute for the attached payer-issued PDF. The current source
fields and byte hash alone did not prove that a PDF was issued by the payer or
that its form-field values matched the reviewed entries. IRS business rules and
a current full-batch XSD/PDF pass remain open.

The prepared bundle now also opens each exact attached PDF and compares every
modeled, readable recipient Copy B AcroForm text field with the sourced W-2G
projection before native XML is built. Payer and winner identity/address,
calendar year, winnings, withholding, and all modeled optional boxes must
agree; an absent field or altered value rejects. The one unmodeled payer phone
field is ignored. The existing SHA-256 check still binds the content-checked
PDF to the submitted bytes, while the printable Copy B and native `IRSW2G`
derive from the same source. Focused content/tamper and updated full-return
fixtures are authored for the deferred batch. This strict route requires a
readable Copy B AcroForm; flattened, scanned, password-protected, or differently
named payer PDFs remain closed pending a separate evidence extraction design.
Field agreement cannot establish that the payer issued the document, that its
rendered appearance matches the AcroForm values, or that a signature is
authentic; those checks remain open.
