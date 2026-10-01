# TY2025 Form 6251 line 2p: first-year long-term contract

The [2025 Form 6251 instructions](https://www.irs.gov/instructions/i6251)
require the percentage-of-completion method for AMT on a non-home long-term
contract even when section 460(e)(1) excepts it from that method for regular
tax. Line 2p is AMT contract income less regular contract income.

A bounded source route now covers one materially participated, continuing
Schedule C business with one fixed-price non-home construction contract begun
in 2025 and unfinished at year end. The signed contract, incurred-cost ledger,
and year-end estimated-total-cost review have distinct references. The regular
exception and deferral are affirmed; no contract receipts or costs appear on
the 2025 Schedule C. The workpaper computes AMT revenue from the cost-to-cost
percentage and subtracts the incurred allocable costs. In the authored case,
$100,000 of incurred costs over $400,000 estimated total costs recognizes
$250,000 of a $1,000,000 contract and $150,000 of AMT profit. The amount flows
through Form 6251 line 2p, Schedule 2, and Form 1040. Native `IRS6251` uses
`LongTermContractAmt`; the PDF uses page 1 field `f1_20`. Both exports replay
the retained Schedule C source and final zero Schedule 1 line 3. Positive
full-return, native, PDF, and source, classification, receipt, Schedule 1, and
line tamper fixtures are authored for the deferred validation pass.

Reviewed references do not authenticate contract or cost-estimate bytes.
Prior-year progress, variable-price contracts, losses, home construction,
multiple contracts or businesses, regular-tax percentage-of-completion,
completed-contract look-back interest, passive/at-risk limitations, and
negative line 2p adjustments remain open.
