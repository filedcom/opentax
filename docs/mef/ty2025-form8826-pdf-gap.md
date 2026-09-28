# TY2025 Form 8826 PDF boundary

Status: no Form 8826 PDF descriptor is registered. This is an open source and
print-coverage gap, not an approved exclusion. The current native `IRS8826`
route and downstream Form 3800 cap ledger do not independently establish a
source-backed positive paper form.

The [official Form 8826](https://www.irs.gov/pub/irs-pdf/f8826.pdf) is the
September 2017 continuous-use form. Its first page prints eligible access
expenditures on line 1, fixed $250 and $10,000 amounts on lines 2 and 4,
calculated self-earned credit on lines 3, 5 and 6, pass-through credit on line
7, and the capped Form 3800 amount on line 8. The official page 2 instructions
require qualifying ADA expenditures, prior-year small-business eligibility,
controlled-group treatment where applicable, and a line 6 denial of double
benefit: credited expenditures cannot also be deducted, capitalized, or used
to calculate another credit.

The direct-claim `f8826` input has only an aggregate
`eligible_expenditures` amount, prior-year gross receipts and employee count,
and a passive-activity flag. It does not identify each expenditure, payment
record, ADA purpose, facility in-service date where relevant, controlled-group
share, or the corresponding deduction/capitalization/other-credit location.
The node calculates lines 1, 3, 5, 6 and 8 from that entered aggregate. The
native builder repeats those arithmetic lines; the gross
`disabled_access_limit` ledger checks the capped Form 3800 entry, and Form 3800
checks its allowed amount against Schedule 3 line 6a and finalized tax
context. These downstream equalities prove arithmetic propagation, not that
line 1 is eligible or that the line 6 expense was removed from other tax
benefits. A blank official AcroForm was inspected; field mapping is not the
blocking step.

A bounded direct-claim PDF path needs a typed expenditure-level source with
stable evidence identity and eligibility facts, prior-year business facts
including any predecessor/common-control members, and a source-to-return
reconciliation of the line 6 double-benefit adjustment. Recompute the
Form 8826 lines from those facts, then join the printed line 8 to the capped
Form 3800 source and Schedule 3/final Form 1040. Keep passive, mixed
pass-through, and controlled-group claims closed until their specific
allocation and statement routes are proven. Pass-through-only recipients do
not attach Form 8826 under the official instructions.

No PDF descriptor, registration or focused print test was added. No tests,
typecheck, XSD validation or filled-PDF rendering was run in this audit.
