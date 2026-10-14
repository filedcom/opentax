# TY2025 Form 7206 independent proprietor policy inventories

## October 10 complete Schedule C policy checkpoint

The existing independent-owner route now applies the issuer-policy and monthly
payment reconciliation to two Schedule C proprietors as well as farm combinations.
Previously that check ran only when the owner inventory included a Schedule F.
All retained independent plans now require the reviewed policy and twelve issued
premium/payment records; missing records reject during public calculation and
native/PDF preparation. This changes the source requirement, not the deduction
formula or the supported number of owners, businesses or plans.

The existing contract matches policyholder and payer to the proprietor, issuer
EIN and policy number to the policy, every month to its coverage record, premium
amount and covered person, and policy/payment references. Payment dates must be
real dates in 2025, and payment references cannot be reused across plans. The
business inventory and plan review still identify which plan belongs to each
business. Native and freshly rehashed PDF exports repeat this reconciliation.
Typed records remain reviewed assertions: no insurer documents, bank records,
employer eligibility or signatures have been independently authenticated.
The shared fixture helper supplies explicitly synthetic policy/payment records;
production code never manufactures missing source facts.

The [2025 Form7206 instructions](https://www.irs.gov/pub/irs-prior/i7206--2025.pdf)
exclude premiums for employer-eligible months and limit a plan's deduction to
its establishing business income after attributable adjustments. Health does
not reduce SE earnings. This checkpoint uses the already-admitted one-business
per owner, two-plan joint-return family with no Marketplace or LTC premiums.

## Complete cases

Each case retains two actual source businesses, two policies, 24 issued monthly
records and their matching coverage/eligibility records. Premiums vary by month
and retain cents until annual form-line rounding. The owner with wages at the
Social Security base has only Medicare SE tax; the lower-wage case retains both
SE components. The changing-coverage case swaps each policy's covered person
after June while preserving policyholder, payer and establishing business.

| Case | Primary health | Spouse health | AGI | QBI deduction | Income tax | Total tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| seasonal-premiums | 4259 | 1737 | 184616 | 1703 | 23139 | 24114 |
| both-income-limited | 9866 | 4646 | 176100 | 0 | 21640 | 22615 |
| primary-employer-excluded | 0 | 1737 | 188875 | 2555 | 23888 | 24863 |
| changing-covered-persons | 4259 | 1737 | 184616 | 1703 | 23139 | 24114 |
| below-wage-base | 4259 | 1737 | 57943 | 1589 | 2508 | 4628 |

Independent Python Decimal calculations reconstruct premiums, owner-specific SE,
half-SE, deductible health, AGI, QBI and final tax. The ordinary tax uses
[2025 Publication1040](https://www.irs.gov/publications/p1040), Section B's
22% less10172 worksheet or its MFJ24850–24900 table row. All five complete XML
returns pass local TY2025v5.4 Return1040 XSD; both Form7206 owner/amount copies
match the independently checked source calculations.

Five local submission archives contain exact prepared XML and manifests, and
each transmission container preserves its exact inner archive. Twenty
missing/altered XML/manifest variants reject. Synthetic originator, software
and citizenship-review values only exercise local packaging; nothing was
transmitted and no authorized transmitter or IRS acceptance is implied.

The new six-test module checks five complete returns and14 conflicting public
source variants. Across the five returns,90 native and90 freshly rehashed
full-PDF mutations reject missing/detached records, policyholder/payer/issuer
conflicts, invalid dates, month/coverage/amount mismatches, plan inventories,
filed health/QBI and final adjustment changes. The final typed gate passes65 tests with zero failures across nine modules,
including calculator, independent owners, mixed C/F, loss-owner, two-farm,
senior-health and business-tip combinations (4m51s).

All85 pages were rendered at1400px:34 unique pages and51 exact pixel duplicates
were reviewed through nine contact sheets. Both health copies per return print
correct owner names, eligible premiums, income limits and deductions, including
the primary zero deduction. Form8995 still prints EXAMPLE ALEX instead of the
joint name (future68); some required zero fields remain blank (future76), and
positive ScheduleC copies retain the line32 at-risk choice (future86). These
are qualified reviews; no deferred layout repair was made. Static PDFs contain
no AcroForm field tree or widget annotations.

Private evidence is in `.state/research/form7206-policy-inventory-2026-10-10/`,
including original probes, typed results, complete source/pending/XML/PDF,
archives, independent arithmetic, renders and the visual review inventory.

## Remaining parent scope

This does not complete single-plan issuer provenance, multiple establishing
businesses per owner, dependent/child coverage, LTC limits, S-corporation
shareholders, optional-method income, Form2555, broader retirement/PTC ordering,
external authentication, IRS business rules or ATS acceptance. The separately
deferred single-primary fully excluded health/QBI boundary is unchanged.
