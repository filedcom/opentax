# TY2025 Form 8801 prior-year source boundary

The [2025 Form 8801 instructions](https://www.irs.gov/instructions/i8801)
require distinguishing AMT caused by deferral items from AMT caused by exclusion
items. They direct a 2024 Form 8801 line 26 carryforward to the 2025 computation
and require filing Form 8801 only when its 2025 line 21 is positive. The public
`f8801` node still has a preview-only credit calculation, and the shared MeF/PDF
attachment guard blocks positive claims.

As a prerequisite, each positive prior-year AMT amount now needs a reviewed 2024
Form 6251 source for lines 1, 2e, 10, and 11. Its signed lines 1 and 2e must sum
to a separately reviewed 2025 Form 8801 line 1, and its line 10 must equal the
reviewed 2025 Form 8801 line 14. A changed or missing source row or
reconciliation rejects the staged input. Each positive carryforward needs a
reviewed 2024 Form 8801 line 26 source. The records name distinct filed-form
references, one taxpayer SSN, a reviewer and date, and exact whole-dollar source
lines. The input schema rejects missing records, changed line amounts,
mismatched owners, and reused document references. The retained combined full regression executed all 26 tests in
`forms/f1040/nodes/inputs/f8801/index.test.ts` successfully, including the
reviewed-line/owner/reference tamper cases. The module bytes match the
current root full-run startup manifest. These tests verify the preview
contract, not the official credit calculation.

These are entered review facts, not authenticated filed-return bytes or an IRS
acceptance record. The line 1 and 14 reconciliations are prerequisites to the
prior-year exclusion-item minimum tax; they do not calculate it, official 2025
Form 8801 line 21, current-year line 24 capacity, or line 26 carryforward. The
node's Schedule 3 line 6b output remains an unfileable preview; Form 8801 has no
registered native or PDF descriptor. Before a positive route opens, reproduce
those official lines from accepted prior-year Forms 6251/8801 and the finalized
2025 return, reconcile Schedule 3/Form 1040, and validate native/PDF output and
IRS rules.


## October 8 requirement reconciliation

The existing main-board Form 8801 requirement remains open. The
[official four-page form](https://www.irs.gov/pub/irs-prior/f8801--2025.pdf)
and [instructions](https://www.irs.gov/instructions/i8801) distinguish these
required computations from the current preview:

| Official dependency | Current evidence and remaining boundary |
| --- | --- |
| Part I, lines 1–15 | Entered lines 1/14 reconcile to four prior Form 6251 fields. No calculation of exclusion adjustments, separate minimum-tax-credit NOL, exemption/phaseout, foreign-tax exclusion credit, or preferential-rate/foreign-exclusion tax. |
| Lines 16–21 | Prior AMT and line 26 carry are entered review facts. Line 18 must subtract exclusion tax and can be negative; line 20 includes the applicable prior unallowed vehicle credit. The preview instead adds AMT and carry. |
| Lines 22–25 | Current-return regular tax must account for specified credits; current Form 6251 line 9 supplies tentative minimum tax. Public asserted amounts alone do not prove those finalized-return joins. Official credit routes to Schedule 3 line 6b. |
| Line 26 | Official unused credit requires a retained next-year record; no accepted carryforward/import contract is proved. |
| Filing artifacts | Both positive export guards remain active; no native/PDF descriptor or complete-return packet/IRS acceptance is proved. |

The source review also covers prior separate-filer adjustments, trust K-1
exclusion items, and conditional foreign/capital-gain workpapers. They cannot
be replaced by an ordinary-rate fixture or by assuming all prior AMT was
deferral tax. Filing status/year changes and both owners require explicit
source and identity reconciliation before any positive route opens.

Private `form8801-requirement-review-20261008-v1/audit.json` under the execution
archive binds this review to the previously retained full log/status digests
and unchanged 2,637 current runtime paths. No new tests, implementation,
registration, approved exclusion or checkoff is claimed. The stale internal
research context is recorded separately as future item 47 and remains unworked.
