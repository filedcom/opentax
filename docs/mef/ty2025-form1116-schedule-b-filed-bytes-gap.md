# TY2025 Form 1116 Schedule B: reviewed filed-2024 PDF bytes

The 2025 MeF bundle's `attachments` are documents sent with the **current**
return. They cannot serve as proof that a 2024 Form 1040 or Schedule B was filed
or accepted. The bounded `reviewForm1116ScheduleBFiledDocuments` helper
therefore accepts two separately supplied, reviewed PDF byte arrays. It checks
each exact SHA-256 against the review record, requires readable two-page
AcroForm documents, and matches the 2024 Form 1040 and Schedule B taxpayer SSNs
to the current owner. It also reads Schedule B's calendar year, one checked
passive/general category, every 2015–2024 line 8 vintage column, and line 8
total. These fields must agree with the existing structured carryover source and
the two distinct document IDs. The result is an evidence manifest with
`export_ready: false`; no public export condition was loosened.

The field paths were inspected on the
[2024 Form 1040](https://www.irs.gov/pub/irs-prior/f1040--2024.pdf) and the
[continuous-use Schedule B (Form 1116)](https://www.irs.gov/pub/irs-pdf/f1116sb.pdf).
The [2025 Form 1116 instructions](https://www.irs.gov/instructions/i1116)
require Schedule B when a prior-year carryover enters line 10, and the
[Schedule B instructions](https://www.irs.gov/instructions/i1116sb) direct
prior-year line 8 columns to current-year line 1. Positive and changed-byte,
owner, year, category, vintage, total, and document-ID rejection fixtures are
authored for the deferred bulk validation.

This is a byte-and-field review prerequisite, not authentication of filing or
IRS acceptance. A forged PDF with matching fields can still pass, and a
flattened or scanned filed copy has no readable AcroForm values and is rejected
by this narrow helper. The current filing path retains its structured-source
guard; it does not claim the separate review manifest proves acceptance. An
authenticated IRS transcript, accepted MeF receipt, or equivalent trusted filing
record and a final source-to-manifest join are still needed before making a
filed-acceptance claim. Tests, typecheck, XSD, and filled-PDF inspection remain
deferred to the shared bulk gate.
