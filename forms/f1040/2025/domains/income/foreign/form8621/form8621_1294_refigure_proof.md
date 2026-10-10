# TY2025 Form 8621 Election B full-return refigure

The 2025
[Form 8621 instructions, Part III line 9](https://www.irs.gov/instructions/i8621)
require line 9a to include the QEF's undistributed earnings, line 9b to be the
total tax as if those earnings were absent, and line 9c to reduce Form 1040
line 24. Subtracting the earnings only from taxable income misses deductions and
credits that change with AGI or MAGI.

`executeReturn` now runs a second complete graph from the same public source
inputs, reducing the elected holdings' QEF ordinary earnings and capital
gain by their source-checked undistributed amounts. The second graph retains every
other source, including prior section 1294 tax. Its Form 1040 line 24 is line
9b; the original complete return's tax before deferral is line 9a. The Form 1040
sink then recomputes its filed line 24, balance or refund, and Form 8621 line 9c
from that difference. Both native and PDF exporters rerun both graphs from the
retained inputs and reject any change to the filed pending packet or the
counterfactual source.

The existing public Schedule A amount and the reviewed Schedule 1-A age, SSN,
and zero-exclusion inputs exercise two AGI-sensitive effects:

| Source variation                                    | Actual deduction | Without-QEF deduction | Source-derived 9c | Original taxable-income-only result |
| --------------------------------------------------- | ---------------: | --------------------: | ----------------: | ----------------------------------: |
| Schedule A, $30,000 medical expense, 7.5% AGI floor |          $24,225 |               $24,375 |              $473 |                                $440 |
| Schedule 1-A, age-75 taxpayer, senior MAGI phaseout |           $5,880 |                $6,000 |              $462 |                                $440 |

The medical packet has 8 pages: Form 1040 (2), Schedule 1 (2), its line 8z
statement (1), Schedule A (1), and Form 8621 (2). The senior packet has 9 pages:
Form 1040 (2), Schedule 1 (2), its statement (1), Schedule 1-A (2), and Form
8621 (2). Both validate against the full local TY2025 MeF v5.4 `Return1040.xsd`;
all 17 pages were rendered at 85 dpi and visually reviewed under
`/tmp/opentax-form8621-qef-agi-rendered/`. Their final PDF SHA-256 values are
`274a91b56a46731a9633ec864242ff2e266026f7ea43dae3f04678444d7204aa` and
`d09e85533d797dc04b5b167a3653d63476c76909dce41f923bb3993e9e847f06`,
respectively.

The earlier five reviewed Form 8621 packets remain byte-identical after this
change: QEF `c096ab1a70c266c86abeccceb92b475773583966c6eab2da933f0482317a1a9a`,
partial Part VI
`f55c3e0fae780da23f7e1a86d26a28d82afc97e11dc61545824b2a80d5a34f4e`,
seven-election Part VI
`28dab3e55115bf9156917904e73d0d0cb47e1bb53a92ff87175c8e761da49ca0`, multiple MTM
`21fa352ad272c655be91eb2a5ae064d6059a2efb69167fa65736590ddbbfab68`, and MTM line
14c `bc1f4f6350dbd4d603a5d77ed2dfd98ff8ef9883439d0ddf7f25dfd0a6fbb8e1`. The
focused source/native/PDF/XSD gate passed 36/0 in
`/tmp/opentax-form8621-qef-agi-focused-oct6.log`; the Schedule 2/Form 8978
preservation gate passed 56/0 in
`/tmp/opentax-form8621-qef-agi-preservation-oct6.log`.

The new tests use synthetic source and acceptance copies, not authenticated IRS
records. The Schedule A medical expense is the currently supported public line-1
amount; this test proves the refigure, not independent invoice authentication.
Multiple simultaneous Election B holdings now require the separately sourced
per-fund and aggregate tax-difference allocation described below. Form 8990
remains guarded until its
source-limited two-pass route can compose with a QEF return. Existing Form 8615,
Schedule J, and AMT gates remain. Newly
discovered Part II D–H, qualifying-insurance, and atypical indirect-owner
workflows remain outside this original parent scope.


## Verified current-main integration

Main4a45410da: source7/0(25s) and seven-module36/0(32s); `/tmp/opentax-form8621-qef-agi-current-main-focused.log` and `/tmp/opentax-form8621-full-refigure-current-main-focused.log`. Full-return QEF counterfactual refigures sourced medical floor473 and senior MAGI phaseout462 rather than440 regular-only difference; finalsourcegraph conflicts rejected. All7fullXSD PDFs/55reviewedpages exactly match prior5/38 plus new2/17 originals; `/tmp/opentax-form8621-full-refigure-current-main-pdf-comparison.json`. Prior related56/0 preserved isolated source proof; latestfull remains live, not a completed gate. AMT/ScheduleJ/Form8615, mixed two-pass, multiple elections, external accepted-filing authenticity and IRS gates remain open.
## Form 6251, Schedule J, and Form 8615 continuations

The full-return counterfactual now also carries the 2025 source routes for ISO
AMT, a Schedule F-only Schedule J election with separately identified nonfarm
QEF ordinary income, and a child's Form 8615. The first-pass regular-tax
estimate can differ from the complete line 24 tax increase in these cases, so
the final native and PDF replay remains mandatory. The Schedule J join subtracts
only source-replayed QEF ordinary income from the farm activity AGI check; its
Schedule F profit, attributable SE deduction, and QBI deduction still bound the
elected farm income. Other nonfarm income remains under the existing Schedule J
source guard. In the Form 8615 shadow, the child's unearned-income worksheet
amount is reduced by exactly the QEF undistributed earnings, while the retained
parent facts remain unchanged.

| Full-return source variation                                         | Form 8621 line 9a | Line 9b | Line 9c | PDF pages |
| -------------------------------------------------------------------- | ----------------: | ------: | ------: | --------: |
| Issued Form 3921 ISO exercise, positive Form 6251 AMT                |           $94,310 | $93,750 |    $560 |        11 |
| Cash Schedule F, Schedule J $15,000 elected farm income, nonfarm QEF |           $21,433 | $21,241 |    $192 |        16 |
| Child's $5,000 bank interest and $2,000 QEF in Form 8615             |              $652 |    $412 |    $240 |         9 |

All three source packets validate against the full local TY2025 MeF v5.4
`Return1040.xsd`; all 36 pages were rendered at 85 dpi and visually reviewed
under `/tmp/opentax-form8621-qef-amt-rendered/`. The final PDFs are
`/tmp/opentax-form8621-qef-amt-oct6.pdf` (SHA-256
`a7b62dd2f8b848bc88d46a3a37611cf108c0846c127f59c7fff8616f6110bc40`),
`/tmp/opentax-form8621-qef-schedulej-oct6.pdf`
(`dd48ecae40224e57e01b3bd3d9f993f9279cb5ec19ab9ceb9ba02d8d6096b01c`), and
`/tmp/opentax-form8621-qef-8615-oct6.pdf`
(`a69cd6e8ccdf3a2623757af7139f1d288c95eb7c248931829b390eb21cefa554`). The
previous seven Form 8621 packets still match all prior PDF SHA-256 values and 55
reviewed pages. The combined focused gate is recorded in
`/tmp/opentax-form8621-qef-amt-focused-oct6.log`.

The Form 3921, Schedule J base-year, and parent Form 8615 facts in these tests
are the existing public synthetic review fixtures; they are computation proof,
not authenticated issuer, parent-return, or IRS acceptance records. Wider
Schedule J nonfarm-attribution combinations and Form 8615 source variants still
need their own evidence before filing.

## Reviewed Form 8839 two-pass composition

The [2025 Form 8839 instructions](https://www.irs.gov/instructions/i8839)
place the nonrefundable adoption credit on Schedule 3, line 6c and limit it
using Form 1040 line 18 after prior credits. Thus the Election B without-QEF
return must settle the adoption credit anew; a raw graph run does not do this.
The existing reviewed, byte-bound one-child adoption route is now an explicit
two-pass runner reused for the full and without-QEF returns. Exporters replay
both source returns, and the adoption packet reconciliation compares its
settled Schedule 3 and the subsequently refigured Form 1040. The pre-adoption
and final source checks remain in force.

The mixed public W-2, reviewed adoption documents, and 2025 QEF annual statement
produce Form 8621 lines 9a/9b/9c of **$7,895/$7,455/$440**. Form 8839 carries
$6,000 nonrefundable and $5,000 refundable credit; Schedule 3 line 6c is
$6,000, and the final Form 1040 line 24 is $7,455. Both native and PDF
exporters reject a changed retained W-2 source. The complete packet validates
against the local TY2025 MeF v5.4 `Return1040.xsd`. Its nine PDF pages—Form
1040 (2), Schedule 1 and statement (3), Schedule 3 (1), Form 8621 (2), and
Form 8839 (1)—were rendered and visually reviewed in
`/tmp/opentax-form8621-qef-adoption-rendered-oct6/`. PDF:
`/tmp/opentax-form8621-qef-adoption-oct6.pdf`, SHA-256
`313ed601462c763eb346d13b95a8bdb36b0488dac518ffaa2a38cbe47fb71db7`.
The focused new and prior source test gate passed 13/0 at
`/tmp/opentax-form8621-qef-adoption-focused-oct6.log`.
The 10 earlier packets were regenerated in
`/tmp/opentax-form8621-qef-adoption-preserved-oct6/`: all 10 PDFs match their
recorded SHA-256 values above, preserving all 91 reviewed pages. The replay
gate passed 10/0 in
`/tmp/opentax-form8621-qef-adoption-preservation-oct6.log`.

Form 8990's current provisional ATI contract accepts only `general` and one
Schedule C source, and its calculated return retains an unfileable diagnostic
pending durable source and carryforward evidence. A QEF holding fails that
contract. No Election B/Form 8990 filing claim is made from its internal
projection, and the existing guard remains.

### Shadow credit limit and zero deferred tax

The actual Form 8839 return must still use its entire nonrefundable credit.
The hypothetical without-QEF return used only for Form 8621 line 9b may have
less tax capacity; its unused credit is neither a filed carryforward nor a
reason to reject the actual return. With reviewed adoption facts, $64,500 of
W-2 wages, and $2,000 of QEF income, the actual Form 1040 line 18 is $6,085
and uses all $6,000 of nonrefundable adoption credit. The hypothetical line
18 is $5,645 and therefore uses only $5,645. Form 8621 lines 9a/9b/9c are
**$85/$0/$85**. Calling the ordinary public Form 8839 filing path for the
hypothetical return still rejects its $355 unused credit; only the private
counterfactual runner permits this calculation.

The [2025 Form 8621 line 9c](https://www.irs.gov/pub/irs-pdf/f8621.pdf)
instructs subtraction of 9b from 9a without a positive minimum. A separate
source-backed $1 QEF inclusion falls within the same tax-table band, making
both line 9a and 9b $7,455 and line 9c **$0**. Its Election B form retains a
zero deferred-tax entry and the Form 1040 arithmetic remains unchanged.

Both additional packets have nine pages with the same form inventory as the
first adoption packet. Their full native XML validates against local TY2025
MeF v5.4 `Return1040.xsd`; all 18 pages were rendered and visually reviewed
under `/tmp/opentax-form8621-qef-adoption-extended-oct6/`. The PDF SHA-256
values are `e8d849fc136308e422c5b170f11c00bbf6da29fec91520ba7f5706c30abe5256`
for the shadow-credit case and
`ba4ce42961e9fd7ca17b31ee7dff00cf82942d2cbc353bc9e73ab8d009dce36b`
for the zero-deferral case. The source and pending snapshots, page origins,
XML, and PDFs are retained in that directory.
The combined Election B, Form 8839, income-tax worksheet, and Form 1040
arithmetic gate passed 71/0 in
`/tmp/opentax-form8621-qef-adoption-extended-focused-oct6.log`. It regenerated
all 10 prior PFIC PDFs into
`/tmp/opentax-form8621-qef-adoption-preserved-oct6/`; every SHA-256 still
matches its reviewed counterpart across the earlier 91 pages. The original
nine-page adoption PDF also remains byte-identical.

## Simultaneous Election B holdings with additive tax effects

The [2025 Form 8621 instructions](https://www.irs.gov/instructions/i8621)
require a separate copy per PFIC. Each copy's line 9b excludes that QEF's
own undistributed earnings, while [section 1294](https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title26-section1294)
and [Treasury regulation 1.1294-1T(f)](https://www.govinfo.gov/content/pkg/CFR-2024-title26-vol13/pdf/CFR-2024-title26-vol13-sec1-1294-1T.pdf)
define the deferred tax by comparing whole-return tax with and without those
earnings. For each elected source identity, the engine now recomputes the
complete return without only that fund's undistributed amount. It also
recomputes tax without all elected amounts. Filing proceeds only if the sum
of the per-fund differences equals the aggregate difference exactly; native
and PDF copies read the resulting independently replayed 9a/9b/9c values.
The exporter independently reruns all source returns and rejects a changed
per-fund allocation.

The reviewed two-QEF source packet has separate 2025 issuer, annual statement,
and activity records for both funds. With the reviewed W-2 and adoption
documents, the complete return has $8,335 tax before deferral and $7,455
after. Each Form 8621 reports 9a/9b/9c **$8,335/$7,895/$440**; their $880
sum agrees with the whole-return tax decrease. The packet has 11 pages:
Form 1040 (2), Schedule 1 and statement (3), Schedule 3 (1), two Form 8621
copies (4), and Form 8839 (1). All 11 were rendered and visually reviewed in
`/tmp/opentax-form8621-qef-multi-rendered-oct6/`. The full native packet
validates against local MeF v5.4 `Return1040.xsd`; PDF SHA-256 is
`b2196e058d58e6a68fcc6d9ed524c9b4ced8060f49307c791d3e35aec53ea92d`.
Source inputs, pending, XML, PDF, and page origins are retained under
`/tmp/opentax-form8621-qef-multi-oct6/multi/`.

A third separately identified 2025 QEF source also reconciles: each of its
three Form 8621 copies has 9a/9b/9c **$8,775/$8,335/$440**, summing to the
$1,320 reduction from $8,775 to $7,455 on Form 1040. The 13-page native
packet validates against the same full XSD, all pages were visually reviewed
in `/tmp/opentax-form8621-qef-triple-rendered-oct6/`, and the PDF SHA-256 is
`a96ca1f7614fab82998888c59361b1befa2d927634eec4e3abae29bd6e0cf5e8`.
Its source, pending, XML, PDF, and origins are under
`/tmp/opentax-form8621-qef-multi-oct6/triple/`.

The additivity guard is material. At $64,500 of wages, the full return's tax
after adoption credit but before deferral is $525. Removing either fund alone
leaves $85 of tax, so two independently computed line 9c amounts would total
$880. Removing both funds leaves $0, making the aggregate deferrable tax only
$525. The route rejects this source packet as nonadditive. The cited IRS
instructions, statute, and regulation do not specify an allocation method
for that interaction; a supplied scalar or arbitrary ordering would not
establish it. Nonadditive simultaneous elections remain guarded pending a
defensible allocation rule and source evidence. The additive route is a
bounded supported case, not completion of every simultaneous-holding case.

The combined six-module gate passed 73/0 in
`/tmp/opentax-form8621-qef-multi-focused-oct6.log`. It regenerated the prior
10 reviewed PFIC PDFs (91 pages) and all three earlier adoption PDFs (27
pages) with unchanged SHA-256 values. The strengthened nonadditivity source
boundary passed 1/0 on a final focused rerun.
The final six source/native/PDF/XSD packet and conflict cases passed 6/0 in
`/tmp/opentax-form8621-qef-multi-final-oct6.log`.

## Election B with education and dependent credits

Form 8863's MAGI and Credit Limit Worksheet are reviewed source workpapers,
but their return-derived entries change in the hypothetical without-QEF
return. The staged route first computes actual Form 1040 AGI, line 18, and
preceding Schedule 3 credits without Form 8863, verifies the filed workpaper,
then computes the completed source return. In each counterfactual it keeps the
same school, payment, scholarship, claimant, and dependent evidence while
recomputing only those return-derived workpaper entries. For a reviewed
Schedule 8812, it also recomputes the dependent credit's AGI, tax limit, and
preceding education credit before the final graph pass. Its actual filed
source values must match independently derived values.

The valid no-1098-T scholarship exception source packet has $75,000 issued
W-2 wages, $6,000 taxable scholarship and $2,000 undistributed QEF earnings.
Actual AGI is $83,000; Form 8863 credits are $1,050 nonrefundable and $700
refundable. Without QEF, AGI is $81,000 and the credits are $1,350 and $900.
Form 8621 lines 9a/9b/9c are **$8,665/$7,925/$740**. The complete 10-page
native packet validates against local MeF v5.4 `Return1040.xsd`, and all
pages were rendered and reviewed at
`/tmp/opentax-form8621-qef-education-contact.png`. PDF SHA-256 is
`58858343a5e15f85b5b50a960650fad0ec3ec2e5a6b1ded996485586be71b1a7`.

A separately reviewed issued Form 1098-T, two paid education records and a
tax-free scholarship establish $7,500 of LLC expenses. With $17,000 issued
W-2 wages and the same $2,000 QEF inclusion, income tax is $328 and the LLC
credit is limited to $328. Without the QEF, tax and the LLC credit are both
$126. The whole-return line 9c is **$0**. Its 10-page native packet validates
against the same full XSD; all pages were reviewed at
`/tmp/opentax-form8621-qef-education-issued-contact.png`; PDF SHA-256 is
`f0ed9b1067d9d863e689ff64bad912c8a8a1e3177a659040f34d518e6f707d56`.

The reviewed two-student claimant packet retains two issued 1098-T copies,
tuition and scholarship records, dependency/owner reviews, and Schedule 8812
source worksheet. Actual AGI and income tax are $77,000/$8,395; without QEF
they are $75,000/$7,955. Both returns use $3,000 education and $1,000
dependent credits. Form 8621 lines 9a/9b/9c are **$4,395/$3,955/$440**.
The 13-page native packet validates against the full XSD; every page was
reviewed at `/tmp/opentax-form8621-qef-education-dependent-contact.png`;
PDF SHA-256 is
`414033b3c49e6e134d5d29ff15cfb0f9d16bc640a1eb803ed18f431d73e6ba10`.
The three immutable source/pending, native XML, PDF and page-origin snapshots
are under `.state/research/form8621-qef-education/` in the isolated tree.

The [2025 Form 8621 instructions](https://www.irs.gov/instructions/i8621)
point line 9a at Form 1040 line 24, while
[temporary regulation 1.1294-1T(f)](https://www.govinfo.gov/content/pkg/CFR-2024-title26-vol13/pdf/CFR-2024-title26-vol13-sec1-1294-1T.pdf)
defines the deferred amount as a change in **Chapter 1** tax. Form 1040
line 23 may include Chapter 2A net investment income tax under
[section 1411](https://uscode.house.gov/view.xhtml?req=%28title%3A26+section%3A1411+edition%3Aprelim%29).
A sourced $198,000 W-2/$1,000 bank-interest/$2,000 QEF example produces
$38 NIIT with the QEF but zero without it. The route rejects that change
instead of including $38 of non-Chapter-1 tax in the Election B deferral.
Stale filed education MAGI/tax worksheets and dependent AGI sources also fail.
The native and PDF exporters reject a changed education-credit pending value
on independent source replay. The six focused new packet/conflict cases passed
6/0 in `/tmp/opentax-form8621-qef-education-final-oct6.log`. The broader
Form 8621, adoption, AMT, education owner/scholarship, and Schedule 1 source
gate passed 32/0 in
`/tmp/opentax-form8621-qef-education-focused-oct6.log`.

## Election B with a tax-limited general business credit

The reviewed employer childcare and referral source packet supplies the
Form 8882 and Form 3800 credit facts. Adding the independently sourced QEF
holding produces $18,347 of income tax before credits and $9,533 of allowed
Form 3800 credit. Without the undistributed QEF earnings, the re-executed
return has $17,867 of income tax and $9,573 of allowed business credit.
Form 8621 lines 9a/9b/9c are **$8,814/$8,294/$520**; the filed Form 1040
line 24 is $8,294. The Form 1040 sink replay now removes the settled
Schedule 3 line 6a credit from its already deposited line 20 input before
recomputing the Form 3800 allowance. This preserves the other preceding
credits and prevents counting the business credit twice.

The actual 21-page native packet validates against the full local MeF v5.4
XSD. All pages were rendered and reviewed in
`/tmp/opentax-form8621-qef-business-contact-1.png` and
`/tmp/opentax-form8621-qef-business-contact-2.png`; PDF SHA-256 is
`da0c3c7d9899a6939a3d91768ffdbc61b03594e0e299f7bae3b6a89294cd29ed`.
Its source, pending, XML, PDF, and page origins are under
`.state/research/form8621-qef-business-credit/` in the isolated tree.
Changing Schedule 3 line 6a by one dollar makes both native and PDF export
reject the packet on independent full source replay. The eight focused
education/business packet and conflict cases passed 8/0 in
`/tmp/opentax-form8621-qef-business-final-oct6.log`.

## October 10 combined education and adoption credit checkpoint

The public Election B route now settles education first and adoption second in
both the actual and without-QEF graphs. Previously, the combination was rejected
before either graph could be reconciled. The existing runners still validate
actual education MAGI and the credit-limit worksheet, retained adoption sources
and required attachments; only the hypothetical graph recalculates the source
worksheet operands. Both exporters replay the complete retained sources.

The [2025 Form 8839 line 17 worksheet](https://www.irs.gov/instructions/i8839)
subtracts Schedule 3 education credit before limiting adoption credit. The
[Form 8863 credit-limit worksheet](https://www.irs.gov/instructions/i8863) does
not subtract adoption credit. [Form 8621 lines 9a–9c](https://www.irs.gov/instructions/i8621)
require the corresponding full-return tax difference. These support composing
the two existing stages in that order, rather than subtracting QEF income from
an already settled taxable-income figure.

Both synthetic sources combine an existing $6,000 taxable-scholarship/AOTC
packet, $11,000 reviewed adoption expenses and $2,000 undistributed ordinary
QEF earnings. The $11,000 expenses split into $5,000 refundable and $6,000
nonrefundable adoption credit. Issuer, school and decree evidence remains
synthetic contract evidence, not external authentication.

| Case | Wages | Actual / without QEF AGI | Actual / without QEF tax before credits | Education nonrefundable actual / without | Adoption nonrefundable actual / without | QEF 9a / 9b / 9c | Filed refund |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AOTC phaseout | 75,000 | 83,000 / 81,000 | 9,715 / 9,275 | 1,050 / 1,350 | 6,000 / 6,000 | 2,665 / 1,925 / 740 | 14,775 |
| Hypothetical adoption limit | 66,000 | 74,000 / 72,000 | 7,735 / 7,295 | 1,500 / 1,500 | 6,000 / 5,795 | 235 / 0 / 235 | 17,000 |

The single-filer tax values independently agree with the [2025 Tax Table](https://www.irs.gov/pub/irs-pdf/i1040tt.pdf)
rows beginning 67,250, 65,250, 58,250 and 56,250 (PDF pages 8–10).
The first AOTC phaseout fractions are 0.7 and 0.9, yielding refundable amounts
700 and 900; the second case retains 1,000. Only actual refundable credits enter
the filed refund, with 11,000 withholding and 5,000 refundable adoption credit.
The hypothetical unused adoption amount does not create a filed carryforward.

Two new actual 11-page packets pass full local TY2025v5.4 Return1040 XSD.
All 22 pages were rendered and reviewed: Form1040 (2), Schedule1 and statement
(3), Schedule3 (1), Form8621 (2), Form8839 (1), Form8863 (2) per packet.
Amounts, identities, elections and ordering reconcile. The hypothetical-limit
packet leaves calculated/native-zero Form1040 line24 blank, repeating deferred76;
this qualification is preserved without repair. The flattened PDFs have no
remaining AcroForm fields or widgets. Required reviewed adoption attachments
are supplied to native preparation; these 22 pages count the generated tax
packet, not a new review of the synthetic evidence attachments.

The grouped QEF/adoption/return-arithmetic gate passes 52/0. After adding the
actual-carryforward boundary assertion, the final focused gate passes 3/0, including assertions on both counterfactual
credit amounts and refund arithmetic, eight native/PDF altered-credit rejections,
two stale-MAGI public rejections and one actual-carryforward rejection. The
ordinary actual-return Form8839/Form8621 carryforward guard remains intact.
The existing stale-education test now checks the combined route's source guard
instead of expecting the removed blanket rejection.

Private source/pending/XML/PDF snapshots, logs, XSD results and visual hashes:
`.state/research/form8621-combined-2026-10-10/`. No IRS transmission, business-rule
acceptance or externally authenticated source is claimed. Form8990 composition,
nonadditive multi-QEF allocation and other original parent boundaries remain
open; PartII D–H and other deferred scope remain untouched.
