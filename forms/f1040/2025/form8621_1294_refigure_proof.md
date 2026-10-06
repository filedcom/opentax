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
need a sourced tax-difference allocation. Form 8839 and Form 8990 two-pass
branches are guarded until they can compose with this full-return
counterfactual. Existing Form 8615, Schedule J, and AMT gates remain. Newly
discovered Part II D–H, qualifying-insurance, and atypical indirect-owner
workflows remain outside this original parent scope.


## Verified current-main integration

Main4a45410da: source7/0(25s) and seven-module36/0(32s); `/tmp/opentax-form8621-qef-agi-current-main-focused.log` and `/tmp/opentax-form8621-full-refigure-current-main-focused.log`. Full-return QEF counterfactual refigures sourced medical floor473 and senior MAGI phaseout462 rather than440 regular-only difference; finalsourcegraph conflicts rejected. All7fullXSD PDFs/55reviewedpages exactly match prior5/38 plus new2/17 originals; `/tmp/opentax-form8621-full-refigure-current-main-pdf-comparison.json`. Prior related56/0 preserved isolated source proof; latestfull remains live, not a completed gate. AMT/ScheduleJ/Form8615, mixed two-pass, multiple elections, external accepted-filing authenticity and IRS gates remain open.
