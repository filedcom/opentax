# TY2025 Form 8283 PDF boundary

The
[official December 2025 Form 8283](https://www.irs.gov/pub/irs-prior/f8283--2025.pdf)
is a two-page filing form. Its AcroForm field names and page widgets were
inspected from the official PDF. The registered descriptor fills page 1 Section
A rows A–D for up to four nonvehicle current-year gifts on the reconciled
capital-gain election route. It prints the reduced claimed amount in column (h)
and appends an FMV-reduction explanation page using the same text as the linked
native MeF statement. The Form 8283 and Schedule A source must agree with the
finalized itemized Form 1040 before PDF projection. Focused cases are written
but unrun.

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
against the cached official AcroForm; filled appearance and fit await the one
agreed PDF batch.

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

This is not whole-form support. Other Section B property and multi-item routes,
actual appraiser/donee signatures in the PDF, mixed Section A/B forms, more than
four Section A rows, vehicles, carryover-year Form 8283 filings, and other
non-election routes still stop rather than producing an incomplete PDF. The
verified field map does not prove that filled text fits or that the supplemental
page is visually correct. AcroForm data, page appearance, and the complete
return must be checked in the agreed PDF/full-test batch; local XSD, IRS
business rules, and ATS acceptance remain separate gates.
