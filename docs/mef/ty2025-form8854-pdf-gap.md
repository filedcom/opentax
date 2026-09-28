# TY2025 Form 8854 PDF boundary

Status: neither the initial `f8854` nor annual `f8854_annual` native route has a
registered PDF descriptor. Both remain open print and source-coverage gaps, not
approved exclusions. Do not render a positive Form 8854 by copying entered
figures from the native inputs without the prior-year and final-return joins
below.

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

The current input has five scalar
`prior_year_us_income_tax_less_foreign_tax_credit` values for 2020-2024 but
does not identify or read those prior returns and Schedule 3 credits. The
native builder prints the same entered values in Part II Section A; its
covered-expatriate decision uses their average. Consequently, even the
noncovered path cannot independently establish whether Section C is properly
absent. `certified_tax_compliance` and the prior-year residence/exception facts
are also self-declared without the five-year filing/payment evidence needed to
support the Section A answers. The balance sheet has typed categories and
arithmetic totals, but no asset- or liability-level valuation evidence join to
its completeness confirmations. A covered path can reconcile identified
mark-to-market assets to Form 8949; that current-year join does not cure the
prior-year status or balance-sheet gaps. Section D additionally needs its
separate hypothetical-return and deferral-agreement evidence to be reflected
in the complete printed package.

## Annual statement

The annual input requires a `prior_form8854_document_id` on each obligation
and a `prior_form8854_obligations_confirmed_complete` flag. The annual native
builder does not load that prior Form 8854 or a durable carryforward ledger to
verify that every prior deferred property, eligible compensation item, and
nongrantor trust appears in Part III with the original gain, deferred tax, and
waiver status. It can match a 2025 property disposition to an identified
Form 8949 transaction, and it internally matches entered distribution rows to
entered `source_1042s` summaries. Those are useful current-year checks, but
the Form 1042-S summaries are not independently joined to actual source
documents, and neither check establishes the prior-year inventory. The
no-distribution annual case is not safe to print merely because current rows
are empty: the earlier filing could contain an omitted item.

To open either PDF route, add a durable, document-identified prior-return
source. Recompute the initial five Section A tax amounts from each year's Form
1040 total tax and foreign tax credit, verify the covered-status and Section C
decision, and substantiate Section B valuations/completeness. For annual
filings, import and reconcile every surviving obligation against the actual
prior Form 8854/carryforward history, then join 2025 sales and distributions
to filed Form 8949 and Form 1042-S evidence. Only then map all applicable
official fields and required statements, reconcile them with native MeF and
the final Form 1040, and retain the separate signature and mailing obligations
described in the IRS instructions.

No PDF descriptor, registration or focused print test was added. No tests,
typecheck, XSD validation or filled-PDF rendering was run in this audit.
