# TY2025 Form 8826 PDF gap

Status: a one-page PDF descriptor is registered for one self-earned, nonpassive
interpreter-service claim with a linked Schedule C line 27b expense reduction,
alone or alongside complete nonpassive partnership/S-corporation K-1 inventories.
This is component support: the mixed public returns below remain blocked by
Form8995; other direct-claim and mixed routes remain open. The native `IRS8826` and Form 3800 cap ledger
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
the first page; page 2 is instructions. The self-only and mixed nonpassive K-1
routes check line 8 against the Form 3800 source and Form 3800 line 38 through
Schedule 3 and Form 1040. A $5,000 interpreter expense, $2,375 credit, and
$2,625 filed Schedule C expense have source/native/PDF/final-tax and tamper
fixtures; the prior complete source proof is linked in the form audit. The mixed route checks the Form
8826 line 7 declaration against partnership box 15 code K or S-corporation box 13 code K and makes the K-1 the sole
Form 3800 credit source; the Form 8826 node only contributes the self credit.
Missing, duplicate, or mismatched K-1 source claims fail before filing.
Pass-through-only recipients do not attach Form 8826 under the official
instructions.

Positive passive, other mixed self/pass-through combinations, barrier-removal, equipment,
controlled-group, predecessor, capitalization/basis, and other deduction
locations remain open. Expenditure and K-1 source authentication, broader complete-return XSD/business
rules and ATS acceptance remain open. See the qualified component evidence below;
it does not establish a complete mixed-source filing route.


## October 10 mixed K-1 inventory component checkpoint

The PDF now matches every admitted nonpassive partnership/S-corporation source
by kind, EIN, issued reference and capped amount, independent of graph order.
Its prepared Form3800 check reconciles the complete multiset of self-document
and K-1 detail rows, source count, line1e totals and final allowed-credit join.
The original interpreter/prior-year/deduction evidence guards remain. The full
line6 credit2375 still reduces expense5000 to2625 even when the allocated self
share is1250 or no current tax credit is usable.

Seven original public-input cases remain in `form8826_inventory.fixture.ts`:

| Case | K-1 sources | Line7 | Line8 | Allowed credit | Calculated final tax | Evidence boundary |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| mixed-two | 2 | 300 | 2675 | 2675 | 13411 | Components reconcile |
| exact-cap | 2 | 2625 | 5000 | 5000 | 11086 | Components reconcile |
| seventeen-sources | 16 | 1600 | 3975 | 3975 | 12111 | Components reconcile; two PartV pages |
| above-cap-integral | 15 | 7125 | 5000 | 5000 | 11086 | Components reconcile; self1250 and fifteen250 shares |
| above-cap-cents | 31 | 3100 | 5000 | approximately5000 | 11086 | PDF source attribution rejects; deferred146 |
| partial-tax-use | 2 | 300 | 2675 | 181 | 2738 | Component only after explicit prepared allocation; public intake deferred147 |
| zero-tax-use | 2 | 300 | 2675 | 0 | 477 | Components reconcile; all2675 remains unused |

All seven original complete native preparations reject at the Form8995
single-Schedule-C/K-1 boundary (deferred145); fresh complete PDF attempts also
reject because Form3800 requires that prepared native bundle. No K-1 was removed and no business
income was changed to obtain a passing return. The cent case retains all31
sources: residual cents go to different issuers because the source calculator
and gross ledger use different order. The partial case retains its original
no-election/public-input evidence; its separately reviewed component allocation
is `[0,0,181]` in graph order (S corporation, partnership, self), supplied directly
to prepared pending data, not claimed as public-route support.

Validation: six focused component tests, eight existing PDF/source tests and
50 related native/routing/cap tests pass (64 total). The focused tests reject
48 altered native component pairs,48 altered PDF projections and42 altered
prepared-detail projections; these are not complete-return tamper counts.
Six component packets contain62 pages and45 PartV source rows. The12 standalone
namespaced IRS8826/IRS3800 roots pass the cached TY2025v5.4 component schemas;
this is not Return1040 XSD or archive validation. Initial harness IDs used
underscores and failed the ID pattern; schema-safe hyphenated synthetic IDs
corrected that harness, without changing runtime values or source inputs.

All62 component pages were rendered at1400px:37 unique pages and25 exact pixel
duplicates, reviewed through10 contact sheets. Amounts, source EINs, full line6
expense reduction, capped shares, explicit partial use, unused credits and both
PartV continuations reconcile. Existing qualifications26 (filled skipped
SectionB lines),68 (RETAILER ALEX header order),76 (blank zero cells) repeat;
no deferred presentation repair was made. The static component copies have no
AcroForm or widget fields. Source authentication, full return/attachment/A2A
assembly and IRS acceptance remain unproved.

Private reproducible evidence: `.state/research/form8826-inventory-2026-10-10/`
contains unchanged original inputs/calculation/errors, component native/PDF
outputs, independent Decimal cap/tax checks, XSD logs, page origins/render
hashes, typed test logs and the qualified visual review. These components are
kept separate from the137 complete business-credit returns/2650 reviewed pages
and the PR's15 complete returns/283 pages. No main-board parent is closed.
