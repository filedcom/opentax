# TY2025 Form 8829 coverage boundary

## October 10 reviewed rented-home source and complete-return checkpoint

The retained one-home, one-business rented-home route now binds its entered
amounts to typed reviewed records before native or PDF export. Five complete
returns pass local Return1040 XSD and archive checks, with all46 PDF pages
reviewed. The original business-loss case remains blocked by the existing
Form8995 current-loss carryforward guard (future8). This is bounded source
reconciliation, not external authentication, IRS acceptance or full Form8829
coverage.

The [2025 form](https://www.irs.gov/pub/irs-prior/f8829--2025.pdf) and
[2025 instructions](https://www.irs.gov/pub/irs-prior/i8829--2025.pdf) distinguish
business-area direct costs from costs benefiting the entire home, require
part-year expenses to relate to the business-use period, and carry unallowed
operating expenses forward. This checkpoint covers the actual-method rented
home already admitted by the calculator; it does not add an owned-home,
daycare, mortgage-interest or depreciation route.

### Source and owner contract

`rented_home.source_evidence` holds the home/business references, owner TIN,
lease reference, measured-area/use record, dated expense ledger, and either
an explicit no-prior-operating-loss confirmation or an identified2024
actual-method Form8829 line43 record. Expense records contain distinct ledger
IDs, bill/payment references, covered dates, payment date, category, whole-dollar
amount, and nonduplication/reimbursement/tax-exempt-allocation confirmations.
Direct repairs additionally identify exclusive business-area work. Ledger sums
must exactly match each entered direct/indirect category; covered dates must
fall within the reviewed2025 use period. Prior carryover must match the same
home, business and owner.

Calculation with supplied evidence rejects conflicting records. Legacy aggregate
calculation remains available for staging, but native/PDF export now requires
the evidence. The fixture-only helper creates explicitly synthetic records for
regression examples; production code never fills in missing filing facts.
References and typed numbers do not authenticate leases, invoices, payments,
measurements or prior returns against external bytes.

Native export recalculates every emitted line, identifies the primary filer as
the sole ScheduleC proprietor, and checks the business reference and tentative
profit. The owner check also applies when the current deduction is zero. A
positive line36 must match the identified ScheduleC line30 claim and filed net
profit; a zero line36 cannot create that claim. PDF instance preparation now
runs the same native source/owner/ScheduleC reconciliation before printing.
The existing conflicting-claim, simplified-method and unsupported-source guards
remain in force.

### Complete cases and independent verification

All full-year cases retain28 expense records: monthly rent/utilities plus
insurance, direct repairs, indirect repairs and other operating costs. The
July–December case retains16 records, a matching use period and no prior
carryover. The five complete cases contain128 expense records in total.

| Case | Business area | Line36 deduction | Line43 carryover | ScheduleC profit | Final tax | Pages |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| monthly-full | 200/1000 | 4100 | 0 | 45900 | 8830 | 12 |
| income-limited | 200/1000 | 2000 | 2100 | 0 | 0 | 5 |
| zero-income | 200/1000 | 0 | 4100 | 0 | 0 | 5 |
| part-year | 200/1000 | 2440 | 0 | 24560 | 4038 | 12 |
| fractional-area | 333/1000 | 6295 | 0 | 43705 | 8322 | 12 |

Independent Python Decimal calculations reconstruct category totals, area
allocation, income limit, carryover, ScheduleC profit, separate SE components,
half-SE deduction, AGI, QBI limit, taxable income and ordinary tax-table amounts.
All five packaged complete XML returns pass the cached TY2025v5.4 Return1040
schema. Form8829 owner/amount elements match the source and calculations.
Five synthetic submission archives retain exact prepared XML and manifests;
each transmission container retains its exact inner archive. Twenty missing or
altered XML/manifest archive variants reject. No package was transmitted, and
synthetic software/originator/citizenship-review facts imply no authorized
transmitter or accepted filing.

The final typed gate passes28 tests: six new source/complete-return tests plus
22 existing calculator, route, native and PDF tests. Seven conflicting public
record variants reject;80 native and80 freshly rehashed full-PDF source/owner/
amount mutations reject across the five complete cases. The original loss−1000
case remains unchanged: line36=0 and line43=4100 calculate, but both full exports
reject the unfiled QBI-loss carryforward. That evidence is appended to future8;
no deferred carryforward work was implemented.

All46 pages were rendered at1400px:38 unique pages plus8 exact pixel duplicates,
reviewed through10 contact sheets. Form8829 areas, percentages, direct/indirect
columns, income limits and both carryover lines reconcile to ScheduleC and final
tax. Names on Form8829 correctly identify Alex Tenant; the Form8995 header still
uses TENANT ALEX (future68). Some zero Form1040/ScheduleC/Form8829 fields remain
blank (future76), including zero-income Form8829 line36; line43 and44 do print.
These are qualified reviews, with no deferred layout repair. Static copies have
no remaining AcroForm or widget fields.

Private evidence is retained in `.state/research/form8829-sources-2026-10-10/`:
original/baseline inputs, full source/pending/XML/PDF cases, preserved loss
boundary, final typed log, packaged archives, independent verifier, rendered
page hashes and qualified visual review. Earlier October8 evidence was22
selected tests; this checkpoint supplies fresh complete-return proof for the
five routes above without closing the broader main-board parent.

### Remaining scope

Owned homes, mortgage interest and real estate taxes, casualty losses,
depreciation/land/basis, other direct-expense kinds, daycare, inventory storage,
multiple homes/businesses, spouse-owned businesses, and non-home business
income remain outside this retained route. Carryovers through intervening
simplified-method years and other prior histories require their own sourced
paths. Form1098's former full-interest home-office routing remains rejected;
no personal/business mortgage allocation or depreciation fallback was enabled.

Independent source-byte authentication, accepted prior-year carryover records,
production next-year import, broader business-rule verification and IRS ATS
acceptance remain open. All original Form8829 main-board requirements remain
open until those applicable routes and evidence gates are resolved.
