# TY2025 Form 1099-R code P source gap

The [2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-prior/i1099r--2025.pdf)
identify code P as a correction taxable in 2024 or an earlier year.
[2025 Publication 525](https://www.irs.gov/publications/p525) directs a filer
who omitted a 2024 excess deferral to amend the 2024 return. It also requires
the excess on 2025 wages when the correction was received after April 15, 2025.
The receipt-date rule cannot be inferred from code P alone.

Positive 2025 Form 1099-R code P source rows, including a secondary code P,
now stop in the source graph before ordinary IRA or pension income reaches the
2025 return. The guard also covers positive reported withholding, whose filing
year requires a separate review. It does not erase the retained source or
silently set current-year taxable income to zero.

A complete route needs the deferral year, actual receipt date, correction
type (plan excess deferral, IRA excess contribution, earnings, or designated
Roth amount), current versus prior taxable amount, owner/source evidence, and
whether the affected prior return already included the excess. Those facts
would determine the prior-year amendment need and whether Pub. 525's late
receipt exception creates 2025 line 1h wages. Existing `box13_date_of_payment`
is optional and does not by itself establish all of these facts. Positive code
P and secondary-code rejection fixtures are authored for the shared bulk test;
no XSD, PDF, or IRS acceptance check has run for this boundary.
