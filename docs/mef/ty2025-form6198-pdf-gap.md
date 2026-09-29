# TY2025 Form 6198 PDF source parity

Build-pass checkpoint (2026-09-28; cases written, unrun). The
[November 2025 Form 6198](https://www.irs.gov/pub/irs-prior/f6198--2025.pdf) and
its [instructions](https://www.irs.gov/instructions/i6198) put the activity
description above Part I, the ordinary loss on line 1, the combined loss on line
5, simplified amount-at-risk inputs on lines 6–10b, and the deductible loss on
line 21. Line 21's printed field is enclosed by parentheses.

The prior PDF descriptor read aggregate `form6198` fields, so the source-backed
Schedule C/F MeF route produced no matching PDF. It also used nonexistent
zero-padded AcroForm field names and placed the aggregate income value in the
activity-description field. The PDF descriptor now reads the same Schedule C and
Schedule F source items and pure at-risk calculations as the MeF descriptor. It
creates one copy per qualifying activity, in the same C-then-F order, and maps
the source values to the checked-in November 2025 AcroForm field sequence. It
refuses aggregate Form 6198 fields and incomplete at-risk facts. The deductible
loss is printed as a positive number inside the form's existing parentheses; the
underlying MeF amount remains signed.

Both Form 6198 serializers now apply the Schedule C/Form 8829 line 30 projection
and the Schedule C/F Form 5884 wage reductions before the at-risk calculation,
matching the source nodes' calculation order. Focused cases join those
adjustments to both MeF and PDF amounts. Form 6198's header asks for the name(s)
shown on the return and identifying number, so the PDF uses the return filer
identity even when the activity proprietor is a spouse; the activity description
distinguishes each copy.

The same PDF projection now appends the bounded Form 4835 rental-farm at-risk
losses after the Schedule C/F copies. It parses the Form 4835 activity source,
uses the same simplified at-risk calculation as its separate MeF `IRS6198`
descriptor, and rejects a line 34b loss without the required source facts.
The Form 4835 activity description and lines 1, 5, 6–10b, 20, and 21 now have
one source-backed PDF copy per qualifying rental farm. Focused MeF/PDF parity
and incomplete-source cases pass 9/9.

The native descriptor now triggers from the Schedule C and Schedule F pending
source slices as well as a direct Form 6198 slice. Previously the return
builder skipped it when only the two Schedule C loss activities were present,
even though its direct serializer could compute both copies. A source-produced
return with two distinct at-risk-limited Schedule C businesses now emits two
`IRS6198` documents and passes TY2025 v5.4 XSD validation. The fixture includes
an offsetting profitable business and low wages so unrelated Form 461 and net
QBI-loss filing boundaries do not block this Form 6198 check. Focused native
serializer tests pass 2/2.

The same two-activity return is now a filled-PDF review fixture. All 16
synthetic review sources passed TY2025 v5.4 XML validation, and the generated
16-page packet under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v10/` was
rendered. Both Form 6198 pages were visually inspected: North prints a $2,000
source loss, $500 amount at risk, and $500 deductible loss; South prints
$3,000, $900, and $900, respectively. Schedule 1 line 3 prints $1,600 after
the $3,000 offsetting business profit. The reviewed PDF SHA-256 is
`2aa20d7bd7f99bc249686074f85bd2f89e4f7587bc030c28e33a24e5abbf0a5e`.

The full XML/PDF joint, business-rule, and ATS gates remain open. This
focused fixture covers the simplified Schedule C route, not the other
Schedule F/Form 4835 or detailed at-risk situations.
Other rental and pass-through activities, detailed Part III, prior suspended
losses, gain/loss allocation, and source-to-return loss reconciliation remain
open.

## Schedule E and pass-through at-risk activities

The November 2025 [Form 6198 instructions](https://www.irs.gov/instructions/i6198)
include Schedule E filers. For an ordinary loss, line 1 includes a prior-year
at-risk-disallowed deduction as well as the current-year activity result. The
simplified Part II calculation needs known activity adjusted basis, current-year
increases, and decreases; Form 6198's allowed loss must be applied before the
passive-activity calculation.

The current Schedule E source only records a yes/no not-at-risk answer and an
aggregate prior at-risk amount. It does not hold those Part II activity facts
or a filed-year suspended-loss ledger. The Schedule E node deliberately rejects
an item with either `some_investment_not_at_risk` or
`prior_unallowed_at_risk` before producing return outputs, and its MeF path
also rejects an at-risk loss or prior at-risk carryover. The supported K-1
sources do not supply a per-activity ordinary loss, outside basis, debt
character, and at-risk ledger to connect Form 6198 to Schedule E Part II.
No Form 6198 XML/PDF copy is generated for these unsupported paths. A correct
route needs source fields and computations across Schedule E/K-1, Form 6198,
and then Form 8582; this is not a Form 6198 serializer-only gap. This is a
static review, not a test or render pass.
