# TY2025 Schedule 1 line 8z source ledger gap

Build-stage audit, 2026-09-28. The checked-in TY2025 Schedule 1 schema has one
`OtherIncomeTotalAmt` on line 8z and an optional linked
`OtherIncomeTypeStatement` containing type-and-amount rows. The current build
registers that statement for named components such as Form 8814, HSA excess
earnings, Form 1099-G trade adjustment assistance, and Form 6198 at-risk
adjustments. Form 8621 now carries its QEF, mark-to-market, and section 1291
amounts separately into Schedule 1, AGI, and this statement. Those rows and
their parent link are written but unrun. Nonbusiness Form 1099-NEC payments
now use Schedule 1 line 8j with payer, recipient, and activity-description
rows; their total reaches AGI without an 8z statement. A reviewed Form 1098 box 4 prior-year
mortgage-interest recovery likewise has one sourced Schedule 1/AGI amount and
a distinct type row. The positive recovery now needs payer-copy identity and a
recipient matching the filer or joint-filing spouse, and both native and PDF
Schedule 1 exports reconcile the sourced taxable amount. A synthetic
$1,200 recovery in a full return passes local TY2025 v5.4 XSD and its
five-page filled PDF was inspected; see the
[Form 1098 review](ty2025-filled-pdf-review-2026-09-29.md).

Two generic scalar keys, `line8z_other` and `line8z_other_income`, remain a real
source-provenance gap. The sink cannot infer the IRS statement's required type
from a merged number. The MeF and PDF projections now reject a nonzero generic
amount instead of inventing a label. That is a temporary fail-closed boundary,
not an approved exclusion or completion of these filing paths.

| Generic deposit       | Current producer files                                                               | Missing source-to-statement decision                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line8z_other`        | `f3115`, `f8873`, `f5471` | Confirm the 2025 income line and character for each fact pattern; retain a typed source type, amount and source identity through Schedule 1 and AGI.     |
| `line8z_other_income` | `k1_s_corp`, `f3115`, `f8915d`, `k1_trust`, `f1099patr`           | Resolve pass-through, disaster and cooperative classifications separately; preserve each signed source row and its filed destination. |

The clergy producer no longer emits a negative line 8z amount. The [2025 IRS
Publication 517](https://www.irs.gov/publications/p517) treats qualifying
housing as an exclusion from gross income, while including parsonage value and
housing allowance in ministerial self-employment earnings when applicable.
Subtracting those amounts again on Schedule 1 could understate AGI; omitting
parsonage from Schedule SE could understate SE tax. The old public input lacks
the matched W-2, minister/recipient, employer, advance designation, excess
allowance review, and Form 4361 approval needed for a complete return. Every
populated clergy input now fails explicitly at calculation and MeF/PDF export. A source-backed
clergy route must reconcile the W-2 box 1 amount, report any taxable excess on
Form 1040 line 1h, include the proper housing amounts on Schedule SE, preserve
owner and payer identity, and handle the Form 4361 exemption. This is an open
filing path, not an approved exclusion.

Partnership K-1 box 11 is now code-specific. An uncoded amount rejects at the
producer and MeF/PDF export. The supported code J tax-benefit recovery requires
the partnership EIN and issued K-1 reference, statement reference, owner TIN,
reported amount, reviewed taxable amount no greater than the reported amount,
and a prior-year tax-benefit workpaper. Each positive source survives into
Schedule 1 and AGI; the native line 8z type statement carries one row per
partnership. MeF and PDF export reconcile the finalized rows to the entered
K-1 facts and filer or joint spouse. A two-K-1 $400/$600 case produces $1,000
on Schedule 1 line 8z and Form 1040 line 8, passes local TY2025 v5.4 XSD,
and prints in four inspected `v69` PDF pages. This follows the [2025 partner
instructions](https://www.irs.gov/instructions/i1065sk1) for box 11 code J.
Box 11 code E has a separate bounded fully taxable cancellation-of-debt route
to Schedule 1 line 8c. It requires the partnership EIN and K-1 reference,
statement and debt references, recipient TIN, amount, affirmative taxability and
no-section-108-exclusion review, confirmation that the debt was not reported
on Form 1099-C, and a taxability workpaper reference. The source rows survive
through Schedule 1 and AGI. MeF/PDF export checks them against the K-1 facts,
filed line 8c and filer or joint spouse; a return with any Form 1099-C source
rejects until debt-level duplicate reconciliation exists. The synthetic
$400/$600 case passes full-return TY2025 v5.4 XSD and all four `v70` PDF pages
were inspected. The [2025 partner instructions](https://www.irs.gov/instructions/i1065sk1)
direct generally taxable code E debt cancellation to line 8c and describe
possible exclusions. Excluded or partly taxable debt, Form 982, 1099-C matching,
and authentic source/workpaper evidence remain open.

Box 11 code K now has a bounded nonbusiness gambling-winnings route to
Schedule 1 line 8b. Each partnership statement must identify a positive
winnings amount, zero losses, the recipient, source K-1, and a gambling review;
the review must confirm the partnership was not in the gambling business and
the winnings do not overlap a W-2G. The K-1 rows sum with a separate W-2G
amount in Schedule 1 and AGI. Native/PDF export rechecks the issued K-1 facts,
recipient, W-2G amount, and filed line 8b. A synthetic $400/$600 K-1 plus
$200 W-2G case passes local TY2025 v5.4 XSD, and all five `v71` PDF pages
were inspected. The [2025 partner instructions](https://www.irs.gov/instructions/i1065sk1)
direct nonbusiness winnings to line 8b and potentially deductible losses to
Schedule A line 16. Partnership losses, gambling businesses, authenticated
no-overlap evidence, and issued source bytes remain open.

Other box 11 codes have distinct destinations and remain open, as do issued
source bytes, prior-return authentication, IRS business rules, and ATS.

The executor accumulates colliding scalar output keys as an array. These two
sink schemas currently expect numbers, so a return with multiple generic
producers may fail to parse before it even reaches the new export guard. A
direct typed source ledger should replace the generic scalar deposits in the
producer nodes, feed the same signed rows to AGI and Schedule 1, and create one
statement row per supported source. This is not a request for a second accepted
API shape or a scalar fallback. Source-document authenticity, correct tax
character, a populated statement, full-batch tests, XSD, filled-PDF review, IRS
business rules and ATS acceptance all remain open.

The former Form 1099-K gross-payment line-8z route is removed for TY2025.
An explicitly classified hobby payment now enters line 8j with the same
amount in AGI, including multi-payer aggregation. This does not classify
personal-item sales, erroneous reports, reimbursements, or business receipts
as hobby income. Those need their own transaction facts and destinations.

The Form 1099-MISC box 3 non-prize other-income route now requires a reviewed
payment description and carries payer, recipient, amount, and description rows
through Schedule 1. AGI receives their summed amount, and the MeF
`OtherIncomeTypeStatement` receives one type-and-amount row per payment.
Native and PDF exports reject a recipient TIN outside the filer/spouse pair.
A two-payer $5,000 case reaches Form 1040 line 8, validates against local
TY2025 v5.4 XSD, and builds a filled PDF packet. Separate bounded Schedule C
and Schedule F box 3 routes now link the payment to a reviewed activity; the
misclassified wage, prize, and excluded-income classifications still require
their own complete source audits. The
[2025 Form 1099-MISC recipient instructions](https://www.irs.gov/pub/irs-prior/f1099msc--2025.pdf)
say to identify a Schedule 1 other-income payment.

The old Form 1099-NEC nonbusiness line 8z scalar is rejected. Positive
not-for-profit or sporadic-activity box 1 payments now require the recipient,
payer, and a reviewed activity description and add their source rows to
Schedule 1 line 8j and AGI. Native and PDF line 8j combine them with any
Form 1099-K hobby amount once, and final exports reject a recipient outside
the filer/spouse pair. Two $3,000/$2,000 payments reach $5,000 on Form 1040
line 8, pass local TY2025 v5.4 XSD, and build a filled PDF. The
[2025 Schedule C instructions](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf)
direct not-for-profit activity to line 8j; the
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
reserve line 8z for other taxable income with listed type and amount. This
does not authenticate the payer form or prove that the activity lacks a profit
motive, detect duplicate reports, visually review the PDF, or establish IRS
acceptance.
