# TY2025 Form 8915-F source and filing boundary

Status: any populated `f8915f` item now rejects before it can produce Schedule 1
income. Absent and empty lists make no claim. Focused negative cases are written
but unrun. No MeF, PDF, XSD, IRS business-rule or ATS acceptance is claimed.

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
rather than an arbitrary current-year income credit. The native `IRS8915F`
document is not registered. These are active correctness gaps, not approved
exclusions.

Reopen with a disaster-specific source contract (FEMA declaration/incident dates
and qualified-area/person facts), distribution type and year, 1099-R
gross/taxable/withholding data, prior filed Form 8915-F elections and annual
inclusions, repayments by date, and the correct $100,000-versus-$22,000 limit.
Then join to Form 1040's proper retirement lines and any amended-year handling,
and add native Form 8915-F, PDF, XSD and ATS validation. No unsupported
prior-year or current-year claim is silently accepted.
