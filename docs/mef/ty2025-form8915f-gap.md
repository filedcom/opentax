# TY2025 Form 8915-F source and filing boundary

Status: a bounded route files one 2025 disaster and one fully taxable, non-IRA
2025 distribution, either included in income in full or spread over three
years. It requires FEMA identity and
dates, principal-home and economic-loss review references, eligible-plan review,
no-prior-distribution and no-repayment reviews, the owner SSN, an issued Form
1099-R reference and account identity, and a whole-dollar distribution of no
more than $22,000. A pure calculation records Form 8915-F lines 1e, 2, 5b, 6,
8–11, 13 and 15. The source matcher requires exactly one 1099-R with the same
recipient, payer, account, issue reference, date, gross, and taxable amount and
a straightforward taxable non-IRA code 2 or 7 route. The bounded Part I source
currently requires that this be the return's only 1099-R, so line 2(a)
represents all plan distributions. The old amount-only source is rejected. The
Form 1099-R calculation supplies Form 1040 lines 5a and 5b. An explicit
Form 8915-F treatment link makes the three-year election report one third of
the 2025 taxable amount, rounded to a whole dollar; a $20,000 distribution
prints $20,000 on line 5a and $6,667 on line 5b. Both native and PDF
Form 8915-F exports verify that result against the source again. Native
`IRS8915F` validates against the local TY2025 v5.4 full-return XSD. The six-page
packet includes all four Form 8915-F pages; the full-inclusion and first-year
spread pages were inspected. A changed 1099-R taxable amount rejects at full
native export, and either export rejects a linked 1099-R without Form 8915-F.
IRS business-rule
and ATS acceptance is unverified.

The [2025 IRS Form 8915-F instructions](https://www.irs.gov/instructions/i8915f)
distinguish 2020 disasters from qualified 2021-and-later disasters. The latter
have a $22,000 per-disaster qualified-distribution limit, while $100,000 was the
2020 limit. They require the disaster year and identifying information,
distribution and retirement-plan type, elected income-spread method, repayments,
and prior-year Form 8915-F amounts. A 2025 return can include a 2025
distribution or a later reporting year for an older disaster.

The prior local node instead imposed one $100,000 cap, treated disaster year as
informational, put all taxable income on Schedule 1 line 8z, and could put an
excess repayment there as negative income. Retirement distributions need the
applicable Form 1040 IRA or pension/annuity lines and Form 1099-R
reconciliation; a prior-year repayment can require amending that year's return
rather than an arbitrary current-year income credit. The bounded route removes
those errors for its one supported current-year plan distribution. Wider routes
remain active correctness gaps, not approved exclusions.

Next, wider sources still need IRA and Form 8606 cases, the 2026–27 annual
inclusions and accepted-filing carryforward for a 2025 three-year election,
prior filed Form 8915-F elections, repayments and
attached worksheets, additional disasters, cost basis, early-distribution
exception handling, and amended-year effects. Review references are structured
facts; they do not authenticate the underlying documents. No unsupported
prior-year or current-year claim is accepted.
