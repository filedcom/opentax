# TY2025 IRA automatic late-rollover waiver

[2025 Publication 590-A](https://www.irs.gov/publications/p590a) describes an
automatic waiver of the 60-day IRA rollover deadline when the receiving
institution timely receives both the funds and deposit instructions, its error
alone delays the deposit, the funds are deposited within one year from the
beginning of the 60-day period, and the rollover would otherwise have been
valid. A late contribution without a waiver is a regular contribution, not a
rollover.

The bounded TY2025 route accepts a traditional or SEP IRA distribution to a
traditional or SEP IRA, or to a named qualified plan, after more than 60 days
only with reviewed dated institution receipt, deposit instructions, error, and
deposit confirmation records. It requires a source Form 1099-R reference and
account, reviewed non-inherited and non-RMD status, an eligibility workpaper,
and the existing owner-specific IRA-to-IRA history check. A qualified-plan
destination also needs a reviewed acceptance reference. Missing, late, or
contradictory facts reject at calculation. A timely rollover cannot carry a
late-waiver claim.

The source graph marks Form 1040 line 4c(1), keeps the gross IRA distribution
on line 4a and zero taxable on line 4b for the fully rolled amount, and creates
an IRA distribution statement even when completion occurs in 2025. The same
statement is linked in MeF and printed in the PDF packet. A $9,000 synthetic
late rollover completed on September 15 after June 20 institution receipt
and instructions passed the focused node cases and the full-return TY2025 v5.4
XSD check. Its three-page filled PDF prints $9,000/zero and the rollover mark;
the statement page was rendered and inspected for the waiver facts and dates.
Internal evidence references remain in the reviewed source and are omitted
from the transmitted statement and printable packet.
The PDF, XML, and three page PNGs are retained under `.state/research/` as
`ty2025-ira-late-waiver-review.*` and `ty2025-ira-late-waiver-page-*.png`.
The PDF SHA-256 is
`5c1c7cdc1e6731b52256118b72a74d91c37c91fbd0760ac4a283b8316865ce49`.

This uses structured reviewed references under the repository's current
bounded-source approach; it does not authenticate the institution's issued
bytes or prove an IRS waiver. Other waiver methods, inherited IRA exceptions,
RMD allocations, prior-return authentication, IRS business rules, and ATS
acceptance remain open.
