# TY2025 Form 8283 PDF boundary

## Two similar Section B art gifts (2026-10-01 build pass, unrun)

The same two-copy path now also permits exactly one artwork to have a
sourced purchased-short-term ordinary-income reduction. That item's original
appraised FMV remains on its Section B copy while its basis-limited claim is
summed with the other artwork's unreduced claim on Schedule A and Form 1040.
The reduced item requires a distinct reviewed purchase/basis PDF and FMV
reduction statement PDF in addition to its signed form, appraisal, and
signature documents. A positive mixed-claim fixture and reduction-statement
byte tamper case are authored for the deferred batch. Other reduction reasons
and two reduced items remain outside this bounded route.

The [2025 Form 8283 instructions](https://www.irs.gov/instructions/i8283)
require a separate Section B form for each item given to different donees,
while similar-property categories aggregate across donees for the $5,000
threshold. A bounded route now accepts two purchased, unreduced artwork gifts
in one declared similar-item group, each appraised and claimed at $20,000 or
more, with different donee EINs. Each gift has its own completed signed Form
8283, full qualified appraisal, appraiser signature, and donee signature PDF.
The native export verifies distinct document names and reviewed signed-form
and appraisal hashes before linking each electronic Section B copy. Schedule A
and Form 1040 reconcile the combined deduction; PDF export makes one filled
Form 8283 instance per item. A full-return positive fixture and changed
appraisal-byte, donee, and Form 1040 fixtures are authored for deferred bulk
validation. Source review records and synthetic signatures do not authenticate
real-world documents. Other multi-item patterns and reductions remain open.

The purchased Section B ordinary-income reduction now distinguishes short-term
capital assets from purchased inventory in a single source reason record. The
inventory route prints the same official Section B FMV and basis-claim fields,
with a supplement identifying the held-for-sale property and reviewed cost
ledger. Its native filing still requires the distinct complete signed form,
full appraisal, reduction statement, purchase/cost record, and appraiser/donee
signature PDFs. A full-return equipment inventory example is authored but not
run; the preview and source-review claims do not authenticate those documents.

The
[official December 2025 Form 8283](https://www.irs.gov/pub/irs-prior/f8283--2025.pdf)
is a two-page filing form. Its AcroForm field names and page widgets were
inspected from the official PDF. The registered descriptor fills page 1 Section
A rows A–D for up to four nonvehicle current-year gifts on the reconciled
capital-gain election route. It prints the reduced claimed amount in column (h)
and appends an FMV-reduction explanation page using the same text as the linked
native MeF statement. The Form 8283 and Schedule A source must agree with the
finalized itemized Form 1040 before PDF projection. Focused descriptor cases
pass locally.

It also projects the bounded one-item current-year Section B unimproved
investment-land capital-gain election onto both official pages. Page 1 prints
other real estate, physical condition, appraised FMV, acquisition facts, basis,
and the lower claimed deduction in separate fields. Page 2 prints the appraiser
and donee identity, date, address, and unrelated-use answer from source facts
recorded as signed. The separate source-file names for the appraisal signature,
donee signature, and FMV-reduction statement are called out on a supplemental
preview page. The renderer does not import or reproduce those signed PDFs, and
the generated form must not be used as a signed paper Form 8283. Native MeF
still requires those exact linked binary attachments. The field map was checked
against the cached official AcroForm; Section B signature and attachment review
remains a filing prerequisite.

The
[December 2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
also say an e-filed return must include the completed Form 8283 with all
required signatures as a PDF attachment, or send it with Form 8453. Therefore
this generated preview does not itself close the signed-form filing gate. The
Section B MeF bundle now requires a separately supplied **completed signed Form
8283** PDF for each electronic Section B document, with a named reviewer's date,
confirmation that both signatures and the electronic data match, and the
SHA-256 of the exact reviewed PDF bytes. The bundle recomputes that digest from
the submitted bytes and links the PDF to `IRS8283` as a `BinaryAttachment`.
Separate appraiser/donee signature excerpts cannot substitute for the complete
form. This is a human source-review attestation, not automatic signature
authentication. A blank or incorrectly reviewed PDF can still be falsely
attested, so operational review remains a filing prerequisite. Form 8453 mail
handoff is a separate procedure and is not implemented as an alternate export
path here.

For each Section B item, collect the original completed Form 8283 with its
required signatures, inspect every page against the electronic item and its
appraiser/donee facts, record the reviewer and review date, then compute
`shasum -a 256 CompletedSignedForm8283.pdf`. Put that exact lowercase digest in
`signed_form_source_review.pdf_sha256`, set the reviewed assertions only after
inspection, and supply the same file to the MeF bundle with a description
starting `Form 8283 completed signed Section B`. The bundle rejects missing,
misdescribed, unreadable, or digest-mismatched PDFs. It does not inspect ink or
digital signatures by itself.

The 2026-09-29 filled-output pass also added one ordinary current-year Section A
gift claimed at its $1,200 FMV. This route requires a purchased noncapital
nonvehicle item, full donee/property/acquisition/valuation facts, FMV no more
than $5,000, basis at least FMV, a complete current-gift Schedule A inventory,
an empty prior-carryover ledger, and an itemized Form 1040 with matching AGI and
deductions. Its synthetic four-page return validates against the local TY2025
v5.4 XSD. The rendered Form 8283 row was visually checked after condensing the
donee address to two lines; all city/state/ZIP text now fits. Schedule A line
12 and the native Form 8283 each carry the $1,200 gift once, and Form 1040 line
12e carries the $37,200 itemized total. This filled-packet review also exposed
a Schedule A AcroForm numbering error: the old map put amounts in unrelated
fields. The corrected map was checked against widget positions and the
rerendered page now prints $1,200 on line 12 and $37,200 on line 17, with
matching name and SSN. The synthetic source and corrected packet are retained
under `.state/research/ty2025-filled-pdf-review/2026-09-29-v15/`.

The 2026-09-30 vehicle pass adds one current-year Section A vehicle whose claim
is limited to donee-certified unrelated-party sale proceeds. It requires one
complete purchased vehicle source, a named donee-issued acknowledgment PDF,
matching printed donee and acknowledgment facts, a sourced FMV reduction, a
complete Schedule A inventory, and an itemized Form 1040 reconciled to that
inventory. Native Form 8283 and Schedule A now enforce that same reconciliation
for the single certified-sale route, including a direct Schedule A build whose
filed amount differs from the pending return. The synthetic full return has
$20,000 FMV, $25,000 basis, $15,000
certified proceeds and claimed deduction; local TY2025 v5.4 XSD passes with
the acknowledgment reference and native FMV statement. The five-page filled
packet was rendered and visually checked: the vehicle checkbox, VIN, basis,
claim, explanation, Schedule A line 12, and Form 1040 line 12e agree. Its PDF
SHA-256 is
`2cb812caecf1ef1565dd1b5c6302e8d988f75949e84e482069b1ebbaf2a08e3a`.
The synthetic acknowledgment contains matching text but is not an actual
donee-issued taxpayer record. The
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
describe the Section A sale-proceeds example and require the donee
acknowledgment with an e-filed return.

The 2026-09-30 two-print review adds a complete-return check for purchased
short-term Section A property. Both $1,000 FMV prints are reduced to $700
adjusted basis and print on rows A and B. Two native FMV statements retain
their separate row letters. Schedule A line 12 and Form 1040 line 12e show
$1,400 and $37,400; the five-page PDF was rendered and inspected. Local
TY2025 v5.4 XSD passed, and native Form 8283, Schedule A, and PDF projection
now require the same finalized current-gift inventory and itemized amount.
See the [reduction review](ty2025-form8283-fmv-reduction-gap.md) for its PDF
digest and remaining source limits.

The 2026-09-30 needy-transfer review adds one purchased, nonappreciated vehicle
claimed at its $4,000 FMV with a $5,000 basis. The source must contain a
donee-certified plan to transfer the vehicle to a needy recipient for
significantly below FMV, a named acknowledgment PDF, matching donee and
printed vehicle facts, a complete Schedule A inventory, and an itemized Form
1040. Native Form 8283 and Schedule A enforce that same reconciliation. The
synthetic full return passes local TY2025 v5.4 XSD and carries the certified
vehicle statement and acknowledgment reference; it needs no FMV-reduction
statement. All four filled pages were rendered and visually checked, including
the vehicle checkbox and VIN, $4,000 Form 8283 claim and Schedule A line 12,
and $40,000 Form 1040 line 12e. The PDF SHA-256 is
`4845e349ebb5b8fdf757e87ee9eed4c227773651a94d94731f04ddb6864146c8`.
The acknowledgment in this fixture is synthetic text, not an authenticated
donee-issued record. The
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
describe the needy-transfer exception and the contemporaneous acknowledgment
requirement. Other vehicle exceptions and combinations remain open.

The 2026-09-30 Section B vehicle pass maps the official page 1 vehicle-type
checkbox and both Section B pages for one purchased, nonappreciated vehicle
above $5,000 with a donee-certified material-improvement, significant-use, or
needy-transfer exception. The
preview prints appraised FMV and claimed deduction separately, plus appraisal
and donee identities. Its supplemental page identifies the VIN, certified
exception, donee acknowledgment, and separately reviewed completed signed
Form 8283. The source must match a complete current-gift Schedule A inventory
and itemized Form 1040; direct Schedule A builds reject a changed filed
amount. Each full synthetic exception route now passes the local TY2025 v5.4
XSD and renders six pages. All six pages of the material-improvement packet
were inspected; the two other variants use the same form fields, and their
exception supplements were rendered and inspected. Form 1040 line 12e and
Schedule A lines 12/17 agree with the $15,000 Section B claim and $51,000
itemized total; the vehicle box, appraisal value, acquisition, basis, donee,
and supplemental VIN/certification record print in their intended locations.
This review caught an existing Section B page 2 field error: the appraiser's
date had printed in the title box, name in the business-address box, and full
address in the city line. The corrected map prints name, street, and
city/state/ZIP in their own fields for both land and vehicle routes. The
official PDF has no AcroForm field for the appraiser signature date, so the
generated supplement records it without filling the signature line. The
reviewed packet is retained under
`.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-vehicle/`;
the first material-improvement snapshot's SHA-256 is
`36fd572b9ab4d7b25d8313b03f9928433165ec3ebb45f4d5c2437bdf5db18254`.
The inspected significant-use and needy-transfer snapshots have SHA-256
`cd420aed27b9721199d16f73f1f31cafd91a0cb088d41f032331c6e0fc4ec383`
and `c6ea8bbe361d06f2a92eeb3d28519e6f013ff137f2c6699292d523638a37de9d`,
respectively.
The fixture uses mock signatures and acknowledgment text; it does not verify
actual signed or donee-issued taxpayer records.

The 2026-09-30 equipment pass adds one purchased, nonappreciated Section B
equipment item claimed at its $12,000 appraised FMV, below the $500,000
full-appraisal attachment threshold. The PDF checks the complete current-gift
Schedule A inventory and itemized Form 1040, prints the official equipment
checkbox, both Section B pages, appraiser/donee identity, basis and claim, and
a source-review supplement. The full synthetic return passes local TY2025
v5.4 XSD with three linked mock PDF attachments. All six pages were rendered
and inspected: Schedule A line 12 is $12,000 and Form 1040 line 12e is
$48,000. The snapshot is retained at
`.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-equipment/filled-return.pdf`
with SHA-256
`425042bd78b4386797ae0325390fd874e9fe5d916227c1201bf57e072904fbbc`.
The fixture does not authenticate the appraisal or signatures.

The same bounded ordinary Section B route now covers a purchased collectible
and a purchased household item in good used condition, each claimed at its
$12,000 appraised FMV with $18,000 basis. The official property-type boxes,
condition, appraiser/donee fields, and review supplement were checked in both
filled packets. Their first three rendered pages are pixel-identical to the
inspected equipment return; local TY2025 v5.4 XSD passes for each full return.
The [2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
distinguish collectibles from art and require good used condition for the
ordinary clothing/household deduction route. The reviewed snapshots under
`.state/research/ty2025-filled-pdf-review/` have SHA-256
`b07d70ecd556c3221b7cdff7ba8b6abb350667bec2c61c1525863d9b005a5f56`
for `2026-09-30-section-b-collectibles/filled-return.pdf` and
`546bef585099c24f9bb4e5b62de788b9f29ea0b225e9461cce702e3dd24b1cd7`
for `2026-09-30-section-b-clothing_household/filled-return.pdf`. These remain
synthetic evidence cases, not authenticated appraisal or signature reviews.

The purchased, nonappreciated art route is limited to one item with appraised
FMV and claim above $5,000 and below $20,000. It uses the official Section B
line 2c checkbox, the same complete Schedule A inventory and signed-form
attachment review, and the same six-page packet. The rendered art packet was
inspected after correcting an initial line 2a/2c checkbox mistake. Its local
TY2025 v5.4 full-return XSD passes, with $12,000 on Schedule A line 12 and
$48,000 on Form 1040 line 12e. The reviewed snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-art_under_20000/filled-return.pdf`
with SHA-256
`0b485419f23e1aff557aac7747a61402092213dbdaf3931b9dc5086e4e82c428`.
The [2025 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
require the complete signed appraisal as a return attachment when the art
deduction reaches $20,000. The under-$20,000 art case uses mock source PDFs and
does not authenticate the appraisal or signatures.

The purchased, nonappreciated art route for a claim from $20,000 through
$500,000 requires a separate complete signed appraisal PDF. The submitted
bytes must match the named review's SHA-256, and the electronic item,
appraiser/donee signatures, completed signed Form 8283, and finalized Schedule
A inventory remain required. One $25,000 synthetic painting passes local
TY2025 v5.4 full-return XSD with four linked PDFs; altered appraisal bytes
reject. All six filled pages were rendered and inspected. Section B line 2a is
checked, the property and appraiser/donee facts print on the intended pages,
Schedule A line 12 is $25,000, and Form 1040 line 12e is $61,000. The review
snapshot is
`.state/research/ty2025-filled-pdf-review/2026-09-30-section-b-art_at_least_20000/filled-return.pdf`
with SHA-256
`0c640887de585db56ef65df89e200222b914e95c620bf8cc473a1920fef96d5d`.
The PDFs are synthetic evidence and the review assertions are not independent
authentication of an actual signed appraisal. Art above $500,000, multiple
items, other reduction reasons, and carryovers remain closed.

The purchased short-term art reduction now also accepts a single art item with
appraised FMV $25,000 and a $22,000 basis-limited claim. The PDF preview uses
the art-at-least-$20,000 box and shows both amounts, appraiser/donee source
facts, and the reduction explanation. Native MeF requires the complete signed
appraisal and completed signed Form 8283 as separate, byte-reviewed PDFs along
with the purchase record, reduction statement, and signature documents. The
Schedule A/native/PDF fixture and altered-statement-byte case are authored but
unrun in this implementation pass; the broader art and carryover boundaries
above remain.

This is not whole-form support. Other Section B property and multi-item routes,
actual appraiser/donee signatures in the PDF, mixed Section A/B forms, more than
four Section A rows, carryover-year Form 8283 filings, and
other non-election routes still stop rather than producing an incomplete PDF. The
verified field map does not prove that every filled text variant fits or that
every supplemental page is visually correct. Other AcroForm data, page
appearance, and complete returns must be checked in the agreed PDF/full-test
batch; local XSD, IRS
business rules, and ATS acceptance remain separate gates.

## Four distinct unreduced Section A gifts (2026-10-01, unrun)

The preview now projects up to four current-year purchased, noncapital gifts
claimed at their unreduced FMV, one per official Section A row. Each row needs
complete donee, acquisition, contribution, basis, and valuation-method facts;
distinct declared similar-item groups must remain below the Section B
appraisal threshold. Native MeF and the preview reconcile the complete Form
8283 inventory with finalized Schedule A and itemized Form 1040, and native
MeF rejects a changed item against the pending source. The authored four-row
fixture totals $5,500 and includes changed return, changed native source, and
changed group fixtures for the deferred bulk pass. The route does not cover
mixed Section A/B, more than five Section A rows, capital-gain property, or
actual source authentication.

## Five distinct unreduced Section A gifts (2026-10-01, unrun)

The [2025 Form 8283 instructions](https://www.irs.gov/pub/irs-prior/i8283--2025.pdf)
require all noncash gift data in the electronic submission; the checked-in
TY2025 `IRS8283.xsd` permits repeated `InformationOnDonatedProperty` entries.
The bounded fifth-item route requires five distinct current-year purchased,
noncapital, nonvehicle Section A gifts, each claimed at its unreduced FMV with
complete donee, acquisition, date, basis, valuation-method, and distinct
similar-item-group facts. Native MeF keeps all five A–E items in one `IRS8283`
document. The PDF preview fills two official first-page copies: rows A–D on the
first and the fifth item in row A on the second. The source inventory is
recomputed against Schedule A line 12 and itemized Form 1040 line 12e before
either projection. A $6,400 case and changed fifth item, return total, and
sixth-row rejection cases are authored but unrun pending bulk validation.
Reduced, capital-gain, vehicle, mixed Section B, carryover, and larger Section A
sets remain closed. These records are preparer-entered facts rather than
authenticated donor/donee source bytes; PDF appearance, XSD/business rules,
and IRS ATS acceptance are pending.
