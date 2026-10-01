# TY2025 corrective plan distributions on Form 1040 line 1h

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
place corrective retirement-plan distributions, including taxable earnings,
on line 1h instead of pension lines 5a and 5b. The
[2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf)
identify box 7 code 8 as a correction taxable in 2025.

The bounded route accepts an active, non-IRA Form 1099-R with primary code 8,
one identified recipient, a distinct source reference, a nine-digit payer EIN,
and an explicit positive whole-dollar taxable box 2a no greater than gross box
1. Box 2a contributes to Form 1040 and AGI line 1h. The native IRS1099R keeps
the issued box 1 gross and box 2a taxable values. One
`WagesNotShownSchedule` row describes the aggregate as `CORRECTIVE
DISTRIBUTION`, and native export verifies that the row equals final Form 1040
and AGI line 1h and belongs to the taxpayer or joint spouse.

The route does not infer how code P, a secondary distribution code, or an IRA
correction is taxable. Mixed line 1h sources, including FEC, Form 2555 wages,
and W-2 excess deferrals, require separate source attribution before a native
statement can describe them together. The focused fixtures are authored; the
shared bulk test, XSD, PDF render, and IRS acceptance checks remain pending.
