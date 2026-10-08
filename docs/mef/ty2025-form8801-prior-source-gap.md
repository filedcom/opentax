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


## Isolated final-amount settlement — October 8, 04:42 UTC

Candidate `1ea5bc1d73f37521dc9849c7e1f1b54c48dea925` adds
`stageForm8801SettledReturn`. The executor now retains the actual Form 1040
finalizer input separately from pending output; adoption and QEF refigures
retain their updated input. Settlement first reproduces every public Form
1040 line from that input, then recomputes the credit and dependent limits
until amounts agree. Caller-supplied pre/post snapshots remain rejected.
Skipped/balance lines are cleared appropriately when tax moves from amount
owed to refund. Positive staged attachment claims remain blocked at both
exports, including a vehicle-only line 21 with no prior AMT/carry amount.

Seven new cases cover full/partial/zero credit, exact unused carry, amount
owed-to-refund transition, preceding foreign credit, vehicle-only attachment
requirements and a later Form 8912 limitation. In the constructed bond case,
Form 8801 credit 5,182 changes allowed bond credit from 20,000 to 17,485 and
unused bond credit to 2,515. Final tax is recomputed rather than adding two
previously settled credits. This proves that tested source/calculation/local
amount chain, not authenticity or every credit interaction.

The final normal typed **15-module run passed 171/0, zero ignored** (1m18s
summary). It includes executor tests and existing Form 1040, adoption, QEF,
business-credit and bond-credit checks. Private
`form8801-settled-return-20261008-v3/` binds all 2,644 candidate runtime paths,
source snapshots, retained schema digest, startup, log, terminal status and
review. Log SHA:
`bbb07d7c0326cc0b2d7f1e11112094336ece80449edacd14e60e1d299bc039a1`.
Earlier v1/v2 infrastructure failures and their sources remain retained;
the final run uses the repository's standard test permissions and retained
XSD directory. No test/source guard was waived. Collateral native/PDF tests
are regression evidence; they do not establish Form 8801 native/PDF support
or add new visually reviewed filing packets.

The API returns `finalReturnAmountsReconciled: true` for its locally projected
pending return. `finalizedReturnReconciled`, `filingReady`, prior acceptance
and workpaper authenticity remain false. Public `executeReturn` still has no
admitted official Form 8801 credit route; the candidate does not promote
`projected_pending` to one. Matching native/PDF/attachments, actual accepted
prior records, MTCNOL/MTFTCE and basis proof, all owner/status and other credit
combinations, the full numeric range, durable carry/import, business rules
and IRS acceptance remain required. The whole main task stays open.

All three candidate commits remain isolated on
`codex/form8801-calculation-20261008`; root's running full regression still
uses its unchanged 2,637 paths. No aggregate coverage count or main checkoff
is increased, and all future tasks remain unworked.


## Isolated native document — October 8, 04:49 UTC

Candidate `1f87c4046bcddff6cf02460a83ad74ba52f2706f` adds `stageForm8801NativeDocument` after
byte-bound review and final credit settlement. All 53 represented TY2025
IRS8801 fields follow the retained schema sequence. Schema-shared lines 17
and 41 have no separate elements; skipped tax/capital cells remain absent.
A nonpositive line 21 emits no document, respecting the schema's positive
amount requirement. Caller-supplied calculated lines and changed review
bytes remain rejected. This is a prerequisite projection, not a registered
filing route.

The normal typed six-module run passed **74/0, zero ignored**, including seven
new native cases. Six standalone documents passed the retained IRS8801 XSD:
partial credit/carry, negative deferral, signed exclusion/Part I stop,
Schedule D including the 25% computation, zero allowed credit with positive
carry, and qualified-dividend skipped cells. The exact schema sequence is
also checked against every represented line. Private
`form8801-native-20261008-v2/` retains sources, 2,646-path startup manifest,
full log, terminal status and review; log SHA
`65cb09d6881f2dfbdcff0901abbf8d4875c9d473a4c25460f6053310fb7f41d8`.
The failed v1 type-check log/status and source snapshots remain retained;
the generic schema-map assertion was corrected without bypassing typing.

The candidate remains isolated; root's original full regression was confirmed
live and its 2,637 startup runtime paths still match exactly. Both public
attachment guards remain active. No Form 8801 PDF, complete-return XSD,
matching business rules, accepted prior history, authentic workpapers,
durable accepted carry/import or ATS acceptance is proved by this result.
The broader main task remains open and aggregate coverage counts do not
increase. All future tasks remain deferred.


## Isolated interactive Form 8801 PDF — October 8, 04:55 UTC

Candidate `d55fd76763d26605114eb20ce2b7dabdda044623` adds
`stageForm8801PdfDocument` after reviewed-source settlement and native
projection. It snapshots all caller inputs and bytes before hashing,
requires the exact [2025 IRS template](https://www.irs.gov/pub/irs-pdf/f8801.pdf)
SHA `b82dff67ecf37406bab02f177c706295bd6084853a9ba8be5c87a35c74668a78`,
and derives filer names/primary SSN from the projected public identity.
Joint names require both spouses. All 55 printed lines, including native
shared lines 17/41, use calculated amounts; skipped cells stay blank. Unused
Part III pages and fields are removed on ordinary-rate branches; capital
branches retain all four pages. A nonpositive line 21 emits no PDF.
The canonical source remains unchanged, and output AcroForms stay interactive.

The final normal typed seven-module run passed **82/0, zero ignored**:
calculation, public capacity, settlement, native, PDF, shared guards and
existing preview cases. Private `form8801-pdf-20261008-v2/` retains sources,
2,648-path startup manifest, log, terminal status and review. Log SHA:
`48e0aa5e7769611666d69efe16128aa52a2348073acbef9ec8670dcbbe5ed87e`.
The earlier v1 81/0 checkpoint remains retained; v2 adds joint identity and
missing-spouse rejection. No test guard/type check was bypassed.

Private `form8801-pdf-20261008-v1/output/pdf/` retains two constructed review
previews: partial credit (2 pages, 28 populated widgets, credit 1,475/carry
3,707) and Schedule D (4 pages, 57 populated widgets, credit 9,573/carry
60,963). Canonical source fields and widgets were inspected before filling.
Reopened output canonical values, effective widget values, identity and
calculated lines agree; every widget has a nonempty normal appearance.
Retained native XML matches its calculation in schema order. All six final
rendered pages were individually viewed: amounts are legible in the proper
rows, including signed line 18 and the 25% capital computation. The PDFs
retain native fields and are not flattened. Source JSON, native documents,
logical/visual review and hashes are retained with the previews.

Root's 2,637 startup runtime paths still match the live full regression.
All five Form 8801 candidate commits remain isolated. This completes the
tested local calculation/settlement/native/PDF prerequisites, not the whole
filing route. Actual accepted prior-return records, authenticated MTCNOL,
MTFTCE/capital-basis workpapers, all owner/status/credit combinations and the
full numeric range, durable accepted carry/import, public route/packet
integration, matching business rules and IRS acceptance remain required.
Both public attachment guards stay active; aggregate filing/PDF counts and
main checkboxes do not increase. All future tasks remain unworked.


## Isolated retained prior-return byte reconciliation — October 8, 05:01 UTC

Candidate `19ee3b671374b8be63d506db88f0c5af1cae045f` adds
`inspectForm8801PriorReturnBytes` and `stageForm8801PriorBoundReturn`.
The latter snapshots public inputs, review/prior bindings and all bytes
before awaits, settles the current credit, then reconciles review facts to
one exact SHA-bound retained 2024 XML return copy. Review JSON and prior
XML references must be distinct; caller acceptance flags reject.

The inspector verifies the IRS element namespace (including prefix bindings),
2024 year/period/1040 type, actual header primary SSN, prior filing-status
code, selected Forms 6251/8801 document IDs and duplicate document IDs.
Ten source Form 6251 fields and prior Form 8801 line 26 must match the
reviewed facts exactly. Missing forms/optional amounts can reconcile only
zero claimed source amounts; they cannot supply a positive AMT or carry.
Duplicate fields/forms, changed source amounts, ambiguous/unsafe dollars,
malformed XML, external entities/CDATA, changed/missing bytes and reused
references reject.

The [official IRS TY2024 package](https://www.irs.gov/pub/irs-schema/py2025r1.zip)
was retained with CRC/digest verification. Its `mef/Stylesheets/2024/IRS6251.xsl`
and `IRS8801.xsl` ground the mappings: 2024 line 1 is
`AGIOrAGILessDeductionAmt`, rather than the TY2025 line 1a/1b fields;
`TotalRefundReceivedAmt` stores a nonnegative magnitude printed as a negative
line 2b. Signed income/interest/depletion amounts remain signed. No 2024 XSD
or full prior-return validity/IRS acceptance is inferred from stylesheets.

The normal typed seven-module run passed **84/0, zero ignored**, including ten
new prior-copy cases and existing calculation/capacity/settlement/native/guard/
preview checks. Private `form8801-prior-bytes-20261008-v1/` retains official
ZIP/stylesheets, source snapshots, 2,650-path startup manifest, log/status and
review. Log SHA:
`26c58422ac1ac596615a88474cde0a2c48748415d1d391426d5ea066d5d205db`.
Root's live full regression still uses its exact unchanged 2,637 startup paths;
all six Form 8801 candidate commits remain isolated. No PDFs are newly
created/delivered or added to aggregate counts by this step.

`priorReturnBytesVerified` and `priorForm6251AndCarryBytesReconciled` become true
for the constructed matching copy. This proves byte/line consistency, not
that the copy was filed or accepted. `priorAcceptanceVerified`,
`workpaperAuthenticityVerified`, `finalizedReturnReconciled` and `filingReady`
remain false. Additional exclusion inventories, MTCNOL, MTFTCE, unallowed
vehicle credit and capital/foreign modifications still need their source
proof. Joint allocation and status-change history, accepted carry/import,
registered return/PDF/native packet integration, all credit/owner/numeric
combinations, matching business rules and ATS acceptance remain open.
Both public attachment guards remain active; main checkboxes and future work
remain unchanged.


## Isolated MTFTCE election amount binding — October 8, 05:06 UTC

Candidate `ad6201a53ba384b63ca62accf9a93a302d2c5fbe` extends the existing
Form 8801 prior-copy verifier with a reviewed MTFTCE method. For the election
to claim 2024 foreign tax credit without Form 1116, the
[2025 Form 8801 line 12 instructions](https://www.irs.gov/instructions/i8801)
use prior Schedule 3 line 1. The canonical review JSON must explicitly name
`without_form1116_election`; its entered amount must equal
`ForeignTaxCreditAmt` in the bound 2024 `IRS1040Schedule3` document.
The exact field name is confirmed in the retained official TY2024 stylesheet.
The verifier rejects missing/wrong Schedule 3 document bindings, changed or
negative amounts, duplicate Schedule 3 documents and any retained IRS1116
family document conflicting with that election. Absent Schedule 3 can match
only a zero amount. Ordinary/general-refiguring review facts do not acquire
this proof merely because Schedule 3 foreign credit is present.

The normal typed seven-module run passed **88/0, zero ignored**, including
four new election cases. The constructed elected prior credit of 125
reconciles to Form 8801 line 12, changes exclusion tax to 793 and current
minimum-tax credit to 5,307; finalized local Form 1040 line 22 is 12,560.
Missing/detached/election-conflict branches reject. Private
`form8801-mtftce-election-20261008-v1/` binds sources, the TY2024 Schedule 3
stylesheet, 2,650-path startup manifest, log/status and review. Log SHA:
`e2901452079e24f2e5e3cb93a0e5f88bbaebe00dfa4f410bcdd9e36e16300975`.
Root's live full regression still matches all 2,637 startup runtime paths.
All seven Form 8801 candidate commits remain isolated.

`minimumTaxForeignCreditAmountReconciled` is true only for this explicitly
reviewed and matching amount contract. It does not authenticate election
eligibility, payer/source records, filing or acceptance. General MTFTCE
refiguring across foreign categories, exclusion adjustments, preferential
rates, carryovers and limitations remains required by the existing task;
MTCNOL, additional exclusions, vehicle credit, capital/foreign workpaper
provenance, joint/status-change history, accepted carry/import, public
packet integration, all owner/credit/numeric cases, matching business rules
and ATS acceptance also remain open. Both public attachment guards remain
active. No main checkoff or aggregate coverage increase follows, and all
future tasks remain untouched.

### October 8 — reviewed general MTFTCE category calculation

Isolated candidate `693ba8381` derives the general Form 8801 foreign-credit
workpaper arithmetic from category/country facts and calculated Form 8801
lines 4/11. It computes indirect-deduction shares, category net income,
reviewed tax reductions/carry amounts, high-tax transfers, limitations,
category aggregation, boycott reductions and preferential worldwide-income
adjustments. Simplified election uses reviewed prior AMT line 17 instead of
Part I. The entered aggregate must match calculated line 35/8801 line 12.
The contracts follow the [2025 Form 8801 instructions](https://www.irs.gov/instructions/i8801)
and [2024 Form 1116](https://www.irs.gov/pub/irs-prior/f1116--2024.pdf).

The normal typed seven-module run passed **72/0, zero ignored**; the separate
two-module public-input/attachment-guard run passed **38/0, zero ignored**.
Fourteen new tests include multi-country deductions, multi-category limits,
reclassification, carry/reductions, losses, 951A/901(j), treaty uniqueness,
simplified election, section 960 increase, boycott, preferential factors,
MFS thresholds, changed totals and canonical public-return settlement.
The constructed general case calculates foreign-credit limit 2,230 and
Form 8801 line 12 of 2,000, current credit 6,100, final Form 1040 income tax
11,767 and refund 8,233. Private `form8801-mtftce-refigure-20261008-v2/`
retains source snapshots, 2,652-path manifests, log/status and review;
log SHA `e8ae080bee489fae8db30440a30ae592189f13e600d7a42e0c59cfacd92a7d8a`.
`form8801-mtftce-refigure-guards-20261008-v1/` has guard log SHA
`2f9a31e9a7f40f9c89a3d0104707a575d7a3c04387c7122c9c018e863a6f7a1e`.
The first typed run failed on a test-fixture literal type; its unchanged
sources and failed terminal evidence are preserved in v1. No type checking
was disabled. All eight Form 8801 implementation commits remain isolated.
Root still matches all 2,637 startup runtime paths of its live full run.

This proves reviewed line arithmetic for these cases. Exclusion-only gross
income, foreign capital/loss adjustments, category/high-tax eligibility and
carry history remain reviewed inputs requiring source derivation and
provenance. `mtftceWorkpaperArithmeticReconciled` is separate from source
or accepted-filing proof. Neither prior source verification nor the public
filing guards are weakened. General source authenticity/eligibility, MTCNOL,
accepted prior history, joint/status changes, durable carry import, complete
combinations, packet integration, matching business rules and IRS acceptance
remain required by the existing main task. No main checkoff or aggregate
coverage increase follows; all 47 future items stay unworked.

### October 8 — foreign dividends and capital-distribution adjustments

Isolated candidate `6ff9ea2a8` extends the reviewed MTFTCE calculation with
country-level foreign qualified-dividend and capital-distribution rate bands.
The [Form 8801 instructions](https://www.irs.gov/instructions/i8801) supply the
preferential trigger, 0.5357/0.7143 adjustments, zero-rate omission and
Form 4952 election exception. Actual calculated Form 8801 cells and the
reviewed regular-tax exception select the adjustment method. The category's
rate-band total rounds once; deterministic largest-remainder allocation
reconciles country columns. Entered country income must match the derived
amount. Each country in the category must supply the same derived method;
other capital gains/losses cannot be asserted as distribution-only inputs.

The normal typed nine-module run passed **116/0, zero ignored**, including
six new source-band/exception/rounding/public-return cases and all existing
input/attachment guards. The constructed adjusted income is 35,571 versus
58,500 without an adjustment trigger or with a qualified exception. The
Form 4952 elected 1,500 remains unadjusted. Two countries with one dollar
each at the 15% rate produce one category adjustment dollar. Public-return
settlement retains credit 6,100 and income tax 11,767. This does not prove
issuer records or the underlying rate allocation/election qualification.
Private `form8801-mtftce-distributions-20261008-v2/` retains source snapshots,
2,652-path manifest, actual exit-zero log/status and review. Log SHA:
`a395663ac7e95805557f7b9524caad257eaff283ed43781dbf17a10e77dfd0ca`.
V1's passing run is preserved; V2 corrects the constructed gross-income
allocation inputs and reruns the same command. All nine Form 8801 candidate
commits remain isolated; root's running full regression matches its 2,637
startup runtime paths.

The original task still requires wider source-derived exclusions,
capital-gain/loss Worksheets A/B and Pub. 514 adjustments, authenticated
rate allocations/elections and prior acceptance, MTCNOL, joint/status-change
history, durable carry import, all combinations, native/PDF packet admission,
business rules and IRS acceptance. No main checkoff or aggregate coverage
increase follows. All 47 future items remain unchanged and unworked.

### October 8 — prior joint-return spouse identity

The isolated Form 8801 candidate now requires a distinct reviewed spouse SSN
when prior status is married filing jointly. Both calculator and canonical
review schemas use one shared identity refinement, so omitting current-return
fields cannot remove that requirement. Prior-copy inspection matches the
reviewed spouse to `ReturnHeader/Filer/SpouseSSN`; a missing, swapped,
duplicate, nested or foreign-namespace value rejects. The official TY2024
`IRS1040.xsl` retained from `py2025r1.zip` confirms the header filer field.
`priorJointSpouseBytesReconciled` records only this matching joint-copy
contract. It remains false on an ordinary single-filer copy and does not
prove filing, acceptance or status-change credit allocations.

The normal typed nine-module run passed **120/0, zero ignored**, including
four new prior-joint identity/byte/public-settlement cases. The constructed
same-pair joint return retains zero exclusion-only net tax and 6,100 current
minimum-tax credit; public Form 1040 tax decreases by that calculated credit.
Both export guards stay active. Private `form8801-prior-joint-20261008-v4/`
retains source snapshots, 2,652-path manifest, log/status and review; log SHA
`29dbf1aecd4e43809094c0a3a3b6d2f782aa49c88bcde152346436ea9779149a`.
The primary source stylesheet/digest is retained in v2. V1's test typing
failure, v2's missing-spouse rejection failure and v3's repeated unchanged
failure after an unsuccessful edit are preserved. V4 restores shared schema
validation and runs the same typed command with all cases passing.

Ten Form 8801 implementation commits remain isolated. Root runtime still
matches all 2,637 startup paths of the live full regression. Prior spouses'
source authenticity, accepted history, joint/separate and changed-spouse
allocations, durable import, the other source/calculation gaps, packet
integration, matching business rules and IRS acceptance remain open. No main
checkoff or aggregate coverage increase follows; the whole future section
remains unchanged and unworked.

### October 8 — reproducible unfiled Form 8801 carry record

Isolated candidate `a64b887c8` adds `stageForm8801CarryRecord` and a retained-
byte verification API. It recomputes prior-source-bound public settlement;
the canonical record binds current public-input SHA, review and prior-return
manifests, current/prior filer identities, calculated lines, credit used and
ending carry. Verification requires exact retained bytes and recomputes from
all original sources, rejecting edited records even with a coherently changed
hash. Source and record references remain distinct; all caller facts and
bytes are copied before the first await.

Records have fixed `local_unfiled` status and false current/prior acceptance,
filing-ready and next-year filing-import flags. They support a reproducible
local opening preview only. The prior-year MTFTCE workpaper record identifies
2024 as originating and 2025 as its next workpaper year; it is not mislabeled
as the 2025 minimum-tax-credit carry opening in 2026. These year/amount
contracts follow the [Form 8801 instructions](https://www.irs.gov/instructions/i8801).

The normal typed ten-module run passed **127/0, zero ignored**, including
seven new disk-round-trip, coherently rehashed tamper, changed public source,
nonpositive stop, byte/reference conflict, pre-await copying and MTFTCE-year
cases. Private `form8801-carry-record-20261008-v2/` retains sources, 2,654-path
startup/terminal manifest, log/status, generator and actual persisted source
and record files. Log SHA:
`d46ebe4d79e4e11bf9cd1b347d8ed80ad9774c2f21823a47f05c3667db721d4f`.
Its disk-reopened partial-credit sample has used credit 1,475 and carry 3,707;
record SHA `513530d62f26a5ac8a7b57f4c715ee11892ff75e500f4dbe41cb904f76ff65a5`.
The separate MTFTCE case records 770 opening its 2025 workpaper and current
minimum-tax-credit carry 4,625 opening 2026. V1's 126/0 run is preserved.
The first sample generator failed to locate a single-quoted fixture and
wrote no output; its source is preserved. `generate-v2.ts` successfully
retained/reopened the constructed sample and verified all original sources.

All eleven Form 8801 implementation commits remain isolated. Root's full
regression is still confirmed live and its 2,637 startup runtime paths match.
Accepted-filing admission and import, authenticated source/acceptance bytes,
status-change allocations, the other source/calculation requirements,
public packet integration, matching business rules and ATS acceptance remain
open. No main checkoff or aggregate coverage increase follows. All future
items stay unchanged and unworked.

### October 8 — reviewed MTCNOL vintage-history calculation

Isolated candidate `947ed15df` adds per-vintage minimum-tax-credit NOL history
arithmetic. Reviewed records name independent exclusion-only origin losses,
owner/year, carry direction, eligibility-workpaper reference and chronological
prior usage. The calculator derives origin loss less prior uses, then sums
amounts carrying to 2024 for Form 8801 line 3. The reviewed aggregate must
match that sum. It rejects duplicate origin/owner or item records, reversed
carry direction, a 2024 origin substituted for a carry to its own year,
nonchronological/ineligible use years, overused losses, conflicting totals
and owners outside the reviewed 2024 filer. A reviewed prior-joint spouse
can own a vintage; legal source/owner allocation is not authenticated.

The [Form 8801 line 3 instructions](https://www.irs.gov/instructions/i8801)
require separate exclusion-only section 172(d) losses and carryovers/carrybacks
to 2024. These origin amounts and legal carry eligibility/expiry remain
reviewed inputs. Neither regular NOL nor prior Form 6251 line 2e is reused as
MTCNOL. `mtcnolWorkpaperArithmeticReconciled` denotes depletion/aggregation
only; origin-loss calculation, eligibility, source authenticity and acceptance
remain false/unproved. No full section 172(d) origin refigure or accepted
history is claimed. Legacy entered workpaper previews remain unproved.

The normal typed eleven-module run passed **137/0, zero ignored**, including
ten new vintage/depletion/year/owner/aggregate/public-return cases. The
constructed 2019 origin 50,000 less 30,000 prior use leaves 20,000; reviewed
2025 carryback 8,000 less 2,000 prior use leaves 6,000, producing line 3 of
26,000. Local Form 8801 line 4 is 94,000, exclusion tax is 2,158 and net
exclusion-only AMT zero. At current public wages 30,000, credit 1,475 and
carry 4,625 reconcile with zero remaining income tax. A reviewed carry total
above AMTI stops the Part I tax cells rather than inventing a same-year loss.
Private `form8801-mtcnol-history-20261008-v1/` retains source snapshots,
2,656-path manifest, log/status and review; log SHA
`e1ce134e6621f8deec6b8cfe7feec325a60147da845a3507bbe1acfe33d7ff9f`.
The previously retained 3,707 local carry record was reverified from original
on-disk source files under this implementation without changing its bytes or
hash `513530d62f26a5ac8a7b57f4c715ee11892ff75e500f4dbe41cb904f76ff65a5`.

All twelve Form 8801 implementation commits remain isolated. Root's actual
full-regression session is still live and all 2,637 startup runtime paths
match. Source-derived NOL origin modifications, authenticated eligibility,
expiry/amendment and owner history, accepted carry import, other source and
calculation branches, packet integration, matching business rules and IRS
acceptance remain open. No main checkoff or aggregate coverage increase
follows; all future items remain unchanged and unworked.

### October 8 — exclusion-only MTCNOL origin workpaper arithmetic

The isolated candidate now calculates an individual's reviewed 2018–2025
MTCNOL origin workpaper from exclusion-only AMT income, deductions and
business/nonbusiness capital items. It derives the net capital gain or
limited capital-loss deduction, recalculates the nonbusiness deduction limit,
and applies the separate section 172(d) capital modifications. The basis
contract requires personal exemptions removed, section 1202 exclusion restored
to full gains and NOL/QBI deductions excluded. These are reviewed basis facts,
not issuer/return authenticity. The calculation adapts the
[Form 172 Part I workpaper arithmetic](https://www.irs.gov/pub/irs-pdf/f172.pdf)
to the [Form 8801 exclusion-only instructions](https://www.irs.gov/instructions/i8801);
it does not emit an ordinary Form 172 or replace regular/AMT NOL computation.

A vintage can include this origin refigure. Owner/year must match the vintage,
and its declared origin loss must equal the calculation before prior uses
are deducted. Per-vintage origin arithmetic is recorded separately. A mixture
of computed and entered-review origins cannot claim all origins refigured.
Source-basis, legal eligibility, acceptance and filing flags remain unproved.
There is no carry-expiry, amendment, spousal-allocation or section 172(b)(2)
absorption inference from these arithmetic results; older-origin refiguring
and complete raw-source classifications remain required by the original task.

The normal typed twelve-module run passed **146/0, zero ignored**, including
nine new origin/nonbusiness/capital/MFS/no-loss/source-conflict/vintage/public
cases. The constructed gross 13,000 less deductions 90,000 yields preliminary
loss 77,000, with nonbusiness deduction adjustment 17,000 producing MTCNOL
60,000. Separate capital cases reconcile 3,000 versus MFS 1,500 deductions
and capital-gain/nonbusiness-deduction interactions. A computed 2019 origin
50,000 less reviewed prior uses 30,000 derives Form 8801 line 3 of 20,000;
line 4 is 100,000, tax 3,718, current public credit 1,475 and carry 4,625.
Changed origin amounts/owners/years and changed underlying items reject.
Private `form8801-mtcnol-origin-20261008-v1/` retains source snapshots,
2,658-path manifest, exit-zero log/status and review; log SHA:
`97ad831bc2ce8c23c0a53745ff9ac6d9c0c01790066eec264c5ae9e867cb05ae`.

All thirteen Form 8801 implementation commits remain isolated. Root's full
regression was polled through its actual live session and independently
matches all 2,637 startup runtime paths. Full source proof, all historic
origin/carry/owner combinations, accepted import, packet integration, matching
business rules, ATS acceptance and the other main requirements remain open.
No main checkoff or aggregate coverage increase follows. The entire 47-item
future section remains unchanged and unworked.
