# TY2025 Form 8621 Election B full-return refigure

The 2025
[Form 8621 instructions, Part III line 9](https://www.irs.gov/instructions/i8621)
require line 9a to include the QEF's undistributed earnings, line 9b to be the
total tax as if those earnings were absent, and line 9c to reduce Form 1040
line 24. Subtracting the earnings only from taxable income misses deductions and
credits that change with AGI or MAGI.

`executeReturn` now runs a second complete graph from the same public source
inputs, reducing only the elected holding's QEF ordinary earnings and capital
gain by its source-checked undistributed amounts. The second graph retains every
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
One elected QEF holding is supported; multiple simultaneous Election B holdings
need a sourced tax-difference allocation. Form 8990 remains guarded until its
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
