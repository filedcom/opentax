# TY2025 Form 8863 education-expense workpaper

Status: bounded implementation; the two-school LLC and AOC routes have local full-return XSD and filled-packet review evidence.

The [IRS 2025 Form 8863 instructions](https://www.irs.gov/instructions/i8863) say the 1098-T box 1 amount may differ from the actual 2025 payments, AOC course materials can be bought away from the school when needed for a course, and LLC materials qualify only when they must be paid to the institution for enrollment or attendance. Tax-free educational assistance, refunds, and expenses used for other tax benefits reduce the amount available for the credit.

For a claimed AOC or LLC student, native MeF and PDF now require one U.S. institution that supplied a 2025 Form 1098-T plus `education_expense_workpaper`. The workpaper records Form 1098-T boxes 1 and 5, document/payment references, paid tuition and eligible material categories, and disjoint reductions. The adjusted amount must exactly equal the applicable Part III expense input. The bounded route treats all box 5 scholarships as tax-free assistance applied to qualified expenses. Taxable or nonqualified-use scholarship allocation is not inferred from box 5 and is outside this route. It rejects LLC materials bought outside the institution and any course materials whose qualifying conditions are not affirmed.

When more than one student contributes to a positive credit, their Form 1098-T document references and education payment references must be distinct. A reused reference rejects before a credit is emitted, so the same sourced payment cannot be counted twice.
One payment legitimately split between students remains open until the source
model records the payment total and per-student allocations; rejecting the
shared reference is a current filing boundary, not a product-scope exclusion.

The tax node now requires this workpaper for every student contributing to a positive AOC or LLC credit; an asserted adjusted expense alone cannot create Schedule 3 or refundable Form 1040 output. Native/PDF export additionally require the final Form 1040 filing status, MAGI, line 18, refundable line 29, Schedule 3 line 3, and the Credit Limit Worksheet source lines to reconcile; direct positive native assembly without finalized return context rejects. The tax-node line 19 calculation and builder output must still be checked in the full batch. Neither payment references nor Form 1098-T numbers constitute independent verification of source documents.

Open paths: no 1098-T with a permitted IRS exception; multiple or foreign institutions; scholarship allocation outside the fully tax-free case; external proof of tuition/payment, enrollment, prior AOC years, disallowance and TIN timing; PDF appearance, TY2025 XSD and IRS business-rule validation, and ATS acceptance. The focused cases are unrun under the agreed single-batch gate.

## One sourced Lifetime Learning Credit with required institution materials

One bounded LLC route now uses $8,000 of tuition and fees, $500 of required
course materials paid to the institution, and a $1,000 Form 1098-T box 5
scholarship applied entirely to qualified expenses. The resulting $7,500
adjusted expense produces a $1,500 nonrefundable credit on Form 8863 line 19,
Schedule 3 line 3, and the finalized Form 1040 credit calculation; line 29
remains zero. When LLC materials are positive, the workpaper now needs a
separate enrollment-requirement record and an identified materials payment
from its payment inventory, with another payment reference for positive
tuition. Native and PDF export recalculate the same source and credit-limit
worksheet. A full-return positive, scholarship-source change, missing
requirement reference, and changed Schedule 3 fixtures are authored for
deferred validation. The record references and Form 1098-T amounts are
structured assertions, not authenticated school or payment bytes. Other
scholarship allocation and LLC material purchase paths remain open.

## Two U.S. institutions for one student (2026-10-06, verified locally)

The [2025 instructions](https://www.irs.gov/instructions/i8863) require the
student's institution information and adjusted paid expenses; two schools
share the student's AOC limit or the return's LLC limit. A positive route
now retains `institution_expense_workpapers`, exactly two separately keyed
school EINs with complete workpapers, instead of a single aggregate
`education_expense_workpaper`. Both institutions must be U.S. schools that
provided current-year Forms 1098-T. Each expense source follows the existing
material, scholarship, refund and other-benefit rules. The per-school adjusted
amounts must sum to the student's claimed amount. School, payment and Form
1098-T references cannot be duplicated within or across students.

The two-school LLC fixture combines $7,500 and $2,500 adjusted expenses,
producing $2,000 on Schedule 3/Form 1040, tax $5,955 and refund $5,045. Its
full XML validates the local TY2025 v5.4 XSD, with two native institution
groups and both schools/EINs on the same printed Part III. Root rendered and
inspected all five packet pages. The adjacent source/PDF/LLC suites passed
79/79; a final two-test run also proves the combined AOC expenses use one
$4,000 expense cap with $1,000 refundable/$1,500 nonrefundable credit. A follow-up two-test run also validates the AOC full return against local XSD; all five AOC packet pages were rendered and inspected, including both school EINs, Part III $4,000 expense cap, $1,000 refundable credit and $1,500 nonrefundable credit.
Changed claims, duplicate school/document/payment records and ambiguous
aggregate-plus-school workpapers reject at prepared export.

Retained LLC packet: `.state/research/ty2025-filled-pdf-review/2026-10-06-form8863-two-schools/`.
XML SHA-256 `ae8545760506c5a83a949b9884532e86baa354f4c2f6544c2c86352ce12a950f`;
PDF SHA-256 `c5826722de49c2fb21f3f24dc5cc32d4341e48c2749ad2ad9eef5a78985e211e`.
The source records are synthetic structured facts, not independently
issued school/payment bytes. Three-school overflow, foreign institutions,
missing-1098-T exceptions, other scholarship allocations, issuer/enrollment
proof, IRS business rules and ATS acceptance remain open.

AOC follow-up artifacts: `/tmp/opentax-form8863-two-schools-aoc-review/`; test log `/tmp/opentax-two-schools-aoc-xsd.log` (2 passed, zero failed). Form 1040 tax $6,455, payments $12,000 and refund $5,545 visibly reconcile. Historical assertions above that all focused cases are unrun are superseded only for the tested LLC/AOC paths; wider routes remain unproven.
