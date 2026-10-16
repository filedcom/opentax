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

## Executed mixed-child calculation and packet parity (October 6)

Native and PDF descriptors now recalculate every numerical Form8814 line from the parsed reviewed child source and reject changed lines9/10/12/15, PTC MAGI, investment-income allocation and duplicate child elections. An independent before-change direct-descriptor probe emitted altered line12/15=1 for actual taxableinterest3700; `/tmp/opentax-8814-before-oct6.log` retains that evidence. Existing aggregate Schedule1/1040 reconciliation remains authoritative. This adds protection to direct child-form exports and all other allocated child lines. It does not authenticate issuer copies or replace the retained-source standard.

Graph-generated mixed interest/dividend/capital-distribution packets exercise one and two separate child forms. First child gross6000 allocates qualifieddividends1320/capitalgain550/line12income1430/tax135. Second child gross4200 allocates36 qualifieddividends/1464 line12income/tax135 and has a child-specific four-adjustment continuation. Combined1040 dividends1356/capital550/Schedule1income2894/childtax270 agree with both native documents and the eight-page packet. Single-child packet is sixpages. This follows [2025 IRS Form8814 instructions](https://www.irs.gov/instructions/i8814), including separate forms for each elected child and allocated amounts to parent lines.

Focused complete native/fullTY2025v5.4XSD/PDF gate1/0(10s), seven-module standard34/0/0ignored(27s), actual retained2packets/14pages exactwholepending/preparedpending/carry/origins/source/PDF/nativeonlyReturnTs/fullXSD. Logs `/tmp/opentax-8814-mixed-source-focused-v3-oct6.log`, `/tmp/opentax-8814-mixed-source-standard-v3-oct6.log`; saved-source replay `/tmp/opentax-8814-mixed-source-main-raw-oct6/report.json`. All14 filled pages rootvisually reviewed, including full-resolution second child form/continuation; six originals privately SHA-preserved at `.state/research/form8814-mixed-source-oct6-preserved`. Initialfixture public/node-shape error and overly specific negative-message assertion logs are retained as diagnostics; guards were not relaxed. Original earlierreview fixtures were not regenerated or replaced, and no equality to absent prior source archives is inferred. External issuer/election authority, wider child-source combinations, IRS business rules and ATS remain open.
