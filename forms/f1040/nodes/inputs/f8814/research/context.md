# TY2025 Form 8814

The parent election reports a qualifying child's interest and dividends on the parent's Form 1040. The election needs a separate Form 8814 for each child. Income eligibility and family facts are required explicitly; missing facts do not authorize the election.

Source: [2025 Form 8814](https://www.irs.gov/pub/irs-prior/f8814--2025.pdf) and [2025 instructions](https://www.irs.gov/instructions/i8814).

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

Build status: the calculation, return routing, MeF serializer, 2025 PDF descriptor, Form 8960 line 7 NIIT route, combined-source Schedule B dividend reporting, and linked interest-adjustment statements have been added, but not yet verified in the user-requested full-batch test. PDF dotted-line notes, broader IRS business rules, and ATS acceptance are still open. Do not mark this form production-ready based on this document.
