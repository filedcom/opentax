# TY2025 Form 8826 PDF gap

Status: a one-page PDF descriptor is registered for one self-earned, nonpassive
interpreter-service claim with a linked Schedule C line 27b expense reduction,
alone or alongside one nonpassive S-corporation K-1 credit. Other direct-claim
and mixed routes remain open. The native `IRS8826` and Form 3800 cap ledger
alone do not establish expense eligibility; the bounded positive export now
requires typed source evidence as well.

The [official Form 8826](https://www.irs.gov/pub/irs-pdf/f8826.pdf) is the
September 2017 continuous-use form. Its first page prints eligible access
expenditures on line 1, fixed $250 and $10,000 amounts on lines 2 and 4,
calculated self-earned credit on lines 3, 5 and 6, pass-through credit on line
7, and the capped Form 3800 amount on line 8. The official page 2 instructions
require qualifying ADA expenditures, prior-year small-business eligibility,
controlled-group treatment where applicable, and a line 6 denial of double
benefit: credited expenditures cannot also be deducted, capitalized, or used to
calculate another credit.

The `f8826` input retains its aggregate `eligible_expenditures`, prior-year
gross receipts and employee count, and passive-activity flag. For positive
self-earned export, it now also takes identified 2025 interpreter invoices,
payment and expense records, ADA-purpose and necessity confirmations, prior-
year receipt/payroll references, an explicit no-predecessor/common-control
assertion, and a Schedule C business/line 27b reduction from the gross expense
by the full Form 8826 line 6 credit. A shared verifier checks each source
amount, unique identity, the prior-year figures, and the filed Schedule C
amount. The native builder and PDF use it; the gross `disabled_access_limit`
ledger checks the capped Form 3800 entry, and Form 3800 checks its allowed
amount against Schedule 3 line 6a and finalized tax context. The source records
and prior-year references remain unauthenticated until their external bytes are
reviewed.

The registered PDF maps the official September 2017 form's two identity fields
and separate dollar/cent boxes for lines 1, 3, 5, 6, 7, and 8. It retains only
the first page; page 2 is instructions. The self-only and one-S-corporation
routes check line 8 against the Form 3800 source and Form 3800 line 38 through
Schedule 3 and Form 1040. A $5,000 interpreter expense, $2,375 credit, and
$2,625 filed Schedule C expense have source/native/PDF/final-tax and tamper
fixtures authored for the deferred bulk run. The mixed route checks the Form
8826 line 7 declaration against K-1 box 13 code K and makes the K-1 the sole
Form 3800 credit source; the Form 8826 node only contributes the self credit.
Missing, duplicate, or mismatched K-1 source claims fail before filing.
Pass-through-only recipients do not attach Form 8826 under the official
instructions.

Positive passive, other mixed self/pass-through, barrier-removal, equipment,
controlled-group, predecessor, capitalization/basis, and other deduction
locations remain open. Expenditure and K-1 source bytes, local XSD/business
rules, filled-PDF visual review, and ATS acceptance are also open. No test,
typecheck, XSD, or filled-PDF run was made for this implementation; validation
is deferred to the shared bulk phase.
