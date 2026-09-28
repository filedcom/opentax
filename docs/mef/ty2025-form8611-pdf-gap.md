# TY2025 Form 8611 printable-return gap

Static source, native, and blank-PDF review on 2026-09-28. No PDF descriptor or
focused case was added, and no test, typecheck, XSD, filled-PDF render,
business-rule, or ATS run occurred. The current
[IRS Form 8611](https://www.irs.gov/pub/irs-pdf/f8611.pdf) is a one-page return
attachment followed by two instruction pages. It calls for a separate form per
building and prints building/bond identity plus lines 1-15; lines 16-17 are for
section 42(j)(5) partnerships, not an ordinary individual recipient.

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

**Decision for this build slice:** no positive PDF route yet. A bounded PDF
should begin only after typed, identified prior-filed Form 8586/8609/8609-A/8611
or issuer K-1 records are linked to each building and checked against the
entered worksheet, recapture, interest, and unused-credit facts. Then
recalculate each line, compare each building's native and PDF projection,
reconcile the sum to the finalized return, map the actual AcroForm widgets, and
run the deferred XSD and filled-PDF visual batch. A zero line 14 is not, by
itself, proof that a Form 8611 or carryforward line 15 is unnecessary; classify
the recapture event and IRS exceptions separately.
