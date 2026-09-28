# TY2025 Form 6251 circulation-cost adjustment

The [2025 Form 6251 line 2o instructions](https://www.irs.gov/instructions/i6251)
require circulation costs deducted currently for regular tax to be capitalized
and amortized over three years for AMT. Line 2o is the signed current-year
regular deduction less the current-year AMT deduction. The remaining
unamortized balance by itself is not a line 2o amount. The adjustment is not
made when the regular-tax three-year write-off was elected.

The `f59e` circulation record now requires the reviewed current-year regular
and AMT deductions and an explicit regular three-year election fact. It sends
their signed difference to Form 6251 line 2o. The Form 6251 node includes that
amount in AMTI and in the negative-lines-2c-through-3 filing test. The TY2025
MeF descriptor uses `CirculationCostAmt` in the `IRS6251` sequence, and the PDF
descriptor uses page-1 AcroForm field `f1_19[0]`. The cached TY2025 XSD and
field dump supplied the element and field mapping. Focused positive, negative,
missing-source, election, calculation, XML-order, and PDF-mapping cases are
written but unrun.

This route relies on reviewed deduction figures; it does not calculate the
three-year amortization schedule, a property-loss limitation, or establish that
the regular deduction was included elsewhere in the return. Non-circulation
`f59e` types still use the existing unsupported mixed-adjustment disposition
until their own line-specific sources are available. XSD, business-rule,
filled-PDF, and full-return validation remain pending.
