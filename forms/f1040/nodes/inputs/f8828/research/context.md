# Form 8828 — TY2025 recapture of federal mortgage subsidy

Authority:
[Form 8828 (Rev. November 2024)](https://www.irs.gov/pub/irs-pdf/f8828.pdf) and
its [instructions](https://www.irs.gov/pub/irs-pdf/i8828.pdf). This revision is
the IRS's current form for TY2025. Form 8828 is an **attachment**, including
when lines 13 or 17 stop the tax computation at zero. The calculated tax goes to
Schedule 2 line 17b.

## Source-backed input

The public `f8828` item now records the property address; QMB loan or MCC type;
issuer, lender, original closing, disposition and full repayment; sale price or
disposition FMV, selling costs, adjusted basis; AGI, tax-exempt interest, gain
included in gross income; family size and adjusted qualifying income from the
issuer's table; and highest subsidized loan amount, issuer federally subsidized
amount, and issuer holding period percentage. All amounts refer to the
taxpayer's interest in the property, including a separately liable co-owner's
share. The adjusted qualifying income corresponds to family size **at sale** and
the number of full and partial years held.

The original loan must close after 1990. The input requires an issuer amount
within dollar rounding of 6.25% of the highest federally subsidized loan and a
line 20 percentage matching the disposition dates. The instructions' holding
period worksheet applies when the original loan was fully repaid before sale
within the first four years, including a conventional refinance; a reissued MCC
is treated as an extension of the original loan for the repayment date.

## Calculation

| Line       | Derivation                                                                                                                                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11, 13, 14 | Sale price minus selling expenses, then adjusted basis; half of positive gain limits tax. A loss ends tax computation but Form 8828 remains required.                                                                                                 |
| 15         | Form 1040 line 11 AGI plus tax-exempt interest minus home gain included in gross income.                                                                                                                                                              |
| 17, 18     | Line 15 minus issuer adjusted qualifying income; zero or less ends tax computation. At $5,000 or more the income percentage is 100%; otherwise divide by $5,000 and round to a whole percent.                                                         |
| 19         | 6.25% of highest federally subsidized loan amount, from the issuer notification. The mortgage interest rate does not enter this line.                                                                                                                 |
| 20         | Issuer holding period percentage corresponding to full and partial years held; verify against the 20%-100%-20% nine-year table. If the loan was repaid within four years before disposition, use the IRS holding period percentage worksheet instead. |
| 21-23      | Multiply line 19 by line 20 percentage, then by line 18 percentage; tax is the smaller of that amount and line 14.                                                                                                                                    |

The node's calculated tax contributes to Schedule 2 line 17b. The **MeF and PDF
export guard still rejects every nonempty Form 8828 input** because the native
Form 8828 attachment, verified return-level AGI/interest/gain reconciliation,
and complete issuer document evidence are not yet in place. Node calculations
and unit fixtures do not establish a fileable return.

## Remaining before public export

- Register the native Form 8828 MeF root and PDF descriptor with source fields
  and zero-tax attachment behavior.
- Reconcile AGI, tax-exempt interest, recognized home gain, and Schedule 2 line
  17b against the computed return.
- Support or expressly exclude special transfers, casualty replacement and
  amended-return scenarios; establish source document review and filing-rule/ATS
  evidence.
