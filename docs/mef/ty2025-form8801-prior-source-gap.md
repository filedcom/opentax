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


## Isolated calculation candidate — October 8, 04:12 UTC

Candidate `3698690eb559d89acdc0dab942f391a1b445e49f` on
`codex/form8801-calculation-20261008` adds `form8801_calculation.ts` and its
focused tests in `/tmp/opentax-form8801-calculation-20261008`. It has not been
integrated into the root checkout while that checkout's full regression runs.
The existing public node and both export guards are unchanged.

The candidate computes the individual-filer line arithmetic of Parts I–III,
including signed exclusion items, prior-status exemption/phaseout, the MFS
adjustment, negative deferral tax, current credit ordering, carryforward,
preferential tax components and foreign-income stacking. It stops after line
21 when required and preserves blank skipped lines. Date/year, duplicate-item,
duplicate-credit, method inconsistency and detached output inputs reject.

These are reviewed calculation facts, not authenticated source records:
MTCNOL and MTFTCE remain separately resolved entered workpapers, capital basis
and applicable foreign-exclusion modifications remain reviewed worksheet
inputs, and the current-return fields are not yet bound to public execution.
The API explicitly returns `filingReady`, `priorAcceptanceVerified`,
`workpaperAuthenticityVerified` and `finalizedReturnReconciled` as false.
Its current whole-dollar input range is bounded at one billion per field;
this candidate does not resolve the main-board requirement's full scope.

The final normal typed run passed **49/0, zero ignored**: 11 new calculation
cases, 26 existing preview cases, and 12 shared attachment-guard cases. The
IRS MFS example, all five prior filing statuses, zero/negative available
credit, zero current capacity, capital rates, and mixed foreign/capital paths
are represented. Private `form8801-calculation-20261008-v2/` retains source
snapshots, startup manifest, log, terminal status and review. The earlier v1
48/0 checkpoint is preserved; v2 adds consistency validation and a stop/carry
boundary case. No full-run, source-authentication, native/PDF, accepted ledger
or IRS acceptance evidence is claimed. The existing source-to-return and
filing-artifact work remains required before any main checkoff.


## Isolated public-capacity join — October 8, 04:24 UTC

Candidate `190caa6f89ed7dbf9cf7f1ffa1ed67b798b74232` extends the same isolated
branch with `form8801_reviewed_return.ts` and a public
`f8801.compute_credit_capacity` request. The request enters no preview credit
facts; it asks the normal execution graph to retain computed current Form
6251 line 9, including zero-AMT cases. Combining it with entered preview
facts rejects. Neither candidate commit is integrated into root.

The staging API verifies the exact SHA-bound canonical JSON review package,
checks its primary taxpayer against public identity, copies bytes/inputs before
awaiting digest verification, derives tax/credit capacity from public execution,
and reconciles mapped Schedule 3 credits to Form 1040 line 20. Detached
aggregate/current-tax inputs, wrong owner/year, duplicate keys/documents,
missing/changed bytes, invalid UTF-8/BOM and incomplete public-source execution
reject. Current source changes recompute capacity. Review JSON is a retained
review record, not an accepted prior-return copy.

Final typed execution passed **60/0, zero ignored**: 11 arithmetic, 11 public
join, 26 existing preview and 12 shared export-guard cases. Private
`form8801-reviewed-return-20261008-v6/` retains source snapshots, startup,
full log, terminal status and review. Log SHA:
`06692d03d373a394cfa48916923e02fe213619393de4108a9eca9c4af7ce771b`.
The earlier failed v1 source/observation and v2–v5 full logs/status/source
snapshots remain retained. Integration was corrected to use a public request
rather than a rejected direct intermediate input. Current-tax expectations were
independently checked against the [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-pdf/i1040gi.pdf)
tax table and computation worksheet, and foreign-credit fixtures now include
their required source and Schedule B answers. Incomplete excess-foreign-tax
review remains a negative case.

Only `reviewPackageBytesVerified` and `currentTaxCapacityReconciled` become
true. `priorReturnBytesVerified`, `priorAcceptanceVerified`,
`workpaperAuthenticityVerified`, `finalizedReturnReconciled` and `filingReady`
remain false. The calculated line 25 is not inserted into the public return:
Form 1040 still contains its pre-credit totals. Actual filed 2024 source and
acceptance, MTCNOL/MTFTCE and basis workpapers, wider owner/status changes,
final credit ordering, carryforward/import and native/PDF/IRS filing evidence
remain required. No complete-form/main-task checkoff follows from this stage.
