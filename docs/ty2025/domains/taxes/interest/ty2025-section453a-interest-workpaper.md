# TY2025 section 453A installment-sale interest workpaper

The bounded individual, calendar-year route takes a retained `f453a_interest`
workpaper. It inventories every obligation used in each origin-year aggregate,
including an obligation paid off before the end of 2025. Each row retains the
seller SSN, transaction and obligation IDs, property and dealer classification,
transaction sale price, origin-year-end face amount, 2025 year-end unpaid face,
gross-profit percentage, unrecognized gain, gain character, and distinct sale,
note, and year-end ledger references. Each origin-year group retains its
aggregate qualifying face amount, fixed applicable percentage, and inventory
reference. The 2025 rate is 7%, with a rate-source reference; the supported tax
year end is December 31, 2025. The IRS [2025 Publication 537](https://www.irs.gov/publications/p537)
and [fourth-quarter 2025 underpayment ruling](https://www.irs.gov/irb/2025-37_IRB)
support the formula and rate.

The calculator excludes dealer obligations, farm property, individual
personal-use property, sales of $150,000 or less, and business or investment
personal property sold before 1989. It checks each origin year's qualifying
face amount and fixed percentage against the retained obligation inventory.
For each qualifying obligation, it verifies unrecognized gain as 2025 year-end
unpaid face times gross-profit percentage. It then computes deferred tax using
the 2025 maximum rate for the declared gain character, multiplies by that
origin year's fixed percentage and 7% underpayment rate, and rounds the sum
once to whole dollars. Two 2025 obligations with a $6 million origin balance
produce $11,317 on Schedule 2 line 15. The line enters Schedule 2 line 21 and
Form 1040 line 23. Native MeF and the filled Schedule 2 PDF replay the
workpaper and filer SSN. Line 14 remains separate.

The source references are recorded facts, not authenticated sale agreements,
accepted prior-year returns, or bank records. The workpaper is not yet keyed
to every Form 6252 sale and its prior-year filed copy. It does not establish
that the origin-year inventory includes every obligation outside the entered
rows, support a pass-through allocation, or cover fiscal-year end rates. Those
joins remain before the interest can be treated as externally verified. XSD
success establishes structure, not IRS business-rule acceptance.
