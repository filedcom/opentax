# TY2025 Form 1040 validation batch

This is the execution checklist for the agreed build-first gate. It is a plan,
not a record of a current pass. Do not run it until the in-scope implementation
and unsupported-path decisions are settled. The historical 2026-09-26 result
(6,596 passed, 0 failed, 48 ignored) predates the current worktree.

## Scope and preflight

The release scope is the Form 1040 family described in `product_board.md`. Form
1040-NR, 1040-SS, 4868 and dual-status e-file exporters are not release gates,
although their tests may still run as repository regressions. The form-by-form
inventory and any explicit unsupported-path exclusions must be resolved before
the batch. Do not turn an unimplemented filing path into an implicit pass by
omitting its fixture.

Run these read-only checks from the repository root before the batch:

```sh
command -v deno
command -v xmllint
command -v pdftoppm
command -v pdfinfo
test -f .state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd
test -f .state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/ReturnData1040.xsd
```

The TY2025 v5.4 return XSDs and all four commands were present on the 2026-09-29
workspace inspection: Deno 2.7.7, `xmllint` with libxml 2.9.13, and Poppler
`pdftoppm`/`pdfinfo` 26.03.0. A filtered MeF Schedule 2 XSD test and a filtered
full-return Single W-2 XSD test each ran with one pass and zero ignored, proving
the local `Return1040.xsd` was used in both test files. The XSD tests use
`ignore: !xsdAvailable`; without the first XSD file, they silently skip. Do not
accept a full batch where those tests are ignored. The IRS schema is structural
validation, not IRS business-rule or ATS acceptance.

## One full automated batch

After the build/scope checkpoint, run the one repository-wide test command:

```sh
deno task test
```

This is the `deno.json` task,
`deno test --allow-read --allow-write
--allow-run=xmllint,deno --allow-net=www.irs.gov`.
It discovers all repository tests, including Form 1040 calculations,
source-to-return/MeF/PDF cases, ATS fixture assertions, and local `xmllint`
cases against `Return1040.xsd`. Record the commit, timestamp, Deno version,
exact pass/fail/ignored totals, every failure and every ignored test. Fix
failures and rerun the same full command; focused tests may help diagnose a
failure but cannot replace the final full batch. Do not use `--force` or
`--draft` to make an export pass.

The 2026-09-29 06:03 UTC local `deno task test` run on source commit
`cabcfdca703c6fb581dfee8b817afdb7c8f73f4f` passed 8,835/8,835 in
13m30s, with no ignored tests reported. Deno was 2.7.7, `xmllint` used libxml
2.9.13, and Poppler was 26.03.0. The log is retained at
`.state/research/ty2025-full-test-cabcfdca.log`. It includes the 605-case
PDF descriptor file and its live IRS AcroForm field-name checks. This run
supersedes the historical 48-ignored-test note for that descriptor file.
Mapped field existence still does not establish filled-output visual parity.
Rerun the full task after remaining scope and route decisions are implemented.

The 2026-09-29 fixed-source regression run on `21457b7e` passed
8,839/8,839, zero failed, in 13m34s; the summary reported no ignored tests.
Its log is `.state/research/ty2025-full-test-21457b7e.log`. Its
separate filled-output pass generated 17 synthetic PDF packets (98 pages) and
17 native XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v15/`. The new ordinary
Form 8283 return passes local v5.4 XSD; its Form 8283 and corrected Schedule A
pages were visually reviewed. This packet count is coverage evidence for the
held review matrix, not closure of the route and IRS acceptance gates.

The Form 3800 prepared-return integration adds an eighteenth synthetic source
return. The generator now consumes the prepared MeF bundle for its PDF, and
the 2026-09-29-v17 review directory contains 18 PDFs (115 pages) and 18 native
XML files. The geothermal case's native return passes local v5.4 XSD, and all
nine filled Form 3800 pages were rendered and inspected. The first full run on
`afb11416` found one draft-PDF regression (8,848 passed, one failed); the
unidentified preview now takes its explicit draft PDF path. The subsequent
2026-09-29 07:30 UTC fixed-source `deno task test` run on `b32aa0ce` passed
8,849/8,849 in 13m34s with zero failures and no ignored tests reported. Deno
was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was 26.03.0. Logs are
retained at `.state/research/ty2025-full-test-afb11416.log` and
`.state/research/ty2025-full-test-b32aa0ce.log`. Source-route, IRS-rule, and
ATS gates still need their release evidence.

The 2026-09-29 07:53 UTC fixed-source `deno task test` run on `98466597`
passed 8,851/8,851 in 13m37s with zero failures and no ignored tests
reported. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its log is `.state/research/ty2025-full-test-98466597.log`. This
run includes the archive's direct use of the prepared MeF bundle and the
source, XML, typed Form 3800 parts, and attachment drift checks. It does not
replace the final release batch after the remaining route and scope decisions.

The next synthetic review adds two distinct geothermal facilities in one
return. Both source credits reach separate native Form 8835 documents and
three-page PDF copies, Form 3800 Part V rows, the $1,200 allowed credit, and
Schedule 3/Form 1040. Its native XML passes local TY2025 v5.4 XSD, and the
20-page PDF was rendered and inspected. The 2026-09-29-v18 directory now has
19 PDFs (135 pages) and 19 XML files. The first repository-wide diagnostic
after this route passed 8,852 tests and failed three older fixtures that
repeated one physical facility identity; its log is
`.state/research/ty2025-full-test-ecf61f3d.log`. The fixtures now use
distinct facilities. The fixed-source `deno task test` run on `15d5430d`
completed at 2026-09-29 08:38 UTC: 8,855/8,855 passed, zero failed, no
ignored tests reported, in 14m11s. Deno was 2.7.7, `xmllint` used libxml
2.9.13, and Poppler was 26.03.0. Its retained log is
`.state/research/ty2025-full-test-15d5430d.log`. Wider source and ATS gates
remain open.

The next synthetic review adds a wind facility and a geothermal facility on
separate Form 8835 copies. Wind uses line 1a and geothermal line 1c; each
contributes $600 to a separate Form 3800 Part V row and the $1,200 return-wide
credit. The mixed return passes local TY2025 v5.4 XSD, the canonical IRS
Form 8835 field-name check, and focused source/PDF cases. Its 20-page PDF was
rendered; both Form 8835 copies and the Form 3800 Part V page were inspected.
The corrected 2026-09-29-v20 directory holds 20 PDFs (155 pages) and 20 XML
files. Its geothermal and wind sources have reviewed 1.5 MW maximum net output,
1,500 kW AC capacity, and post-January-2023 construction dates consistent with
their no-increase answers. This set supersedes the earlier Form 8835 samples
whose pre-cutoff construction dates and sub-1-MW AC capacities conflicted with
those answers; the earlier generated packets remain diagnostic artifacts.
The fixed-source `deno task test` run on `08786417` completed at 2026-09-29
11:04 UTC: 8,860/8,860 passed, zero failed, no ignored tests reported, in
15m48s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its retained log is `.state/research/ty2025-full-test-08786417.log`.
The final release batch still follows the unresolved source and ATS gates.

The next fully synthetic nonpassive New Markets case supplies a $10,000
qualified equity investment and computes $500 on Form 8874. The same amount
prints on Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and
Form 1040 line 20. Its native `IRS8874` and parent return pass the local
TY2025 v5.4 XSD; focused Form 8874 projection and prepared-return checks pass.
The first filled Form 8874 render exposed a three-line CDE address that crossed
the row boundary. The corrected two-line name/address field was rendered and
visually checked with Form 3800 Part III. The corrected
`2026-09-29-v23` directory holds 21 PDFs (170 pages) and 21 XML files. Longer
CDE text, multiple investments, other credit combinations, and the final
release batch remain open.

The fixed-source `deno task test` run on `5eeb5e6b` completed at
2026-09-29 12:05 UTC: 8,862/8,862 passed, zero failed, no ignored tests
reported, in 20m21s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and
Poppler was 26.03.0. Its retained log is
`.state/research/ty2025-full-test-5eeb5e6b.log`.

The next two New Markets review cases use two and six direct investments.
The two-row case prints a first-year 5% $500 credit and fourth-year 6% $600
credit; the full-capacity case prints six $500 rows. Their $1,100 and $3,000
totals reach Form 3800 Part III line 1i and line 38, Schedule 3 line 6a,
and Form 1040 line 20. The focused prepared-return and 23-fixture local
TY2025 v5.4 XSD suite passed 30/30. Both Form 8874 pages and the parent
Part III page were rendered and visually checked, including row 6. The
`2026-09-29-v25` review directory holds 23 PDFs (200 pages) and 23 XML files.
Long CDE text, passive combinations, source authentication, and the final
release batch remain open.

The fixed-source `deno task test` run on `f0839295` completed at
2026-09-29 12:39 UTC: 8,866/8,866 passed, zero failed, no ignored tests
reported, in 20m30s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and
Poppler was 26.03.0. Its retained log is
`.state/research/ty2025-full-test-f0839295.log`.

One further synthetic return combines a $600 geothermal Form 8835 and a
$500 New Markets Form 8874 on separate prepared Form 3800 Part III lines 4e
and 1i. The prior Form 8835 PDF guard incorrectly equated its source amount
with the whole return credit; it now requires exact prepared line 4e source
and applied amounts and checks the parent total separately. A changed
prepared line 4e test rejects the packet. Local TY2025 v5.4 XML validation
and focused PDF tests pass. The 18-page packet's Form 3800 Part III, Form
8835, and Form 8874 pages were rendered and reviewed; Schedule 3 line 6a
and Form 1040 line 20 each print $1,100. The
`2026-09-29-v26` review directory holds 24 PDFs (218 pages) and 24 XML files.
The fixed-source `deno task test` run on `81a2c713` completed at 2026-09-29
13:37 UTC: 8,869/8,869 passed, zero failed, no ignored tests reported, in
20m35s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its retained log is
`.state/research/ty2025-full-test-81a2c713.log`. The final release batch
remains open.

The 25th synthetic return has seven $10,000 New Markets investments. Its
Form 8874 last row points to a supplemental page listing the sixth and
seventh investments; the $1,000 attached subtotal joins five direct $500
credits to make $3,500 on Form 8874, Form 3800, Schedule 3, and Form 1040.
The Form 8874 and statement pages were rendered and reviewed, its 16-page
PDF has SHA-256
`7d277794aea0a0e8667f6020a28083f653cb0eea3d97b3cb6565c2884a0824cd`,
and all 25 review fixtures pass local TY2025 v5.4 XSD. The
`2026-09-29-v27` review directory holds 25 PDFs (234 pages) and 25 XML files.
The final all-routes PDF and release batch gates remain open.

The fixed-source `deno task test` run on `bc556b01` completed at 2026-09-29
14:05 UTC: 8,873/8,873 passed, zero failed, no ignored tests reported, in
16m39s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its retained log is
`.state/research/ty2025-full-test-bc556b01.log`.

The 26th synthetic return has 24 New Markets investments and a two-page
Form 8874 continuation statement. Five $500 credits print on the form, a
$9,500 last-row total covers the remaining nineteen, and $12,000 joins Form
8874, Form 3800, Schedule 3, and Form 1040. Its native XML passes the local
TY2025 v5.4 XSD; Form 8874 and both continuation pages in the 21-page
packet were rendered and reviewed. The PDF SHA-256 is
`f34eb17b6b92ad02294e788c792950082f5ef3a40e633b60bf42d3a8fa5de602`.
The `2026-09-29-v28` directory holds 26 PDFs (255 pages) and 26 XML files.
The broader filled-PDF and release gates remain open.

The 27th synthetic return has one New Markets investment with a schema-valid
long CDE name and address. Form 8874 row 6 says "See attached" with the $500
credit, and the appended six-column statement wraps the complete CDE identity.
Form 3800, Schedule 3, and Form 1040 each reconcile to $500. The native return
passes the local TY2025 v5.4 XSD; the Form 8874 and statement pages in the
16-page packet were rendered and visually reviewed. Its PDF SHA-256 is
`6cf8c2689fb337831cb0ade1a187e37f5b1f8d4514d23a09408958ebaa4d97c6`.
The `2026-09-29-v29` directory holds 27 PDFs (271 pages) and 27 XML files.
The broader filled-PDF and release gates remain open.

The fixed-source `deno task test` run on `7318ed47` completed at 2026-09-29
15:04 UTC: 8,880/8,880 passed, zero failed, no ignored tests reported, in
16m42s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its retained log is
`.state/research/ty2025-full-test-7318ed47.log`.

A separate Form 3800 carryover-history diagnostic now renders nine checked
synthetic credit vintages over two letter-size pages. Both pages were visually
inspected, and text extraction finds all nine source headings. It is a
standalone statement proof, not one of the 27 prepared return packets; a
carryover return still needs source binding, native Part IV/VI rows, and a
linked attachment. The fixed-source `deno task test` run on `500bd115`
completed at 2026-09-29 16:48 UTC: 8,886/8,886 passed, zero failed, no
ignored tests reported, in 15m51s. Its retained log is
`.state/research/ty2025-full-test-500bd115.log`. The later type-only import
correction on `1087f488` passed focused lint and the two statement tests.

The fixed-source `deno task test` run on `9175f7c1` completed at 2026-09-29
14:29 UTC: 8,875/8,875 passed, zero failed, no ignored tests reported, in
15m57s. Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was
26.03.0. Its retained log is
`.state/research/ty2025-full-test-9175f7c1.log`.

## XML evidence

For each supported positive filing route in the completed coverage inventory,
retain its full-return source fixture, computed 1040/supporting lines, emitted
XML, and the local XSD result. Existing `*.xsd.test.ts` and
`forms/f1040/e2e/xsd_validation.test.ts` are structural cases, but a passing
slice does not establish every listed route. A separately generated full Form
1040 XML can be checked with:

```sh
xmllint --noout --schema .state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd /absolute/path/to/return1040.xml
```

That command is for an XML artifact after it exists, not a substitute for
source-to-return assertions or IRS business-rule review. Do not use an ATS
scenario packet PDF as if it were a generated return.

## Filled-PDF visual review

The first post-implementation `deno task test` at `b168d9bb` on 2026-10-02
stopped before test execution with 32 TypeScript errors. It used Deno 2.7.7,
V8 14.6.202.9-rusty, and TypeScript 5.9.2; the log is retained locally at
`.state/research/ty2025-pr59-bulk-test-2026-10-02.log`. The same full command
must be rerun after type repairs. This is not a test pass.
The type-repaired rerun at `f63302d8` completed in 27m05s with 10,287 passed
and 216 failed (none ignored reported). Its local log is
`.state/research/ty2025-pr59-bulk-test-retry-2026-10-02.log`. Failures are
under source/fixture triage; the result does not pass the release gate.
A second type-clean full `deno task test` at `c7b3be71` completed in 30m15s
with 10,393 passed and 112 failed. Its local log is
`.state/research/ty2025-pr59-bulk-test-retry2-2026-10-02.log`. The two
1099-K review assertions failing in that run were subsequently repaired and
passed a nine-case focused rerun. Subsequent focused repairs also corrected
three HSA/Form 2555 fixtures (7/7 passing) and two Form 5329 tax joins plus
the Schedule E retained-sale allocation (33/33 passing). Most remaining
failures concern the deferred named-form parents; a fresh full run is required
to establish the exact residual count.
The full gate still has no passing result.
A later full `deno task test` at `b4e01e51` completed on 2026-10-02 in
30m09s with 10,428 passed and 103 failed. It used Deno 2.7.7 (V8
14.6.202.9-rusty, TypeScript 5.9.2), `xmllint` libxml 2.9.13, and Poppler
26.03.0; its local log is
`.state/research/ty2025-pr59-bulk-test-retry4-2026-10-02.log`. The new
source-backed EIC opt-out, spouse-dependent refund, frozen IRA deposit,
overpayment-to-2026, and divorced estimated-payment PDF review/XSD cases
passed. Most failures concern the deferred named-form routes; nonnamed
fixture/assertion failures are being repaired. This is not a release pass.
A full rerun at `d22ab027` completed on 2026-10-02 in 29m09s with 10,432
passed and 99 failed (none ignored reported). The local log is
`.state/research/ty2025-pr59-bulk-test-retry5-2026-10-02.log`. The repaired
packet/Form 8994 assertions and source-backed Form 8824 bundle/XSD case pass
in that run. All 99 residual failures map to deferred named-form routes or
their fixtures. Three generic attachment-export cases concern Forms 8958,
2106, and 8844 and fail on earlier source or guard assertions. The read-only
failure audit found no independent nonnamed return, payment, PDF assembly, or
A2A production failure in this run. This is not a release pass.

A fresh local ARM64 CLI compiled from `d22ab027` with `deno compile` and SHA-256
`f80caffb31d473b311e6134b3e57ae3853ec0d976d40892f64f8f0508aef751a`
passed `scripts/smoke-release-binary.ts` as version `dev`: source-backed W-2,
clean CLI validation, finalized MeF XML, and a two-page PDF. This verifies the
local compiled asset only; the five release-workflow platform artifacts and
downloaded release assets have not been built or smoked.

The workspace has blank IRS PDF templates in `.state/field-dumps/cache` and
source ATS scenario PDFs in `.state/research/docs/ats-ty2025`. These are not
filled-output fixtures. `forms/f1040/2025/pdf/review-fixtures.ts` now holds
178 synthetic source returns, and `scripts/generate-ty2025-pdf-review.ts`
can run them through the real return graph and PDF builder. Earlier on
2026-09-29, the first sixteen
generated 94 pages successfully under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v10/`
and all sixteen source returns passed TY2025 v5.4 XSD validation. The earlier
thirteen-case, 67-page batch, its source/pending JSON, page-count and
SHA-256 manifest and native XML are retained locally at
`.state/research/ty2025-filled-pdf-review/2026-09-29-v6/`; all thirteen XML
returns validate against TY2025 v5.4 `Return1040.xsd`; see the
[first review notes](ty2025-filled-pdf-review-2026-09-29.md). This is a starting
review batch, not the completed PDF gate. The generator refuses to overwrite an
existing output directory and stops on executor diagnostics. Rerun it after
changes using a new output directory:

```sh
deno run --allow-read scripts/plan-ty2025-pdf-review.ts > /absolute/new/review-plan.json
```

The read-only plan enumerates all fixture IDs, expected PDF descriptor keys,
synthetic owner SSNs, and review focus, then lists registered PDF keys not
represented by any fixture. The current fixture metadata names **84 distinct
registered PDF keys out of 112**; **28 keys remain without a fixture**, across
115 registered descriptors. The eight older human-readable expected-form aliases
have been replaced with their exact descriptor keys, while repeated keys still
indicate multiple expected copies. The plan does not prove that any PDF renders.
Its uncovered list is the concrete queue for more source-backed fixtures or
documented fail-closed routes; none may be treated as visually reviewed by this
batch.

Two additional W-2-backed full returns cover the previously unrepresented
Form 8911 and its Schedule A descriptor keys and the Form 8936 key shared by
its parent and Schedule A PDF descriptors. The personal home charger has a
$1,000 qualified cost, a $300 credit, and a $3,875 regular-tax limit. The new
clean vehicle has a $7,500 tentative credit limited to $3,875 on the return.
Both graph returns passed their focused local TY2025 v5.4 XSD cases. Prepared
PDF builds produced seven pages each; the Form 8911, Form 8936, and both
Schedule A page sets were rendered and visually checked for source identity,
amounts, checkboxes, page order, and legibility. The packets are retained
locally under `.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage/`.
Three further full returns cover Form 2106, Form 8859, and Form 8834. The
fee-basis county officer has one W-2-matched job, $1,200 of unreimbursed
expenses, and $48,800 AGI. The $1,200 DC homebuyer carryforward and $450
qualified-electric-vehicle prior passive credit each join Schedule 3 and Form
1040 against $3,875 of current income tax. All three passed their focused
graph/native local TY2025 v5.4 XSD cases and separate prepared-bundle XSD
checks. Their prepared PDF packets contain six, four, and six pages; the
Form 2106, 8859, and 8834 pages were rendered and visually checked for filer,
amounts, page order, and legibility, with the Schedule/1040 transfer amounts
checked in the filled packets. Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage-2/`.
These are synthetic source records; prior-year carryforward and passive-credit
documentation still need external authentication. A graph-valid Form 8611
case was excluded from the PDF matrix because its historical credit and basis
records fail the existing printable-filing source-verification gate.
Two further full returns cover Form 5884 and Form 8912. The W-2-backed,
certified work opportunity case has $6,000 qualifying wages, a $2,400 credit,
and a matching Schedule C wage deduction reduction, Form 3800 line 4b, Schedule
3 line 6a, and Form 1040 line 20. Its Schedule C business has no net profit,
so the case does not claim an unsupported QBI filing route. The identified
2017 qualified energy conservation bond reports a $100 current credit through
Form 8912, Schedule 3 line 6k, and Form 1040 line 20. Both focused full-return
XSD cases and prepared-bundle local TY2025 v5.4 XSD checks passed. Their
prepared PDFs have 17 and seven pages; the Form 5884, Schedule C, Form 3800,
and Form 8912 target pages were rendered and inspected for source identity,
amounts, page order, and legibility. Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage-3/`.
The synthetic SWA certification and Form 1097-BTC facts do not authenticate
external issued records.

Two more full returns cover Form 8820 and Form 8844. The orphan-drug case has
$10,000 of qualified clinical testing costs and a reduced-section-280C credit
of $1,975 on Form 3800 line 1h. The empowerment-zone case has $10,000 of
qualified wages and a $2,000 credit on Form 3800 line 3, with the matching
Schedule C wage deduction reduction. Both credits join Schedule 3 line 6a
and Form 1040 line 20. The focused graph/native tests and both prepared bundles
passed local TY2025 v5.4 XSD validation. Their prepared PDFs have 16 and 17
pages; the Form 8820, Form 8844, and Schedule C target pages were rendered and
visually inspected for identity, amounts, page order, and legibility. Filled
packet text also confirms the Form 3800, Schedule 3, and Form 1040 amounts.
Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage-4/`.
The synthetic FDA designation and zone/employment records do not authenticate
external issued records.

Two further full returns cover Form 8882 and Schedule R. The childcare case
reports $40,000 of qualified facility spending and $10,000 of referral spending,
with the $39,000 net Schedule C deduction after the $11,000 tentative credit.
Form 3800 allows $9,573 in the current year, matching Schedule 3 line 6a and
Form 1040 line 20. The under-65 disabled worker reports $17,000 of taxable
disability wages and a $38 Schedule R credit on Schedule 3 line 6d and Form
1040 line 20. Both focused graph/native tests and prepared bundles passed local
TY2025 v5.4 XSD validation. Their prepared PDFs have 17 and five pages; the
Form 8882, Schedule C, and both Schedule R pages were rendered and inspected
for owner identity, line amounts, selected disability box, and legibility.
Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage-5/`.
The synthetic childcare contracts and signed physician statement need
external authentication.

Two W-2-backed cases add filled-PDF review of Schedule 3 payment aggregation.
Two distinct $100,000 employers withhold $12,400 of Social Security tax,
producing $1,482 of excess withholding on Schedule 3 line 11 and Form 1040
line 31. The second case adds a separately sourced $426 Form 4136 fuel credit
on Schedule 3 line 12, bringing line 15 and Form 1040 line 31 to $1,908.
Focused graph/native tests, prepared-bundle TY2025 v5.4 XSD validation, and
three- and seven-page PDF builds passed. Schedule 3, Form 1040 page 2, and
Form 4136 target pages were rendered and inspected for source identity,
amounts, page order, and legibility. Artifacts are under
`.state/research/ty2025-filled-pdf-review/2026-10-02-extra-coverage-6/`.
The remaining 28 registry keys still need source-backed coverage or a
documented fail-closed scope decision; the full 178-case render batch remains
open.

The later `single-refinanced-car-loan-schedule1a` source case keeps one VIN and
splits $4,000 of qualified interest between the original 2025 purchase loan
and its same-vehicle, first-lien refinance. It awaits the same execution, XSD,
rendering, and page review as the rest of this batch.

Three newly authored positive source cases target registered PDFs that were
missing from the matrix: a nonliquidating Form 7217 distribution with three
property bases, a W-2 code-D retirement-savings Form 8880 credit, and a direct
interpreter-expense Form 8826 credit with its Schedule C deduction reduction and
Form 3800 parent. Their source shapes come from existing native/PDF route
fixtures; no filled packet or XSD result has been produced for these three yet.
The plan's `uncoveredPdfKeys` is the exact remaining descriptor-key list and
must be reviewed after every further fixture addition. Many of those keys need
additional independently reviewed source facts or guarded attachment bytes;
the list is not a set of safe positive filing paths.

Three additional source-backed cases use previously exercised full-return paths:
a cash-method Schedule F raised-products farm with Schedule SE and Form 8995,
and a full-year Form 2555 physical-presence exclusion with linked Schedule 1
and Form 1040 amounts. The third adds a provider, dependent, and W-2-backed
Form 2441 care credit to Schedule 3 alongside the child's other return effects.
Their fixture definitions await the one bulk execution
and visual gate; adding them here is not a rendered-page signoff.

Three further source cases come from existing full-return native/PDF tests: a
Section 1231 land exchange through Form 8824 and Form 4797, an installment
business-land sale through Form 6252 and Form 4797, and sourced investment
interest and dividends through Form 4952 and Schedule A. Each uses the same
synthetic W-2 filer identity as the basic return case. These fixture definitions
still await the bulk run and visual review.

Five more fixtures reproduce supported full-return routes: a W-2 income-limited
section 179 asset on Form 4562, two Section 1256 broker accounts on Form 6781,
a scholarship-adjusted lifetime learning credit on Form 8863, a sourced
post-year IRA contribution and distribution on Form 8606, and a twelve-month
Schedule C health plan on Form 7206. The source, owner, and final-return joins
come from existing route tests; these fixture definitions have not yet been
rendered or validated in the held batch.

Four more source cases cover a Series EE bond exclusion on Form 8815, two
early IRA distributions on owner-specific Form 5329, a qualified disaster
distribution alongside an ordinary plan distribution on Form 8915-F, and a
rented-home Schedule C deduction on Form 8829. Their source shapes follow the
existing full-return graph/native/PDF paths; the held batch must still prove
their XSD and filled-page results.

Two further existing full-return routes add Form 8995-A with its Schedule C
loss-netting companion and Form 7203 with a separately sourced capital
contribution and formal shareholder note. The first has two distinct Schedule C
business copies, so its page review also exercises copy-number tracking in the
completion checker. The second reconciles the allowed K-1 loss to Schedule E,
Schedule 1, and Form 1040. Neither new fixture has been rendered in this held
batch.

Three more cases reuse source-to-return paths already covered by the native
and XML route tests: a 2025 principal-residence debt discharge through Form 982
and Schedule 1, Form 1099-NEC wages classified under Form 8919 with linked
Schedule 2 and Form 8959 taxes, and Section A door plus Section B air-conditioner
credits on Form 5695. They add exact registered PDF keys to the review queue.
Their expected pages and cross-form amounts still await the held bulk run and
visual review.

Three additional source-backed routes add a Schedule C excess business loss on
Form 461 with its Schedule 1 addback, a long-term business casualty on Form 4684
linked to Form 4797, and a mortgage credit certificate with allocated interest
on Form 8396 linked to Schedule 3. Existing full-return graph tests establish
the source shapes and cross-form joins; the held bulk run must still establish
the new fixtures' XML validity and filled-page output.

Two more source-backed review returns add Schedule J farm-income averaging and
Form 8881 startup plus auto-enrollment credits. Both pass the focused local
TY2025 v5.4 full-return XSD test. The Form 8881 case also rendered as a
24-page prepared packet; its filled Form 8881 page was inspected with 750 on
Part I line 8 and 500 on Part II line 11. The same amounts reach separate
Form 3800 rows and total 1,250 on Schedule 3 and Form 1040. Source
authentication and the all-cases visual pass remain open. The Form 8881 case
also caught a document-discovery bug: its native builder now reconciles its
source during discovery and requires the linked Form 3800 ID during the final
pass.

Three further prepared review fixtures cover an identified Form 4835 crop-share
rental profit, a Form 4136 farm-equipment fuel credit, and a first-year joint
Form 2210-F farm-income underpayment election. Each source return passed focused
TY2025 v5.4 full-return XSD validation, and all three produced filled PDF
packets (6, 7, and 3 pages). The Form 4835, Form 4136, and Form 2210-F pages
were rasterized and inspected for identity and the stated amounts; the full
page-by-page review matrix remains open. The packets are retained under
`.state/research/ty2025-filled-pdf-review/2026-10-02-nonnamed-3/`. The Form
4136 fixture uses a whole-dollar $426 claim. A separate $42.60 source claim
currently fails the Form 1040 line 31/Schedule 3 exact join after Form 1040
rounds to $43; that fractional-credit route needs a calculation/serialization
decision before this coverage can be generalized.

An attempted Form 5884 Work Opportunity Tax Credit review case exposed an
unresolved combined route. Its correctly reduced Schedule C wage deduction
leads to positive business QBI, but the positive Form 8995 filing validator
currently rejects a Schedule C source with a WOTC wage reduction. Making the
business loss-making instead triggers separate Form 461 and QBI-loss carryover
requirements. No Form 5884 review fixture was added until that interaction is
implemented and verified.

Uncovered registered PDF keys at this checkpoint (40):

```text
f2106 f4255
f5471_parent f5471_schedule_e f5471_schedule_h f5471_schedule_i1
f5471_schedule_j f5471_schedule_m f5471_schedule_p f5471_schedule_q
f5471_schedule_r f5884 f8611 f8820 f8834 f8844 f8854 f8854_annual
f8859 f8864 f8882 f8911 f8911_schedule_a f8912
f8936 f8941 f8978 f8994 f965
form8582cr
form8839 form8853
form8978_schedule_a form8990 form8992 form8992_schedule_a
form8995a_schedule_a form8995a_schedule_b
form8995a_schedule_d schedule_r
```

```sh
deno run --allow-read --allow-write --allow-net=www.irs.gov --allow-run=xmllint scripts/generate-ty2025-pdf-review.ts /absolute/new/review-directory /absolute/path/Return1040.xsd
```

Each generated native XML must pass the supplied TY2025 `Return1040.xsd`
before its PDF artifact is written. The manifest records the schema file digest
and each case's structural validation result; IRS business rules, source
authenticity, and visual parity still require separate review.
The generator records one fixed synthetic `ReturnTs` in its source record and
manifest so later source replay yields byte-identical native XML. This timestamp
is only for the review batch; ordinary exports keep their actual build time.

Each case writes a filled PDF and a JSON record of its synthetic source,
identity, expected forms, review focus and raw computed pending data. On a fully
successful run, the generator also writes `review-manifest.json` with exact PDF
and native XML hashes, the retained IRS template cache filenames, descriptor
source URLs and SHA-256 digests, the rendered page count, expected owner and form-copy
lists, the builder's registry form/copy origin for each page, and one unreviewed
checklist slot for **every actual page**. Reviewers
must identify each page's observed form and owner, compare amounts and
checkboxes with source/XML, and inspect continuation order and clipping before
marking the slots complete. Any guarded or otherwise failing fixture stops the
run without a completion manifest; the known `single-8862-ctc-reinstatement`
case currently expects a native export guard. Resolve such cases by a supported
route or an explicit validation-scope decision, not by dropping them silently.
For each page, the reviewer fills `observedForm` with the exact registered PDF
key, `observedFormCopy` with its 1-based copy number for that case (the same
number on all pages of that copy), and `observedOwner` with `primary` or
`spouse`. The reviewer sets all six page checklist booleans to `true` only
after inspecting that page; `reviewerNotes` may remain empty. The read-only
completion checker requires every expected key and repeated copy to appear on
at least one reviewed page, and rejects extra form keys or pages without an
owner. Run it only after human review:

```sh
deno run --allow-read --allow-run=xmllint scripts/check-ty2025-pdf-review.ts /absolute/review-directory /absolute/path/Return1040.xsd
```

The checker compares the manifest's expected forms, owners, and review focus
against the checked-in fixture list and source records, recomputes
PDF/XML/source hashes, checks PDF page counts, and
replays each checked-in source through the current return graph and native MeF
builder so saved pending data and XML must match that calculation. It then
reruns the XML schema validation against the recorded root XSD digest and the
reviewed local v5.4 root/tree pins described in
`ty2025-v54-schema-provenance.md`. It also
requires exactly one PDF, XML, and source JSON file per checked-in case plus
the manifest; the generator's IRS template cache directory is the only extra
top-level entry. Missing files, unlisted files, and symlink artifacts fail.
The checker rebuilds each filled PDF from the replayed prepared bundle using
that retained IRS template cache and rejects a different PDF even if its
manifest digest was updated. It also rejects a cache entry whose name, registered
IRS URL, or bytes differ from the generation manifest. Earlier review manifests
without template-cache or page-origin evidence need regeneration; no old-format
acceptance is provided. The checker compares replayed page origins with the
manifest and every reviewer-entered form/copy label; emitted copies must match
the fixture's expected registry keys. The recorded URL and digest prove only
that the retained bytes match
the generator's cache. They do not independently authenticate the original IRS
download, because the repository has no trusted template digests or signed IRS
template archive against which an edited cache and manifest can be checked.
It does not
inspect visual correctness or set any review flag itself. A successful command
means the recorded human checklist is complete and the named artifacts have
not changed; the visual observations remain the reviewer's responsibility.

### Focused review-packet smoke, 2026-10-02

A temporary copy of each script imported only the existing
`single-divorced-agreed-joint-estimated-payment` and `single-w2-eic-opt-out`
fixtures; the checked-in 178-fixture list was not changed. From the repository
root, the focused copies ran with these exact command shapes and the local
schema path below (the temporary copies were removed after the run):

```sh
deno run --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov scripts/.withholding-generate.ts /tmp/ty2025-focused-review.BfPKB3/packet2 .state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd
deno run --allow-read --allow-run=xmllint scripts/.withholding-check.ts /tmp/ty2025-focused-review.BfPKB3/packet2 .state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd
```

The packet and all four rendered page PNGs are retained locally at
`.state/research/ty2025-focused-review-2026-10-02/` (`packet/` and
`renders/`). It contains two source JSON files, two native XML files, two
filled Form 1040 PDFs, four pages, a manifest, and one retained IRS template.
Both native returns passed the local v5.4 XSD, and the generator/checker
accepted the root-XSD and 746-file schema-tree pins. All four pages were
rendered and inspected for form/year, primary identity, amounts, boxes, order,
and legibility. The first case shows the former spouse SSN and $300 estimated
payment/refund; the second shows $15,000 wages and the EIC opt-out mark. The
completed read-only checker reported `Review checklist complete: 2 cases, 4
pages; artifact hashes and TY2025 XSD validation confirmed.` Its PDF replay,
source/XML hashes, page count, and template-cache evidence also passed.

After page-origin evidence was added, the same two case PDFs regenerated with
byte-identical hashes and recorded all four pages as Form 1040 copy 1. The
completed checker passed again on
`.state/research/ty2025-page-origin-smoke-2026-10-02/`. In a disposable copy of
that packet, changing one recorded origin to `schedule3` while keeping page
count and PDF bytes fixed made the checker reject the manifest with `recorded
PDF page origins differ from replay`. This exercises the new manifest format
on two cases; it does not expand the full-review count.

An initial focused attempt stopped at `single-w2-refund`: its positive W-2
source lacks `employee_ssn`, which the current W-2 source guard requires.
Inspection found the same missing field in
`single-w2-overpayment-applied-2026` and `single-1098-purchase-points`; those
two were not executed in this smoke. Correct their fixtures before the full
batch. This two-case smoke is not the 178-case filled-PDF review, repository
test batch, IRS rule validation, ATS acceptance, or a release gate.

Schedule 1 line 8z now prints `SEE STATEMENT` on its IRS page and appends the
same identified type/amount rows used by the native OtherIncomeTypeStatement.
Its PDF total must match the printed line amount; mixed-source cases need a
fresh filled-page check for wrapping and page order.
The table below records the earlier starting subset; the plan script enumerates
all current fixtures. This subset is not coverage of all registered PDF
descriptors:

| Synthetic case                           | Target visual evidence                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `single-w2-refund`                       | Two 1040 pages, Single and digital-assets No checkboxes, wages, withholding and refund                             |
| `single-child-unearned-income`           | 1040, Schedule B, and Form 8615; parent MFJ status and the $412 Form 8615/1040 line 16 join                         |
| `single-high-wage-no-niit`               | Form 8960 filed above the MAGI threshold with zero NIIT; Form 8959 and Schedule 2 carry $180 Additional Medicare Tax |
| `single-two-partnership-code-j-recoveries` | Two K-1 code J recoveries, separate native type rows, Schedule 1 line 8z and Form 1040 line 8/AGI                  |
| `single-two-partnership-code-e-cod` | Two fully taxable K-1 code E debts, Schedule 1 line 8c and Form 1040 line 8/AGI; no Form 982 or Form 1099-C |
| `single-partnership-code-k-and-w2g` | Two nonbusiness K-1 code K winnings and a distinct W-2G combine on Schedule 1 line 8b; W-2G withholding reaches Form 1040 |
| `single-two-partnership-code-s-capital` | Two reviewed nonpassive K-1 code S amounts reach Schedule D lines 5/12 and Form 1040 line 7a/AGI |
| `single-partnership-code-l-r-ordinary` | Two K-1 code L/R ordinary rows reach Form 4797 line 10, Schedule 1 line 4, and Form 1040 line 8/AGI |
| `single-six-partnership-code-l-r-continuation` | Six reviewed K-1 code L/R rows reach Form 4797 line 10; three print directly and three on a numbered continuation, with Schedule 1 and Form 1040 reconciled |
| `single-sourced-collectibles-gain`        | Form 8949 Part II box E and Schedule D lines 9/18 carry a sourced $3,000 collectible gain to Form 1040              |
| `single-short-and-long-form8949-sales`   | Form 8949 boxes B/F, Schedule D lines 2/10 and short/long totals, and Form 1040 capital gain                        |
| `single-direct-broker-basis-sales`        | Unadjusted basis-reported sales on Schedule D lines 1a/8a with no Form 8949 document or PDF page                    |
| `single-direct-and-adjusted-broker-sales` | Direct Schedule D line 1a and adjusted Form 8949 box A/line 1b in the same source-backed return                    |
| `joint-two-w2s`                          | MFJ and spouse identity, combined W-2 amounts without duplicate pages                                              |
| `joint-two-w2s-schedule-lep`             | Two separately owned language requests, native LEP documents, and one printable page per spouse                    |
| `single-reviewed-car-loan-schedule1a`   | Reviewed VIN and loan interest to Schedule 1-A Part IV lines 22–30/38 and Form 1040 line 13b                     |
| `single-three-car-loan-schedule1a` | Three reviewed VINs, a line 22 continuation, and $4,000 reconciled on Schedule 1-A and Form 1040 |
| `single-two-w2-flsa-overtime-schedule1a` | Two reviewed W-2 box 14 premiums to Schedule 1-A Part III lines 14a/14c/15/21/38 and Form 1040 line 13b       |
| `single-w2-qualified-tips-schedule1a`   | W-2 box 7 and TTOC 102 to Schedule 1-A Part II lines 4a/4c/6/7/13/38 and Form 1040 line 13b                      |
| `single-two-w2-qualified-tips-schedule1a` | Two employer-identified box 7 tip sources reach line 4c through a printed worksheet, then Form 1040 line 13b |
| `joint-senior-schedule1a`                | Two senior owners, Schedule 1-A Parts I/V/VI and Form 1040 line 13b; four-page identity and amount review          |
| `single-schedule-c`                      | Schedule C page order and business boxes, Schedule SE/1/2, Form 8995, Form 1040 amount owed                        |
| `single-two-at-risk-business-losses`     | Two source-backed Form 6198 pages, three Schedule C activities, and $1,600 on Schedule 1 line 3                  |
| `single-direct-pension-rollover`         | 1040 lines 5a/5b and affirmative line 5c rollover box, with no inferred QCD                                        |
| `single-ira-rollover`                    | 1040 lines 4a/4b and affirmative line 4c(1) rollover box from dated IRA-to-IRA evidence; pension line 5c blank    |
| `single-ira-qualified-plan-rollover`     | Form 1040 line 4c(1), linked native IRA statement, and a matching qualified-plan explanation page in the PDF      |
| `single-ira-2026-rollover`               | Form 1040 line 4c(1), linked native IRA statement, and a matching 2026-completion explanation page in the PDF      |
| `single-hsa-code2-excess`                | Form 8889 lines 14a/14b/14c, Schedule 1 line 8z earnings, and Form 1040 line 8                                     |
| `joint-two-hsa-owners`                   | Two separately identified Form 8889 pages, Schedule 1 and Form 1040 deduction reconciliation                       |
| `single-marketplace-aptc-repayment`      | Form 8962 two-page monthly PTC calculation, one 1095-A policy, capped excess APTC through Schedule 2 and Form 1040 |
| `mfs-shared-policy-repayment`             | One spouse-shared policy, APTC-only Part IV percentage and $750 repayment on Schedule 2 and Form 1040              |
| `mfs-shared-policy-exception`             | One spouse-shared policy, family SLCSP, 50% premium/APTC percentages and $2,400 credit on Schedule 3 and Form 1040 |
| `single-iso-amt`                         | Form 3921 ISO spread on Form 6251 line 2i, both AMT pages and any Schedule 2/Form 1040 tax join                    |
| `single-nonparticipating-rental-loss`    | Schedule E loss, Form 8582 Part V/worksheet rows, three-page order and no unsupported current loss deduction       |
| `single-elected-lump-sum-part-ii`        | Form 4972 Part-II-only capital-gain election from a matching 1099-R; ordinary share and special tax on Form 1040   |
| `single-foreign-interest-current-excess` | Source-joined 1099-INT, standard-deduction Form 1116 Part I/III/IV, current-year excess Schedule B, Schedule 3     |

The 2026-09-30 direct-pension-rollover review found a missing Form 1040 line
5a amount in the earlier generated packet. The source Form 1099-R had a $20,000
code-G distribution, while both Form 1040 PDF and native XML omitted its gross
amount. The corrected graph reports $20,000 on line 5a and zero taxable on
line 5b. The PDF now prints the `0` required for a full rollover, checks line
5c(1), and leaves QCD unchecked. Both rendered Form 1040 pages were inspected
against the source and native XML from the regenerated 27-case
`2026-09-29-v31` batch. The PDF SHA-256 is
`d2e69dee162e15bab26376a8b3e38ca3277494cbf25d257841777643c8d5c435`.
The focused Form 1099-R, Form 1040 PDF and 27-case XML checks pass 115/115 and
101/101 in separate runs. Other cases still need per-page comparison.

The first eleven cases were rendered into page contact sheets for the first visual
pass. The new Form 8615 and Form 8960 pages were rendered and checked at higher resolution.
The three later Form 8962 and Form 6198 cases were rendered and checked on
their relevant pages; see the [policy-month](ty2025-form8962-policy-month-gap.md)
and [Form 6198](ty2025-form6198-pdf-gap.md) notes for packet hashes and
the checked amounts.
Schedule 1 and Schedule 2 blank filer headers were found and fixed;
the latest Schedule 1 page was rerendered and checked at higher resolution.
The Schedule E loss case now uses its linked Form 8582 allowed-loss allocation
to print line 22 and line 26, with the disallowed amount absent from Schedule
1. The first pass checked page order, form/year, visible identity, and major
amount placement. A per-page source-to-XML amount/checkbox review is still
needed, so this is not a completed visual signoff. The
`single-marketplace-aptc-repayment` source is one supported policy; it does not
cover shared-policy allocations, interstate moves, multiple policies or
same-state alternating policy years. The rental case does not cover prior PAL
imports, active-rental allowances or entire dispositions. The ISO case does not
cover the other Form 6251 adjustments or Part III preferential-rate
combinations. The Form 4972 case covers one taxpayer's full-share Part II
election only; it does not cover Part III, NUA, beneficiary/estate allocations,
separate spouse forms or multiple elected distributions. The Form 1116 case
covers one passive interest source and a reviewed 2024 zero-carryback position
only; it does not cover mixed income, multiple payers or countries, itemized
deductions, or prior carryover use.

Do not claim general Form 1116 Schedule B filled-output coverage from this
one-source fixture. The public
`form1116_review.single_source_pdf_review` intake now joins the one-source
parent Form 1116 and Schedule B to a synthetic 1099-INT and prior-year review,
Both Schedule B pages and the parent Form 1116 now generate through the public
graph and were viewed in the contact sheets; the detailed cross-check is still
open. Do not inject calculated pending values or silently drop the parent page.
The remaining registered descriptors also need
representative filled-output fixtures before this visual gate can close.

Expand this matrix to every supported active PDF route in the final coverage
inventory, including multi-page/overflow, multiple owner copies, checkbox or
radio, zero/negative amount and attachment cases. A failed generator case is a
batch failure to diagnose, not a reason to drop that fixture or use `--force`.
Keep real taxpayer data out of validation artifacts.

For each generated PDF, inspect every page beside the corresponding canonical
IRS form. Check form/year, taxpayer and spouse identity, line amounts,
checkboxes, row placement, page order, continuations, clipping, legibility,
duplicate/missing pages, and equality with computed lines and XML. Record a
result per descriptor and preserve the PDF, source fixture and review notes. For
an existing generated PDF, rasterize its pages for visual inspection with:

```sh
pdfinfo /absolute/path/to/filled-return.pdf
pdftoppm -f 1 -l 1 -png -r 150 /absolute/path/to/filled-return.pdf /absolute/path/to/review-page
```

Render all pages, not just page 1, when performing the actual review. The CLI's
`return export --type pdf` needs an existing return ID in its local store; no ID
should be selected from `.state/returns` without confirming that it is a
synthetic validation fixture. Do not use `--force` or `--draft` for a
filing-readiness claim. A PDF map test or blank template inspection is not a
filled-PDF visual check.

## Completion record

The gate stays open until the automated full batch passes on the final commit,
all expected TY2025 XSD cases execute and pass, supported positive routes have
source-to-output XML evidence, ignored live-PDF field checks are resolved, and
every active PDF route has an actual filled-file visual review. IRS
business-rule review and accepted ATS acknowledgments remain separate gates;
neither is established by local tests or rendering. Only after those and the
scope/coverage decisions are complete should PR, merge and release review begin.
