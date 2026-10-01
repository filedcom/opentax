# TY2025 Form 8611 printable-return gap

Static source, native, and blank-PDF review began on 2026-09-28. A bounded PDF
descriptor and direct projection fixtures are now authored, but no test,
typecheck, XSD, filled-PDF render, business-rule, or ATS run has occurred. The
current [IRS Form 8611](https://www.irs.gov/pub/irs-pdf/f8611.pdf) is a one-page
return attachment followed by two instruction pages. It calls for a separate
form per building and prints building/bond identity plus lines 1-15; lines 16-17
are for section 42(j)(5) partnerships, not an ordinary individual recipient.

The public `f8611` source retains one building address/BIN/date, optional
tax-exempt bond details, and either an own-credit calculation or a flow-through
recapture. `calculateForm8611` derives lines 1-15, and registered
`mef/forms/f8611.ts` emits one `IRS8611` per building. For a positive line 14,
native export compares the **sum** of all building line 14 amounts with Schedule
2 line 16 when pending return context is supplied. This is arithmetic and
destination reconciliation, not independent verification of the source values.

For an own-credit building, the
[IRS instructions](https://www.irs.gov/pub/irs-pdf/f8611.pdf) say to use filed
Forms 8586, 8609, 8609-A, and prior Forms 8611. The current
`source_document_reference` and each `source_form8609a_reference` are free-text
strings, while prior Form 8586 credits, annual worksheet lines, qualified-basis
decrease, previous accelerated recapture, unused credits, and prior-year
interest are entered as numbers. No prior filed document or payment/interest
record is imported and compared to those entries. For a pass-through recipient,
line 8, line 9, line 11, and unused credits are likewise entered directly with
no identified K-1/estate/trust recapture amount or source-year linkage. An
internally consistent calculation can therefore print incorrect historical
recapture figures. The positive Schedule 2 sum cannot detect a wrong amount
shared by both outputs.

The Form 8611 PDF descriptor now maps the 2021 revision's actual first-page
AcroForm widgets: filer and building identity, optional bond facts, and lines
1–15, with one page per building. It splits the two printed decimal ratios,
leaves own-credit lines 1–7 blank for pass-through recipients, and prints the
section 42(j)(5) line 11 annotation where applicable. Its source projection uses
the same line calculator as native MeF and compares the sum of line 14 to final
Schedule 2 line 16. The source also rejects duplicate building BINs so two
recapture events cannot silently emit two Forms 8611 for one building. The
authored positive and tamper fixtures remain unrun; the PDF export gate remains
active.

**Remaining evidence prerequisite:** link typed, identified prior-filed Form
8586/8609/8609-A/8611 or issuer K-1 records to each building and check the
entered worksheet, recapture, interest, and unused-credit facts against them.
Then run the deferred XSD and filled-PDF visual batch and the IRS rules. A zero
line 14 is not, by itself, proof that a Form 8611 or carryforward line 15 is
unnecessary; classify the recapture event and IRS exceptions separately.
