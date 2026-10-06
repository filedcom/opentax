# TY2025 Schedule J fishing and mixed farm source checkpoint

The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
require line 2a to combine all income, gains, losses, and deductions
attributable to the taxpayer's farming and fishing businesses. The existing
ordinary-rate Schedule C fishing and Schedule F routes had positive graph cases;
the preferential source replay rejected fishing, and the catch evidence was only
a reference. This checkpoint adds a retained operator catch-sales and
paid-supplies ledger to the reviewed cash Schedule C source. Its SHA-256 byte
digest, owner SSN, business reference, commercial vessel status, sales and
expenses must match the filed C and computed at-risk profit before the source
replay accepts fishing. The actual no-election return derives dividend
preferential operands. The elected graph must then reconcile Schedule C/F
profit, half-SE, AGI, the zero-limited QBI result, line 15, Schedule J and the
no-election 6251 regular tax. Native and PDF exporters replay that complete
public source.

The filed examples retain Ada's earlier reviewed $200,000 Schedule F grain
income and issued $35,000 dividend source with $30,000 qualified; one example
has fishing only, another has one farm, and a third has two farms. The retained
catch book has a single commercial buyer sale and one paid marine-supply
receipt, netting $320,000 in the fishing-only example or $120,000 in each mixed
example. The buyer and supplier references are reviewed operator-book records;
this proof does not authenticate buyer- or supplier-issued documents. The
prior-year Schedule J references in the underlying public fixture also remain
synthetic, so externally accepted prior returns are not claimed.

For each of the three actual source combinations, independently checking the
2025 Social Security wage cap and Schedule SE rates yields half-SE $15,203.
$320,000 combined business profit plus $35,000 ordinary dividends minus that
half-SE gives AGI $339,797 and line 15 $322,047 after the $17,750 standard
deduction. With no business W-2 wages or UBIA, this exceeds the $197,300
single-filer QBI threshold plus the full $100,000 phase-in range, so no current
QBI deduction or Form 8995-A is filed. The $15,000 election produces Schedule J
lines 3/4/23 of $307,047/$71,014/$72,757; Form 1040 line 16 is $73,587 including
the retained $830 Form 4972 tax. Form 6251 uses the separate $76,264 no-election
regular tax. Mutation cases reject a missing or altered ledger, wrong
owner/business, mismatched sale/expense, another Schedule C expense and changed
final pending before native/PDF output.

Focused source tests: `/tmp/opentax-schedulej-fishing-source-test-oct6.log`
(3/0; all six native full-v5.4-XSD and real-PDF packets). All 114 pages in the
six packets were visually reviewed using ten contact sheets; exact copy/page
inventory and source/pending/XML/PDF/origin SHA-256 digests are in
`/tmp/opentax-schedulej-fishing-rendered-oct6/visual-review-manifest.json`. The
directly rerun earlier W-2 and ordinary fishing/farm tests pass 15/0
(`/tmp/opentax-schedulej-fishing-preservation-oct6.log`). The prior W-2 2/38
packet source/pending/PDF/origin files remain byte equal, with XML differing
only at ReturnTs, against `/tmp/opentax-schedulej-w2-after6251-final-v2-oct6`.

This does not cover phase-in positive mixed C/F QBI, fishing crew wages or
lease, disposition income/loss, capital allocations, itemization/NOL, and other
income source classes. The bounded current route continues to guard those cases.
It is local schema and rendering proof, not IRS business-rule or accepted filing
evidence.

The final isolated source rerun passes 3/0 at
`/tmp/opentax-schedulej-fishing-source-final3-oct6.log`; four related QBI
modules pass 52/0 at `/tmp/opentax-schedulej-fishing-qbi-preservation-oct6.log`.
The separate checkout-independent script
`/tmp/opentax-schedulej-fishing-raw-replay-oct6.ts` reads each of the six
immutable reviewed `source-pending.json` inputs rather than invoking a case
factory, verifies each retained ledger digest, and runs the actual return,
native XML/full XSD, PDF and page origins. Its isolated selfcheck reports 6/114
with source/pending/PDF/origins exact and XML only ReturnTs in
`/tmp/opentax-schedulej-fishing-raw-selfcheck-oct6.log`. The prior Ada J/no-J
2/36 source/pending/PDF/origins and prior staged QEF/adoption/education 3/49
source/pending/PDF/origins are also byte exact against their separately retained
reviewed originals, with XML only ReturnTs.
