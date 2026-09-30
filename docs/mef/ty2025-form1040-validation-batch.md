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

The workspace has blank IRS PDF templates in `.state/field-dumps/cache` and
source ATS scenario PDFs in `.state/research/docs/ats-ty2025`. These are not
filled-output fixtures. `forms/f1040/2025/pdf/review-fixtures.ts` now holds
fifty-one synthetic source returns, and `scripts/generate-ty2025-pdf-review.ts`
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
deno run --allow-read --allow-write --allow-net=www.irs.gov scripts/generate-ty2025-pdf-review.ts /absolute/new/review-directory
```

Each case writes a filled PDF and a JSON record of its synthetic source,
identity, expected forms, review focus and raw computed pending data. The six
original cases plus ten source-backed filing paths are a starting matrix, not
coverage of all registered PDF descriptors:

| Synthetic case                           | Target visual evidence                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `single-w2-refund`                       | Two 1040 pages, Single and digital-assets No checkboxes, wages, withholding and refund                             |
| `single-child-unearned-income`           | 1040, Schedule B, and Form 8615; parent MFJ status and the $412 Form 8615/1040 line 16 join                         |
| `single-high-wage-no-niit`               | Form 8960 filed above the MAGI threshold with zero NIIT; Form 8959 and Schedule 2 carry $180 Additional Medicare Tax |
| `single-sourced-collectibles-gain`        | Form 8949 Part II box E and Schedule D lines 9/18 carry a sourced $3,000 collectible gain to Form 1040              |
| `single-short-and-long-form8949-sales`   | Form 8949 boxes B/F, Schedule D lines 2/10 and short/long totals, and Form 1040 capital gain                        |
| `single-direct-broker-basis-sales`        | Unadjusted basis-reported sales on Schedule D lines 1a/8a with no Form 8949 document or PDF page                    |
| `single-direct-and-adjusted-broker-sales` | Direct Schedule D line 1a and adjusted Form 8949 box A/line 1b in the same source-backed return                    |
| `joint-two-w2s`                          | MFJ and spouse identity, combined W-2 amounts without duplicate pages                                              |
| `joint-two-w2s-schedule-lep`             | Two separately owned language requests, native LEP documents, and one printable page per spouse                    |
| `single-reviewed-car-loan-schedule1a`   | Reviewed VIN and loan interest to Schedule 1-A Part IV lines 22–30/38 and Form 1040 line 13b                     |
| `single-two-w2-flsa-overtime-schedule1a` | Two reviewed W-2 box 14 premiums to Schedule 1-A Part III lines 14a/14c/15/21/38 and Form 1040 line 13b       |
| `single-w2-qualified-tips-schedule1a`   | W-2 box 7 and TTOC 102 to Schedule 1-A Part II lines 4a/4c/6/7/13/38 and Form 1040 line 13b                      |
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
