# TY2025 Form 8915-F source and filing boundary

Status: any populated `f8915f` item still rejects before filing. Absent and
empty lists make no claim. A bounded source contract now covers one 2025
disaster and one fully taxable, non-IRA 2025 distribution elected into income
in full. It requires FEMA identity and dates, principal-home and economic-loss
review references, eligible-plan review, no-prior-distribution and no-repayment reviews, the owner
SSN, an issued Form 1099-R reference and account identity, and a whole-dollar
distribution of no more than $22,000. A pure calculation records Form 8915-F
lines 1e, 2, 5b, 6, 8–11, 13 and 15. The source matcher requires exactly one
1099-R with the same recipient, payer, account, issue reference, date, gross,
and taxable amount and a straightforward taxable non-IRA code 2 or 7 route.
The bounded Part I source currently requires that this be the return's only
1099-R, so line 2(a) represents all plan distributions rather than silently
omitting another source.
The old amount-only source is rejected, not accepted as a second API shape.
Six focused Form 8915-F cases and the 92 Form 1099-R cases pass. No native,
PDF, full-return XSD, IRS business-rule or ATS acceptance is claimed.

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

Next, connect the bounded 2025 source to Form 1040 line 5b, its native
`IRS8915F` document, and all four printable pages; cross-check the pending
1099-R and filer again at export, then validate a full return and inspect the
filled packet. Wider sources still need IRA and Form 8606 cases, income spread
over three years, prior filed Form 8915-F elections and annual inclusions,
repayments and attached worksheets, additional disasters, cost basis,
early-distribution exception handling, and amended-year effects. No
unsupported prior-year or current-year claim is silently accepted.
