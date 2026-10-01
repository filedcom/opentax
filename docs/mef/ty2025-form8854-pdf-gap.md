# TY2025 Form 8854 PDF boundary

Status: bounded initial `f8854` and annual `f8854_annual` PDF descriptors are
registered, but positive PDF export remains gated. Both are open
source-authentication gaps, not approved exclusions. Entered figures alone do
not prove the prior-year and final-return facts below.

The [official 2025 Form 8854](https://www.irs.gov/pub/irs-pdf/f8854.pdf) is a
five-page initial and annual statement. Every filer completes Part I. A 2025
initial filer completes Part II: Section A has five prior-year net income tax
amounts, net worth and certification answers; Section B is the expatriation-date
balance sheet; covered expatriates complete Section C; and a deferral election
requires Section D and its computations. A pre-2025 expatriate completes Part
III for each applicable prior deferred property, eligible deferred compensation
item, or nongrantor trust. The
[2025 instructions](https://www.irs.gov/instructions/i8854) say that, for
example, the 2024 Section A line 1 amount is 2024 Form 1040 line 24 less
Schedule 3 line 1, and annual Part III line 1 columns (a)-(c) come from the
previously filed Form 8854.

## Initial statement

The initial input now requires five document-identified 2020-2024 filed Form
1040 records. Each records Form 1040 line 24, Schedule 3 line 1 foreign tax
credit, a filed-return SHA-256 and IRS acceptance reference. The schema requires
one distinct record for each year and recomputes every Part II Section A net-tax
value as line 24 less that foreign credit. The covered threshold calculation and
native Section A therefore use values cross-checked against the five structured
prior-return records. A positive fixture with a 2024 $100 tax/$20 foreign credit
and altered-credit, duplicated-year, and reused-digest fixtures are written but
unrun.

The executor still does not load and authenticate the underlying prior-return
bytes or payment evidence; the references and digests are entered metadata.
`certified_tax_compliance` and prior residence/exception facts still lack
verified five-year filing/payment evidence. The balance sheet has typed
categories and arithmetic totals, but no asset- or liability-level valuation
evidence join to its completeness confirmations. A covered path can reconcile
identified mark-to-market assets to Form 8949; that current-year join does not
cure the prior-year status or balance-sheet gaps. Section D additionally needs
its separate hypothetical-return and deferral-agreement evidence to be reflected
in the complete printed package. Positive PDF export remains closed.

The initial PDF descriptor projects a noncovered former U.S. citizen with a
short U.S. mailing address, one U.S. citizenship, five prior-return tax amounts,
and cash/bank deposits as the only balance-sheet asset. It fills Part I, Section
A's five tax amounts, net worth and answers, and Section B's cash, total assets,
zero liabilities and net worth. It leaves Section C blank and marks no Section D
deferral. The five prior-return amounts are recomputed from the typed filed Form
1040 and Schedule 3 records; the PDF candidate must match the finalized initial
pending input. Other assets, liabilities, exception claims, significant changes,
covered cases and deferral are outside this projection. Native MeF and the
calculation node accept this staged source, while the PDF coverage gate still
blocks positive filing until the five source returns, tax compliance and cash
valuation/completeness can be authenticated.

## Annual statement

The annual input now requires a document-identified prior Form 8854 obligation
ledger with a filed tax year, SHA-256 and IRS acceptance reference. Its deferred
properties, eligible compensation items, and nongrantor trusts must match every
current Part III item exactly, including original gain/deferred tax and waiver
status. Omitted, changed, or newly inserted current items are rejected; a
positive one-property ledger and tampering fixtures are written but unrun. The
current bounded ledger represents one prior filing, and each current obligation
must name that filing. The executor still does not load or authenticate those
prior Form 8854 bytes, so the ledger is a cross-check of entered facts, not
proof of complete prior history. It can match a 2025 property disposition to an
identified Form 8949 transaction, and it internally matches entered distribution
rows to entered `source_1042s` summaries. The Form 1042-S summaries are not
independently joined to actual source documents. The no-distribution annual case
is not safe to print merely because current rows are empty: the earlier filing
could contain an omitted item.

The bounded annual descriptor fills shared Part I identity and status fields, up
to seven Part III deferred-property descriptions, prior gains and deferred tax
amounts, and the two no-distribution answers. It accepts only a former U.S.
citizen with one U.S. citizenship, a short U.S. mailing address, no foreign
residence or separate tax country entry, and no 2025 property disposition,
compensation distribution, trust distribution, or Form 1042-S. The current
annual input schema binds those property amounts to its prior obligation ledger,
and the descriptor uses the same Form 1040 filing scope and Form 8949
reconciliation as native MeF. A direct PDF projection is a staged candidate; the
PDF coverage gate still refuses filing because the ledger's source bytes are not
authenticated.

To open either PDF route, authenticate the five initial filed-return source
documents and substantiate tax compliance and Section B valuations/completeness.
For annual filings, authenticate the prior Form 8854/carryforward history, then
join 2025 sales and distributions to filed Form 8949 and Form 1042-S evidence.
Only then map all applicable official fields and required statements, reconcile
them with native MeF and the final Form 1040, and retain the separate signature
and mailing obligations described in the IRS instructions.

Initial cash-only and annual no-event PDF descriptors, registrations, and
focused positive/tamper fixtures were added. No tests, typecheck, XSD validation
or filled-PDF rendering was run in this implementation batch.
