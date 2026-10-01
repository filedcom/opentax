# TY2025 Form 8814 child-income source review

The Form 8814 filing route now requires a `source_review` for each elected
child before native MeF or PDF export. The review names a nonempty source
document reference, 2025 tax year, child SSN, electing parent SSN, and an
explicit eligibility review. It repeats each child-income and adjustment
amount used by the election calculation. Export rejects a missing review,
wrong child or parent, or an amount that differs from the calculated item.

This is a structured review record, not authentication of issuer bytes. The
input still does not reconstruct each child's Form 1099-INT, Form 1099-DIV,
Alaska PFD, or other original statements. Election authority, source copies,
multi-child evidence, and IRS business-rule/ATS acceptance remain open.

A standalone byte-binding prerequisite now covers one child with one or more
distinct plain Form 1099-INT box 1 issuer records and no other reported income or interest
adjustment. The [2025 Form 8814 instructions](https://www.irs.gov/instructions/i8814)
put the child's taxable interest on line 1a. The new guard joins the reviewed
issuer records to the elected child's SSN and parent-reviewed packet, requires
unique issuer TINs and copy keys, sums all box 1 amounts exactly to line 1a,
and checks a PDF header and SHA-256 for every retained issuer copy. Missing,
extra, duplicate, changed-byte/owner/amount, and mixed-income
fixtures are authored for deferred validation.

The issuer amount and no-other-boxes statement remain reviewed assertions;
the PDF bytes are not parsed or authenticated as issuer-origin records. This
guard is not yet called by MeF or PDF export. Corrections from one issuer,
dividends, Alaska PFD, adjustments, and active filing source
authentication remain open.

The parent Form 1040 PDF also requires its finalized lines 3a and 3b to carry
at least the Form 8814 child-dividend amount before marking the two line 3c
boxes. The existing direct line 7a versus Schedule D line 13 child-gain route
is unchanged. The current implementation and fixture edits await the requested
single bulk test and filled-PDF review after implementation is complete.
