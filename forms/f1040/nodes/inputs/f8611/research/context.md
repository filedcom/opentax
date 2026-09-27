# Form 8611: low-income housing credit recapture

Source:
[IRS Form 8611 and instructions, Rev. December 2021](https://www.irs.gov/pub/irs-pdf/f8611.pdf).
This is the current form used by the TY2025 MeF schema. The form says to attach
one copy per building and to report the sum of line 14 amounts on Schedule 2,
line 16.

## Inputs and source evidence

Each `f8611s` item identifies one building by the address, BIN, and
placed-in-service date from Form 8609. The input names the source worksheet or
pass-through statement and the 2025 recapture year. A tax-exempt-bond financing
answer is required. If it is true, the issuer, issue date/name, and CUSIP or
explicit no-CUSIP answer are required for item F.

Own-credit claims require confirmation that a recapture exception does not
apply, the first year of the credit period, prior Forms 8586 line 1 credits,
per-prior-year Form 8609-A worksheet fields for line 2, line 6 decrease ratio,
earlier accelerated recapture already paid, prior unused credit, unused
additions credit, and independently calculated interest. The engine calculates
line 2 by summing the worksheet's steps a-i for each supplied prior year. The
line 6 ratio must account for additions to qualified basis before recapture. A
taxable disposition uses 1.000. The field `line11_interest_from_prior_years` is
a supplied source figure, not an engine-derived daily-interest calculation.

Pass-through recipients skip lines 1-7 and use the entity's line 8 recapture
amount, the unused accelerated credit, prior unused credit, and interest. If a
section 42(j)(5) partnership already included interest in line 8, line 11 must
be zero. Partnership-level lines 16-17 belong to Form 1065 and are outside this
Form 1040 board.

## Calculation and output

For an own-credit item, the start year determines the credit-period year. Form
8611 line 4 is .333 in years 2-11, .267 in year 12, .200 in year 13, .133 in
year 14, and .067 in year 15. Years outside 2-15 are rejected. Lines 1-15 follow
the printed form and instructions, including the unused-credit reduction and
interest. The node sums each building's line 14 into Schedule 2 line 16. The MeF
descriptor emits one `IRS8611` document per building, and Schedule 2 links the
resulting document IDs.

## Limits and verification still needed

The current source model does not derive the Form 8609-A worksheet inputs,
historical Form 8586/Form 3800 allowed-versus-unused credits, or
daily-compounded interest from source transactions. Those figures must be
supplied and verified against records. The new node, MeF serializer, and written
cases have not yet run in the requested full-batch test, local XSD validation,
or IRS ATS.
