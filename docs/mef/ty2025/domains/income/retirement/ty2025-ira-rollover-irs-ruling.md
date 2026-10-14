# TY2025 IRA rollover with an IRS private letter waiver

[2025 Publication 590-A](https://www.irs.gov/publications/p590a) identifies an
IRS private letter ruling as a third way to obtain relief from the 60-day
rollover deadline. The IRS may waive that deadline, but not the other
requirements for an otherwise valid rollover.

The TY2025 route requires an issued favorable ruling number and document
reference, issue date, ruling-specific deposit deadline, review linking the
ruling to the owner and Form 1099-R distribution, and deposit confirmation.
It also requires the 1099-R account and source reference, reviewed non-inherited
and non-RMD status, the existing IRA-to-IRA history check, and qualified-plan
acceptance when applicable. A ruling request, a late deposit beyond the ruling
deadline, or simultaneous claims under another waiver method reject.

A $7,000 synthetic late IRA-to-IRA rollover passes node checks and the full
TY2025 v5.4 Form 1040 XML schema. The filled three-page PDF was rendered and
inspected: Form 1040 line 4a prints $7,000, line 4b prints zero, line 4c(1)
is marked, and the linked statement lists the ruling and dates. Internal
evidence references remain in the reviewed source and are omitted from the
transmitted statement and printable packet. The PDF, XML, and three page PNGs are retained under
`.state/research/` as `ty2025-ira-irs-ruling-review.*` and
`ty2025-ira-irs-ruling-page-*.png`. The PDF SHA-256 is
`d8075b8d5b9ee78cea6fdbf055f240d65602922bbbc8b0ce724df5ebb73f84f9`.

The ruling and 1099-R in this fixture are synthetic reviewed references, not
authenticated IRS or payer-issued bytes. Actual ruling verification, other
rollover eligibility evidence, IRS business rules, and ATS acceptance remain
open.
