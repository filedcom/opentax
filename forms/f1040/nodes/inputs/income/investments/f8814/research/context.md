# TY2025 Form 8814

The parent election reports a qualifying child's interest and dividends on the parent's Form 1040. The election needs a separate Form 8814 for each child. Income eligibility and family facts are required explicitly; missing facts do not authorize the election.

Source: [2025 Form 8814](https://www.irs.gov/pub/irs-prior/f8814--2025.pdf) and [2025 instructions](https://www.irs.gov/instructions/i8814).
Parent print destinations were checked against the [2025 Form 1040](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf), [Schedule D](https://www.irs.gov/pub/irs-prior/f1040sd--2025.pdf), and [Schedule B](https://www.irs.gov/pub/irs-prior/f1040sb--2025.pdf) source PDFs.

| Form line | Calculation | Destination |
| --- | --- | --- |
| 2a | ordinary dividends + Alaska PFD | child's Form 8814 |
| 4 | taxable interest + line 2a + capital gain distributions | election requires line 4 under $13,500 |
| 6 | max(0, line 4 - $2,700) | allocated to parent |
| 9 | line 6 × qualified dividends / line 4 | parent Form 1040 lines 3a and 3b |
| 10 | line 6 × capital gain distributions / line 4 | Schedule D line 13 or direct Form 1040 line 7a |
| 12 | line 6 - lines 9 and 10 | Schedule 1 line 8z, labeled Form 8814 |
| 14 | max(0, line 4 - $1,350) | child tax basis |
| 15 | 10% of lesser(line 14, $1,350) | included on parent Form 1040 line 16, box 1 |

Form 8962 Worksheet 1-2 has a special household-income amount when a dependent child is covered by Form 8814 and line 4 exceeds $1,350. For each such child it adds tax-exempt interest, lesser(line 4, $2,700), and nontaxable Social Security. The child's SSN must match a dependent whose `ptc_tax_return.filing` is `form8814`; this prevents adding the same child twice or counting a nondependent child's election as dependent MAGI.

`interest_income` is the net Form 8814 line 1a amount. Any nominee distributions or accrued-interest, ABP, and OID adjustments are already excluded from that amount. The 2025 IRS `ChildTaxableInterestStatement.xsd` requires those adjustments in a separate `ChildTaxableInterestStmt`, linked from line 1a of the matching child's Form 8814. It does not define an over-15-payer statement.

`dividend_income` and `capital_gain_distributions` are likewise net of their nominee distributions. MeF carries those excluded amounts as `nomineeDistributionCd` and `nomineeDistributionAmt` attributes on lines 2a and 3.

The private-activity-bond portion of the child's line 1b tax-exempt interest is included in `tax_exempt_interest` and separately routed to the parent's Form 6251 line 2g, per the 2025 Form 8814 instructions' AMT note. It cannot exceed the child's total tax-exempt interest.

If the elected child had a foreign financial account or foreign-trust activity, the parent must file Schedule B Part III and enter `Form 8814` beside the matching question. These child facts force Yes for lines 7a or 8, but they do not determine whether FinCEN Form 114 is required. The parent must explicitly answer that question and list countries when required.

The 2025 Form 1040 has dedicated line 3c checkboxes for child income included on lines 3a and 3b, and a line 7b checkbox for child capital gain or loss. The PDF checks these only when Form 8814 line 9 or 10 actually contributes income. It checks the separate "Schedule D not required" box when the return's capital gain distributions are reported directly on line 7a. When a child line 10 amount goes directly to line 7a, the PDF writes `Form 8814 $[amount]` in that line's dotted space; if Schedule D is filed, the annotation goes beside Schedule D line 13 instead. The 2025 Form 1040 line 16 Form 8814 tax box and the child-specific Form 8814 pages are also mapped. Schedule B prints `Form 8814` beside line 7a and/or line 8 only when the child's corresponding fact is true.

The Form 8814 PDF prints line 1a nominee/accrued/ABP/OID adjustment notes, line 2a and line 3 nominee notes, and a child-specific continuation when line 1a's dotted space cannot hold every amount. For Part I, it leaves lines 7 through 10 blank when both qualified dividends and capital gain distributions are zero, but prints an explicit zero ratio and zero allocation on the other branch when just one is zero, as the form directs. The source PDF field rectangles and dotted-space positions were inspected before adding these overlays. Output rendering has not yet been run.

Build status: the calculation, return routing, MeF serializer, 2025 PDF descriptor and parent-return print annotations, Form 8960 line 7 NIIT route, combined-source Schedule B dividend reporting, and linked interest-adjustment statements have been added, but not yet verified in the user-requested full-batch test. PDF visual layout, broader IRS business rules, and ATS acceptance are still open. Do not mark this form production-ready based on this document.
