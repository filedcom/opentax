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

The same first-year method now accepts two contracts in distinct Schedule C
businesses when each has its own business and contract identity, signed
contract, cost ledger, and estimate review reference. The exporter sums both
independently computed AMT profits and checks the retained zero regular
Schedule C result, Schedule 2 line 2, and Form 1040 line 17. In the authored
case, the first contract yields $150,000 and the second yields $80,000; Form
6251 line 2p is $230,000. Native MeF and PDF projection replay both source
workpapers and reject altered costs, duplicate references, regular receipts,
printed line 2p, or finalized tax. These fixtures are written but unrun. The
[2025 Form 6251 line 2p instructions](https://www.irs.gov/instructions/i6251)
require percentage-of-completion AMT income less regular income for each
applicable long-term contract.

Reviewed references do not authenticate contract or cost-estimate bytes.
Prior-year progress, variable-price contracts, losses, home construction,
more than two contracts or businesses, regular-tax percentage-of-completion,
completed-contract look-back interest, passive/at-risk limitations, and
negative line 2p adjustments remain open.
