# TY2025 mortgage mid-month source periods

The prior cash-out route represented a refinance on the first day of a month,
and a separately secured lien on the first day of its origination month or the
last day of its payoff month. This addition accepts a dated mid-month event
when retained lender and closing records establish the partial periods.

The [2025 IRS Publication 936, pages 14–16](https://www.irs.gov/pub/irs-prior/p936--2025.pdf)
permits lender monthly closing balances and divides each single-use mortgage's
sum by the number of months it secured a qualified home. Mixed-use category
balances include zero months and use a twelve-month denominator in its example.
The old and new lenders may therefore each have a paid-interest row in the
refinance month. The old row ends with the actual payoff balance of zero; the
new row begins at the financed principal. A byte-bound lender ledger records
each interest period, paid date, opening, repayment, closing, interest and
statement reference. Separate retained closing and payoff records join the
actual date, wires, prepaid first-period interest, property, lender and owner.

The July 15, 2025 refinance example keeps its $200,000 acquisition payoff and
$250,000 mixed-use new principal. The old lender has six $200,000 monthly
closes and a zero July 15 payoff close, so its Table 1 average is
`$1,200,000 / 7`. The new lender's July–December closing balances total
`$1,350,000`, and the qualifying acquisition part totals `$1,200,000`; both
use twelve months. The independently derived Table 1 ratio is `.956`. Paid
interest is $6,500 old plus $6,375 new, yielding Schedule A line 8a $12,309.

The new refinance points are charged and paid at the July 15 closing. Its
retained note/payment schedule proves five actually paid August–December
installments on a 180-month term; $4,000 interest-like points multiplied by
`5 / 180` and then by `.956` yields Schedule A line 8c $106. A retained
original-loan settlement record establishes zero old spread points in this
packet. A claimed nonzero old remainder is rejected; a different-lender
accelerated remainder or same-lender new-term carryforward requires its own
prior paid-points and filed-workpaper source chain under [2025 Pub. 936,
page 9](https://www.irs.gov/pub/irs-prior/p936--2025.pdf).

Two more complete packets retain a July 15 new second-home lien and a
September 15 pre-2017 second-home lien payoff. Their issued Form 1098 Copy B,
recorded notes, invoices/payment or payoff, partial lender periods, other
qualified-home inventory, points, and total interest are source-joined before
Schedule A and Form 1040. Public parse, native and direct filled-PDF guards
reject altered dates, missing rows, conflicting payment schedules and rehashed
source documents. The retained records are reviewed test evidence, not
authenticated lender originals or IRS acceptance.

## Bounded proof

The unchanged before-gap source archives remain in their previous locations;
the three new raw input and physical source packets are saved at
`/tmp/opentax-1098-midmonth-main-v2-oct6` and
`/tmp/opentax-1098-midmonth-additional-v2-oct6/{july15-new,september15-payoff}`.
The raw replayer `/tmp/opentax-1098-midmonth-all26-raw-v2-oct6.ts` reads the
saved JSON and retained Copy B/other documents, executes the public return
graph, prepares native XML and the real filled PDF, and compares with the
saved outputs. It passed **26/26 packets, 81 filled-PDF pages, 24/24 comparable
pending packets**, exact PDF and physical source bytes, XML except `ReturnTs`,
and full local TY2025v5.4 XSD. See its sibling `.log` and output
`comparison.json`; historical originals were not rewritten.

All nine new return pages and four changed lender Copy B pages were rendered
and inspected at `/tmp/opentax-1098-midmonth-rendered-v2-oct6`. The
`/tmp/opentax-1098-midmonth-visual-review-v2-oct6.json` manifest records
physical hashes and expected Form 1040/Form 1040/Schedule A page inventories.
The three cases show Schedule A 8a/8c and itemized totals respectively:
July 15 refinance $12,309/$106/$12,415; July 15 separate lien
$35,501/$341/$35,842; September 15 payoff $35,561/$354/$35,915.

The seven-module Form 1098, refinance-points and Schedule A standard gate
passed **98/0 (4m28s)** on the held final source at
`/tmp/opentax-1098-midmonth-standard-final-oct6.log`. Public-source,
prepared-native and direct-filled-PDF negatives include missing partial rows,
wire-date conflicts, unsourced payment records, corrupted or rehashed lender,
closing, payoff, original-points and schedule records, and wrong filed points.

## Root integration verification

Integrated at c4c597887. Root seven-module standard passed **98/0, zero ignored
(6m37s)**, `/tmp/opentax-1098-midmonth-main-standard-oct6.log`, session79313
terminal0. The independent original-source reader passed **26/26 returns,
81 pages,24/24 comparable pending**, exact PDFs/retained source bytes,
native XML except ReturnTs and full XSD at
`/tmp/opentax-1098-midmonth-main-retained26-oct6/comparison.json`, session5100
terminal0. Historical no-points archives lack pending/carry/origins; equality
is not inferred. Root reviewed all nine new return pages and four changed
Copy B pages plus full-size Schedule A totals,
`/tmp/opentax-1098-midmonth-root-review-oct6.json`. All80 new and268 prior
original/private files were hash-checked after the final gates,
`/tmp/opentax-1098-midmonth-all348-preservation-oct6.json`.

Disk pressure was measured at99% with3.2GiB available. Forty-two generated
comparison pending JSON files from the completed19/23 root replay directories
were losslessly compressed to sibling `.json.gz` files, preserving exact
decompressed hashes in `/tmp/opentax-generated-mortgage-replay-compression-oct6.json`
and reclaiming1,988,654,286bytes. Those are generated comparison outputs;
original source archives, private copies, reviewed PDFs/XML and reports
remain unchanged. Use gzip decompression when reading those comparison copies.
Latest-production full regression and IRS acceptance remain required.


## Generated comparison-output storage

After the root 26-return replay completed, only its generated `*/pending.json` comparison outputs were losslessly compressed to sibling `pending.json.gz` files. `/tmp/opentax-generated-midmonth-replay-compression-oct6.json` records all 26 decompressed SHA-256 checks and 1,372,186,966 bytes reclaimed. Read those comparison files through gzip; all original source archives, private retained copies, PDFs, XML and reports remain unchanged. The earlier 42 generated inventory/payoff comparison outputs have their separate preservation manifest `/tmp/opentax-generated-mortgage-replay-compression-oct6.json`.
