# TY2025 Form 6251 line 2p: first-year long-term contracts

## October 10 complete contract-inventory checkpoint

The existing one-contract-per-business/two-business limit is replaced by a
complete first-year contract inventory for each Schedule C business. The legacy
singular source remains accepted, but it cannot coexist with the plural source.
Business identities and every contract, signed-contract, cost-ledger and estimate
reference must be distinct across the inventory. All businesses still require
material participation, cash accounting, zero regular receipts/deductions and
reviewed first-year, unfinished, profitable non-home contracts.

The [2025 Form 6251 line 2p instructions](https://www.irs.gov/pub/irs-prior/i6251--2025.pdf)
require AMT percentage-of-completion income less regular income, with simplified
cost allocation for contracts excepted under section 460(e)(1). Each retained
workpaper independently computes rounded contract revenue from incurred costs
and estimated total costs, subtracts incurred costs, and contributes its AMT
profit to line 2p. The same replay checks native/PDF exports against zero regular
Schedule C income, Schedule 2 AMT and final Form 1040 additional tax.

Eight public-entry returns cover both legacy source shapes, three contracts in
one business, five contracts across three businesses, spouse-only and paired
owners, fractional cost ratios, and the houseboat-interest combination. All
retain AGI200,000 and payments35,000; amount owed is total tax less payments.

| Case | Businesses | Contract adjustment | Regular tax | AMT | Total tax | Pages |
|---|---:|---:|---:|---:|---:|---:|
| legacy-one | 1 | 150,000 | 37,067 | 31,483 | 68,550 | 7 |
| legacy-two | 2 | 230,000 | 37,067 | 53,883 | 90,950 | 9 |
| one-business-three | 1 | 280,000 | 37,067 | 67,883 | 104,950 | 7 |
| three-businesses-five | 3 | 380,000 | 37,067 | 95,883 | 132,950 | 11 |
| joint-spouse-three | 1 | 280,000 | 26,898 | 64,360 | 91,258 | 7 |
| joint-both-five | 2 | 380,000 | 26,898 | 92,360 | 119,258 | 9 |
| fractional-cost-ratios | 1 | 279,993 | 37,067 | 67,881 | 104,948 | 7 |
| contracts-houseboat | 1 | 230,000 | 33,647 | 57,303 | 90,950 | 8 |

Independent decimal arithmetic reconciles 24 contract records across12 business
copies, deduction choice, exemption, AMT and final balance to native amounts and
actual flattened PDF text. Both spouses' Schedule C names/SSNs match their
sources. Eight full XMLs pass cached TY2025v5.4 XSD; all65 packet pages were
observed through40 unique rendered hashes on10 sheets. The synthetic Form1098
source page is reviewed separately, including four canonical/widget values,
appearances and retained-byte digest; it does not authenticate a lender.

The grouped regression selected365 tests:362 passed initially, and three new
fixture cases lacked a W-2 document reference or the required Form1098 Copy B.
After supplying those source records, all eight focused cases pass; no
production guard was relaxed. These runs resolve all365 selected tests. The
focused cases reject34 invalid public sources,64 native mutations and64 fresh
PDF mutations covering missing/duplicate records, conflicting source shapes,
altered price, regular receipts and final AMT/tax. The benchmark remains46/133
with exactly the same87 failing IDs as34dbcb2cf. The new plural source is also
excluded from the ordinary ABLE self-employment compensation route, preserving
its existing AMT-source boundary.

Evidence: `.state/research/form6251-contract-inventories-2026-10-10/`, including
source/pending JSON, XML/XSD logs, actual PDFs, rendered hashes, independent
arithmetic, source-copy checks, regression logs and benchmark comparison.

This is qualified evidence. Native Form6251 line1a remains omitted (deferred84),
zero Schedule C amounts print blank (76), and the two joint Form6251 headers name
only Alex (68); Schedule C owner identities and positive amounts reconcile.
No deferred repair was made. References/affirmations do not authenticate signed
contracts or cost records. Prior-year progress, variable prices, losses, home
construction, regular-tax percentage-of-completion, completed-contract
look-back interest, passive/at-risk limitations and negative adjustments remain
open, as do IRS business-rule and acceptance gates. No parent board task is
closed by this first-year inventory extension.
