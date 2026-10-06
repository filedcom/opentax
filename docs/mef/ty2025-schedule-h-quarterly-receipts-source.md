# Schedule H quarterly contribution source compact

Isolated base `5e5d78b7f`. Read the entire frozen board and the retained
state/rate proof before work. The parent still requires wider source-based
Schedule H state/rate coverage. The completed state/rate route derives each line
17 period from dated wages, state notices, and contribution receipts, but
rejects every receipt before the _last_ wage date in its entire rate period.
That rejects ordinary quarterly payments when a notice spans several quarters.

Primary
[TY2025 Schedule H instructions](https://www.irs.gov/pub/irs-prior/i1040sh--2025.pdf)
require line 17(h) to sum contributions actually paid for 2025 by April 15,
2026; line 17 rows separate rate periods, not quarterly deposits. The
[California 2025 household employer guide](https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de8829-2025.pdf)
documents quarterly wage reports and due dates, with Q2 and Q3 due July 31 and
October 31, 2025. A retained July 15 Q2 payment and October 15 Q3 payment
against one April–December notice therefore merit source review when the
payments do not exceed liability accrued on the dated taxable wages. The current
all-period last-wage guard treats the July payment as unsupported.

The exact saved original split-receipt input is
`/tmp/opentax-scheduleh-quarterly-before-inputs-oct6.json` (SHA256
`df98bc80e9015ee7fc3d5f5180b9e74a312944a5d57e9068df850f2e5003031d`).
It changes only the $200 CA April–December contribution into two $100 receipts
after their respective $2,000 wage payments. The old code rejects this saved
source; the new cumulative accrued-liability check accepts it with the same
$1,338 Schedule H tax and the same reviewed PDF.

Quarterly assessments are a separate, optional retained source contract. The
California guide calculates UI on quarterly taxable wages. With two quarters
of $2,000.11 taxable wages at 5%, each quarter assesses $100.01; the two
receipts total $200.02, while rounding the whole-period product once gives
$200.01. The exact saved before input is
`/tmp/opentax-scheduleh-quarterly-cents-before-inputs-oct6.json`; without
quarterly assessment records it remains rejected. A sourced assessment must
match a notice, a quarter with an actual dated cash payment, the exact taxable
wage cents, and the rounded quarter liability. Every quarter with cash on that
assessed notice needs one assessment. A quarter after the annual state wage
base is exhausted can have real wages, zero taxable wages, and a zero
assessment. Receipts are tied to that assessment, cannot precede quarter end,
and cannot exceed its liability.

General household payroll reconciliation now sums exact cents for annual and
quarterly worker wages, W-2 wage and withholding checks, FICA and FUTA source
totals, and dated family service. It rejects source amounts finer than cents.
The independently preserved FICA-only counterexample is
`/tmp/opentax-scheduleh-fica-quarterly-cents-before-inputs-oct6.json`: its
quarter amounts sum to $2,802.49 in cents, even though binary floating-point
addition previously produced a mismatching number. Its filed tax remains $478.

These sources establish dated state contribution and complete cash-payroll
arithmetic for the reviewed routes. Rate changes, interstate wage-base credit
evidence, family state allocations, and external authenticity retain their
existing guards under the wider Schedule H parent.

## Reviewed packet and preservation evidence

The three new complete return packets are retained in
`/tmp/opentax-scheduleh-quarterly-final-oct6`: split receipts, separately
rounded cent assessments, and a zero-taxable quarter after the CA wage base.
Each has seven pages and passed the real TY2025 full XSD. The first two PDFs
are byte-identical because their source cents round to the same filed dollar
amounts; the zero-quarter packet prints Schedule H FICA $1,377, FUTA $126, and
total $1,503. All 21 pages were rendered and reviewed, including the Schedule H
continuation. The first two packets have Schedule H total $1,338.

Independent saved-source replay against unchanged candidate production is
`/tmp/opentax-scheduleh-quarterly-root-prior34-candidate-oct6/report.json`:
34 returns/191 pages, 31 fresh exact whole-graph/PDF/native/source/carry/origin
matches and three expressly historical qualifications, each full-XSD valid.
New saved-original replay is
`/tmp/opentax-scheduleh-quarterly-root-new3-candidate-oct6/report.json`:
three returns/21 pages exact whole pending, prepared, carry, origins, source,
native except ReturnTs, and PDF, each full-XSD valid. The original split input
also passed public/native/PDF/full-XSD without any added assessment record,
while the original separately rounded cents input remains correctly rejected
until matching quarter assessments are supplied. The original complete FICA
quarter-cent source passed public/native/PDF/full-XSD at $478, with its
previously reviewed five-page PDF unchanged. The FICA-only minor fixture in the
focused test has zero withholding, so its independently derived tax is $428.

The source tests reject receipts before accrual, a receipt exceeding an
assessment, a missing or mismatched assessment, phantom quarters, a nonzero
assessment after the wage base is exhausted, and subcent wages. Core
quarter/assessment conflicts are checked at public graph, native exporter,
and direct filled-PDF boundaries.


## Main integration gate

Integrated at `c2c950cbf657181e7cd3e94510c11592799b6746`. The ordinary
14-module payroll command in `/tmp/opentax-scheduleh-quarterly-main-standard-oct6.zsh`
passed **71/0** (6m5s runtime), with no ignored-test summary. Its log is
`/tmp/opentax-scheduleh-quarterly-main-standard-oct6.log`. The saved-original
main replay in `/tmp/opentax-scheduleh-quarterly-main-final41-oct6/report.json`
passed **41 returns / 238 pages**: 38 fresh exact graph/prepared/carry/origin/PDF
and native matches except ReturnTs, plus three historically qualified cases.
All sources stayed unchanged and every output passed the full retained XSD.
Production bytes were unchanged throughout both saved-source replays.

All 21 new state pages are reviewed; the three original-input variants retain
19 pages of byte-identical previously reviewed output. Final 87 main replay/gate
files are privately preserved by
`/tmp/opentax-scheduleh-quarterly-main-final-gates-preservation-oct6.json`.
Quarter diagnostic, positive, assessment, source and replay manifests were
rehashed after terminal gates. The isolated broad result was 65/6 because six
older modules lacked the worktree schema directory; this is not reported as a
passing broad run. The identical main 14-module command passed 71/0 with that
retained schema available. Source authentication, unpaid state balances, wider
state/family cases, the current full batch and IRS acceptance remain open.
