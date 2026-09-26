# Form 8615 (TY2025)

The [2025 form](https://www.irs.gov/pub/irs-prior/f8615--2025.pdf) and
[instructions](https://www.irs.gov/instructions/i8615) require Form 8615 line
18 to replace the child's Form 1040 line 16 income tax. It does not post to
Schedule 2 line 17d. The earlier incremental-tax-only implementation and its
Schedule 2 route were wrong.

The `f8615` input supplies facts from the parent's return and an explicit
eligibility confirmation. The child's taxable income, filing status, chosen
deduction, and regular tax come from the child return graph. The calculation
now follows lines 1-18 for ordinary-rate cases, including other children's
line 5 allocations, the child's own-tax comparison, the $2,700 Form 8615
deduction, and the separate dependent standard deduction worksheet.

The parent qualified-dividend, Schedule D, Schedule J, and Form 2555 tax
methods, and the child's preferential-rate or Form 2555 paths, still need
their IRS worksheets. Those paths throw rather than silently using ordinary
brackets. Parent and child eligibility, line 1 source reconciliation, exact
Tax Table behavior, and all IRS business rules remain to be audited.
