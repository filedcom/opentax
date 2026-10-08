# Form 4255, TY2025 scoped net-EPE route

The old `original_credit_amount × recapture year` input did not represent the
2025 Form 4255 Part I columns, and it always labeled the result as a generic
Schedule 2 line 17a `3468` recapture. It is replaced with explicit Part I
row facts for line 1d (Form 3468 Part IV) and line 2a (Form 8933). The input
requires a source-document reference, prior-year credit and EPE split,
recapture partition, and EP amounts. Column (h) must equal (i)+(j)+(k)+(l),
and each partition must fit its prior-year source. This scoped route requires
columns (j), (k), and (n)(2) to be zero because their Schedule 2 routes are
not yet implemented.

| Form 4255 row and column | Schedule 2 | MeF source |
| --- | --- | --- |
| 2a(l), Form 8933 net-EPE recapture | 1d | `Form8933PYCreditsGrp/RcptrPrtnNetEPECrAmt` |
| 1d(n)(1) and 2a(n)(1) | 1e, boxes (iii)/(iv) | respective row groups' `NetEPEPortionAmt` |
| 1d(n)(3) and 2a(n)(3) | 1f, boxes (iii)/(iv) | respective row groups' `EP20PctOweAmt` |
| 1d(l), Form 3468 Part IV net-EPE recapture | 19 | `Form3468PartIVPYCreditsGrp/RcptrPrtnNetEPECrAmt` |

The native `IRS4255` document and Schedule 2 builder reconcile those amounts.
Schedule 2 line 19 is kept outside the Form 8978 chapter-1 offset until its
classification is supported; it is tracked as unclassified. Other Form 4255
credit lines, line 17a recapture, columns (j)/(k)/(n)(2), and penalties need
their own exact source routes. The tax and source calculations remain untested
until the batch validation; no claim of ATS acceptance is made.

Sources: [2025 Form 4255](https://www.irs.gov/pub/irs-prior/f4255--2025.pdf),
[2025 Form 4255 instructions](https://www.irs.gov/pub/irs-prior/i4255--2025.pdf),
and [2025 Form 1040 instructions, Schedule 2](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).
