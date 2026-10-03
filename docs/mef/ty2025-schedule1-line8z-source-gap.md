# TY2025 Schedule 1 line 8z source ledger gap

## 2026-10-02 at-risk recapture source boundary

The direct `at_risk_recapture` amount had a printable line 8z label but no
retained activity-level recapture workpaper. Native return assembly accepted a
bare $300 amount before this audit. The shared native/PDF statement builder now
rejects a nonzero scalar. Source-backed Schedule C and F loss-limitation Form
6198 paths are unchanged. The [2025 Form 6198 instructions](https://www.irs.gov/instructions/i6198)
explain that recapture depends on the activity's amount at risk becoming
negative after prior allowed losses. A positive route needs the activity,
prior-year allowed loss and at-risk history, current-year decreases, and a
calculation tying the resulting income to Schedule 1. The existing aggregate
`form6198` node's recapture input has none of those retained facts, and its
native descriptor refuses aggregate Form 6198 fields. Issued/prior-return
evidence and the source-to-attachment join remain open.

The separate `at_risk_disallowed_add_back` scalar had the same direct-export
gap: a bare $300 amount was accepted on line 8z without any Schedule C or F
activity. Native and PDF statement assembly now reject it. The existing
Schedule C and F routes compute each at-risk-limited net loss directly from
its activity facts and file separate Form 6198 copies; those routes do not need
this aggregate line 8z amount. The old aggregate Form 6198 node can still
calculate the scalar internally, but it cannot establish a filed activity or
justify an additional line 8z income item. A positive route would need a
specific activity and a reconciled computation that avoids adding back a loss
already reduced on its source schedule.

## 2026-10-02 excess golden parachute source boundary

`line8z_golden_parachute` had a fixed type label but no producer, payer record,
or retained workpaper. A directly supplied $500 scalar was accepted by native
return assembly before this audit. The shared line 8z row builder now rejects
any nonzero amount in that slot, so both native and PDF final export refuse an
unsourced type statement. A positive route needs a reviewed payment source,
recipient and tax-character facts, and a calculation connected to Schedule 1
and AGI. Neither an issued payment record nor an independent source-document
authentication path exists for this slot yet.

## 2026-10-02 Form 8814 child-election statement replay

The shared native/PDF final check recalculates each retained Form 8814 line 12
from its reviewed child-election facts, sums the child amounts, and requires
Schedule 1 line 8z's `FORM 8814` amount to equal that sum. A changed Schedule 1
amount was previously accepted by PDF export while the Form 8814 attachment
remained unchanged. A synthetic positive child-election return now prints
`FORM 8814` in the filled PDF, carries that type in the native statement, and
validates against the local TY2025 v5.4 XSD. Altering either the Schedule 1
amount alone or both it and the retained line 12 result rejects in both
exporters. The child-interest continuation also requires the exact IRS
`ChildTaxableInterestStatement` reference name for the
`ChildTaxableInterestStmt` document root; the document validator permits only
that verified pair and still rejects arbitrary names. The entered child income
record and election review are still not
authenticated against original issued income documents or the parent signature.

The same retained child election now also replays each calculated Form 8814
line 15 and their sum against the Form 1040 `Form8814Ind` tax amount. A
read-only mutation of that amount previously changed native XML while the
retained child forms stayed fixed; both native and PDF final export now reject
it. Tampering a retained line 15 also rejects. A 167-exportable-fixture replay
test probes numeric Form 1040 and Schedules 1–3 fields, excluding 12 declared
guarded fixtures; it normalizes only the assembly timestamp and passed after
this repair. These tests verify source replay, not child income authenticity
or IRS ATS acceptance.

## 2026-10-02 Form 1099-MISC box 3 final source replay

Native and PDF final export now match every Schedule 1 box 3 other-income
statement row to a positive retained Form 1099-MISC box 3 source. The replay
compares payer name and TIN, filer or joint-spouse recipient TIN, whole-dollar
amount, and reviewed payment description as a multiset. A missing, duplicated,
or altered row rejects before filing. A two-payer box 3 case combined with
Form 1099-G RTAA reaches Form 1040 line 8; both descriptions and the RTAA type
appear in the native statement and extracted filled-PDF text, and the bundle
passes local TY2025 v5.4 XSD. A negative case first demonstrated that a
changed description was accepted by final export before this replay guard.
The entered payer data and description still do not authenticate issued copy
bytes or establish that the payment has the stated tax character.

## 2026-10-02 Form 1099-G box 6 grant total replay

The existing taxable-grant route now replays the aggregate of retained Form
1099-G box 6 entries at both native and PDF Schedule 1 export. A changed or
unsourced line 8z grant amount rejects. Each positive box 6 copy now needs a
recipient TIN matching the taxpayer or joint spouse at native and PDF export;
missing and wrong-owner copies reject. Two-copy positive, joint-spouse, and
altered-total/owner fixtures are authored for the deferred bulk gate. The
source now also requires an affirmative review that each positive box 6 grant
is nonbusiness income for Schedule 1; an unclassified or business/farm grant
cannot automatically enter line 8z. The
[Form 1099-G instructions](https://www.irs.gov/pub/irs-pdf/i1099g.pdf)
identify box 6 as taxable grants. [2025 Publication 334](https://www.irs.gov/publications/p334)
directs income connected with a sole proprietorship to Schedule C, while the
[2025 Schedule F instructions](https://www.irs.gov/instructions/i1040sf)
direct agricultural program payments to Schedule F. Form 1099-G box 8 only
classifies certain box 2 business-tax refunds and cannot classify box 6.
This narrow review flag does not independently establish each grant's tax
character, payer-copy authenticity, or a business/farm route.
On 2026-10-04, the two-copy positive and changed-row/copy/total/owner cases
passed 2/2 focused tests. The positive packet's payer rows appeared in
extracted filled-PDF text and its native return passed the local TY2025 v5.4
XSD. The narrow review does not authenticate payer bytes or settle other
grant character, broader PDF, business-rule, or IRS acceptance checks.

## 2026-10-02 S corporation K-1 box 10 code J source rows

The existing tax-benefit recovery calculation now retains a separate row for
each issued S corporation K-1 code J source: corporation EIN, source-document
reference, shareholder TIN, reported recovery, reviewed taxable amount, and
prior-year benefit workpaper reference. The taxable amount cannot exceed the
reported recovery. Schedule 1 line 8z, AGI, and Form 1040 line 8 keep the
sum; the native type statement prints one row per corporation. Native and PDF
exports compare distinct source identities and complete retained rows to the
entered K-1 copies, whole-dollar total, and taxpayer or joint-spouse owner.
Two-corporation positive and changed-row, changed-copy, changed-total,
wrong-owner, and missing-identity fixtures are authored for the deferred bulk
gate. The [2025 shareholder K-1 instructions](https://www.irs.gov/pub/irs-prior/i1120ssk--2025.pdf)
direct box 10 code J recoveries to Schedule 1 line 8z to the extent the
earlier deduction reduced tax. The entered workpaper reference and review flag
do not authenticate the prior filed return or issued K-1 bytes. On
2026-10-04, the two-corporation positive and changed-row/copy/total/owner
cases passed 2/2 focused tests; extracted filled-PDF text retains both EINs.
Source bytes, complete filled-PDF review, XSD validation, and IRS acceptance
remain open.

## 2026-10-02 Form 1099-G box 5 RTAA source rows

The bounded RTAA route now requires payer name/TIN, recipient TIN, and an
issued-copy reference for every positive Form 1099-G box 5 entry. It retains
one row per copy in Schedule 1, while the same summed amount reaches AGI and
Form 1040 line 8. The native line 8z type statement prints a separately
identified RTAA row for each payer. MeF and PDF export compare those rows,
the filed line 8z total, the distinct issued-copy identities, and recipient
ownership against the retained Form 1099-G sources. Two-payer positive and
changed-row, changed-copy, changed-total, wrong-owner, and missing-identity
fixtures are authored for the deferred implementation gate. The
[TY2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
explicitly direct box 5 RTAA to Schedule 1 line 8z and require a type and
amount; [2025 Publication 525](https://www.irs.gov/publications/p525) also
states that state RTAA payments are included in income. On 2026-10-04, the
two-payer positive and changed-row/copy/total/owner cases passed 2/2 focused
tests. Both payer identifiers appeared in extracted filled-PDF statement
text, and the native full return passed the local TY2025 v5.4 XSD. Exact
payer-copy bytes, tax-program eligibility, complete visual review, other
business rules, and IRS acceptance remain open.

## 2026-10-01 Form 1099-MISC box 8 source rows

The box 8 substitute-payment route now carries one payer, recipient, and amount
row from each positive Form 1099-MISC into Schedule 1. The Schedule 1 line 8z
calculation retains the aggregate, while the native type statement prints one
row per source. MeF and PDF export compare the row multiset and total to the
original source copies and require each recipient to be the taxpayer or an MFJ
spouse. Positive two-payer and missing, changed-payer, changed-total, and
wrong-recipient fixtures are authored for the deferred implementation batch.
The two-payer source-row helper and its changed-total/payer/recipient/missing-
row cases passed one focused test on 2026-10-04. A separate full-return case
now carries two $300/$450 issued-copy records through Schedule 1 line 8z and
Form 1040 line 8, emits two native statement rows, validates against the local
TY2025 v5.4 XSD, and finds both payer TINs in the filled PDF text. Native and
PDF packet builders reject an altered statement amount or source recipient.
The three focused tests pass. A mixed-family replay also combines two box 8 copies with separate RTAA and
taxable-grant 1099-G copies: all four native and filled-PDF statement rows
appear, $1,750 reaches Form 1040 once, and the XML passes local TY2025 v5.4
XSD validation. The four focused cases pass. Issued payer-copy bytes, payment
character beyond the reported box, raster appearance, IRS business rules, and
ATS acceptance remain open. The
[2025 Form 1099-MISC recipient instructions](https://www.irs.gov/pub/irs-prior/f1099msc--2025.pdf)
and [2025 Publication 550](https://www.irs.gov/publications/p550) direct box 8
substitute payments to Schedule 1 line 8z whether they replace dividends or
tax-exempt interest; the underlying security type does not change this route.

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

Two generic scalar keys, `line8z_other` and `line8z_other_income`, have no
known current producers. Schedule 1 now rejects either key, including a zero
deposit, before calculating its totals. The AGI sink likewise rejects
`line8z_other`. The sink cannot infer the IRS statement's required type from
a merged number. MeF and PDF projections continue to reject a nonzero generic
amount in directly supplied pending data. This is a fail-closed boundary, not
an approved exclusion or completion of these filing paths.

| Generic deposit       | Current producer files                                                               | Missing source-to-statement decision                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `line8z_other`        | None now | Form 5471's wrong line 8z deposit was removed; all populated Form 5471 input rejects at calculation until section 951(a) line 8n, Form 8992 line 8o, and required documents are supported. Form 8873's asserted exclusion now also rejects at calculation; its named TY2025 scope decision remains open. |
| `line8z_other_income` | None now | Form 8915-D's asserted income or repayment now rejects at calculation instead of producing a TY2025 line 8z amount. Its named current-year scope decision and any affected-year amendment workflow remain open. |

This producer list was rechecked against the current node source on
2026-09-30. Form 3115 now applies its section 481(a) adjustment through a
named Schedule C business. The cited S-corporation K-1, trust K-1, and Form
1099-PATR nodes no longer deposit into either generic line 8z scalar. Their
remaining source and filing gaps still require separate audit.

The [2025 Form 5471 instructions](https://www.irs.gov/instructions/i5471)
direct a noncorporate shareholder's Schedule I section 951(a) inclusions to
Schedule 1 line 8n. Schedule I-1 is CFC-level input for Form 8992, not an
asserted shareholder GILTI inclusion. The [Form 8992 instructions](https://www.irs.gov/instructions/i8992)
direct an individual shareholder's Part II line 5 result to Schedule 1 line
8o. The checked-in TY2025 v5.4 Schedule 1 XSD has distinct
`Section951aInclusionAmt` and `Section951AaInclusionAmt` elements. The current
`f5471` public schema lacks the ownership, Schedule I/I-1 detail, Form 8992
calculation, and native Form 5471/8992 documents needed to lift its existing
export guard. A generic line 8z type statement would be the wrong fix.

The [Form 8873 instructions](https://www.irs.gov/instructions/i8873) say the
binding-contract exception was repealed for tax years beginning after May 17,
2006. The [latest Form 8915-D instructions](https://www.irs.gov/instructions/i8915d)
are for 2024 repayments that can require amendment of 2021–2023 returns.
Neither source establishes a positive TY2025 Schedule 1 line 8z claim. Do not
mark either path excluded before the named scope decision is approved.

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

Box 11 code S now has a bounded nonpassive Schedule D route, separate from
Schedule 1 line 8z. Each K-1 statement identifies signed short- and long-term
capital amounts, the recipient, and a character workpaper; review must confirm
that no passive limitation or special-rate component applies. The source rows
and partnership subtotals survive into Schedule D. Native/PDF export checks
them against the K-1 statements and filer or joint spouse. A $400 short-term
and $600 long-term two-K-1 case passes local TY2025 v5.4 XSD and all four
`v72` PDF pages were inspected. The [2025 partner instructions](https://www.irs.gov/instructions/i1065sk1)
direct code S short- and long-term amounts to Schedule D lines 5 and 12.
Passive losses, special-rate amounts, issued source bytes, IRS business rules,
and ATS remain open.

Other box 11 codes have distinct destinations and remain open, as do issued
source bytes, prior-return authentication, IRS business rules, and ATS.

The executor accumulates colliding scalar output keys as an array. Any future
generic producer now fails at the Schedule 1 or AGI sink, before its amount can
enter a return total. A direct typed source ledger should replace generic
scalar deposits for each supported source, feed the same signed rows to AGI and
Schedule 1, and create one statement row per source. Source-document
authenticity, correct tax character, a populated statement, full-batch tests,
XSD, filled-PDF review, IRS business rules and ATS acceptance all remain open.

The former Form 1099-K gross-payment line-8z route is removed for TY2025.
An explicitly classified hobby payment now enters line 8j with the same
amount in AGI, including multi-payer aggregation. Personal-item sales now use item-level acquisition and sale facts on Form
8949 and Schedule D: positive gains are taxable and code L cancels a
nondeductible personal loss. This does not classify erroneous reports,
reimbursements, mixed-purpose K reports, or business receipts as hobby
income; those need their own transaction facts and destinations. A reviewed
business/personal mixed route now allocates one K report between Schedule C
and Form 8949, including an identified NEC/MISC duplicate when present.
Native MeF and PDF export reject any positive K box 1a with no supported
income classification, so an unresolved source report cannot silently drop
from a filed return. A wholly erroneous report for reviewed personal gifts
or expense reimbursements now enters the non-income entry space at the top
of 2025 Schedule 1, with source-to-print reconciliation. Partial erroneous
amounts can share one K report with reviewed business, not-for-profit, or
personal-item sales; those remaining amounts follow their ordinary routes.
Other classifications and fee/refund adjustments remain open.

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
