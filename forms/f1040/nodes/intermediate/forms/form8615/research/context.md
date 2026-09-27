# Form 8615 (TY2025)

The [2025 form](https://www.irs.gov/pub/irs-prior/f8615--2025.pdf) and
[instructions](https://www.irs.gov/instructions/i8615) require Form 8615 line 18
to replace the child's Form 1040 line 16 income tax. It does not post to
Schedule 2 line 17d. The earlier incremental-tax-only implementation and its
Schedule 2 route were wrong.

The `f8615` input supplies facts from the parent's return and an explicit
eligibility confirmation. The child's taxable income, filing status, chosen
deduction, and dividend/gain facts come from the child return graph. The
calculation covers the ordinary-rate route and the qualified-dividend/net
capital gain route, including all three Line 5 allocation worksheets, parent and
sibling preferential income on line 9, the child's line 15 residual, and the
line 17 own-tax comparison.

The exact low-income tax lookup comes from the
[TY2025 IRS Publication 1040 Tax Table](https://www.irs.gov/publications/p1040).
Published ranges are `[0,5)`, `[5,15)`, `[15,25)`, then $25 ranges through
$3,000 and $50 ranges through $100,000. Tax in each range is the 2025 bracket
tax at its midpoint, rounded to the nearest whole dollar. The qualifying
surviving spouse uses the MFJ column. During the build pass, an independent
read-only extraction of the IRS HTML table found 2,062 contiguous rows and 8,248
cells; the midpoint rule matched every cell. The shared
`worksheets/tax_table_2025.ts` computes the midpoint tax in integer cents to
avoid floating-point tie errors. The
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) require
this Tax Table on lines 22 and 24 of the Qualified Dividends and Capital Gain
Tax Worksheet when the respective amount is below $100,000, even if another
worksheet line exceeds that threshold. Form 8615 lines 9, 15, and 17 use the
same tax rules with the parent's or child's filing status as directed by the
[Form 8615 instructions](https://www.irs.gov/instructions/i8615).

Schedule D special-rate gain or Form 4952 elections, Schedule J, and Form 2555
paths still throw where the positive-line-5 worksheets need additional facts.
Parent and child eligibility proof, exact source derivation for every
earned-income scenario, visual PDF checks, and IRS business rules remain open.
The focused and end-to-end cases are written but have not been run during the
build-first pass.
