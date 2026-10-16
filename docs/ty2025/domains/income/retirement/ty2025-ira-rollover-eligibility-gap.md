# TY2025 IRA rollover eligibility boundary

[2025 Publication 590-A](https://www.irs.gov/publications/p590a) allows a
surviving spouse to roll a distribution from a deceased spouse's traditional IRA
into the spouse's own IRA within 60 days, even when the spouse is not the sole
beneficiary, provided the distribution is not a required distribution. It
prohibits a nonspouse beneficiary from rolling amounts into or out of an
inherited IRA. [2025 Publication 590-B](https://www.irs.gov/publications/p590b)
also excludes required minimum distributions from rollover treatment.

The current Form 1099-R rollover source does not retain the deceased IRA owner,
beneficiary relationship, beneficiary rights, required beginning date,
prior-year account balance, applicable RMD divisor, or earlier distributions
needed to calculate those rules independently. Every claimed rollover now
requires the same reviewed non-inherited status, non-RMD status, and eligibility
workpaper reference on the rollover source, whether it is timely, direct, or
uses a late waiver. Every positive route also retains one identified payer Form
1099-R copy, account, recipient SSN, and filed taxpayer/spouse owner. It
additionally needs a distinct IRA account-registration record naming the same
account and recipient as owner. A mismatch or reused payer-copy reference fails
calculation and native/PDF preflight. These are structured source identifiers,
not authentication of payer-issued or custodian-issued bytes. The four
late-waiver objects no longer carry duplicate copies. A payer death code 4,
whether primary or secondary in Box 7, rejects a claimed rollover; so do
conflicting SIMPLE/Roth codes S, J, Q, and T in either code position. An
ordinary death-coded distribution without a rollover claim still follows the
income route. Native and PDF preflight recheck the source review and code
guards. The focused Form 1099-R suite, native/PDF source-tamper checks, positive
filled-PDF checks, and seven IRA full-return TY2025 v5.4 XSD fixtures pass.

This is a narrow guard, not a determination that every death-coded IRA
distribution is ineligible. A positive spouse-beneficiary route needs an issued
payer copy with the deceased owner's account and distribution codes; the death
record; marriage and beneficiary designations establishing the recipient's
spouse rights and share; the recipient's own receiving IRA registration and
dated deposit; and a 2025 RMD workpaper. The workpaper must identify the
2024-12-31 balance, owner/beneficiary birth and death dates, required beginning
date, applicable 2025 table and divisor, distributions already satisfying the
2025 RMD, and the amount of this payment remaining eligible to roll. These facts
must reconcile to distinct custodian-issued account and distribution records and
any relevant prior return. The route must allocate the non-rollable RMD first,
tax that portion, and mark line 4c(1) only for an eligible rolled remainder. The
present source does not contain those facts, so death-coded claims remain
blocked. An ordinary code-7 IRA distribution could still include an RMD; a
reviewed reference and registration identifier alone do not authenticate the
records or independently calculate the RMD. Those, prior-return history, visual
PDF review, full-suite tests, and IRS acceptance remain open.

For the supported pretax partial rollover, the taxable remainder is gross
distribution less the documented rolled amount even when the payer leaves Form
1099-R box 2a undetermined. A populated box 2a below gross stops this route
because the difference may require a Form 8606 basis calculation that the
rollover route does not yet support. A code-1 early distribution sends only that
taxable remainder to Form 5329 line 1 and Schedule 2 line 8. The focused
source-to-Form-1040/Form-5329/native/PDF case validates against the TY2025 v5.4
XSD. This does not establish rollover eligibility for an inherited account or
exclude a required minimum distribution without authenticated issued account,
beneficiary, and prior-return records. See the
[2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-pdf/i1099r.pdf) and
[2025 Form 5329 instructions](https://www.irs.gov/instructions/i5329).
