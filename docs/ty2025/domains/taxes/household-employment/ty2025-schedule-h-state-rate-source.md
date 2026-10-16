# Schedule H state/rate source working compact

Base `a72625d2c` in isolated worktree. Read whole frozen product board,
`ty2025-schedule-h-futa-payroll.md`, mixed family, parent and child-transition
proofs. Existing Section A and Section B typed rows calculate taxes, but Section
B state taxable wage allocations, period rates, contribution amounts and
credit-reduction wage allocations are supplied totals. Existing native and PDF
projectors replay those supplied rows and Schedule 2, but cannot independently
tie each line 17 row to dated worker payroll, state wage bases and actual
contribution payments. The Section B positive in the native unit test has one CA
rate row and $7,000 wages; no changed-rate full-return packet.

Primary
[TY2025 Schedule H instructions](https://www.irs.gov/pub/irs-prior/i1040sh--2025.pdf)
lines 17–23 require distinct rows for each experience-rate period, the state
taxable wages for each row, contributions actually paid by April 15, 2026, and
Worksheet 2 credit-reduction wages subject to state unemployment law. Worksheet
1 limits late-payment credit to 90%. Preserve $7,000 annual FUTA cap per worker.
New opt-in source review will derive these filed amounts from a complete
unrelated-worker payment inventory, state rate/wage-base notices and
contribution receipts; family cross-state histories beyond that reviewed source
remain guarded.

Retained prior archives: `/tmp/opentax-scheduleh-mixed-family-evidence-v5-oct6`
(6/31), `/tmp/opentax-scheduleh-parent-evidence-v2-oct6` (8/41),
`/tmp/opentax-scheduleh-turn21-evidence-v4-oct6` (2/12), plus earlier originals
referenced in parent proofs. Replay original inputs; never rewrite them. Keep
board and future bytes unchanged.

## Reviewed source route

The opt-in `state_payroll_review` retains a complete 2025 unrelated-worker
inventory with each dated cash payment, worker identity and state; state rate
notices with valid jurisdiction, nonoverlapping effective dates, rate and annual
state wage base; and actual dated state contribution receipts tied to the
notice. The calculator reconciles each worker's annual and quarterly cash
payroll, derives the $7,000 FUTA cap across chronological payments, derives each
state/period's state-taxable wages from the worker/state annual base, checks
each contribution against the rate and due-date window, and derives each
credit-reduction state's FUTA wages that were also state taxable. Filed Section
B rows, lines 10–12, 20 and 23 must equal those independent results. Native and
direct PDF replay the retained source through the same calculator and Schedule
2/Form 1040 join. Rate notices and receipts are reviewed structured facts, not
authenticated agency bytes.

The first source pays one unrelated household worker $2,000 in each 2025
quarter: CA Q1 at a reviewed 3% rate; CA Q2 and Q3 at 5%; TX Q4 at 2.7%. The
state wage bases are $7,000 CA and $9,000 TX, so line 17 state wages are
$2,000/$4,000/$2,000 and paid contributions are $60/$200/$54. The worker's
$8,000 annual wages produce $7,000 capped FUTA wages, $6,000 CA credit-reduction
wages and $1,000 TX FUTA wages. Line 18 additional credit is $118, line 19
tentative credit $432, line 22 maximum $378, CA Worksheet 2 reduction $72, line
23 credit $306, line 24 FUTA $114. FICA is $992 Social Security plus
$232 Medicare, yielding Schedule H and Schedule 2 line 9 **$1,338**.

The companion retains the exact worker pay and state rate facts. Its $200 CA
contribution receipt moves from January 15 to April 16, 2026. Line 17(h) for the
second CA rate period becomes zero; line 19 is $232. Worksheet 1's late-credit
addition is 90% of the lesser of $146 remaining maximum credit and the $200 late
contribution, rounded to $131. Worksheet 2 subtracts $72 CA reduction from $363,
giving line 23 $291, FUTA $129 and filed household tax **$1,353**. Both real
print packets have the third line 17 row on a named continuation page.

Five more complete packets retain: an exact $60.49 CA contribution calculated
from $2,003 at a schema-representable 3.02% rate; two $0.49 contribution tails
in different rows before an uncapped late-payment credit; a split CA $60
liability with $30.49 timely and $29.51 late (plus the separate $200 late CA
period), yielding integer Schedule H/Schedule 2/1040 tax **$1,356**; a zero
experience-rate notice with no invented contribution receipt; and $2,009.49
actual first-quarter wages whose filed line 17(b) is $2,009 before the 5.4% and
state-rate credit products. Exact wage and receipt cents are reconciled in
integer cents before each filed row is rounded. The filed line 20 wage and
Worksheet 2 credit-reduction wage operands are rounded before their products.
The
[2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf)
permit consistent whole-dollar filing and require cents to be combined before
rounding a line. The 2025v5.4 `UnemploymentStateExperienceRt` RatioType has five
fractional digits. A preserved $60.49 counterexample with a six-digit `0.030245`
ratio remains an explicit rejected source; rounding that ratio would contradict
its state liability.

The prior native Section B projector rounded fractional experience rates to zero
even while the PDF printed the actual rate. All Section B rows now emit their
exact schema-representable ratio string. Prior XML snapshots remain immutable;
their rate element is an intentional correction. Every other native element and
the prior PDFs are checked against the retained originals.

Source negatives reject a nonexistent worker, incorrect annual/quarter wages,
invalid or overlapping notice periods, unknown state code, reused
W-2/notice/payment references, incorrect rate, state row amount, early/late
contribution answer, unsupported contribution prepayment before the last
corresponding wages, incorrect CA reduction wage allocation, and changed Section
B lines. A destination-state wage-base crossing after wages in another state
needs separate retained interstate credit evidence and is rejected rather than
assigning a fictitious destination-state base. Native and direct filled-PDF
reject a tampered retained state row. A saved-input public replay through
preimplementation `a72625d2c` rejects both packets as unrecognized source:
`/tmp/opentax-scheduleh-state-rate-before-public-rejection-oct6.log`.

The original two 7-page source PDFs in
`/tmp/opentax-scheduleh-state-rate-evidence-v4-oct6` are byte-identical to their
counterparts in the final seven-packet source archive
`/tmp/opentax-scheduleh-state-rate-final-source-v7-oct6` (49 pages total). All
35 new pages were inspected in
`/tmp/opentax-scheduleh-state-rate-v7-rendered-oct6`; the prior 14 pages were
inspected in `/tmp/opentax-scheduleh-state-rate-rendered-oct6`. Every packet has
a full local TY2025v5.4 XSD check. The first actual-source replay passed 28
returns/151 pages in
`/tmp/opentax-scheduleh-state-rate-final28-raw-oct6/report.json`. The later
pre-ratio-correction replay passed **33 returns/186 pages** in
`/tmp/opentax-scheduleh-state-rate-final33-v7-raw-oct6/report.json`, preserving
all retained source, pending, prepared pending, carryforwards, origins, PDF and
native XML except ReturnTs. The integrated replay below independently checks the
same source family after the native ratio correction. The isolated final
eight-module gate passed **36/0**
(`/tmp/opentax-scheduleh-state-rate-standard-v8-oct6.log`); focused source gate
passed **8/0** (`/tmp/opentax-scheduleh-state-rate-focus-v8-oct6.log`). At
integrated main `5e5d78b7f`, the 14-module gate passed **67/0**
(`/tmp/opentax-scheduleh-state-rate-main-standard-oct6.log`) and the retained
source replay passed **34 returns/191 pages**
(`/tmp/opentax-scheduleh-state-rate-main-final34-oct6/report.json`): 31 newer
saved inputs have exact source, whole pending, prepared pending, carryforwards,
origins, PDF and native XML except ReturnTs, plus three historical packets with
their earlier documented qualifications. Full TY2025v5.4 XSD and source-rate
matching passed for every native output.

Those retained packets did not contain a legacy supplied-rate row. A separate
exact-input before/after proof at
`/tmp/opentax-scheduleh-legacy-rate-comparison-oct6.json` replayed a 7-page
legacy row packet from `ee63eaedf` and `5e5d78b7f`. Saved inputs, whole pending,
prepared pending, carryforwards, filer, origins, and PDF were byte-equal; the
three native ratios alone changed from `0/0/0` to `0.03/0.05/0.027` besides
ReturnTs. Both XML packets passed full XSD; the before/after source and outputs
remain in `/tmp/opentax-scheduleh-legacy-rate-before-oct6` and
`/tmp/opentax-scheduleh-legacy-rate-after-oct6`.

This selected source review does not convert older supplied Section A or B
totals into derived dated evidence. State credits with unknown rates,
contributions not fully paid, surcharge/voluntary contributions, state wage
rules other than a documented per-worker annual base, midyear rate periods
without records, family cross-state work (including a turning-21 child),
interstate wage-base credits, excess-credit state letters, and external document
authenticity remain open within the frozen parent. The three October 4 source
packets retain their historical employer-name/pending qualifications; they are
not represented as exact original-byte matches.

A worker with two same-day state payments is rejected in this source review
because their order could change which state receives the remaining annual FUTA
base; an independently retained intra-day allocation contract is outside this
selected route.
