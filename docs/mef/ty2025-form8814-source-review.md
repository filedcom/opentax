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

The parent Form 1040 PDF also requires its finalized lines 3a and 3b to carry
at least the Form 8814 child-dividend amount before marking the two line 3c
boxes. The existing direct line 7a versus Schedule D line 13 child-gain route
is unchanged. The current implementation and fixture edits await the requested
single bulk test and filled-PDF review after implementation is complete.
