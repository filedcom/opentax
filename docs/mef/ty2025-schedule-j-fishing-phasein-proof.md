# TY2025 mixed fishing/farm QBI phase-in checkpoint

The [2025 Form 8995-A instructions](https://www.irs.gov/instructions/i8995a)
require a separate Part II business column for each nonaggregated qualified
trade or business and a $197,300–$247,300 single-filer wage/property phase-in.
The [2025 Schedule J instructions](https://www.irs.gov/instructions/i1040sj)
include attributable farming and fishing income. This checkpoint composes one
retained commercial catch ledger, one actual Schedule C, one cash Schedule F,
the combined Schedule SE deduction, issued dividend copy, and Schedule J's
independently replayed no-election income tax. The C and F owner workpapers
identify a consistent positive-profit allocation method and both business
references; neither business reports employee W-2 wages or qualified-property
UBIA. They are separate Part II columns, with no aggregation election.

The checked fishing books give $50,000 of buyer sales and $20,000 of paid
supplies, or $30,000 Schedule C profit. The owned farm reports $200,000.
Schedule SE's $13,998 half-tax deduction allocates $1,825.83 to fishing and
$12,172.17 to farming, giving filed whole-dollar QBI rows $28,174 and
$187,828. Pre-QBI taxable income is $233,252, within the actual phase-in.
Part II lines 3/25/26 are $5,635/$4,052/$1,583 for fishing and
$37,566/$27,011/$10,555 for farming. Part III line 39 and Form 1040 line
13 are $12,138; taxable income is $221,114. The issued $30,000 qualified
dividend reduces the line 36 income cap. Schedule J line 23 is $41,357;
Form 1040 line 16 is $42,187 including the retained $830 Form 4972 tax.
The no-election Form 6251 regular tax is $43,214.

Native and PDF builders compare both rows with the complete retained C/F
pending sources, half-SE, filed 1040, issued dividend and the source-return
replay. They independently reject changed allocated SE, farm receipts,
qualified dividend cap, or QBI deduction. Missing business allocation review
still fails closed. Focused source tests pass 5/0 at
`/tmp/opentax-schedulej-fishing-phasein-final-v2-oct6.log`. The two
elected/no-election public source packets validate
against the full TY2025 v5.4 XSD and have 22/20 real PDF pages. All 42 pages
were reviewed in seven contact sheets at
`/tmp/opentax-schedulej-fishing-phasein-rendered-oct6`; the per-page origins
and SHA-256 hashes are in its `visual-review-manifest.json`. Immutable raw
`source-pending.json` replay, without invoking case factories, reports 2/42,
exact pending/PDF/page origins and XML differing only at ReturnTs in
`/tmp/opentax-schedulej-fishing-phasein-raw-selfcheck-oct6.log`. Four related
QBI modules pass 52/0 at
`/tmp/opentax-schedulej-fishing-phasein-qbi-preservation-oct6.log`.

The earlier eight fishing and mixed packets retain their independent 152-page
reviewed archive; raw-input preservation reports 8/152 exact pending/PDF/page
origins and XML only ReturnTs at
`/tmp/opentax-schedulej-fishing-phasein-prior8-preservation-oct6.log`.
This local result is schema, source and rendering proof;
externally authenticated catch buyers/suppliers, accepted prior-year returns,
IRS business-rule acceptance, further businesses, wages, property, losses and
other attributable source classes remain outside this checkpoint.

## Integrated current main

Main690b53d34 keeps root fishing-source omission restriction and required mining zero8995A. Fresh typed fishing5+mining2 source **7/0** (1m20s), `/tmp/opentax-fishing-phasein-mining-main-source-oct6.log`. Actual retained elected/noJ **2/42** full-XSD replay exactpending/PDF/origins/XMLonlyTs `/tmp/opentax-fishing-phasein-actual-main-held-oct6.log`; prior **8/152** unchanged `/tmp/opentax-fishing-phasein-prior8-main-held-oct6.log`. VisualmanifestSHA899e2e263c15a1cc61542ad4f557739637f755168e5fd8eb6a67fa50df315a26 transfers all42new reviewedpages by PDFbyteidentity. IsolatedQBI52/0 remains separate, broaderjointowner/attribution/prioraccepted/IRS parentsopen.
