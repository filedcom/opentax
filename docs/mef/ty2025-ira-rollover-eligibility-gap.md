# TY2025 IRA rollover eligibility boundary

[2025 Publication 590-A](https://www.irs.gov/publications/p590a) allows a
surviving spouse to roll a distribution from a deceased spouse's traditional
IRA into the spouse's own IRA within 60 days, even when the spouse is not the
sole beneficiary, provided the distribution is not a required distribution.
It prohibits a nonspouse beneficiary from rolling amounts into or out of an
inherited IRA. [2025 Publication 590-B](https://www.irs.gov/publications/p590b)
also excludes required minimum distributions from rollover treatment.

The current Form 1099-R rollover source does not retain the deceased IRA
owner, beneficiary relationship, beneficiary rights, required beginning date,
prior-year account balance, applicable RMD divisor, or earlier distributions
needed to calculate those rules independently. Every claimed rollover now
requires the same reviewed non-inherited status, non-RMD status, and eligibility
workpaper reference on the rollover source, whether it is timely, direct, or
uses a late waiver. The four late-waiver objects no longer carry duplicate
copies. A payer death code 4, whether primary or secondary in Box 7, rejects
a claimed rollover; so do conflicting SIMPLE/Roth codes S, J, Q, and T in
either code position. An ordinary death-coded distribution without a rollover
claim still follows the income route. Native and PDF preflight recheck the
source review and code guards. The 104-case Form 1099-R suite, focused
native/PDF tamper and positive filled-PDF checks, and seven IRA full-return
TY2025 v5.4 XSD fixtures pass.

This is a narrow guard, not a determination that every death-coded IRA
distribution is ineligible. A positive spouse-beneficiary route needs
identified issued payer and IRA records, death/beneficiary facts, an
eligible destination, and a sourced RMD calculation or prior RMD satisfaction
before it may mark Form 1040 line 4c(1). An ordinary code-7 IRA distribution
could still include an RMD; a reviewed reference alone does not authenticate
the issued records or independently calculate the RMD. Those, prior-return
history, visual PDF review, full-suite tests, and IRS acceptance remain open.

For the supported pretax partial rollover, the taxable remainder is gross
distribution less the documented rolled amount even when the payer leaves
Form 1099-R box 2a undetermined. A populated box 2a below gross stops this
route because the difference may require a Form 8606 basis calculation that
the rollover route does not yet support. A code-1 early distribution sends
only that taxable remainder to Form 5329 line 1 and Schedule 2 line 8. The
focused source-to-Form-1040/Form-5329/native/PDF case validates against the
TY2025 v5.4 XSD. This does not establish rollover eligibility for an inherited
account or exclude a required minimum distribution without authenticated
issued account, beneficiary, and prior-return records. See the
[2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-pdf/i1099r.pdf)
and [2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329).
