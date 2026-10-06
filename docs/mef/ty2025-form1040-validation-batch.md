# TY2025 Form 1040 validation batch

This is the execution checklist for the agreed build-first gate. The local
automated batch has passed on the retained routes, but the filing-ready gate
remains open until scope, route, filled-page, and IRS acceptance work is done.
The historical 2026-09-26 result (6,596 passed, 0 failed, 48 ignored)
predates the current worktree.

The 2026-10-03 diagnostic `deno task test` at `a5f4229c` reported **10,415
passed, 152 failed, 459 ignored** in 12m2s. The isolated worktree could not
see the locally cached TY2025 v5.4 XSD (114 schema failures and one `stat`
failure), and 25 PDF extraction cases could not spawn `pdftotext`. The
remaining 12 failures exposed two additive AGI-source normalization errors,
an outdated Form 9000 PDF-URL expectation, and rejection tests that expected a
later guard than the one reached by their tampered source. The worktree now
uses the cached schema through an ignored local link and a local Poppler
launcher on `PATH`; neither is committed. Focused PAB, Form 8814, Form 8288-A,
Form 8828, and Form 8915-F cases passed after the corrections. This diagnostic
is a failed gate, with the full corrected rerun recorded separately below.

The first schema-enabled rerun on 2026-10-03 was stopped after five failures:
three direct-XSD fixtures omitted retained source/print fields (Form 4972,
Form 8615 twice, and Form 8814), and one Form 8962 negative expected a later
MAGI guard after the earlier 1099-INT/1040 source guard rejected the change.
The four XSD fixtures and the Form 8962 case passed focused reruns after their
fixture/assertion corrections. That interrupted run is diagnostic only.

The subsequent complete `deno task test` on 2026-10-03 reported **11,027
passed, one failed** in 51m24s, with no ignored tests reported. All 179
source-fixture XML/XSD cases passed. The sole failure was an EIC negative test
that changed Form 1040 line 2a but expected a later investment-income guard;
the earlier 1099-INT/1040 source guard rejected it. The corrected assertion
passed a focused rerun. This complete diagnostic is still a failed gate;
the final full rerun must pass before claiming local batch stability.

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` rerun at `a942dee4`
completed on 2026-10-03 14:52 UTC in 50m44s: **11,028 passed, zero failed**,
with no ignored tests reported. All 179 source-fixture XML/XSD cases passed.
It used Deno 2.9.4 (V8 15.0.245.2-rusty, TypeScript 6.0.3), `xmllint`
libxml 2.9.13, and Poppler 26.09.0. The isolated worktree accessed the
locally cached TY2025 v5.4 schema through an ignored link and ran Poppler
through a local launcher on `PATH`. The local log is
`.state/research/ty2025-full-test-a942dee4.log` (SHA-256
`28ac90f14f15ab02ec080f61a88c0cac663d52c1de04eebd7ce92011049dd626`).
This is a passing local automated gate for tested routes. Complete source and
form coverage, human page review, IRS business rules, ATS acceptance, and a
filing-ready release remain open.

The frozen-head `PATH=/tmp/opentax-tools:$PATH deno task test` run at
`59911414` completed on 2026-10-03 by 18:35 UTC in 51m19s: **11,034 passed,
zero failed**, with no ignored tests reported. It used Deno 2.9.4 (V8
15.0.245.2-rusty, TypeScript 6.0.3), `xmllint` libxml 2.9.13, and Poppler
26.09.0 through the local launcher. The retained log is
`.state/research/ty2025-pr62-full-test-59911414.log` (SHA-256
`07abcfbaf6f361e915c5ba861e27d1d9e5a7beaf982ea75c580028230eedc3cb`).
The completed overtime/EIC and joint Form 9000 page reviews and refreshed 167-case export
are separate evidence; this full automated pass does not complete the remaining
visual, business-rule, or IRS ATS gates.

After the Form 4852 export guard, a focused seven-file run using the same
`deno test` permissions and local Poppler launcher passed **91/91 tests**,
including both native/PDF substitute rejection cases. This code change is
newer than the frozen-head full run above; the bulk gate must be rerun after
the remaining nonnamed implementation reaches its phase boundary.

A later issued-W-2 nonstandard-code slice passed nine focused tests and a
complete synthetic Form 1040 return against the local TY2025 v5.4 XSD. The
reviewed handwritten W-2 emitted `StandardOrNonStandardCd` `N`; the filled PDF
printed its $75,000 wages. Native and PDF export rejected a changed retained
copy reference. This is newer than the frozen-head full run and does not
unblock the separate Form 4852 substitute route.

A following altered-1099-R slice passed **123/123 focused tests**. Its complete
synthetic Form 1040 XML emitted a nonstandard IRS1099R code `N`, passed the local
TY2025 v5.4 XSD, and generated a filled PDF with $20,000 gross pension.
Removing the payer-copy reference rejected in both exporters. The full suite
predates this change, and the Form 4852 source remains guarded.

The 2026-10-03 diagnostic `deno task test` at `8c53a6a3` finished in 49m30s
with 10,889 passed, two failed, and no ignored tests reported. Both failures
tried to fill the Form 1040 line 16 Form 8814 checkbox from a numeric tax
amount. Commit `637dace9` derives boolean print fields for the Form 8814 and
Form 4972 boxes while retaining the numeric tax amounts. Both failed cases
passed in focused reruns and in the full rerun.

The fixed-source `deno task test` at `637dace9` completed on 2026-10-03
02:19 UTC in 49m18s: **10,891 passed, zero failed**, with no ignored tests
reported. It used Deno 2.9.4 (V8 15.0.245.2-rusty, TypeScript 6.0.3),
`xmllint` libxml 2.9.13, and Poppler 26.09.0. The exact command was
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test`; the local log is
`.state/research/ty2025-full-test-637dace9.log` (SHA-256
`6faee3fbc0e980f5d335d1450d347fc56d0d372722783786262bafa9c3f0fd48`).
The locally cached TY2025 v5.4 XSDs and live IRS PDF templates were present,
so their tests executed. This result establishes local automated stability
for tested routes; it does not close complete route coverage, human filled-PDF
review, IRS business rules, ATS acceptance, or the filing-ready release.

At `8149198a` on 2026-10-03, the attachment-aware fixture command
`deno test --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov forms/f1040/2025/pdf/review-fixtures.xsd.test.ts`
passed **178/178** in 11m9s. Deno was 2.9.4 (V8 15.0.245.2-rusty,
TypeScript 6.0.3), and `xmllint` used libxml 2.9.13. The checked-in harness
validated the 169 positive source returns against the cached TY2025 v5.4 XSD
and asserted nine expected fail-closed cases. Its W-2G and Form 8824 paths
built the required PDF attachments before native export. The separate
household-wage (3/3) and partial-early-IRA (1/1) XML/PDF cases also passed with
`PATH=/tmp/opentax-poppler-env/bin:$PATH` and their required test permissions.
This is a fixture/XSD regression after the newer source guards, not a rerun of
the full `deno task test`, visual review of all 178 filled PDFs, IRS business
rules, or accepted ATS transmission.

At the 2026-10-03 implementation checkpoint after the 1099-copy identity
guard, the two 1099-INT/OID input-node files passed **92/92** and the
withholding/export file passed **9/9**. The native and PDF builder files passed
**184/184**; format and lint passed for the changed files. This selected run
confirmed that repeated identified copies reject at native and PDF preflight
even when payer TIN or account is absent. The repository-wide batch remains
deferred until implementation and scope decisions are settled.

After the 1099-R copy-identity guard on 2026-10-03, its input-node and shared
withholding/export files passed **118/118**, including graph and native/PDF
rejection of a repeated issued copy without an account number. The native and
PDF builder files passed **184/184**. Separate pension-copy fixtures now carry
distinct references; broader issued-copy authentication and the full batch
remain open.



The subsequent 1099-G and 1099-MISC source-reference replay passed **149/149**
input-node cases, **11/11** shared withholding/export cases, and **184/184**
native/PDF builder cases on 2026-10-03. A repeated G source with no payer TIN
and a repeated MISC source with no account now reject in the graph and both
exports; distinct references remain accepted. Format and lint passed for the
changed files. The repository-wide batch and issued-copy byte review remain
open.

The Form 1098-E issued-source pass on 2026-10-03 passed **22/22** focused
input/full-return/native/PDF cases and **184/184** selected builder cases.
Positive retained copies now require lender name/TIN, full borrower TIN matched
to the taxpayer or joint spouse, and an issued-document reference before either
export. Repeated references and same-lender/borrower ambiguous copies reject;
the retained AGI interest input must match capped box 1 source totals. The
zero-deduction upper-phaseout joint case still builds native XML. The
[2025 recipient form](https://www.irs.gov/pub/irs-prior/f1098e--2025.pdf)
contains these identity fields; its
[instructions](https://www.irs.gov/pub/irs-prior/i1098et--2025.pdf) allow a
truncated borrower TIN on Copy B; the reviewed-owner route was still open at
that pass, as were loan qualification, issuer bytes, and broader MAGI cases.

The next final-export phaseout replay pass on 2026-10-03 passed **189/189**
selected phaseout/native/PDF builder cases. Both exporters now require the
printed Schedule 1 line 21 deduction to equal the result recalculated from
retained AGI inputs, including the zero-deduction upper-phaseout case. A
changed line 21 rejects even before Form 1040 line 10 comparison. Lint passed
for the changed TypeScript files; the wider MAGI and full-batch gates remain
open.

The masked-borrower Form 1098-E pass on 2026-10-03 passed **25/25** focused
cases and **191/191** selected phaseout/native/PDF builder cases. The 2025
recipient [Copy B](https://www.irs.gov/pub/irs-prior/f1098e--2025.pdf) permits
only the last four borrower TIN digits. A masked copy now requires a borrower
name and reviewed owner reference, and must uniquely identify the taxpayer or
joint spouse by name and last four digits. Both exports reject missing or
wrong owner evidence and a duplicate issued reference entered once masked and
once in full. Lint passed; issuer-byte proof, additional name variants, loan
eligibility, and the full batch remain open.

The Form 1098-E foreign-earned-income MAGI correction on 2026-10-03 passed
**82/82** selected AGI and full-return cases. Publication 970's
[TY2025 Worksheet 4-1](https://www.irs.gov/publications/p970) adds the
Schedule 1 line 8d exclusion back before phaseout; the AGI node now keeps
that amount in MAGI. A combined Form 2555/W-2/1098-E full return with
$90,000 gross wages and $5,000 exclusion yields a $1,667 deduction in
Schedule 1, Form 1040, native XML, and filled PDF; the $101,000 wage and
$10,000 exclusion upper-phaseout calculation yields zero in the AGI unit
case. Lint passed. Foreign housing and territorial addbacks, authenticated
foreign employer records and Form 2555 review, and the repository-wide batch
remain open.

The below-$600 student-loan payment-ledger pass on 2026-10-03 passed
**213/213** selected input, full-return, native, and PDF builder cases.
One lender's $450 interest ledger reaches Schedule 1, Form 1040, native XML,
and filled PDF without Form 1098-E; a separate $600 issued copy plus a $400
second-lender ledger combines once. Changed payment sums, repeated payment
source references, wrong borrower, issued-copy overlap, and a same-lender
$600-or-more ledger reject. The
[2025 Publication 970](https://www.irs.gov/publications/p970)
describes the lender's $600 furnishing threshold and qualified-loan conditions.
This bounded path requires the borrower's own education, expense timing,
eligible school and half-time enrollment, legal obligation, unrelated lender,
and no employer-plan or double-benefit review facts. Lint passed. Actual loan,
school, payment, and no-double-benefit source authentication; spouse/dependent
student loans; and the full batch remain open.

The Form 1098-E corrected-copy pass on 2026-10-03 passed **215/215** selected
source, full-return, native, and PDF builder cases. A marked corrected copy
with original and review references contributes its replacement amount once;
the original plus corrected copy rejects in input and both final exporters.
At $90,000 single wages, a $900 corrected box 1 produces a $600 phased
Schedule 1 deduction in native XML and filled PDF. The
[2025 Copy B](https://www.irs.gov/pub/irs-prior/f1098e--2025.pdf) includes
the corrected marker. Lint passed. Issuer-byte lineage, full source review,
and the repository-wide batch remain open.

The preceding Form 1098-E phaseout pass on 2026-10-03 passed **90/90** input
and AGI unit cases and **186/186** selected full-return/native/PDF builder
cases. At $90,000 single wages and $2,500 entered interest, Schedule 1 line 21
and line 26, Form 1040 line 10, native XML, and filled PDF now all use the
$1,667 phased deduction; a changed Schedule 1 rejects in both exports.
Joint boundaries use the [2025 Publication 970](https://www.irs.gov/publications/p970)
$170,000–$200,000 range, while qualifying surviving spouse uses the single
range. The same status now uses the [Publication 915](https://www.irs.gov/publications/p915)
$25,000 Social Security base. Positive 1098-E lender/borrower source identity,
wider MAGI addbacks, page review, and the full phase batch remain open.

The subsequent 1099-PATR copy-identity pass on 2026-10-03 passed **20/20**
focused input/owner/export cases and **204/204** selected Schedule F and
native/PDF builder cases. Multiple positive copies from one cooperative and
recipient now reject when any lacks both an account and issued-copy reference,
including a box 4-only pair and a mixed TIN/name payer entry. Distinct issued
references remain accepted. Issuer-byte proof and corrected-copy lineage
remain open, along with the full phase batch.

The subsequent 1099-B wash-sale source pass on 2026-10-03 passed **84/84**
focused broker graph/full-return/export cases and **191/191** selected native,
PDF, and Schedule B builder cases. Box 1g now adds its positive disallowed loss
to a separately coded Form 8949 adjustment instead of disappearing when that
adjustment is present. A manually entered W amount must agree with the issued
box 1g; incomplete or conflicting combinations reject. A source-backed $120
net loss reached Form 1040, native XML, and filled PDF; a changed box 1g
rejected in both exports. Wider corrected-box statement routes and the full
phase batch remain open.

The subsequent 1099-K transaction-class and copy-identity pass on 2026-10-03
passed **84/84** focused graph/direct-export cases and **184/184** selected
native/PDF builder cases. Same-processor, same-recipient positive copies now
reject if any lacks account and issued-copy identity, unless explicit card vs.
third-party-network type or distinct card merchant category identifies separate
reports. The same account can carry separate card/network or card category
reports, as the IRS instructions permit. A row checking both transaction types
rejects. The full command and issuer-byte review remain open.

The next 1099-B/1099-K source-identity pass on 2026-10-03 passed **151/151**
input-node cases, **13/13** direct withholding and 1099-K export cases, and
**184/184** native/PDF builder cases. A repeated broker statement/transaction
pair now rejects without payer/account data; a repeated processor copy with
changed gross and no account rejects after an optional issued reference is
entered. Distinct source transactions and references remain accepted. Format
and lint passed on the changed files; the full command and complete source-byte
review remain deferred.

After the 1099-NEC graph identity guard on 2026-10-03, the input, owner, and
withholding files passed **75/75**. One selected command covering Schedule C,
Form 8919, Schedule 2, native/PDF builders, and related 1099-MISC source joins
passed **256/256** with `PATH=/tmp/opentax-poppler-env/bin:$PATH`. The first
attempt without that PATH reached five PDF text-extraction cases but could not
spawn `pdftotext`; the complete selected rerun passed. The source fixtures for
different named payers now use distinct payer TINs. This is focused regression
evidence; the repository-wide command and issued-copy review remain open.

After the 1099-MISC ambiguity guard on 2026-10-03, the selected input,
withholding, and native/PDF builder files passed **291/291** with
`deno test -A` on commit `0758d35d` plus the working change. It covers two
unidentified positive copies, an unidentified copy mixed with an identified
one in either order, and separate identified accounts. The repository-wide
command and issuer-copy verification remain open.
The adjacent 1099-MISC owner, box 8, and section 409A source replay files
passed **12/12** after exposing the cached TY2025 XSD and `pdftotext` to the
separate worktree. Their first attempt failed on missing local tools and
schema files, not on a source assertion.

After the 1099-INT/OID ambiguous-copy guard on 2026-10-03, the two input
files and direct export reconciliation passed **107/107**. A selected owner,
Schedule B, tax-exempt interest, and native/PDF builder run passed **199/199**
with the locally cached TY2025 schema and Poppler tools available in the
separate worktree. These checks cover unidentified repeats, same-account OID
obligations, and final export rejection. The complete repository-wide command
and issued-copy verification remain open.

After the 1099-R ambiguous-copy guard on 2026-10-03, the selected input,
withholding, IRA and railroad pension, payer-document, and native/PDF builder
files passed **335/335** with Poppler on PATH and the cached TY2025 schema
available. The first wider run exposed an ATS fixture with two distinct payer
names sharing one synthetic EIN; the payer identity check was refined and the
complete selection passed. A final 109-case input rerun also passed after
adding the reverse-order account-only assertion. The repository-wide command
and issuer-copy verification remain open.

After the 1099-G ambiguous-copy guard on 2026-10-03, the graph and direct
export files passed **71/71**. The selected grant, RTAA, unemployment, refund,
owner, and native/PDF builder files passed **198/198** with Poppler on PATH
and the cached TY2025 schema available. Six aggregation fixtures needed
distinct issued references to represent distinct payer copies; no assertion
or production route was dropped. The repository-wide command and source-byte
verification remain open.

After the 1099-DIV payer-scoped copy guard on 2026-10-03, the input and
direct-export files passed **101/101**. The selected dividend source, owner,
qualified-dividend subset, Schedule B, and native/PDF builder files passed
**199/199** with Poppler and the cached TY2025 schema available. The graph
now accepts distinct unreferenced payers, while mixed unidentified and
identified copies from one payer/recipient reject. The repository-wide
command and issued-copy authentication remain open.
The same 101/101 and 199/199 selections passed again after enforcing the
account number on a checked 1099-DIV FATCA copy.

At the current implementation checkpoint on 2026-10-03, the focused
`deno test -A forms/f1040/2025/pdf/builder.test.ts` passed **32/32** and
`deno test -A forms/f1040/2025/mef/builder.test.ts` passed **148/148**. Their
positive routing and serialization fixtures now retain matching W-2,
unemployment, dividend, and Schedule B source and owner facts. The production
source guards were unchanged. These selected files are diagnostic preparation,
not the deferred repository-wide batch.

After the Schedule B projection guard, the selected native builder, interest
reconciliation, and Part III end-to-end files passed **168/168** on 2026-10-03.
The $1,501 sourced-interest case now rejects missing or changed prepared payer
rows; changed dividend payer and foreign-country projections and an invented
nonfiling projection also reject in both exporters. An extra unsourced payer
print cell now rejects as well. The source-backed
`single-child-unearned-income` and
`single-form8815-series-ee-bond-exclusion` review fixtures each passed their
TY2025 v5.4 XML/XSD cases after the guard. This is a focused regression; the
complete artifact batch and all-page inspection remain open.

The five direct Schedule B native-descriptor XSD cases passed **5/5** after
their structural inputs were wrapped in a valid Form 1040 return envelope.
They cover Part III countries, more than 15 dividend payers, seller-financed
addresses/interest adjustments, and nominee dividends; the separate
source-backed cases above cover full-export preflight.

The subsequent IRA final-export replay passed two new sourced/tamper cases and
seven existing IRA, disaster, and Form 8606 cases with
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno test -A` on their selected files.
Seven `single-ira-*` and two other early/disaster review fixtures passed their
TY2025 v5.4 XML/XSD cases after the guard. A prior selected run without that
Poppler path reached PDF text extraction and failed to spawn `pdftotext`; the
same cases passed when the recorded tool path was supplied. This is focused
evidence, not the deferred full test task or all-route validation.
The native and PDF builder files also passed **152/152** and **32/32** after
the IRA replay was added.

The subsequent finalized Schedule D to Form 1040 line 7 comparison and
Schedule D print-total replay passed six broker-sale source cases, including
changed-line and paired-print tampering in both exports. The native and PDF
builder files passed **184/184** together. Selected Form 4797, Form 6252,
Form 8814, and capital-loss routes passed after `pdftotext` was supplied on
the Poppler path; the first run of two text-extraction cases stopped only at
the missing executable. A read-only replay over all 178 review-fixture
graphs found 177 clean graphs, of which 18 had finalized Schedule D totals;
all 18 agreed with the new print-total calculation. This is focused evidence,
not a repository-wide batch or filled-page review.

The next source-row replay passed **192/192** selected broker-sale and
native/PDF builder cases, including a joint-owner broker positive and both
exporters' rejection of changed broker proceeds, broker basis, and direct
Form 8949 basis. A read-only graph audit found 177 clean review fixtures;
five carried retained 1099-B or direct Form 8949 source rows and all five
matched their Schedule D transactions. `deno check`, format, and lint passed
for the changed code. This does not establish issued-copy authenticity or
complete capital-disposition route coverage.

The Schedule D direct-aggregate follow-up rejects a changed full-return line
1a proceeds amount even when its print gain, Schedule D totals, and Form 1040
line 7 are changed together. The nine broker-sale cases and 184 native/PDF
builder cases passed; all 18 clean review fixtures with finalized Schedule D
totals matched the direct-row replay. Format and lint passed. The complete
repository batch is still deferred until implementation work is complete.

The full-return Schedule 1 subtotal check passed nine arithmetic cases and
184 native/PDF builder cases. All 177 clean review-fixture graphs matched
lines 10, 25, and 26 to their retained printed components. A source-backed
Schedule C fixture then built native XML (5,205 characters) and a filled PDF
(371,854 bytes) with Schedule 1 line 10 of $80,000 and line 26 of $5,651.82.
This is a focused route check; all-page visual review and the full command
remain open.

The Schedule 1 line 9 follow-up passed one source-backed mixed 1099-NEC/K
native/PDF positive and both-export coordinated-tamper rejection, plus nine
arithmetic and 184 builder cases. All 177 clean review graphs passed the
expanded Schedule 1 replay; 13 had a nonzero printed line 9. The mixed
fixture's raw 1099-K line 8j component was $5,000, while the existing
nonbusiness projector combined it with the $3,000 NEC source for the $8,000
printed line 8j and line 9. This remains selected route evidence rather than
the full batch or visual page review.

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
command -v pdftotext
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
--allow-run=xmllint,deno,pdftotext,pdftoppm
--allow-env=OPENTAX_SCHEDULE1A_FEIE_REVIEW_PDF,SCHEDULE1A_2555_REVIEW_PDF,SCHEDULE1A_2555_VEHICLE_REVIEW_PDF
--allow-net=www.irs.gov`.
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
At that checkpoint, the full gate still had no passing result.
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

The later implementation-first phase command `deno task test` at `298e083a`
completed on 2026-10-02 in 25m11s with **10,454 passed and 429 failed**; no
ignored tests were reported. Deno was 2.7.7 (V8 14.6.202.9-rusty, TypeScript
5.9.2), `xmllint` was libxml 2.9.13, and Poppler `pdftotext` was 26.03.0.
The complete local log is
`.state/research/ty2025-pr59-nonnamed-phase-bulk-2026-10-02.log`. The first
triage found 134 missing retained digital-assets answers, 67 missing issued
W-2 employee SSNs, and 30 strict MeF reference-name mismatches among the
failure messages. These counts describe error groups, not unique root causes
or the complete failure classification. Nonnamed fixtures and shared
references require repair before another full run; deferred named-form tests
also remain. No release pass is claimed.

The next full `deno task test` at `d59366ab` completed on 2026-10-02 in
32m54s with **10,662 passed and 221 failed**; no ignored tests were reported.
It used Deno 2.7.7 (V8 14.6.202.9-rusty, TypeScript 5.9.2), `xmllint`
libxml 2.9.13, and Poppler 26.03.0. The complete local log is
`.state/research/ty2025-pr59-nonnamed-phase-bulk-rerun-2026-10-02.log`.
The 221 failing test names were all present in the prior 429; shared fixture
groups include 44 missing issued W-2 employee SSNs, 32 retained-general
digital-asset answers, and Schedule C/F and reference-name mismatches. The
178-case PDF/XSD batch had 16 failures: one stale EIC error assertion now
fixed in a focused test and 15 deferred named-form routes. This is not a
release pass; subsequent focused repairs need another full run.

The third full `deno task test` at `f1820bca` completed on 2026-10-02 in
35m38s with **10,736 passed and 147 failed**; no ignored tests were reported.
It used the same Deno 2.7.7, V8 14.6.202.9-rusty, TypeScript 5.9.2,
`xmllint` libxml 2.9.13, and Poppler 26.03.0 tools. The complete local log is
`.state/research/ty2025-pr59-nonnamed-phase-bulk-rerun2-2026-10-02.log`.
Compared with the 221 failures above, 97 old cases cleared, 124 persisted,
and 23 advanced to later checks and newly failed. The EIC PDF assertion and
exact Form 965-A and Form 4136 statement names pass in this run. Residuals
include source/fixture guards and deferred named-form routes; a full-suite or
release pass is not claimed.

A fresh local ARM64 CLI compiled from `d22ab027` with `deno compile` and SHA-256
`f80caffb31d473b311e6134b3e57ae3853ec0d976d40892f64f8f0508aef751a`
passed `scripts/smoke-release-binary.ts` as version `dev`: source-backed W-2,
clean CLI validation, finalized MeF XML, and a two-page PDF. This verifies the
local compiled asset only; the five release-workflow platform artifacts and
downloaded release assets have not been built or smoked.
After the smoke was strengthened to inspect the flattened Form 1040 filer,
line 1a wages, and line 25a withholding, a freshly compiled local CLI passed
the same synthetic return on 2026-10-02. The five platform artifacts still
need their release-workflow run.

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

The 2026-10-02 read-only planner rerun reports **178 fixtures, 84 of 112
registered PDF keys covered, and 28 uncovered keys**. The 40-key list above is
an earlier checkpoint. The current uncovered keys group as follows:

| Deferred named-form family | Uncovered registry keys | Count | Positive-route boundary in this phase |
| --- | --- | ---: | --- |
| Form 5471/8992 and section 965 | `f5471_parent`, `f5471_schedule_e`, `f5471_schedule_h`, `f5471_schedule_i1`, `f5471_schedule_j`, `f5471_schedule_m`, `f5471_schedule_p`, `f5471_schedule_q`, `f5471_schedule_r`, `form8992`, `form8992_schedule_a`, `f965` | 12 | The single-CFC calculation is staged, but full required Form 5471 attachment/export and section 965 ownership remain open. Form 8992 positive filing waits for that packet. |
| Business-credit forms | `f4255`, `f8611`, `f8864`, `f8941`, `f8978`, `form8978_schedule_a`, `f8994`, `form8582cr` | 8 | These form-specific parent/conditional branches remain in the deferred credit scope. Form 8994 additionally requires validated policy/payroll attachments; the review generator currently supplies no attachments. |
| Form 8854 initial/annual | `f8854`, `f8854_annual` | 2 | Both descriptors explicitly guard positive print until prior filed-return/Form 8854 bytes and expatriation facts are authenticated. The native/PDF parity TODO retains this boundary. |
| Adoption and medical accounts | `form8839`, `form8853` | 2 | Form 8839 has one bounded adoption route, with carryforward/exclusion and source authenticity open; Form 8853 remains a named-form route. |
| Business interest and QBI | `form8990`, `form8995a_schedule_a`, `form8995a_schedule_b`, `form8995a_schedule_d` | 4 | Form 8990 blocks positive nonexcepted interest pending debt/prior-year evidence; Form 8995-A conditional schedules await their respective supported QBI source branches. |

Thus the current planner has **zero uncovered nondeferred core/attachment PDF
keys** for this implementation phase. Form 8854 and Form 8994 also appear in
cross-cutting parity/status text, but their positive form-specific routes remain
guarded or deferred. No unsupported source was turned into a positive fixture,
and this classification does not close the 28-key coverage or full-review gate.

```sh
deno run --allow-read --allow-write --allow-net=www.irs.gov --allow-run=xmllint scripts/generate-ty2025-pdf-review.ts /absolute/new/review-directory /absolute/path/Return1040.xsd
```

For a bounded batch, pass a third argument naming a JSON file with an
`includedFixtureIds` array of checked-in fixture IDs. The generated manifest
labels the scope `selected` and lists every omitted fixture explicitly; the
checker validates that partition and its exact artifact inventory. Omitting
the selection file retains the full 178-case requirement. A selected batch
cannot close the full visual-review gate.

An initial complete-scope generator attempt on 2026-10-02 wrote 21
source-backed PDF/XML/source trios, then stopped at a Form 8862 CTC/ODC and
AOTC fixture requiring executor-owned authentication of prior IRS notice
issuance and contents. Its partial directory is
`.state/research/ty2025-filled-pdf-review/2026-10-02-pr59-nonnamed-attempt1`
and the local log is `.state/research/ty2025-filled-pdf-review-attempt1.log`.
It has no completed manifest and is not a visual-review pass. The declared
selection option now permits bounded manifests with omitted cases recorded as
exclusions while included cases retain all source, schema, and PDF checks.

The 2026-10-03 full generator attempt at `e3b0a165` reached the same
authenticated-prior-notice guard after writing 21 synthetic PDF/XML/source
trios to `.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-attempt2/`.
Its local log is `.state/research/ty2025-filled-pdf-review-attempt2-2026-10-03.log`
(SHA-256 `1bb7f326f263e723e5126545ea07349bc0eee98e29a9f637d77c5ffa73db5517`).
There is no completed manifest or full-batch page review. The guard belongs to the
deferred Form 8862 source-authentication gap; it was not bypassed to inflate
the review count. The 178 automated filled-PDF/XML tests above do not replace
this held visual-review workflow.

A later 2026-10-03 selected export run covered the first **84** of 167
exportable fixtures before its stale expectation for three Schedule C copies
stopped it. Smaller source-backed XML/XSD/PDF runs then exposed and corrected
several fixture copy counts, a one-character Form 8880 rate field, the
Form 8995-A source-versus-print projection, a sourced Form 8826 Schedule C
Part V description and print gate, and the Schedule E page identity attached
to Form 7203. A two-case manifest for the Form 8826 and Form 7203 routes
contains **31 generated pages** with XML/XSD checks; its per-page visual
checklist was blank at that checkpoint. Other selected runs remain partial
diagnostics.

On 2026-10-04, the checked-in Form 8826 direct-interpreter-credit and Form
7203 capital-plus-debt-basis fixtures were regenerated at `a75f0bca` and all
**31 filled pages** were visually checked against retained source, pending
values, and native XML. The Form 8826 packet prints the separately reduced
Schedule C expense of $2,625, the $2,375 credit on Form 8826 lines 6/8,
Form 3800, Schedule 3, and Form 1040. Its line 7 is blank; the TY2025 XSD
documents `PrtshpandSCorpReportAmt` as line 8 despite that element name. The
Form 7203 packet reconciles the $4,000 K-1 loss to $1,500 stock basis,
$2,000 debt basis, $3,500 Schedule E/1/1040 loss, and $500 carryover. The
read-only checker passed: selected scope, two cases, 31 pages, artifact
hashes, page origins, source replay, and local TY2025 XSD. The private
manifest is `.state/research/ty2025-filled-pdf-review/2026-10-04-8826-7203/review-manifest.json`
with SHA-256 `cf6a7cedd5e4b579cbaa395a305fae25184d03dffc1b7853a47f86d0f8f1d22d`.
This selected review does not complete the 182-case all-page gate or IRS
business-rule/ATS acceptance.

Three further checked-in fixtures were generated and reviewed at `a75f0bca`
on 2026-10-04: Form 7217 nonliquidating property distribution (four pages),
Form 8606 post-year contribution and IRA distribution (four pages), and Form
5695 door/central-air credit (six pages). All **14 pages** were rendered and
compared to their source, pending graph, native XML, and Form 1040 totals.
Form 7217 allocates $400 post-distribution property basis across $100/$150/$150
rows; Form 8606 carries $4,000 nontaxable and $16,000 taxable IRA amounts;
Form 5695 joins its $150 door and $600 central-air credits through Schedule 3
to a $750 Form 1040 credit. The read-only selected-scope checker passed three
cases and 14 pages, replaying source, page origins, artifact hashes, and local
TY2025 XSD. The private manifest is
`.state/research/ty2025-filled-pdf-review/2026-10-04-mef-3/review-manifest.json`
with SHA-256 `00a8059c8949cc8b3423be55de84d183ddbec604c8e685b6b8a441e9882b6af8`.
These synthetic packets do not resolve wider Form 7217/8606/5695 source
branches, the full-page gate, IRS business rules, or ATS acceptance.

After the source-backed packet fixes, the declared **167-case exportable
selection** completed on 2026-10-03 at `bd9387a4`. The manifest at
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-exportable-167-full/review-manifest.json`
records **1,052 filled PDF pages**, all 167 local TY2025 XSD checks, and
per-case source/XML/PDF SHA-256 digests. A separate read-only digest and
inventory check found zero missing or mismatched files and zero page-origin
count mismatches; the manifest SHA-256 is
`a0dd2cc274a4c767281f7a0d0b9336741566a5dc98b2bfe570aa0e3cfc645075`.
Its scope explicitly excludes 12 guarded source or attachment cases from the
179-case plan. None of the 1,052 page checkboxes is a completed
human visual review, and this selection does not establish IRS business-rule
or ATS acceptance.

A follow-up visual inspection of the seven-page personal clean-vehicle case
found that Schedule A (Form 8936) Part II line 10 printed only the template's
percent sign, while a business-use value would have duplicated that sign.
The projector now prints the numeric `0.00` or business-use percentage without
its own percent glyph and explicitly prints zero on line 11 when the vehicle
is wholly personal use. The corrected page was rendered and checked against
the retained source, Form 8936 parent, Schedule 3, and Form 1040; seven focused
Form 8936 tests passed. The 167-case selection above predates this correction.
A fresh full export completed at `68d5416d` with the same declared 167-case
selection and **1,052 filled pages**. Its manifest is
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-exportable-167-68d5416d/review-manifest.json`
with SHA-256
`2b2b077c61f112167f61cf5e5cce971cfccdf6578d52d1a7e3412a54e87ee346`.
All 167 XML files passed the local TY2025 v5.4 XSD check; a separate
inventory check found zero missing or mismatched source/XML/PDF digests and
zero page-count mismatches. The generated pages still require human visual
review and do not establish IRS business-rule or ATS acceptance.

A later four-page review of `single-two-w2-flsa-overtime-schedule1a` rendered
both Form 1040 pages and both Schedule 1-A pages from the same saved PDF. Its
two W-2 sources report $50,000 and $30,000 wages, $5,000 and $3,000 federal
withholding, and $3,000 and $1,000 reviewed FLSA overtime premiums. The
Schedule 1-A pages print $4,000 on lines 14a, 14c, 15, 21, and 38; Form 1040
prints $80,000 wages, $4,000 on line 13b, $8,175 tax, $8,000 withholding,
and $175 owed. The native XML reports the same amounts. All four page
checklists were completed, and `scripts/check-ty2025-pdf-review.ts` passed on
`.state/research/ty2025-filled-pdf-review/2026-10-03-single-two-w2-overtime-reviewed`.
This review found that the fixture's review focus incorrectly called the
$175 balance a refund; that label was corrected. Other generated pages need
their own review.

A separate three-page `single-w2-custodial-eic-release` packet was rendered
and checked page by page. Form 1040 lists no dependent or child tax credit
after the release, but prints the $4,328 EIC and $5,828 refund; Schedule EIC
prints Ada's identity, daughter relationship, 2017 birth year, and 12 U.S.
months. Its source records $15,000 W-2 wages and $1,500 withholding, which
match the PDF and native XML. The completed checklist and artifact replay
passed `scripts/check-ty2025-pdf-review.ts` at
`.state/research/ty2025-filled-pdf-review/2026-10-03-custodial-eic-reviewed`.

The four-page `joint-two-w2s-form9000` packet was also rendered and checked
page by page. Its two W-2s provide $70,000 wages and $6,500 withholding;
Form 1040 prints a $2,354 refund. The two attached Form 9000 copies print
Alex's code 01 large-print request and Sam's code 05 Braille-ready-file
request under their own names and SSNs, leaving standalone address/signature
fields blank. The native XML contains two separately identified IRS9000
documents with codes 01 and 05. The completed checklist and artifact replay
passed `scripts/check-ty2025-pdf-review.ts` at
`.state/research/ty2025-filled-pdf-review/2026-10-03-joint-form9000-reviewed`.

The three-page `single-w2-three-eic-children-with-reviewed-birth` packet was
rendered and checked page by page. Schedule EIC prints separate identities,
relationships, birth years, and U.S. months 12, 8, and 12 for Ada, Ben, and
Cora. Cora's source records one actual December month plus the reviewed
from-birth U.S. residency that warrants 12 on the form. Form 1040 lists all
three children and prints $6,761 EIC, $1,500 W-2 withholding, the sourced ACTC
opt-out, and an $8,261 refund; the native XML agrees. The completed checklist
and artifact replay passed `scripts/check-ty2025-pdf-review.ts` at
`.state/research/ty2025-filled-pdf-review/2026-10-03-three-eic-children-reviewed`.

The two-page `mfj-spouse-dependent-refund-only` packet was rendered and
checked page by page. Sam's retained W-2 reports $800 wages and $100
withholding; Form 1040 prints joint ownership, the spouse-dependent line 12a
checkbox, $1,350 dependent standard deduction, zero taxable income and EIC,
and a $100 refund. The native XML carries the same wages, deduction,
withholding, and refund. The completed checklist, source/PDF/XML replay,
artifact hashes, page origins, and local TY2025 v5.4 XSD passed
`scripts/check-ty2025-pdf-review.ts` at
`.state/research/ty2025-filled-pdf-review/2026-10-03-mfjspouse-dependent-reviewed`.

After the overtime review-focus correction, the declared 167-case selection
was regenerated from source content committed as `8e28daa7` in
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-exportable-167-reviewfocus`.
Its manifest SHA-256 is
`87fdaff50de3a57bf9641c9449fba1dfcfc54c82bb1842dfd74226ae1e1ffe42`.
All 167 XML files passed the local TY2025 v5.4 XSD, and all 1,052 pages have
matching source/XML/PDF digests and page counts. Compared with the earlier
corrected export, no PDF or XML digest changed; exactly one source JSON
digest changed for the corrected review label. Sixteen pages have separately
completed human checklists; the remaining pages have not.

A full `PATH=/tmp/opentax-tools:$PATH deno task test` process launched before
the review-focus edit ended with **11,034 passed, 0 failed** in 53m07s.
Its log is `/tmp/opentax-pr62-full-test-68d5416d.log` with SHA-256
`c21b122bf55b93a1caa44386e749f1055bbcdbacac6d1ae1d27098cd814d5628`.
Because that source label changed while the process was live, this is a
diagnostic pass rather than a frozen-commit full gate; a new full command must
run after the documentation and review evidence are committed.
The same scan found that the Form 2441 PDF descriptor had no printable
credit/provider/person route. A later bounded fix now generates its
no-benefit child-care-credit case as a **four-page** Form 1040, Schedule 3,
and Form 2441 packet with source-backed XML/XSD validation. The filled Form
2441 page was rendered and inspected for the filer, care provider, qualifying
person, rate, expense, and limited credit. Benefit claims and provider/person
overflow remain guarded because Part III and continuation pages are not yet
printable. A later bounded Form 5695 Section A door and Section B central-air
case generated a six-page Form 1040/Schedule 3/Form 5695 packet with XML/XSD
checks. Its three Form 5695 pages were rendered and visually inspected for
eligibility answers, addresses, QMID, costs, and the $750 limited credit. A
Form 4684 casualty case generated a nine-page packet with a one-page Form
4797 Part II loss of $30,000; the Form 4797 page was rendered and inspected
against Form 4684 and Schedule 1. The new Form 8936 personal clean-vehicle
case generated seven pages with distinct parent and Schedule A copies and
XML/XSD checks. A separate seven-case selection from the remaining credit and
payment fixtures generated its XML/XSD/PDF packets after the Form 8834,
Form 8912, and other expected-copy inventories were corrected. Other Form
5695 branches and broader Form 4797 paths remain
open parity limits, not approved exclusions or a
full visual-review pass. The 12 guarded source or attachment cases and 28
uncovered named PDF keys remain outside the selected run as
previously recorded.

A bounded visual check of that partial directory rendered all nine pages of
three synthetic cases at 120 dpi: `single-child-unearned-income` (Form 1040,
Schedule B, Form 8615), `single-divorced-agreed-joint-estimated-payment`
(Form 1040), and `single-form8888-two-account-refund` (Form 1040, Form 8888).
The page sequence, year, filer/parent identity, visible boxes, amounts, and
legibility were inspected. The child's $5,000 interest and $412 tax, the
divorced taxpayer's $300 payment/refund and former-spouse SSN attribute, and
the $300/$700 refund allocation were checked against retained pending fields
and native XML. No discrepancy was found on those nine pages.

The same partial set's joint spouse-dependent refund and three MFS residence/
separation cases add 12 inspected pages, bringing this bounded review to
**seven cases and 21 pages**. The joint $800 wage/$100 refund and spouse
dependency mark, the MFS $10,000 wage/$1,000 refund and line 6d mark, and the
two $15,000 wage/EIC cases were compared with retained pending fields and
native XML. Form 1040, Schedule EIC, and Schedule 8812 page order, dependent
identity, checkboxes, amounts, and legibility showed no discrepancy. A 300-dpi
crop confirmed Schedule 8812 line 1 prints **15,000**, matching Form 1040
AGI and line 3; the leading digit was hard to read at 120 dpi. The other 14
generated cases and the full 178-case manifest/review remain open.

Four Form 1098 points cases add 12 inspected pages, bringing the partial review
to **11 cases and 33 pages**. Schedule A and Form 1040 visibly agree on
$20,400 purchase interest/points, $18,067 construction-refinance amortization,
$18,000 reported interest plus $67 unreported points, and $18,000 reported
interest plus $133 from the 2023 points ledger. Their retained pending amounts
and native XML amounts match the printed deductions and resulting return
totals; no clipping, page-order, or owner-identity discrepancy was observed.
The other ten generated cases and the complete 178-case review remain open.

The prior-year Form 1098 recovery case adds six inspected pages, bringing this
bounded review to **12 cases and 39 pages**. Form 1040, Schedule 1 and its
line 8z statement, and Schedule A visibly carry the $1,200 taxable recovery,
$81,200 AGI, and $18,000 mortgage interest deduction recorded in retained
pending data and native XML. The $3,176 refund, page order, and identity also
match; no clipping or legibility issue was observed. Nine generated cases and
the complete 178-case review remain open.

The remaining nine synthetic cases add 31 inspected pages, completing a
**bounded visual review of all 21 generated cases and 70 pages** in this
partial directory. The ACTC and EIC opt-out boxes, $5,000 fully repaid
unemployment annotation, $10,000 Form 2439 gain and $1,500 payment, and
$220,000 high-wage Form 8959/Schedule 2 tax with zero Form 8960 NIIT were
checked on rendered pages against retained pending data and native XML. The
custodial EIC release, $500 overpayment application to 2026, ordinary W-2
refund, and three Schedule EIC child columns (including reviewed birth-year
residence) likewise showed the expected identities, amounts, boxes, and page
order. No discrepancy or clipping was found in this partial set. These pages
remain synthetic review evidence only; the generator stopped before the next
Form 8862 case, and the full 178-case manifest and visual signoff remain open.

The explicit selection workflow regenerated those same 21 PDFs into
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-selected21/` with
byte-identical PDF contents and a completed selected-scope manifest. Its
scope lists 21 included and 157 excluded fixtures. After the page observations
above were entered, the read-only replay checker reported `Review checklist
complete (selected scope): 21 cases, 70 pages; artifact hashes and TY2025 XSD
validation confirmed.` The private manifest SHA-256 is
`28cd598497f44e3cb14fb139d9b163800030b5819bc01ece1ca4efcd9ca97257`.
This selected result verifies only those 21 generated cases; it does not
declare the nonnamed phase or the 178-case visual gate complete.

A second declared selection contains **55 fixtures whose expected printed
forms use only Form 1040, Schedules 1/1-A/2/3/A/B/D, and Schedule EIC**. It
generated 55 source JSON/native XML/PDF trios and 185 PDF pages in
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-core-pdf55/`;
each native XML passed the supplied TY2025 XSD before PDF output. The
completed private review manifest SHA-256 is
`554a5d6f8f63d285d2a416a8bdf36f208d292f9fb573ae5fc694cf0873c64f7a`.
This is a PDF-form projection selection, not a claim that every fixture's
underlying source route is outside the named-form gaps. It declares 123
excluded fixtures. Sixteen cases and 46 pages overlap the completed 21-case
review above; their regenerated PDF bytes are identical.

Six new cases and 20 pages in this 55-case packet were rendered at 120 dpi
and visually checked: `joint-presidential-campaign-both`, `joint-two-w2s`,
`single-reviewed-car-loan-schedule1a`,
`single-three-car-loan-schedule1a`, `single-k-blank-tin-withholding`, and
`single-two-employers-excess-social-security`. The joint names, SSNs, and
campaign boxes; $127,000 two-W-2 wages; Schedule 1-A $4,000 deduction and
three-VIN continuation; $5,000 Form 1099-K income and $480 withholding; and
$1,482 excess Social Security payment visibly matched retained pending data
and native XML. No page-order, clipping, or owner discrepancy was found in
those pages. Five additional cases and 21 pages cover final-trust/partnership
capital amounts, two partnership debt-cancellation and recovery paths, and
direct broker basis sales. Three final-trust cases and 12 pages cover separate
short-term and long-term capital losses plus a section 67(e) deduction. The
printed lines and totals in these eight cases matched retained pending data
and native XML, with no visible page-order, owner, or clipping discrepancy.
The remaining 25 cases and 86 pages were rendered at 120 dpi and reviewed:
five vehicle/overtime Schedule 1-A cases; five qualified-tip cases, including
the two-employer worksheet and high-income phaseout; two joint senior/mixed
Schedule 1-A cases; two 1099-NEC/K classification cases; eight pension/IRA
rollover and attached-statement cases; and three Form 1040 line 1h wage-source
cases. Their printed amounts, source ownership, checkboxes, continuation
pages, and packet order matched retained pending data and native XML. No
clipping or legibility discrepancy was found. Thus **all 55 cases and 185
pages** in this selected packet have visual observations. The read-only replay
checker reported `Review checklist complete (selected scope): 55 cases, 185
pages; artifact hashes and TY2025 XSD validation confirmed.` This selected
result does not declare the nonnamed phase or the 178-case visual gate
complete.

Each generated native XML must pass the supplied TY2025 `Return1040.xsd`
before its PDF artifact is written. The manifest records the schema file digest
and each case's structural validation result; IRS business rules, source
authenticity, and visual parity outside the two selected packets still require
separate review.
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
requires the entire saved source JSON byte sequence to match the generator's
canonical serialization of the checked-in fixture and current graph result;
extra top-level fields, reordered fields, and edited ignored source fields
cannot pass by updating only the manifest hash. It then
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

The same focused packet exposed an additional source identity gap: adding
`unsupportedReviewClaim` to one source JSON and updating only its manifest
SHA-256 passed the earlier checker with unchanged XML and PDF. Exact source
serialization replay now rejects that mutation with `source JSON differs from
current source replay`; the original two-case/four-page packet still passes.

Seven existing positive Form 1098 review fixtures now include distinct,
deterministic synthetic issuer Copy B PDFs, each bound to its source reference,
borrower TIN, lender, reported box amounts, filename, and SHA-256. The focused
generator run on only those seven fixtures completed graph execution, prepared
MeF, local TY2025 v5.4 XSD validation, PDF build, and emitted-page-origin
checks. It wrote seven source/XML/PDF triplets, **27 pages**, and six retained
IRS templates to `.state/research/ty2025-form1098-copy-review-2026-10-02/packet/`.
The six Schedule A pages and the Form 8396 page were rendered and inspected;
their PNGs are under the sibling `renders/` directory. The seven Copy B
digests are distinct and stable across Deno processes. The initial focused
attempt caught incorrectly formatted Form 4952 1099-INT/DIV recipient TINs;
the corrected nine-digit values passed the second run. These synthetic issuer
copies test source-byte joining and filled output; they are not authentic
issuer records. The remaining pages and all 178 fixtures still need the full
review checklist and release gate.

A separate 178-fixture owner scan checked 189 positive W-2/1099 source rows
against their filer identity. It found 90 missing owner fields before fixture
repair. The ordinary `wage()` review helper now names the primary taxpayer;
explicit joint-spouse rows retain their own employee SSN. Three positive 1099-INT
rows and one 1099-G row now name the correct nine-digit recipient TIN. The
rescan found no wrong-owner row and three remaining missing fields:
`single-k-blank-tin-withholding` deliberately exercises 1099-K's separate
recipient-identity review; the W-2 rows in
`single-form7203-capital-and-debt-basis-loss` (distinct `123456789` filer) and
`single-form8995a-two-business-loss-netting` belong to deferred named-form
fixture work. Four representative nondeferred source-backed cases (child
interest, high-wage W-2, repaid unemployment W-2/1099-G, and MFS W-2/EIC)
passed graph, prepared MeF, local v5.4 XSD, and PDF generation: 17 pages and
eight retained templates at
`.state/research/ty2025-owner-fixture-sample-2026-10-02/packet/`. This is a
focused fixture check, not the 178-case generation or visual signoff.

An initial focused attempt stopped at `single-w2-refund`: its positive W-2
source lacks `employee_ssn`, which the current W-2 source guard requires.
Inspection found the same missing field in
`single-w2-overpayment-applied-2026` and `single-1098-purchase-points`; those
two were not executed in that smoke. Their W-2 employee SSNs were subsequently
added to the fixtures; the purchase-points case also passed the seven-case Form
1098 run above. This two-case smoke is not the 178-case filled-PDF review, repository
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

## Form 9000 current fixture addition (2026-10-03)

The optional return-attached alternative-media preference now has a confirmed taxpayer/joint-spouse input, native `IRS9000` documents, and one filled PDF form page per person. Three focused cases passed, including a two-owner full return with two native and two printable copies; the single-owner full-return XML validated with `xmllint` against the locally cached TY2025 v5.4 `Return1040.xsd`. Its page was rendered and visually checked for name, SSN, large-print selection, and blank standalone-only address/signature. The read-only planner now reports **179 fixtures, 85 of 113 unique PDF keys covered, 28 uncovered named-family keys, and 116 PDF descriptors**. The earlier 178-fixture bulk pass and selected visual batches are historical checkpoints; the expanded full batch, business-rule and IRS ATS evidence remain open. [IRS accessible-products guidance](https://www.irs.gov/forms-pubs/accessible-irs-tax-products) permits attaching Form 9000 or sending it separately.

## Interrupted implementation-checkpoint batch (2026-10-03)

At `4a366f85`, `PATH=/tmp/opentax-tools:$PATH deno task test` was started with
Deno 2.9.4 and Poppler `pdftotext` 26.09.0. It reached Form 1116 XSD tests
without a reported failure, then was deliberately interrupted with SIGINT
(exit 130) after a separate calculated-output replay probe found that changing
Form 1040's Form 8814 tax amount could change XML without changing the retained
child forms. The partial log is the ignored local file
`.state/research/ty2025-full-test-4a366f85.log`, SHA-256
`28b6c062b5b03bdc1df15fbfee7d989277572b9be6da9d51d8a308e4bb0f4536`.
This is **not** a passing full batch. The source replay gap was repaired, and
focused Form 8814 and 167-exportable-fixture calculated-field mutation checks
passed. Rerun the full command after implementation freezes on the new head.

At `a935ec37`, the same full command was started with Deno 2.9.4 and Poppler
`pdftotext` 26.09.0. It reached the Schedule H XSD cases without a reported
failure, then was deliberately interrupted with SIGINT (exit 130) to add the
new [issue #60](https://github.com/filedcom/opentax/issues/60) CLI regression
before continuing the bulk gate. The partial ignored local log is
`.state/research/ty2025-full-test-a935ec37.log`, SHA-256
`8ec6e20040c58cd4ecefab9583db91920e0ec263eb37732300b3d4eaa82cdefb`.
This is **not** a passing full batch. The focused issue cases passed 56/56 with
no failures; rerun the full command at the next frozen implementation head.

## Frozen-head full batch after issue #60 regression (2026-10-03)

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` command at
`f92a09e4` completed by 2026-10-03 21:30 UTC in 52m14s: **11,050 passed,
zero failed**, with no ignored tests reported. It used Deno 2.9.4 (V8
15.0.245.2-rusty, TypeScript 6.0.3), `xmllint` libxml 2.9.13, and Poppler
`pdftotext` 26.09.0 through the local launcher. The ignored local log is
`.state/research/ty2025-full-test-f92a09e4.log` (SHA-256
`9e4ed2887a433e5378f4ee2f0a979ff3ecece3f4e464900330164f68451a7cd0`).
The code head remained frozen during the run. This is a passing local automated
batch for its tested routes; unresolved coverage decisions, all-page visual
review, IRS business-rule validation, and ATS acceptance remain open.

## Direct pension rollover filled-PDF review (2026-10-03)

At documentation head `61db04f2` (the tested code from `f92a09e4`), the real
review generator selected `single-direct-pension-rollover` and wrote a fresh
synthetic source, local TY2025 v5.4 XSD-valid XML, and two-page filled Form
1040 PDF to the ignored directory
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-direct-pension-61db04f2/`.
The PDF, XML, and source SHA-256 values exactly match the prior 167-case export.
Both pages were rendered at 150 dpi and visually checked against the source
and XML: Alex's 1099-R code G reports $20,000 gross, $0 taxable, the Form 1040
line 5c rollover box is selected, QCD is clear, and page 2 prints the $15,750
standard deduction with no positive tax or payment. Form/year, owner, page
order, checkboxes, amounts, and clipping flags are complete. The read-only
review checker passed **one selected case and two pages**, including source
replay, artifact hashes, page origins, and local XSD. The reviewed manifest
SHA-256 is
`af724d3e5414b91b2178612aafd71bc1c737abd7ef8c76d335e4ad408ae62353`.
This selected review leaves the rest of the 179-case plan, business rules, and
IRS ATS open.

## Form 1098 points filled-PDF review (2026-10-03)

At head `804cb13c` (unchanged implementation from the `f92a09e4` full pass),
the real review generator selected `single-1098-purchase-points` and
`single-1098-construction-refinance-points`. Its ignored directory is
`.state/research/ty2025-filled-pdf-review/2026-10-03-pr62-1098-points-804cb13c/`.
Both source-backed native returns passed the locally cached TY2025 v5.4 XSD.
All six generated pages were rendered at 150 dpi and inspected. The purchase
case prints $18,000 of issued mortgage interest plus $2,400 of reviewed
purchase points on Schedule A lines 8a/8e/10/17 and Form 1040 line 12e,
for $20,400 total; its $80,000 wages, $8,032 tax, $12,000 withholding, and
$3,968 refund agree with source and XML. The construction-refinance case
prints $18,000 interest plus $67 of six-month amortization of $2,000 paid
points, for $18,067 on those same lines; its $8,538 tax and $3,462 refund
also agree. Form/year, owner, boxes, row placement, page order, and clipping
checks are complete. The read-only review checker passed **two selected cases
and six pages**, including source replay, hashes, page origins, and XSD. The
reviewed manifest SHA-256 is
`3b0f027f0646ea5bfccaea1d9e19558412740edf8cceed5cfe41bc4aa81d1261`.
The Form 1098 source-byte boundary, cross-loan limits, other points variants,
remaining 179-case page review, business rules, and ATS remain open.

## Multiple Form 1098 mortgage-limit regression (2026-10-03)

The shared Pub. 936 Table 1 review now covers two or more full-year post-2017
acquisition loans for one single filer. Focused source tests include the
formerly accepted two-loan $900,000 box 2 sum without a whole-return review;
it now rejects. The three-loan final-export test retains locally XSD-valid
native XML and filled PDF for a reviewed $900,000 monthly-average balance:
$3,000 issued interest × .833 = $2,499 Schedule A line 8a. It also verifies
full $3,000 interest at $600,000 reviewed average despite $900,000 in box 2
snapshots, plus full/partial unreviewed over-limit rejection in native and PDF
exports. All **56 focused input/final-export tests** and the existing
two-loan TY2025 XSD case passed. This focused check does not replace the earlier 11,050-test full
suite at frozen head `f92a09e4`; the implementation has changed since then.

## Multiple mortgage filing-status regression (2026-10-04)

The Form 1098 limit preflight now receives the final filing status in both
exporters. A source-level case rejects unreviewed MFJ interest over $750,000
in combined box 2 snapshots and MFS over $375,000. The three-loan final-export
fixture adds a joint return with the third lender copy owned by the spouse:
unreviewed native/PDF exports reject, while a verified MFJ Table 1 workpaper
reconciles $3,000 reported interest to $2,499 in native XML and filled PDF.
The local TY2025 XSD and focused tests passed. These checks do not establish
complete MFS allocation, lender-statement authenticity, IRS business-rule
acceptance, or the final full-suite gate.

## One Form 1098 loan over the acquisition debt limit (2026-10-04)

The existing whole-return Pub. 936 Table 1 source now accepts one full-year
post-2017 loan. An unreviewed $900,000 box 2 snapshot with positive Schedule A
line 8a rejects in both exporters. Twelve documented $900,000 monthly balances
apply the .833 ratio to $1,000 reported interest, yielding $833 in local
TY2025 XSD-valid native XML and text-extracted filled PDF. A $600,000 reviewed
average permits the full $1,000 despite the box 2 snapshot; a zero line 8a
claim does not require a deduction review. This is focused source/export
evidence, not the later complete bulk test or IRS ATS acceptance.

## 2025 purchase mortgage without points (2026-10-04)

One July 2025 $900,000 principal-residence acquisition loan with issued Form
1098 box 2 and a reviewed closing/monthly-balance workpaper computes $833 of
deductible interest from $1,000 reported. Its source-to-native XML passed the
locally cached TY2025 XSD, and its three-page filled PDF text contains $833.
Native and PDF export reject the unreviewed claim. A second two-source case
combines a $500,000 July purchase and $500,000 full-year mortgage, computes
$1,500 from $2,000 reported interest, and builds the MeF bundle and PDF.
Source validation rejects missing closing reference, positive balances
before purchase, changed deduction, and missing issued box 2. These focused
checks do not establish other part-year or points paths, closing/statement
byte authenticity, the final bulk suite, or IRS ATS acceptance.

## 2025 purchase and qualified second-home source (2026-10-04)

The combined July purchase and preexisting Form 1098 review now requires
distinct property references and the former home's second-home occupancy
record. The source check accepts a rented home with 100 fair-rental and 15
personal-use days. It rejects 14 personal days, a 400-day total, and reuse of
the purchase property reference. The prior positive $1,500 combined-loan MeF
bundle and three-page filled-PDF case passed again with an unrented former
main home. A second $300,000 plus $300,000 pair with $2,000 claimed interest
rejects without the shared review and builds MeF/PDF with it; this also checks
the under-limit qualified-home path. Occupancy-document bytes, other property-use combinations, the
full bulk suite, and IRS acceptance remain outside this focused result.

## Purchase-points prior-home qualification (2026-10-04)

The separate $21,000 Form 1098 purchase-points plus existing-mortgage
fixture now retains distinct property references and a former-home
second-home occupancy review. Focused source parsing keeps the unrented
positive case and accepts 100 fair-rental plus 15 personal-use days; 14
personal-use days and duplicate property identity reject. The earlier
purchase-points native and PDF Schedule A source-replay tests passed on this
head, as did the full-return local TY2025 XSD case. Occupancy bytes, full
batch, and ATS remain open.

## Direct capital-gain source omission (2026-10-04)

A retained positive Form 1099-DIV box 2a or calculated Form 8814 child gain
must reach Schedule D or the direct Form 1040 line 7a route. Native and PDF
Form 1040 now reject a missing or zero direct line when there is no Schedule D
source. The focused source, native Form 1040, and PDF Form 1040 suites passed
104/104 after the change. This does not authenticate payer copies or prove the
wider Schedule D route, full bulk suite, or IRS ATS acceptance.

The follow-up Schedule D check now requires a finalized line-16 print amount
before using Schedule D as the reporting destination, and compares its retained
1099-DIV and Form 8814 line-13 components with their sources. The 104 affected
Form 1040 source/native/PDF tests passed after that change. The local Poppler
binary initially could not load its cached dependent libraries. With their
package directories on `DYLD_LIBRARY_PATH` and the Poppler binary directory
on `PATH`, both physical Form 8814/Schedule D and Schedule 1/Form 8814 PDF
source/print tests passed. These two tests do not replace the full bulk or
all-page visual review gates.

## Form 8814 child gain in native Schedule D (2026-10-04)

The source-backed Form 8814 fixture calculates $179 of child capital gain,
prints it on Schedule D line 13, and joins $1,179 of net capital gain to Form
1040. Native MeF now includes the same $179 in Schedule D
`CapitalGainDistributionsAmt`; previously it omitted the child component.
The 34 focused native Schedule D cases, one physical Form 8814/Schedule D/Form
1040 PDF source/print case, and the selected full-return TY2025 v5.4 XSD case
passed on this head. The full bulk and all-page visual review remain open.

## Two elected children with Schedule D (2026-10-04)

A second reviewed Form 8814 child record was added to the single-child
Schedule D source fixture in a focused return test. The graph retains two
separate child identities and Form 8814 documents, combines $179 from each on
Schedule D line 13, adds the existing $1,000 share sale to Form 1040 line 7a,
and projects two child PDF copies plus the $358 Schedule D amount and dotted
note. The full native return passes the local TY2025 v5.4 XSD. The physical
two-child pages now pass a physical page-count, origin, and extracted-text
check: each child is on its own Form 8814 page, and the Schedule D page prints
the $358 line-13 amount and Form 8814 note. Raster layout review and
issuer-source bytes remain outside this test.

## Selected Schedule 1 line 8z multi-source rerun (2026-10-04)

The existing two-payer 1099-G grant, two-payer RTAA, two-corporation S
corporation K-1 code J, and 1099-MISC box 8 source-row suites passed 7/7
focused tests. Grant and RTAA full native returns passed the local TY2025
v5.4 XSD, and filled-PDF text preserved both source identifiers for each.
The code J PDF text preserved both corporation EINs; the box 8 check covered
the row-reconciliation helper only. The RTAA positive case now checks its
filled statement text and XSD explicitly. Original source bytes, broader
character and prior-year evidence, the full bulk suite, and ATS remain open.

## Form 1099-MISC box 8 full-return replay (2026-10-04)

The focused box 8 file passed 3/3 tests. Two separately referenced $300/$450
copies flow through Schedule 1 line 8z and Form 1040 line 8, generate two
native other-income statement rows, validate against the cached TY2025 v5.4
XSD, and print both payer identifiers in the filled PDF text. Altering a filed
row or retained source recipient rejects at both native and PDF packet export.
The frozen full-suite result at `f92a09e4` has not been rerun on this head.

The later mixed-family replay passed 4/4 tests in the same focused file. Two
1099-MISC box 8 copies, one RTAA copy, and one taxable grant copy sum to
$1,750 on Schedule 1 line 8z and Form 1040 line 8. Native XML and extracted
filled-PDF text retain all four distinct payer rows; the local TY2025 v5.4 XSD
validates the complete return. The full suite remains due at implementation
freeze.

## PR #62 bulk diagnostic and Form 8814 fixture repair (2026-10-04)

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` command at
`3e353bc7` finished in 52m47s with **11,057 passed and two failed**. Its log is
`.state/research/ty2025-pr62-full-test-3e353bc7.log` (SHA-256
`47ba6164f949b2a880bac95569ae181d8d17c7d633540e9fa62346b286df77c5`).
Both failures were pre-existing Form 8814 fixtures that omitted a calculated
child capital-gain destination from the finalized Form 1040 or Schedule D;
the newer source guard correctly rejected them. The native/XSD fixture now
files the calculated child amount on direct line 7a. The parent-PDF fixture
provides a finalized Schedule D with its child line-13 amount and expects the
early omission guard for the intentionally unsourced negative. All ten tests
in the two corrected files pass. No production guard changed. The bulk test
must be rerun on the fixed head before claiming a current-head pass.

## PR #62 fixed-head full automated pass (2026-10-04)

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` rerun at
`78d11d95` completed in 52m53s with **11,059 passed, zero failed** and no
ignored tests reported. The retained local log is
`.state/research/ty2025-pr62-full-test-78d11d95.log` (SHA-256
`723b113c8f83495bec686bc437e4e104d3aeee3a0071b263e152a227c8b1233f`).
It used Deno 2.9.4, TypeScript 6.0.3, `xmllint` libxml 2.9.13, and Poppler
26.09.0 through the local launcher; the cached TY2025 v5.4 XSD was present.
Both repaired Form 8814 tests passed in the full run. This establishes a
current-head local automated pass for tested routes, including issue #60 and
the mixed Schedule 1 line 8z return. The 52 board parent gates, complete
source and business-rule coverage, all-page visual review, issued evidence,
and IRS ATS acceptance remain open.

## Mixed Schedule 1 line 8z filled-PDF review (2026-10-04)

A new source-backed `single-mixed-box8-rtaa-taxable-grant-line8z` fixture
exercises two 1099-MISC substitute payments ($300 and $450), one $400 RTAA
payment, and one $600 taxable grant in the printable packet. The planner now
reports 180 fixtures and 85/113 unique PDF keys. Its selected packet is in
`.state/research/ty2025-filled-pdf-review/2026-10-04-mixed-line8z/`.
All five physical pages were rendered and visually inspected: Form 1040
pages 1–2, Schedule 1 pages 1–2, and the separate line 8z statement. Form
1040 and Schedule 1 each carry the $1,750 other-income total once; the
statement preserves four distinct payer/TIN rows and the same total. The
per-page checklist records owner, amounts and native XML, checkbox state,
order, continuation, and legibility. The read-only selected-scope checker
passed **one case and five pages**, replaying source, native XML, PDF bytes,
page origins, hashes, and local TY2025 v5.4 XSD validation. This is a bounded
visual result; the complete all-page review, issued payer records, business
rules, and IRS ATS acceptance remain open. The earlier 11,059-test bulk pass
predates this added fixture.

## Registered PDF AcroForm field-name audit (2026-10-04)

`scripts/inspect-pdf-fields.ts` now reads the current `fields`, `filerFields`,
`extraPdfFields`, and expanded `rows` descriptors rather than the removed
`PDF_FIELD_MAP` property. It uses a URL-specific IRS template cache and writes
per-descriptor dumps under ignored `.state/research/ty2025-pdf-field-audit/`;
any template error, missing mapped field, or field-type mismatch makes the command fail. The current
run inspected **116 registered descriptors** against IRS AcroForms: **zero
fetch/parse errors**, **zero descriptors with missing mapped field names**,
and **zero field-type mismatches**.
Ninety-seven descriptors have template fields outside their mapped set; this
is an inventory, not a finding that every such field is needed. This static
check does not verify domain values, form-page retention, row overflow, owner,
layout, source/MeF parity, or the still-uncovered PDF keys. The exact run log
is `.state/research/ty2025-pdf-field-audit/run-2026-10-04.log`.

## Short/long Form 8949 filled-PDF review (2026-10-04)

The selected `single-short-and-long-form8949-sales` packet was generated under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8949-two-sales/`.
All six pages were rendered and visually reviewed: Form 1040 pages 1–2,
Schedule D pages 1–2, a short-term box B Form 8949 copy, and a long-term box F
Form 8949 copy. The $2,000/$1,000 short sale yields $1,000 on Schedule D line
2; the $4,000/$2,000 long sale yields $2,000 on line 10. Schedule D line 16
and Form 1040 line 7a each show $3,000; AGI is $33,000. Owner association,
checkboxes, page order, and legibility were checked on every page. The
read-only selected-scope checker passed **one case and six pages**, replaying
source, XML, PDF, artifact hashes, page origins, and local TY2025 v5.4 XSD.
This remains a synthetic bounded packet; broker/issuer evidence, other sales
and gains, the complete all-page review, business rules, and ATS are open.

## Simplified home-office Schedule C filled-PDF review (2026-10-04)

The selected `single-schedule-c-simplified-home-office` packet under
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-c-home-office/`
contains eleven pages: Form 1040, Schedules 1/2/C/SE, and Form 8995. Every
page was rendered and visually checked for form/year, owner association,
amounts, checkbox state, page order, continuation, and legibility. Schedule C
line 30 prints **1,200 total and 200 business square feet** and a $1,000
simplified expense; line 31 prints $19,000 profit from $20,000 receipts. The
packet and native XML agree on $1,342 half-SE-tax deduction, $2,685 SE tax,
$382 limited QBI deduction, and $2,839 Form 1040 amount owed. The read-only
selected-scope checker passed **one case and eleven pages**, including exact
source/XML/PDF replay, hashes, page origins, and local TY2025 v5.4 XSD. This
is synthetic bounded evidence; external business records, wider Schedule C
expense routes, complete visual review, business rules, and ATS remain open.

## Mixed Form 1099-K error, duplicate, and personal-sale review (2026-10-04)

The selected `single-k-mixed-error-duplicate-personal` packet under
`.state/research/ty2025-filled-pdf-review/2026-10-04-k-mixed-error/`
contains thirteen pages: Form 1040, Schedules 1/2/C/D/SE, and Form 8949.
All were rendered and visually checked for form/year, owner association,
amounts, checkbox state, page order, and legibility. The $4,000 reported K
amount comprises $2,000 unique business receipts, $1,000 duplicated 1099-NEC
already counted once, $800 personal-sale proceeds, and a $200 reported error.
Schedule 1 prints the $200 error above its income lines without including it
in line 10; Schedule C and Form 1040 carry $3,000 business profit once. Form
8949 box F, Schedule D, and Form 1040 line 7a carry the $800 less $300 camera
sale as a $500 long-term gain. The read-only selected-scope checker passed
**one case and thirteen pages**, including source/XML/PDF replay, hashes, page
origins, and local TY2025 v5.4 XSD. The source/transaction records remain
synthetic; authenticated issuer bytes, wider corrected copies, complete visual
review, business rules, and ATS remain open.

## Personal-sale Form 1099-K gain/loss and selling-fee review (2026-10-04)

Two selected fixtures, `single-k-personal-gain-loss` and
`single-k-personal-selling-fees`, were generated under
`.state/research/ty2025-filled-pdf-review/2026-10-04-k-personal-sales/`.
Each six-page PDF contains Form 1040 pages 1–2, Schedule D pages 1–2,
short-term Form 8949 box C copy 1, and long-term Form 8949 box F copy 2.
All twelve rendered pages were visually checked for 2025 form/year, owner,
amounts, checkboxes, order, and legibility. The $1,500 gross K source splits
into an $800 ticket sale and $700 chair sale in the first case. Form 8949 and
Schedule D carry a $550 short-term gain, while code L adds $300 to cancel the
non-deductible personal chair loss; Form 1040 line 7a and AGI are $550. In
the selling-fee case, $50 documented expense on each sale reduces proceeds
to $750 and $650: the ticket gain is $500, and code L adds $350 to zero the
chair loss. Form 1040 line 7a and AGI are $500. Both returns have zero tax
and payments. The read-only selected-scope checker passed **2 cases and 12
pages**, including source/XML/PDF replay, hashes, page origins, and local
TY2025 v5.4 XSD. These are synthetic bounded reviews; issuer and transaction
records, other classifications, the complete all-page review, business rules,
and IRS ATS acceptance remain open.

## PR #62 post-fixture full automated pass (2026-10-04)

After the `3fa9c6fe` mixed line 8z review fixture landed, the exact
`PATH=/tmp/opentax-tools:$PATH deno task test` command passed **11,060 tests,
zero failed** in 52m58s, with no ignored tests reported. The retained log is
`.state/research/ty2025-pr62-full-test-3fa9c6fe.log` (SHA-256
`c2885c449bca9b1fc039eaca773dabf3114b24425c74a64c581de87d2c7f408b`).
The two new personal-sale Form 1099-K fixtures passed within its 181-case
filled-PDF/XSD file. The later PDF descriptor audit script was also exercised
separately against all 116 registered official templates; subsequent branch
commits changed validation documentation only. This local automated result
does not establish complete source evidence, all-page human review, IRS
business-rule acceptance, or ATS transmission.

## PR #62 post-guard full automated pass (2026-10-04)

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` command ran on frozen
code head `f2b2b545` from 02:54:56 to 03:47:34 UTC and passed **11,063 tests,
zero failed** in 52m12s, with no ignored tests reported. This includes the
Form 1040-ES payment-year, Form 1099-K recipient identity, and direct Form 8949
withholding guards added after the prior 11,060-test full pass. The retained
log is `.state/research/ty2025-pr62-full-test-f2b2b545.log` (SHA-256
`958594c9b05585de4ba2132dc433213c235a846ab8734cb641f912b82c5c7ac9`).
The runner used Deno 2.9.4 (V8 15.0.245.2-rusty, TypeScript 6.0.3),
`xmllint` libxml 2.9.13, and Poppler 26.09.0 through the local launcher.
This local pass does not establish complete source evidence, every-page visual
review, IRS business-rule acceptance, or ATS transmission.

## Unidentified 1099 payer-name duplicate guard (2026-10-04)

A repeated positive 1099-INT, DIV, OID, G, or PATR payer copy without an issued
reference, payer TIN, or account could bypass duplicate detection by changing
only the capitalization or spacing of its payer name. Form 1099-R could do
the same with a fixed payer EIN because its key also included a varying plan
name. Shared native/PDF export regressions were red before the changes.
Payer names now trim, collapse whitespace, and compare case-insensitively
where a TIN is missing; the Form 1099-R key uses the EIN, normalized payer
name, and recipient, so distinct copies of one named payer need an account
or issued reference. Reported
payer text and amounts remain unchanged in the filed output. Six negative
cases reject through native and PDF export. An older test's alleged second
1099-R payer actually reused the first EIN; its fixture now uses a distinct
EIN. The seven-file focused input/reconciliation run passed **378/378**;
format, lint, and diff checks passed. The preceding 11,063-test full run was
older than this code change; the post-correction bulk gate below passed. This guard
compares reviewed structured payer facts; issuer-copy authentication and
broader correction lineage remain open.

The first post-guard bulk diagnostic on `3a551e4f` found a Scenario 8
1099-R fixture failure. Its two different payers share the IRS packet's
synthetic `000000009` EIN, so an EIN-only duplicate key incorrectly rejected
them. That diagnostic was stopped after the failure; it is not a full pass.
The 1099-R key now includes the normalized payer name with the EIN and
recipient: case/spacing-only variants still reject, while the two genuinely
different Scenario 8 names remain separate. The focused 1099-R, exporter, and
Scenario 8 rerun passed **140/140**; format and lint passed. The clean full
rerun below passed after this correction.

## PR #62 post-correction full automated pass (2026-10-04)

The exact `PATH=/tmp/opentax-tools:$PATH deno task test` command ran on frozen
code head `4efaf107` from 04:33:08 to 05:25:59 UTC and passed **11,064 tests,
zero failed** in 52m23s, with no ignored tests reported. This includes the
1099 payer-name duplicate guard and the Scenario 8 synthetic-EIN correction.
The retained log is `.state/research/ty2025-pr62-full-test-4efaf107.log`
(SHA-256 `682c4db19c2447a1e0575e5111e9009be480fb052d8bb7a2888ec88dbc09f966`).
The runner used Deno 2.9.4 (V8 15.0.245.2-rusty, TypeScript 6.0.3),
`xmllint` libxml 2.9.13, and Poppler 26.09.0 through the local launcher.
This local pass does not establish complete source evidence, every-page visual
review, IRS business-rule acceptance, or ATS transmission.

## Form 1098-E repeated-account source guard (2026-10-04)

A red input-schema regression showed that two positive Form 1098-E copies
from the same lender, borrower, and loan account could both count interest
when their issued-copy references differed. The source schema now rejects
that combination, including payer-name capitalization/spacing variants when
lender TINs are absent, while retaining distinct accounts. A second red
regression showed that an unreported-interest payment ledger could claim the
same lender, borrower, and loan account as a positive issued Form 1098-E;
that combination now rejects at intake. The native and PDF final exporters
also bind masked and full borrower TINs to the resolved filer, rejecting a
repeated account under different source references. The two-file focused run
passed **35/35** tests; formatting, lint, and diff checks passed. The preceding
11,064-test full run is older than this source change, so a current-head bulk
rerun remains due after the other implementation work. Issuer authentication,
all positive source routes, and ATS acceptance remain open.

## Form 1099-NEC positive-payer identity guard (2026-10-04)

A red Form 1040 exporter regression showed that a box 4 only Form 1099-NEC
withholding row could pass with an empty payer name or invalid payer TIN.
The shared input schema now requires a nonblank payer name and nine-digit TIN
for positive box 1, box 3, or box 4 amounts. Informational zero-amount rows
retain their prior behavior. Both native and PDF Form 1040 projection reject
the malformed withholding source; the two-file graph/exporter run passed
**76/76** tests, and formatting, lint, and diff checks passed. The current-head
bulk rerun remains due after implementation. Issued-copy authentication and
other source variants remain open.

## Form 1099-MISC payer-name identity guard (2026-10-04)

A red Form 1040 exporter regression showed that a positive box 4 Form
1099-MISC row could retain a whitespace-only payer name while contributing
withholding. The input schema now requires nonblank payer-name text, preserving
the supplied text for filing. Native and PDF Form 1040 projection both reject
the malformed row. The two-file source/exporter run passed **99/99** tests;
formatting, lint, and diff checks passed. The current-head bulk rerun remains
due after implementation, and issued-copy authentication and wider source
variants remain open.

## Forms 1099-INT/OID payer-name identity guards (2026-10-04)

Red Form 1040 exporter regressions showed that positive taxable interest and
OID source rows with whitespace-only payer names passed both native and PDF
projection. Their source schemas now require nonblank payer-name text without
changing valid filed text. The four-file focused graph/exporter run passed
**102/102** tests; formatting, lint, and diff checks passed. The current-head
bulk rerun remains due after implementation, and issued-copy authentication
and wider source combinations remain open.

## Form 1099-DIV positive-payer identity guard (2026-10-04)

A red Form 1040 exporter regression showed that a positive ordinary-dividend
row could reach native and PDF projection with neither a payer TIN nor a
nonblank payer name. The shared final owner check now requires at least one
identified payer field after validating the recipient; rows with valid payer
identity retain their prior behavior. The focused graph/exporter run passed
**90/90** tests, and five nearby dividend-reconciliation tests passed,
including final native/PDF export. Formatting, lint, and diff checks passed.
The current-head bulk rerun remains due after implementation; issuer-copy
authentication and wider source combinations remain open.

## Form 1099-G positive-payer identity guard (2026-10-04)

A red Form 1040 exporter regression showed that positive unemployment could
reach native and PDF projection with neither a nonblank payer name nor a valid
nine-digit payer TIN. The shared final owner check now requires one of those
identifiers after validating the recipient. The focused graph/exporter run
passed **62/62** tests, and four nearby unemployment replay tests passed,
including a two-copy native/PDF return. Formatting, lint, and diff checks
passed. The current-head bulk rerun remains due after implementation; issuer
authentication and wider source combinations remain open.

## Form 1099-PATR positive-payer identity guard (2026-10-04)

A red Form 1040 exporter regression showed that positive box 4 cooperative
withholding could reach native and PDF projection with a valid recipient but
neither a nonblank payer name nor a valid nine-digit payer TIN. The shared
final owner check now requires one of those payer identifiers. The three-file
graph, owner, and withholding-exporter run passed **22/22** tests; formatting,
lint, and diff checks passed. The current-head bulk rerun remains due after
implementation, and issued-copy authentication and wider source combinations
remain open.

## Form 1099-B broker identity at final export (2026-10-04)

A red full-return regression showed that a broker sale with a matching
recipient could reach both native and PDF export with neither a payer TIN nor
an issued-copy source reference. Calculation still accepts incomplete broker
facts, but the shared final recipient check now requires at least one of those
broker identifiers for every filed Form 1099-B row. An identified payer TIN
and a separately identified issued-copy reference remain valid. The two-file
broker run passed **23/23** tests, and three related withholding, Schedule B,
and attachment files passed **36/36** tests. Formatting, lint, and diff checks
passed. The current-head bulk rerun remains due after implementation; issuer
authentication, transaction-level correction lineage, and ATS acceptance
remain open.

## Form 1099-B description and TY2025 sale date (2026-10-04)

Red full-return regressions showed that an identified broker sale with a
whitespace-only property description or a nonexistent/prior-year sale date
could reach TY2025 native export; the direct Schedule D path did not print a
Form 8949 detail row that would catch the date in PDF projection. The shared
final broker-source check now requires a nonblank description and a real
calendar-2025 sale date. Both native and PDF exports reject the malformed
sources before packet assembly. The two-file broker run passed **25/25**
tests, and three related withholding, Schedule B, and attachment files passed
**36/36** tests; formatting, lint, and diff checks passed. The current-head
bulk rerun remains due after implementation; acquired-date variants, issuer
authentication, wider transaction combinations, and ATS acceptance remain open.

## Form 1099-B acquired-date final guard (2026-10-04)

A red full-return regression showed that a direct Schedule D broker sale could
reach native export with a nonexistent acquired date or an eight-digit date
string, while the native detail serializer expects a calendar date value.
The shared final broker check now requires an exact real ISO acquired date for
the currently supported route, before either native or PDF packet assembly.
The two-file broker run passed **26/26** tests and the three related
withholding, Schedule B, and attachment files passed **36/36** tests;
formatting, lint, and diff checks passed. Other legitimate acquired-date
representations need an explicit native/PDF route before filing. The
current-head bulk rerun, issuer authentication, and ATS acceptance remain open.

## Two-employer W-2 excess deferral filled-PDF review (2026-10-04)

On `c458142c`, the selected `single-w2-code-d-excess-line1h` fixture was
regenerated through the real return graph, native MeF builder, and PDF builder
under `.state/research/ty2025-filled-pdf-review/2026-10-04-w2-code-d-current/`.
Its source, XML, and PDF hashes are respectively
`bd6fe4a6ffc8b9f0231ddcfdc4c4079e64df8a9dedef0d4b83716468cb631e9f`,
`28b3e11019b4735ba873903f85efef1d82ae23571caa54ddfad5457026901154`,
and `6cae047c7665916a1750d1371b245429cdf21f52c7a41f756048edcc781fda65`.
Both Form 1040 pages were rendered and inspected for year, filer, checkbox,
amount, page order, and clipping. Two distinct employer W-2s each report
$13,000 box 12 code D: the $26,000 combined deferral exceeds the
[2025 $23,500 limit](https://www.irs.gov/instructions/i1040gi) by $2,500.
The PDF and native XML retain $100,000 line 1a wages, $2,500 line 1h excess,
$102,500 line 1z/AGI, $10,000 W-2 withholding, and $4,005 owed. The selected
read-only review checker passed **1 case, 2 pages**, including source/XML/PDF
hash replay and local TY2025 v5.4 XSD validation. Issued W-2 authenticity,
other deferral plan types and corrections, all-page review, business rules,
and ATS acceptance remain open.

## Form 1099-K withholding and business refund/fee filled-PDF review (2026-10-04)

The selected `single-k-blank-tin-withholding` four-page packet and
`single-k-business-refund-and-fee` ten-page packet were generated under
`.state/research/ty2025-filled-pdf-review/2026-10-04-k-business-source/`.
All fourteen physical pages were rendered and inspected for form/year, owner
association, amounts, checkbox state, page order, continuation, and
legibility. The blank-TIN source relies on retained name/address owner review;
Schedule 1 line 8j and Form 1040 line 8 show $5,000, while Form 1040 lines
25b/25d and 35a show $480 withheld and refunded with zero tax. In the
business case, the $3,000 Form 1099-K gross source stays on Schedule C line 1;
$400 of customer returns and $90 of processor fees reach lines 2 and 10,
leaving $2,510 profit. Schedule SE shows $355 tax and $177 half-tax deduction;
Form 1040 shows $355 owed. The read-only selected-scope checker passed
**2 cases and 14 pages**, replaying source/XML/PDF bytes, hashes, page origins,
and local TY2025 v5.4 XSD. These synthetic packets do not authenticate
processor records or settle wider classifications, business rules, complete
visual review, or IRS ATS acceptance.

## Form 1040-ES retained payment-year designation (2026-10-04)

The `f1040es` source now requires `tax_year: 2025` on ordinary quarter-payment
records and on each signed joint allocation payment. Previously, a record
marked only with quarter, payment date, payer, and reference could be counted
on TY2025 line 26 even if the payment belonged to another tax year. IRS Direct
Pay identifies the tax year separately for [estimated tax payments](https://www.irs.gov/payments/types-of-payments-available-to-individuals-through-direct-pay).
Wrong-year ordinary and signed joint rows reject in both native and PDF final
export. Positive quarterly, divorced-joint, MFS-joint, return arithmetic, and
source packet cases passed **37 focused tests**; the agreed-joint native return
passed the local TY2025 v5.4 XSD (**38 checks total**). These are synthetic
reviewed facts; IRS-account confirmation, agreement signature authentication,
other payment channels, and ATS remain open. The full post-change run above passed.

## Form 1099-K conflicting recipient TIN guard (2026-10-04)

A retained 1099-K source with no recipient TIN can use a reviewed filer
name/address match. The shared native/PDF check previously accepted the same
review even after the payer row was changed to carry a different recipient
TIN. A regression against `single-k-blank-tin-withholding` reproduced this as
an unexpected native-export success. The final check now rejects any present
recipient TIN that differs from the taxpayer or joint spouse; a matching
name/address review cannot override it. The changed-source case rejects in
both native and PDF exporters. All **nine** selected `single-k-` full-return
fixture/XSD routes then passed. Issuer-copy authentication, corrected-copy
lineage, wider owner ambiguity, and ATS remain open. The full post-change
run above passed.

## Form 1099-K joint recipient name and TIN alignment (2026-10-04)

The final 1099-K owner check previously allowed a payer row to name the
spouse in its reviewed identity while carrying the taxpayer’s recipient TIN,
or the reverse, on an MFJ return. A direct joint-owner regression was red
before the fix. When a recipient TIN is present, the shared native/PDF check
now accepts only that person’s reviewed name; a missing TIN still permits a
reviewed taxpayer or spouse name/address match. The direct owner case passed,
and all nine `single-k-` full-return/XSD fixture routes passed again. Payer
copy authenticity, wider corrected-source combinations, and ATS remain open.
The full post-change run above passed.

## Direct Form 8949 withholding source boundary (2026-10-04)

A direct Form 8949 transaction could formerly set `federal_withheld` and
create Form 1040 line 25b without a payer-issued record or recipient owner. A
red regression demonstrated that the shared withholding reconciliation
accepted the source. Final native/PDF export now refuses a positive amount on
that direct row and points to the issued Form 1099-B source route. The
[2025 Form 1099-B](https://www.irs.gov/pub/irs-pdf/f1099b--2025.pdf) places
federal withholding in box 4; [Form 8949 instructions](https://www.irs.gov/instructions/i8949)
describe capital-sale reconciliation, not an independent withholding source.
The direct-source negative reached both exporters and **79** focused
withholding/Form 8949 tests passed. The 1099-B payer-copy path remains
available for sourced withholding; issuer authenticity, wider corrected
copies, and IRS ATS remain open. The full post-change run above passed.

## PDF test launcher check after later source guards (2026-10-04)

At `f072629e`, the two focused PDF files that previously failed when
`pdftotext` was absent from the shell `PATH` passed **8/8** with
`PATH=/tmp/opentax-tools:$PATH` and the test permissions for `xmllint`, Deno,
`pdftotext`, and `pdftoppm`. The local launcher reports Poppler 26.09.0.
Calling the package-cache binary directly does not load its linked libraries;
the existing launcher is the working test environment. This focused result
does not replace a full `deno task test` run on the final implementation head.

## Form 4547 pilot-only existing-account reference (2026-10-04)

The Form 4547 request schema now rejects a pilot-contribution election without
an initial-account election unless a nonblank existing-child-account reference
is retained. The [IRS instructions](https://www.irs.gov/instructions/i4547)
permit pilot-only election for a child who already has an account. The focused
input and attachment-coverage files passed **15/15**; format and lint passed
for changed code. Both final exporters still reject every entered Form 4547
request pending authority, eligibility, separate signature, native/PDF, and
ATS evidence. This is not a full post-change bulk run.

## HOH nondependent child identity on Form 1040 (2026-10-04)

The general source's head-of-household qualifying-child name previously
disappeared before both final packets. A bounded positive case now ties it to
one reviewed custodial Form 8332 release child, SSN, residence, and home-cost
record. The complete synthetic W-2 return emits `QualifyingHOHNm` and
`QualifyingHOHSSN` in native Form 1040 and passed local TY2025v5.4 XSD;
its filled PDF prints the same child name in the canonical `f1_29` field.
Changing the retained Form 1040 child SSN stops both exports. The five nearby
Form 1040 files passed **236/236** after an older dividend fixture received
its required payer name. Other HOH/QSS routes, custody proof, page review,
current-head bulk testing, IRS business rules, and ATS acceptance remain open.

## Post-QSS bulk failure and source-fixture repair (2026-10-04)

The first full `PATH=/tmp/opentax-tools:$PATH deno task test` on `3e72e410`
finished in 52m20s with **11,099 passed and 7 failed**. All seven failures
were older fixtures missing payer identity under the existing positive
1099-DIV/1099-G export guards. Two synthetic dividend replay rows and one
synthetic unemployment source now identify their payers. ATS Scenario 8's
amount-only 1099-DIV cover-sheet fact still has no issued payer copy: its
calculation test now expects PDF export rejection, while its separate 1099-R
schema fixture labels the added payer name as synthetic test metadata rather
than ATS evidence. The seven formerly failing cases then passed **7/7** with
202 other tests filtered out; format and lint passed. The failed full-run log
is `/tmp/opentax-pr62-current-head-test.log` (SHA-256
`59ff9ef48a0b5a53ae704cae3e9287f635077368f04d48a72443e87ec5774a56`);
the focused rerun log is `/tmp/opentax-pr62-failures-rerun.log` (SHA-256
`45a0b749b242c73b254e875008cc7623e68ded9a3a17f2c8fb05145dce650e09`).
The corrected full `PATH=/tmp/opentax-tools:$PATH deno task test` on
`0bbf1fb0` passed **11,106/11,106** in 52m48s, including all seven formerly
failing cases. Its log is `/tmp/opentax-pr62-final-head-test.log` (SHA-256
`99f0c4816df34c30cc9b04b9bbbfe13782c70f59c1c5f538c4cf907f1b2c9b74`).
This is a local regression gate; complete route evidence, every-page visual
review, current IRS ATS effectiveness, transmission, and acceptance remain open.

## QSS nonclaimed child joint-return exception (2026-10-04)

A bounded QSS source review now carries one child or stepchild who filed a
nonrefund joint return and is not listed as a dependent to the 2025 Form 1040
MeF qualifying-person fields and shared HOH/QSS PDF name field. It requires a
2023/2024 spouse death year, confirmed no remarriage, prior joint-return
eligibility, full-year home, more-than-half home cost, and retained record
references. The entered child SSN must match the review and differ from filer,
spouse, and dependent-row SSNs. A synthetic W-2 return passed local TY2025v5.4
XSD and filled-PDF text checks; native and PDF builds reject changed or
omitted child identity. The five nearby Form 1040/general files passed
183/183, and the three QSS tests passed again after the final status assertion;
format and lint passed. Source authenticity, other QSS exceptions, current-head bulk
testing, IRS business rules, and ATS acceptance remain open.

## QSS two-page selected packet review (2026-10-04)

The new `qss-w2-nonclaimed-joint-return-child` fixture passed its local
TY2025v5.4 XML/XSD test and was generated through the real graph, native MeF,
and filled-PDF builder. The selected artifact is at
`.state/research/ty2025-filled-pdf-review/2026-10-04-qss-joint-return-child-0454714c/`.
Both rendered Form 1040 pages were inspected: page 1 checks QSS, prints Avery
Child in the shared HOH/QSS name line, leaves dependent rows empty, and shows
$75,000 W-2 wages; page 2 shows a $31,500 deduction, $4,746 tax, $11,000
withholding, and $6,254 refund. These values and the qualifying-person
name/SSN match the retained source, pending Form 1040, and local XSD-valid
native XML. The completed selected-scope manifest passed the read-only
checker for **1 case and 2 pages**, including exact source/PDF/XML hashes and
page origins; manifest SHA-256 is
`162b0a9666b53391d0e1f8ffc341997f4c65a144ca659bca5df83667c85b1c0e`.
The planner now has 181 fixtures and 85/113 distinct registered PDF keys.
Remaining fixture pages, uncovered keys, source authenticity, current-head
bulk testing, and IRS ATS remain open.

## HOH two-page selected packet review (2026-10-04)

The `hoh-w2-nonclaimed-custodial-release-child` fixture passed local
TY2025v5.4 XML/XSD and was generated through the real graph, native MeF, and
filled-PDF builder. The selected artifact is at
`.state/research/ty2025-filled-pdf-review/2026-10-04-hoh-custodial-release-child-5c22a5b9/`.
Both rendered Form 1040 pages were inspected: page 1 checks HOH, prints Avery
Child in the shared HOH/QSS line, leaves dependent rows empty, and shows
$75,000 W-2 wages; page 2 checks the EIC opt-out and shows a $23,625 deduction,
$5,825 tax, $11,000 withholding, and $5,175 refund. These values and the
qualifying-child name/SSN match source, pending Form 1040, and local XSD-valid
native XML. The completed selected-scope manifest passed the read-only
checker for **1 case and 2 pages**, including exact source/PDF/XML hashes and
page origins; manifest SHA-256 is
`2d81b4815e773e59abd057ee28918fd5f0269c86a82fc0f52066305f013a0c73`.
The planner now has 182 fixtures and 85/113 distinct registered PDF keys.
Remaining fixture pages, uncovered keys, source authenticity, current-head
bulk testing, and IRS ATS remain open.

## PR-ready current-code regression gate (2026-10-04)

`PATH=/tmp/opentax-tools:$PATH deno task test` passed **11,111/11,111** with
zero failures on code commit `8f8ced89` in 53m4s. The run included both new
QSS and HOH child source-to-native-XML/PDF fixtures. Its log is
`/tmp/opentax-pr62-hoh-qss-final-test.log` (SHA-256
`6c0a96b774dac03c9bf9eab2e4d0fe66cba9bb3e98b80c1cceee480c3a2b32e5`).
The selected packet reviews passed separately. This local regression result
does not establish complete form coverage, every-page PDF review, or IRS ATS
acceptance.

## Form 8880 filing-page correction and selected review (2026-10-04)

The existing `single-form8880-w2-deferral` fixture initially produced five
filled pages: two Form 1040 pages, Schedule 3, Form 8880, and the IRS Form
8880 instructions page. The Form 8880 PDF descriptor now selects only its
filing page. A regenerated packet has four pages, and rendered pages 1–4 are
pixel-identical to the corresponding pages before the correction. All four
retained pages were visually inspected for owner, year, amounts, checkboxes,
order, clipping, and legibility. The W-2 code D $2,000 deferral yields a
$1,000 tentative credit limited to $428 on Form 8880 line 11; line 12,
Schedule 3 line 4, and Form 1040 line 20 each show $428. Form 1040 reports
$20,000 wages, $500 withholding, and a $500 refund.

The completed selected-scope packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8880-fixed/`;
its manifest SHA-256 is
`74e7e393bb2265d06b9243a32c0367aed900e547d755128e475272370525655e`.
The read-only checker passed **1 case / 4 pages**, including source replay,
exact PDF/XML artifact hashes, page origins, and local TY2025v5.4 XSD.
Sixty-six focused Form 8880 and PDF-builder tests passed. The earlier full
suite was stopped after this PDF issue was identified; a post-fix full run
was started separately. This review covers the selected synthetic route, not
issuer authenticity, the remaining Form 8880 branches, IRS business rules,
or ATS acceptance.

## Form 8863 lifetime-learning selected packet (2026-10-04)

The existing `single-form8863-lifetime-learning-scholarship` source fixture
generated a five-page Form 1040, Schedule 3, and Form 8863 packet. All pages
were rendered and visually checked for owner, year, amounts, checkboxes,
continuation, order, and clipping. The workpaper's $8,000 tuition plus $500
required institution materials less a $1,000 scholarship yields $7,500
adjusted LLC expenses. Form 8863 Parts II/III show the $1,500 nonrefundable
credit, Student Test, Test University, EIN, and current-year Form 1098-T answer;
Schedule 3 line 3 and Form 1040 line 20 each show $1,500. Form 1040 also
reconciles $75,000 wages, $7,955 tax before credit, $11,000 withholding, and
the $4,545 refund.

The selected packet and completed manifest are under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8863/`; manifest
SHA-256 is
`7c9a0a85d3193a90994d00604abe7177bc5b83bf45018adcd5f0fe2e925d72f0`.
The read-only checker passed **1 case / 5 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Other education-credit
variants, issuer authenticity, IRS business rules, and ATS acceptance remain
open.

## Form 6198 two-activity selected packet (2026-10-04)

The existing `single-two-at-risk-business-losses` fixture generated 16 filled
pages: Form 1040, Schedules 1/2/SE, three Schedule C copies, and two Form
6198 copies. Every page was rendered and visually checked for identity,
amounts, marks, copy and page order, and clipping. North and South Schedule C
copies show $2,000 and $3,000 losses; their separate Form 6198 copies show
$500 and $900 at-risk amounts and deductible losses. A third Schedule C has
$3,000 profit, leaving $1,600 on Schedule 1 line 3. Schedule SE and Schedule
2 show $226 self-employment tax, Schedule 1 deducts $113, and Form 1040
reports $6,487 AGI and $226 due. These values agree with the retained source,
pending graph, and native XML.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form6198/`; its manifest
SHA-256 is
`90abdb94a5a80b84bc38d6e814c3e511cb5ee31bac828b486af1c46786817469`.
The read-only checker passed **1 case / 16 pages**, including source replay,
artifact hashes, exact page origins, and local TY2025v5.4 XSD. Other Form
6198 activity types, detailed basis, carryforwards, issuer authenticity,
IRS business rules, and ATS acceptance remain open.

## Form 7206 health-plan selected packet (2026-10-04)

The existing `single-form7206-schedule-c-health-plan` fixture generated 12
filled pages: Form 1040, Schedules 1/2/C/SE, Form 7206, and Form 8995. Every
page was rendered and visually checked for identity, amounts, boxes, page
order, and clipping. Twelve sourced $1,000 premium months produce Form 7206
line 14 and Schedule 1 line 17 of $12,000. Schedule C has $50,000 profit;
Schedule SE shows $7,065 tax and a $3,532 deduction. Form 8995 uses $34,468
QBI after the health-plan and half-SE-tax deductions, and its $3,744 deduction
agrees with Form 1040 line 13a. Form 1040 reports $34,468 AGI and $8,624 due.
The retained source, pending graph, and native XML agree with the filled pages.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form7206/`; its manifest
SHA-256 is
`fde7162119a14e5ea21e4158e3a2641bf831f310f008614debde79ff156ac902`.
The read-only checker passed **1 case / 12 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Other Form 7206
plans, owner combinations, source authenticity, IRS business rules, and ATS
acceptance remain open.

## Form 4136 fuel-credit and excess-SS selected packet (2026-10-04)

The existing `single-excess-social-security-plus-fuel-credit` fixture
generated seven pages: Form 1040, Schedule 3, and the four-page Form 4136.
Every page was rendered and visually checked for identity, amounts, marks,
order, and clipping. Two distinct employers produce $1,482 excess Social
Security withholding on Schedule 3 line 11. The farm source has 1,000
off-highway gasoline gallons at $0.183 and 1,000 farm-use undyed-diesel
gallons at $0.243, producing Form 4136 credits of $183 and $243 and a $426
line-17 total. Schedule 3 lines 12/15 carry $426/$1,908; Form 1040 line 31
shows $1,908 and line 37 shows $35,159 owed against $37,067 tax. The retained
sources, native XML, and packet agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form4136/`; manifest
SHA-256 is
`35cd30ffa3d07ff2fd989be904997afa741829efaae311cec2a5b11397af8763`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Fuel purchase/usage
and employer-copy authenticity, other fuel categories, IRS business rules,
and ATS acceptance remain open.

## Paired HSA current-excess selected packet (2026-10-04)

The new retained `joint-other-coverage-hsa-current-excess` fixture extends the
PDF review inventory to **183** cases. Its eleven-page packet contains Form
1040, Schedules 1/2, taxpayer Form 5329, and two owner-specific Forms 8889.
Every page was rendered and visually checked for owner, year, amounts, marks,
copy/order, and clipping. Alex's Form 8889 deducts $2,000 and Sam's deducts
$6,000; Schedule 1 and Form 1040 line 10 each show $8,000. Alex's Form 5329
Part VII lines 47/48 each print $1,000 current excess and line 49 prints $60;
Schedule 2 line 8 and Form 1040 line 23 show $60. Form 1040 reports $82,000
AGI, $5,646 total tax, $12,000 withholding, and a $6,354 refund. The retained
source and native XML agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form5329-hsa-retained/`;
manifest SHA-256 is
`817562eaf49f9d3342aef2e078e39fd0af31a1d6ac34716aa782bcda9d1bf86b`.
The read-only checker passed **1 case / 11 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD; its focused
review-fixture XSD test passed. The full suite already in progress began with
the preceding 182-case inventory. Insurance/allocation and account-value
source authentication, other HSA routes, IRS business rules, and ATS acceptance
remain open.

## Form 8815 savings-bond selected packet (2026-10-04)

The existing `single-form8815-series-ee-bond-exclusion` fixture generated four
filled pages: Form 1040, Schedule B, and Form 8815. Every page was rendered and
visually checked for owner, amounts, answers, page order, and clipping. The
synthetic 1099-INT reports $2,000 Series EE interest; Form 8815 shows $15,000
qualified expenses, $12,000 bond proceeds, $72,000 modified AGI, and the full
$2,000 exclusion. Schedule B shows $2,000 gross interest and its $2,000
exclusion, leaving zero taxable interest. Form 1040 retains $70,000 wages and
AGI, $7,000 withholding, and a $145 refund. These values agree with retained
source, pending data, and native XML.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8815/`; its manifest
SHA-256 is
`46a9ff20644fc4dc74976eeb8d02c98f354ac225b38a61e81c660b4caa16da67`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Other bond and
expense combinations, issuer authenticity, IRS business rules, and ATS
acceptance remain open.

## Form 5329 early-distribution PDF repair (2026-10-04)

The existing `single-form5329-two-early-ira-distributions` fixture exposed
stale PDF field positions: its $10,000 distribution appeared in the stand-alone
address area while Part I was blank, although native XML, Schedule 2, and Form
1040 carried the $1,000 additional tax. The 2025 IRS AcroForm field positions
were checked against the rendered template. The PDF descriptor now places Part
I lines 1–4, Part II lines 5–8, and HSA Part VII lines 42–49 in their actual
fields, with calculated Part I/II lines printed. Positive excess-contribution
Parts III–VI/VIII now stop PDF export until their prior/current-year worksheet
sources can support complete printed lines.

The corrected seven-page packet was rendered and visually checked for year,
owner, amounts, marks, page order, and clipping. Form 5329 Part I lines 1 and
3 each show $10,000, line 4 shows $1,000, and its stand-alone address remains
blank. Schedule 2 line 8 and Form 1040 line 23 each show $1,000; the retained
source has two $4,000/$6,000 owner-matched 1099-R distributions. The selected
packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form5329-fixed/`;
manifest SHA-256 is
`55e40f033edf63f495fb1266bf52ca6672ef2001a51a472ade389a26e7901fbf`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. After the additional
excess-IRA worksheet guard regression, 19 focused PDF/MeF/XSD tests passed
with read, write, and `xmllint` run permissions and none were ignored. Other Form 5329 source shapes, excess
contribution worksheets, full visual review, IRS rules, and ATS remain open.

## Form 2106 fee-basis employee selected packet (2026-10-04)

The existing `single-fee-basis-employee-expenses` fixture generated six pages:
Form 1040, Schedule 1, and the two-page Form 2106. All pages were rendered and
visually checked for year, owner, amounts, marks, order, and clipping. Form 2106
identifies one county hearing officer and prints $1,200 unreimbursed business
expense on lines 4, 6, 8, 9, and 10. Schedule 1 line 12/26 and Form 1040 line
10 each show $1,200; $50,000 W-2 wages yield $48,800 AGI, $3,731 tax, and a
$3,269 refund after $7,000 withholding. Source, native XML, and the packet
agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form2106/`; manifest
SHA-256 is
`2976a6be11a01c273b1f2d66c3a419ecf27f75cd74fdde2e9dfe8c43d781b4e9`.
The read-only checker passed **1 case / 6 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Other Form 2106 job,
expense, reimbursement, and vehicle branches, source authenticity, IRS business
rules, and ATS acceptance remain open.

## Form 8936 new clean-vehicle selected packet (2026-10-04)

The existing `single-new-clean-vehicle-personal-credit` fixture generated
seven pages: Form 1040, Schedule 3, one Form 8936 parent, and one three-page
Schedule A copy. Every page was rendered and visually checked for owner,
year, amounts, marks, copy/order, and clipping. The Schedule A identifies the
2025 Example EV and source VIN, September 30 service date, no dealer transfer,
and the new-vehicle eligibility answers. Its $7,500 tentative personal credit
reaches Form 8936 line 9, where $3,875 Form 1040 tax limits the filed credit
on line 13. Schedule 3 line 6f and Form 1040 line 20 each show $3,875; the
$7,000 W-2 withholding is refunded against zero net tax. Source, native XML,
and the packet agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8936/`; manifest
SHA-256 is
`97ebfe94fc7e8836742f6308bb435bc2253272c3c2cbdaf83bbdd5cf7560dc54`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Seller-report/VIN
authenticity, other vehicle and transfer routes, IRS business rules, and ATS
acceptance remain open.

## Form 8911 home-charger selected packet (2026-10-04)

The existing `single-personal-home-charger-credit` fixture generated seven
pages: Form 1040, Schedule 3, Form 6251, Form 8911, and its Schedule A. Every
page was rendered and visually checked for owner, form revision, amounts,
marks, order, and clipping. The one main-home charger has a $1,000 cost,
May 2025 construction date, June 2025 placed-in-service date, eligible-census-
tract answer, and 11-digit GEOID. Schedule A line 21 and Form 8911 lines 4/10
show a $300 personal credit; Schedule 3 line 6j and Form 1040 line 20 agree.
Form 1040 reports $50,000 wages, $3,875 tax before credit, $7,000 withholding,
and a $3,425 refund. Retained source, native XML, and the packet agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8911/`; manifest
SHA-256 is
`1a8c98bb480d2343bb8caf3df003c0487ebcb100f96d6e32f445099f7d2b353b`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Address/tract and
purchase evidence, other ownership or business-use branches, IRS business
rules, and ATS acceptance remain open.

## Form 8882 childcare-credit selected packet (2026-10-04)

The existing `single-employer-childcare-facility-and-referral-credit` fixture
generated 17 pages: Form 1040, Schedule 3, Schedule C, all nine Form 3800
pages, two Form 6251 pages, and the single filing page of Form 8882. Every
page was rendered and visually checked for identity, amounts, marks, order,
and clipping. Form 8882 shows $40,000 qualified facility expense at 25% and
$10,000 referral expense at 10%, yielding an $11,000 tentative credit. Form
3800 Part III line 1k limits the current-year amount to $9,573; Schedule 3
line 6a and Form 1040 line 20 each show $9,573. Schedule C prints $30,000
facility and $9,000 referral expenses after the $11,000 credit reduction,
against $39,000 receipts, leaving zero profit. Native XML and retained source
agree with the packet.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8882/`; manifest
SHA-256 is
`eb0233d809671519c9f9fdfb058f8d6a57ce8636631bbf164b4793a17ecefa58`.
The read-only checker passed **1 case / 17 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Facility and
contract evidence, other credit-source combinations, IRS business rules, and
ATS acceptance remain open.

## Form 5884 work-opportunity-credit selected packet (2026-10-04)

The existing `single-certified-work-opportunity-credit` fixture generated 17
pages: Form 1040, Schedule 3, Schedule C, all nine Form 3800 pages, Form 5884,
and Form 6251. Every page was rendered and visually checked for identity,
amounts, marks, order, and clipping. A certified employee's $6,000 qualifying
first-year wages at 40% produce $2,400 on Form 5884 lines 1b/2/4 and Form
3800 Part III line 4b. Schedule C line 26 prints $3,600 wages after the
$2,400 credit reduction, against $3,600 gross receipts, leaving zero business
profit. Form 3800 allows the full $2,400 credit under its $9,573 limitation;
Schedule 3 line 6a and Form 1040 line 20 show $2,400. Form 6251 shows $8,294
tentative minimum tax below $17,867 regular tax, with zero AMT. Retained
source, native XML, and the packet agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form5884/`; manifest
SHA-256 is
`b23f2b5bb0ec6b7084e08e570673fea219436444922b3bd5c3d251c87ecc18c5`.
The read-only checker passed **1 case / 17 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. State certification
and payroll bytes, other WOTC target groups and business combinations, IRS
business rules, and ATS acceptance remain open.

## Form 8834 passive electric-vehicle credit selected packet (2026-10-04)

The existing `single-passive-electric-vehicle-credit` fixture generated six
pages: Form 1040, Schedule 3, Form 6251, and Form 8834. All pages were rendered
and visually checked for owner, year or form revision, amounts, marks, order,
and clipping. Form 8834's retained $450 passive-activity credit is below the
$3,875 regular-tax limit with zero tentative minimum tax; line 7, Schedule 3
line 6i, and Form 1040 line 20 each show $450. Form 1040 reports $50,000 wages,
$7,000 withholding, $3,425 net tax, and a $3,575 refund. The retained source,
native XML, and packet agree.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8834/`; manifest
SHA-256 is
`d5bae97961498eaddc8d832a96d60276babbdb49a6d52888626cd42f5838afdb`.
The read-only checker passed **1 case / 6 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Prior passive-credit
source authenticity, wider Form 8582-CR combinations and credit ordering, IRS
business rules, and ATS acceptance remain open.

## Form 8859 DC homebuyer credit selected packet (2026-10-04)

The existing `single-dc-homebuyer-credit-carryforward` fixture generated four
pages: Form 1040, Schedule 3, and Form 8859. Every page was rendered and
visually checked for owner, year, amounts, marks, order, and clipping. Form
8859 shows a $1,200 prior-year carryforward, $3,875 tax-liability limit, and
$1,200 current credit; zero remains for 2026. Schedule 3 line 6h and Form
1040 line 20 each show $1,200. The $50,000 W-2 income, $7,000 withholding,
$2,675 net tax, and $4,325 refund reconcile to the retained source and native
XML.

The completed selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8859/`; manifest
SHA-256 is
`a08e51ec790e7287a2125c3b5444f6117ef22d3ffe6a294731680a62bf1a83eb`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Prior filed-return
authenticity, other carryforward amounts and credit ordering, IRS business
rules, and ATS acceptance remain open.

## Fully repaid unemployment selected packet (2026-10-04)

The existing `single-fully-repaid-unemployment` source has a $5,000 2025
Form 1099-G unemployment payment and an equal current-year repayment. Its
four-page packet prints Form 1040 and both Schedule 1 pages. Schedule 1 line 7
marks the repayment checkbox and prints $5,000 beside the repayment prompt;
the net line 7 and total additional income are zero in pending data and native
XML and are blank in the filled PDF. Form 1040 carries $75,000 W-2 wages and
AGI, $7,955 tax, $11,000 withholding, and a $3,045 refund. All four pages
were rendered and inspected for identity, year, amounts, checkbox, order, and
clipping against the retained source and native XML.

The selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-fully-repaid-unemployment/`;
manifest SHA-256 is
`79710eecc8071a9543170b21450b07617da0143f70ec88801fd57362a8f4c0d0`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Issued 1099-G and
repayment-record authenticity, other repayment amounts and tax interactions,
IRS business rules, and ATS acceptance remain open.

## Full test baseline after Form 5329 PDF repair (2026-10-04)

At `a75f0bca`, `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test`
completed with **11,112 passed, 0 failed, 0 ignored** in 53m24s (log created
15:11:09 and modified 16:04:59 CEST). Deno was 2.9.4, V8
15.0.245.2-rusty, and TypeScript 6.0.3. The retained log is
`.state/research/ty2025-full-test-a75f0bca-form5329-2026-10-04.log`, SHA-256
`484d171751027fc1832b88db4768916eb6e4a2a5855024ae7cab1a0692a357b3`.
No failed or ignored summary was reported. The run started before the
`joint-other-coverage-hsa-current-excess` fixture and the additional Form 5329
excess-IRA guard regression were added. Those passed separately in the focused
fixture and 19-test Form 5329 PDF/MeF/XSD checks. This local
baseline does not close visual-route, IRS business-rule, or ATS gates.

## Five-dependent continuation selected packet (2026-10-04)

The existing `single-five-dependent-continuation` source generated five
pages: Form 1040 pages 1–2, one dependent-continuation statement, and Schedule
8812 pages 1–2. Alex's U.S. main-home and more-than-four-dependents boxes are
marked. Jamie, Casey, Riley, and Morgan print in the four Form 1040 columns;
Taylor's full name, TIN, daughter relationship, residence and other-dependent
credit designation print on the continuation. The native XML has five matching
dependent records and the overflow indicator. Schedule 8812 shows five other
dependents and a $2,500 line 14 credit, matching Form 1040 line 19. The
remaining Form 1040 totals are $80,000 wages/AGI, $9,055 tax before credits,
$6,555 final tax, $12,000 withholding, and a $5,445 refund. All five pages
were rendered and inspected for year, owner, amounts, marks, order, and
clipping against source and XML.

The selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-five-dependent/`;
manifest SHA-256 is
`d3e688e4a38549108cea52f89045e44566792dc0fdc7790c0085e711c3715836`.
The read-only checker passed **1 case / 5 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Dependent identity,
residence, and support evidence, wider credit combinations, IRS business
rules, complete PDF review, and ATS acceptance remain open.

## Form 2439 undistributed gain selected packet (2026-10-04)

The existing `single-form2439-undistributed-gain-and-tax-credit` source
generated six pages: Form 1040, Schedule 3, both Schedule D pages, and payer
Form 2439 Copy B. The Copy B prints Example Growth Fund's EIN/address and Alex
Example's SSN/address, $10,000 undistributed long-term gain in box 1a, and
$1,500 tax paid in box 2. Schedule D lines 11/15/16 carry the $10,000 gain;
Schedule 3 lines 13a/14/15, Form 1040 line 31, and the native XML carry the
$1,500 payment once. With zero taxable income, Form 1040 refunds $1,500. All
six pages were rendered and checked for identity, amounts, marks, page order,
and clipping against source and XML.

The selected packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form2439/`; manifest
SHA-256 is
`ac7f535dc85879d132f249f971b2e2d28edbdd6afb37f17bae84b4b0fd3f192b`.
The read-only checker passed **1 case / 6 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Payer-issued Copy B
authenticity, other Form 2439 fields and duplicate/corrected records, IRS
business rules, complete PDF review, and ATS acceptance remain open.

## Withheld W-2G fixture evidence boundary (2026-10-04)

The existing `single-withheld-w2g` fixture has $10,000 reported winnings and
$2,400 withholding but does not provide the exact issuer Copy B PDF bytes.
A selected generator attempt stopped at `buildMefBundle` with `W-2G payer copy
content needs its exact attached PDF`, before XML/PDF output or a review
manifest was produced. The incomplete empty output directory was removed.
The existing `assertW2GPayerCopyContents` gate compares every modeled readable
Copy B field against the attached bytes; passing a synthetic projection in its
place would not establish issued-copy evidence. This fixture remains outside
the exportable selected review set, and no page or XSD pass is claimed for it.

## Schedule H three-state FUTA selected packet (2026-10-04)

The existing `single-schedule-h-three-state-futa` fixture exposed a filled-PDF
checkbox error: its initial packet printed line 9 No despite a true quarterly
threshold, and omitted the applicable Box B/C answers. The TY2025 AcroForm
places Box C Yes at `c1_3[1]` and line 9 No at `c1_4[1]`. The descriptor now
prints Box A No, Box B No, Box C Yes, and leaves Part I lines 1–9 blank when
Box C directs the filer to line 10. Seven focused Schedule H PDF tests pass.

The corrected seven-page packet prints $1,000 state wages and $30 contributions
for OH and NY on Schedule H line 17, with PA on the attached continuation.
Line 18 totals $90 contributions; lines 20/21/22/23/24 print
$3,000/$180/$162/$90/$90. Line 25 is zero, line 26 is $90, Schedule 2 line 9
is $90, and Form 1040 shows $90 tax and amount owed. Native XML includes all
three state rows and the same amounts. All pages were rendered and checked for
identity, amount, marks, page order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-h-three-state-final/`;
manifest SHA-256 is
`c07d5ba6c70d97e928f060467e0f3c8f86cf29486f1d0a11c8ea8c69befa83ae`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The earlier packets
remain private discrepancy evidence and are not counted as reviewed. State
source bytes, wider payroll and state/rate combinations, complete PDF review,
IRS business rules, and ATS acceptance remain open.

## Schedule H FICA plus FUTA selected packet (2026-10-04)

The new `single-schedule-h-fica-and-futa` fixture raises the filled-PDF
inventory to **184** sources, still covering 85 of 113 unique PDF keys. It
retains one unrelated adult employee's $3,100 cash payroll and matching W-2
box 3/5 references. The six-page full return prints Schedule H Box A Yes,
leaves Boxes B/C blank, computes $384 Social Security plus $90 Medicare on
Part I lines 2/4, and marks line 9 Yes. Ohio Section A shows $3,100 FUTA wages
and $19 line 16 FUTA. Schedule H lines 25/26 are $474/$493; Schedule 2 line 9
and Form 1040 tax/amount owed are $493. All six pages were rendered and checked
for identity, amount, marks, page order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-h-fica-futa/`;
manifest SHA-256 is
`5babf0015fdf08357035ddb10bd2a8b07175ed027ffc8b4c2a1501c78643cf49`.
The read-only checker passed **1 case / 6 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Payroll/W-2 and state
source bytes, wider household cases, IRS business rules, complete PDF review,
and ATS acceptance remain open.

## Schedule H spouse withholding selected packet (2026-10-04)

The new `joint-schedule-h-spouse-withholding-only` fixture raises the current
filled-PDF inventory to **185** sources, still covering 85 of 113 PDF keys. It
retains reviewed marriage, W-4, payroll, and W-2 references for Sam, the joint
filer's spouse, with $5,000 wages and $250 withholding. The initial six-page
packet exposed a printed zero on Schedule H line 6 even though Box B Yes says
to skip to line 7, and it retained a blank second page after line 9 No says
to stop. The corrected five-page packet prints Box A No/B Yes/C blank, lines
1–6 blank, lines 7/8 $250, and line 9 No on its sole Schedule H page. Form
1040 lines 1a/25a carry Sam's $5,000/$250 once; Schedule 2 line 9 and Form
1040 tax are $250, offset by the same withholding. All five pages were
rendered and checked against source and native XML for identity, amounts,
marks, page order, and clipping.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-h-spouse-withholding-fixed/`;
manifest SHA-256 is
`3c316b8ca52e61ea204c7aa29f9cb4b23b50896df11a0cf23b7dd33b6bb3d9cb`.
The read-only checker passed **1 case / 5 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Nine focused
Schedule H tests passed. Marriage, W-4/W-2, and payroll source bytes, wider
family cases, IRS business rules, complete PDF review, and ATS remain open.

## Three-child Schedule EIC selected packet (2026-10-04)

The existing `single-w2-three-eic-children-with-reviewed-birth` fixture
generated a three-page Form 1040 and Schedule EIC packet. Ada, Ben, and Cora
print in distinct dependent and Schedule EIC columns with matching names,
SSNs, relationships, and 2017/2020/2025 birth years. Schedule EIC line 6
prints 12/8/12 U.S. months; Cora's source records one actual December month
plus a reviewed from-birth U.S. home, which the native XML projects as 12 under
the birth-year instruction. The native XML has three matching child groups.
Form 1040 carries $15,000 wages, $6,761 EIC, $1,500 W-2 withholding, and an
$8,261 refund. All three pages were rendered and checked for identity,
amounts, marks, page order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-three-eic-children/`;
manifest SHA-256 is
`8994558565e550ad3d188a5efaa157994d30529e273471f795131af51cb7830f`.
The read-only checker passed **1 case / 3 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. External birth and
residence evidence, wider EIC eligibility, complete PDF review, IRS business
rules, and ATS acceptance remain open.

## Joint Schedule LEP selected packet (2026-10-04)

The existing `joint-two-w2s-schedule-lep` fixture generated four filled pages:
Form 1040 and separate Schedule LEP copies for Alex and Sam. The first LEP
page prints Alex Example/111223333 and marks Spanish code 001; the second
prints Sam Example/444556666 and marks French code 011, without copying the
other owner's identity or language selection. Two owner-specific W-2s produce
$70,000 Form 1040 wages, $6,500 withholding, $4,146 tax, and a $2,354 refund.
Native XML carries two LEP documents with the same owner and code pairing.
All four pages were rendered and checked for identity, marks, amounts, page
order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-joint-lep/`; manifest
SHA-256 is
`9f86033a99d9bd7a58e8935ac5d640e4e434448794fe4cec343f5573f63a7cb3`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Prior language
elections and authenticated request records, other owner combinations, IRS
business rules, complete PDF review, and ATS acceptance remain open.

## Intermediate full batch after HSA and Form 5329 additions (2026-10-04)

At `a75f0bca` with local changes, the exact
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` command passed
**11,114 tests, zero failed and zero ignored** in 53m43s (log created 16:06:48
and modified 17:00:35 CEST). Deno was 2.9.4 (V8 15.0.245.2-rusty,
TypeScript 6.0.3), `xmllint` used libxml 2.9.13, and Poppler `pdftotext` was
26.09.0. The private log is
`.state/research/ty2025-full-test-a75f0bca-hsa-f5329-current-2026-10-04.log`,
SHA-256 `c795e1c25ea87acc702cdd31a5433fed1968e1e489915ae657c62c4074565ae4`.
This run included the paired HSA fixture and Form 5329 excess-IRA regression,
but it began before the subsequent Schedule H checkbox/page-routing edits and
two new Schedule H filled-PDF fixtures. It is an intermediate local pass, not a
current-worktree gate result. A new exact full command is running against the
185-fixture code state; its result will be recorded separately. Complete route
coverage, IRS business rules, manual PDF review, and ATS acceptance remain open.

## Joint Form 9000 selected packet (2026-10-04)

The existing `joint-two-w2s-form9000` fixture generated four filled pages:
Form 1040 and separate Form 9000 copies for Alex and Sam. The first Form 9000
prints Alex Example/111223333 and marks Large Print code 01; the second
prints Sam Example/444556666 and marks Braille Ready File code 05, without
copying the other owner's identity or choice. Both attached copies correctly
leave address and signature fields reserved for a standalone Form 9000 blank.
Two owner-specific W-2s produce $70,000 Form 1040 wages, $6,500 withholding,
$4,146 tax, and a $2,354 refund. Native XML carries two Form 9000 documents
with the same owner and code pairing. All four pages were rendered and checked
for identity, marks, amounts, page order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-joint-form9000/`;
manifest SHA-256 is
`ae32289f758d206d48169f62ab57a39d1406f63f6fbc5cb64575f250422381e7`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Prior alternative-
media elections and authenticated request records, other owner combinations,
IRS business rules, complete PDF review, and ATS acceptance remain open.

## Restored HOH and QSS nonclaimed-child selected packet (2026-10-04)

The earlier HOH/QSS review was documented against private artifact directories
that are not present in the current workspace. A fresh selected packet now
retains both fixtures under
`.state/research/ty2025-filled-pdf-review/2026-10-04-hoh-qss-restored/`.
Each two-page Form 1040 prints Avery Child in the nonclaimed HOH/QSS
qualifying-person name field while leaving dependent rows blank. The native
XML carries the matching qualifying-person SSN 444556666 and filing-status
codes 4/5. Both returns have $75,000 W-2 wages and $11,000 withholding; HOH
prints $23,625 standard deduction, $5,825 tax, and $5,175 refund, while QSS
prints $31,500, $4,746, and $6,254. All four pages were rendered and checked
for identity, status marks, amounts, page order, and clipping against source
and XML.

Manifest SHA-256 is
`e8088c66a20bbb38a4464e2afdbd0e5a078d8473dfdf501e08722a4baa1a1057`.
The read-only checker passed **2 cases / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Custody, residence,
death and prior-return source authenticity, wider filing-status cases, IRS
business rules, complete PDF review, and ATS acceptance remain open.

## Restored Schedule R disabled-worker selected packet (2026-10-04)

The earlier Schedule R review referenced a private artifact directory that is
not present in the current workspace. A fresh five-page selected packet is
under `.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-r-restored/`.
Form 1040 has $17,000 W-2 disability wages, $126 regular tax before credits,
a $38 Schedule 3 line 6d credit, $88 final tax, $1,700 withholding, and a
$1,612 refund. Schedule R page 1 checks the under-65 permanent-and-total-
disability box 2; page 2 prints $17,000 taxable disability income, the
$7,500 AGI threshold, $9,500 excess, $4,750 half-excess, $250 remaining
amount, and a $38 credit under the $126 tax limit. Native XML and Schedule 3
carry the same $38. All pages were rendered and checked for identity, marks,
amounts, page order, and clipping against source and XML.

Manifest SHA-256 is
`692208e957acd7c0bfea78bced50c1854aeb32c6dcc061e4761cd236cb726b4d`.
The read-only checker passed **1 case / 5 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Signed physician,
income, and eligibility source authenticity, other Schedule R paths, IRS
business rules, complete PDF review, and ATS acceptance remain open.

## Form 2441 child-care selected packet (2026-10-04)

The existing `single-form2441-child-care-credit` fixture generated four
pages: Form 1040, Schedule 3, and Form 2441. Care Center's EIN 123456789 and
Austin address print with $3,000 paid. Ada Example's qualifying-person row
shows SSN 111223334 and $3,000 expenses, matching her dependent identity.
Form 2441's $600 tentative credit is limited by $500 tax-liability input on
line 10, so line 11, Schedule 3 lines 2/8, and Form 1040 line 20 each show
$500. Form 1040 has $50,000 wages/AGI, $3,375 final tax, $5,000 withholding,
and a $1,625 refund. All pages were rendered and checked for identity,
amounts, marks, page order, and clipping against source and XML.

The reviewed packet is under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form2441-care/`;
manifest SHA-256 is
`44135d383b7ccdfd5368544efdf8650eb701f3163d999b2aeb2ffc319596a351`.
The read-only checker passed **1 case / 4 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Provider/payment
source authenticity, dependent-care benefits and multiple-person branches,
IRS business rules, complete PDF review, and ATS acceptance remain open.

## Retained PDF review artifact inventory checkpoint (2026-10-04)

A read-only comparison of the current 185-fixture planner with private
`review-manifest.json` files under
`.state/research/ty2025-filled-pdf-review/` found **90 distinct fixture IDs**
with every page-check flag completed and **95 without** such a current
manifest. Selecting one completed manifest per ID accounts for 428 reviewed
pages. This is a manifest-completion inventory, not an independent recheck of
all 90 packets: older completed manifests were not all rerun through the
read-only checker during this checkpoint. The fresh HOH/QSS, Schedule R, and
Form 2441 packets above did pass that checker. Some historically documented
review directories are absent from the current workspace, which is why their
fixtures were regenerated before counting them. Do not infer full-page review
or current artifact availability from an old prose claim alone.

## Core broker and tips selected packets (2026-10-04)

Three existing fixtures generated 24 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-core-three/`.
The direct/adjusted broker packet has five pages: Schedule D line 1a carries
the direct $1,000 gain, Form 8949 Box A and Schedule D line 1b carry the
adjusted ($200) result, and Form 1040 line 7a has the $800 net gain. The
seven-page employee-tips packet has Form 4137's $6,500 received/$5,000
reported/$1,500 unreported amounts, $115 tip tax on Schedule 2, and the
$6,500 deduction on Schedule 1-A and Form 1040. The twelve-page 1099-NEC
business packet has $18,000 receipts, $8,000 expenses, $10,000 Schedule C
profit, $1,413 Schedule SE tax, and a $9,294 Schedule 1-A deduction after
the $706 half-SE-tax adjustment. All 24 pages were rendered and checked
against the source and XML for owner, form/year, amounts, marks, order, and
clipping.

The manifest SHA-256 is
`9932fdf547f45703817f7b5c84ac0f0917145dcffcd345fa139881641ccdad8b`.
The read-only checker passed **3 cases / 24 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory checkpoint above becomes **93 distinct fixture IDs with completed
page flags, 92 without, and 452 pages** when these three fresh packets are
included; that remains a manifest-completion count, not a recheck of older
packets. Issued source authenticity, broader routes, complete PDF review,
IRS business rules, and ATS acceptance remain open.

## Two Form 8814 selected packets (2026-10-04)

The existing child-interest/dividend fixture generated seven pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8814-dividends/`.
Jamie Example's Form 8814 has $1,850 adjusted interest, $1,850 qualified and
ordinary dividends, $500 included dividends, $500 Schedule 1 line 8z income,
and $135 election tax. Its retained interest-adjustment statement lists
$120 nominee distribution, $30 accrued interest, $15 ABP, and $5 OID
adjustment. Form 1040 has $81,000 AGI and a $2,625 refund. The manifest
SHA-256 is
`e082ffd121d12ba7c636fd3d96fa187ed227e1ffe5414bd2671878530c78743f`.

The existing child-gain fixture generated nine pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8814-gain/`.
The parent's Form 8949 Box E $1,000 gain and Jamie's Form 8814 $179
capital-gain distribution join Schedule D and Form 1040 line 7a as $1,179;
line 7b marks and identifies the child amount. Form 8814 line 12 and Schedule
1 line 8z/statement carry $1,321 other income once. Form 1040 has $82,500 AGI
and a $2,347 refund. The manifest SHA-256 is
`9f97f3bc37ec50bee9343b54d980dfb93441ad69a0f3d8c8ea15ba86545e842d`.

All 16 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The read-only checker passed
both selected scopes, including source replay, artifact hashes, page origins,
and local TY2025v5.4 XSD. Adding these to the prior retained-artifact
inventory yields **95 distinct fixture IDs with completed page flags, 90
without, and 468 pages**. This is a manifest-completion count, not an
independent recheck of all older packets. Issuer/election source authenticity,
broader Form 8814 combinations, complete PDF review, IRS business rules,
and ATS acceptance remain open.

The same review attempt left two other existing fixtures guarded. The
`single-8862-ctc-reinstatement` packet cannot export without executor-owned
authentication of the prior IRS notice issuance and contents. The
`single-withheld-w2g` packet cannot export without the exact attached W-2G
payer-copy PDF. No source facts or attachment bytes were invented to bypass
these guards; both needs already sit in the existing source/statement task.

## Collectibles and trust K-1 selected packets (2026-10-04)

Three existing fixtures generated 15 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-capital-trust-three/`.
The collectible sale prints $5,000 proceeds, $2,000 basis, code C, and a
$3,000 gain on Form 8949 Box E; Schedule D lines 9/15/16/18 and Form 1040
line 7a carry the $3,000 once, with $1,835 tax and a $1,165 refund.
Family Trust EIN 123456789's box 5 $750 prints in Schedule E Part III
nonpassive column (f), lines 34a/35/37/41, Schedule 1 line 5, and Form 1040
line 8; that return has $30,750 AGI and a $1,435 refund. A separate trust
fixture has positive box 6/7/8 activity records of $300/$200/$100, totaling
$600 in Schedule E Part III passive column (d), lines 34a/35/37/41, Schedule
1 line 5, and Form 1040 line 8; that return has $30,600 AGI and a $1,453
refund.

All 15 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, and clipping. The manifest SHA-256 is
`84104744e55066524d4d7ffc8af9009338892c97b6656b1a720429a2df35745e`.
The read-only checker passed **3 cases / 15 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **98 distinct fixture IDs with completed page flags, 87
without, and 483 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Issued K-1 and sale proof, broader passive
and capital-gain cases, complete PDF review, IRS business rules, and ATS
acceptance remain open.

## HSA code 2 and paired-owner selected packets (2026-10-04)

Two existing fixtures generated 12 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-hsa-two/`.
The code 2 packet prints Alex Example's $5,200 contribution, $4,300
deduction, and $1,000 timely excess withdrawal on Form 8889 lines 14a/14b;
line 14c stays zero/blank. The 1099-SA box 2 $100 earnings print on Schedule
1 line 8z and its statement, then Form 1040 line 8 once. Form 1040 has
$70,800 AGI and a $3,969 refund. The joint packet prints Alex's $4,000 HSA
deduction with SSN 111223333 and Sam's $5,000 with SSN 444556666 on
separate self-only Form 8889 copies in that order. Schedule 1 line 13/26 and
Form 1040 line 10 carry the combined $9,000; Form 1040 has $81,000 AGI and
a $6,534 refund.

All 12 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`d2a7d91929baa1b0ee49b32eda9c2d063e42c3b08c44e65f2e9724748b0c4ab2`.
The read-only checker passed **2 cases / 12 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **100 distinct fixture IDs with completed page flags, 85
without, and 495 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Issued 1099-SA, contribution and coverage
proof, wider paired-owner paths, complete PDF review, IRS business rules,
and ATS acceptance remain open.

## Form 8283 Section A noncash gift selected packets (2026-10-04)

Four existing fixtures generated 19 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-noncash-gifts-four/`.
The ordinary used-books gift prints $1,800 basis, $1,200 FMV and claim,
$1,200 on Schedule A line 12, $37,200 itemized deductions, $8,736 tax,
and a $7,264 refund. The collectible coin prints $4,500 original FMV
less $1,500 appreciation under the 50% AGI election, leaving $3,000
basis and claim; Schedule A line 12 is $3,000, Form 1040 itemizes
$39,000, and the refund is $7,660. The donor-prepared manuscript prints
$1,000 FMV less $700 ordinary gain, a $300 basis/claim, $36,300 itemized
deductions, and a $7,066 refund. Two art-print rows A/B each print $1,000
FMV less $300 short-term appreciation and a $700 basis/claim; their
separate explanations link to the correct items, while Schedule A line 12
is $1,400, Form 1040 itemizes $37,400, and the refund is $7,308.

All 19 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`c18394f7b5a2a0d2976ff1c323edf4501402c0d20153340cc5c41723e8486a57`.
The read-only checker passed **4 cases / 19 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **104 distinct fixture IDs with completed page flags, 81
without, and 514 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Donee/property source authenticity, wider
charitable-gift cases, complete PDF review, IRS business rules, and ATS
acceptance remain open.

## Form 8396, Form 4835, Form 4136, and line 8z selected packets (2026-10-04)

Four existing fixtures generated 23 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-mixed-four/`.
Form 8396 prints Austin Housing Finance Corporation certificate
MCC-2025-101: $7,500 interest paid on a $125,000 mortgage, $100,000
certified principal, $6,000 allocable interest, and a 20%/$1,200 credit.
Schedule 3 line 6g and Form 1040 line 20 agree; the return has $3,875
final tax and a $1,125 refund. Form 4835 prints $8,000 crop-share income
and $1,000 feed expense; its $7,000 profit joins Schedule E lines 40/41,
Schedule 1 line 5/10, and Form 1040 line 8 once. Form 4136 prints Example
Farm's two separate 1,000-gallon claims, $183 and $243, totaling $426
on line 17, Schedule 3 line 12/15, and Form 1040 line 31; the refund is
$426. The mixed line 8z packet prints two substitute payments ($300 and
$450), RTAA ($400), and a taxable grant ($600) with distinct payer TINs
on a continuation statement; Schedule 1 line 8z and Form 1040 line 8
include $1,750 once, with $51,750 AGI and a $915 refund.

All 23 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`32c87336a1e184b1fb20a736bf338bc5dc806c89117695cecee9052443f5a1bf`.
The read-only checker passed **4 cases / 23 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **108 distinct fixture IDs with completed page flags, 77
without, and 537 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Source authenticity and wider branches,
complete PDF review, IRS business rules, and ATS acceptance remain open.

## Form 2555, 4562, 4952, and 6781 selected packets (2026-10-04)

Four existing fixtures generated 26 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-income-deduction-four/`.
Form 2555 identifies a Toronto employer and 365 physical-presence days;
$100,000 foreign wages on Form 1040 line 1h with FEC type are offset by
Schedule 1 line 8d's $100,000 exclusion, leaving zero AGI. Form 4562
prints a $30,000 computer-server Section 179 deduction under a $40,000
business-income limit; Schedule C's $30,000 receipts less $30,000 line 13
expense leave no business profit, and the return refunds $1,525. Form 4952
prints $900 investment interest expense, $900 investment income including
$100 qualified dividends, an $800 allowed deduction and $100 carryforward.
Schedule A adds $800 to $18,000 mortgage interest; Form 1040 selects the
$18,800 itemized amount, with $7,475 tax and a $3,525 refund. Form 6781
prints Broker A's $12,000 gain and Broker B's $2,000 loss, splitting the
$10,000 net into $4,000 short-term and $6,000 long-term Schedule D gains;
Form 1040 line 7a carries $10,000 once, with $9,735 tax and a $1,265
refund.

All 26 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`235c820a1b3000f2df9c1b9e42ab7ac47fb41ae6bea8380b73b0e687333d21e4`.
The read-only checker passed **4 cases / 26 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **112 distinct fixture IDs with completed page flags, 73
without, and 563 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Source authenticity and wider branches,
complete PDF review, IRS business rules, and ATS acceptance remain open.

## Form 4684 Section B PDF repair and selected packet (2026-10-04)

A three-case exploratory generator stopped at `single-form461-schedule-c-excess-business-loss`
because the existing Form 8995 gate requires a sourced net-QBI-loss carryforward
route. That generated directory is partial and is not counted. The existing
Forms 8995/8995-A board parent retains that filing gap; the guard was not bypassed.

A separate seven-page repaired case is retained under
`.state/research/ty2025-filled-pdf-review/2026-10-04-4684-repair/`.
The initial exploratory print had placed the business casualty's values in
Form 4684 personal-use Section A. The corrected PDF leaves Section A blank,
prints Workshop equipment in Section B with $50,000 basis, $80,000 FMV before,
$50,000 after, and $30,000 loss on lines 27/28/34/35/37, then ($30,000)
on line 38a. Form 4797 lines 14/17/18b, Schedule 1 line 4/10, and Form 1040
line 8 carry the loss once; Form 1040 has $20,000 AGI, $428 tax, and a $7,572
refund. Unused Ponzi and prior-year disaster pages are omitted. A changed
Form 4797 join rejects before PDF export; five focused descriptor tests pass.

All seven pages were rendered and checked for owner, form/year, amounts, marks,
order, and clipping. The manifest SHA-256 is
`c63f935f1003b34d408cd9c878c08b22e031ef197696968e8c0d4b3672700734`.
The read-only checker passed **1 case / 7 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD.

## Form 982 and Form 8919 selected packets (2026-10-04)

Two existing fixtures generated 12 pages under
`.state/research/ty2025-filled-pdf-review/2026-10-04-982-8919-fixed/`.
Form 982 checks qualified-principal-residence exclusion and prints $750,000
excluded from $900,000 discharged debt; Schedule 1 line 8c and Form 1040
line 8 include $150,000, with $25,067 tax owed. Form 8919 prints Employer
Inc reason G, its 1099-NEC mark and $210,000 wages, $26,100 remaining
Social Security wage base, and $4,663 tax on Schedule 2 line 6. Form 8959
adds $1,440 Additional Medicare Tax on line 11; Schedule 2 totals $6,103,
Form 1040 reports $360,000 AGI, $96,138 total tax, $20,000 withholding,
and $76,138 owed. Form 8960 has zero investment income and zero NIIT.

All 12 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`38414441e910b826e62b30dda4f38c1c003e0dc4aa5f50d997b0726c676a66f0`.
The read-only checker passed **2 cases / 12 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **115 distinct fixture IDs with completed page flags, 70
without, and 582 pages**. This remains a manifest-completion count rather
than a recheck of older packets. Lender, employer, and casualty source
authenticity, wider branches, complete PDF review, IRS business rules, and
ATS acceptance remain open.

## Full batch before Form 4684 PDF repair (2026-10-04)

`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` on `a75f0bca`
with local worktree changes finished at approximately 2026-10-04 15:57:37
UTC: **11,116 passed, zero failed, zero ignored**, in 53m19s. Deno was 2.9.4
(aarch64-apple-darwin), V8 15.0.245.2-rusty, TypeScript 6.0.3, and Poppler
`pdftoppm` 26.09.0. The log is
`.state/research/ty2025-full-test-a75f0bca-schedule-h-185-2026-10-04.log`
with SHA-256
`c7d6c024a9a700be8a2ad2dd9b9ba528e213ef974978edae1119160fc592ebf0`.
This run started before the Form 4684 PDF correction. A corrected-source
full `deno task test` run stopped near the end amid disk pressure, with only
114 MiB reported free and no valid final suite summary. Its retained log is
`.state/research/ty2025-full-test-a75f0bca-form4684-repair-2026-10-04.log`
(SHA-256 `ea451011b5afa4469b9ac34e0e7fd9b03253a1f19fbc2f67513318ca3e32eed9`).
After restoring disk space, the same 18-case XSD file passed 18/18 with zero
failures using the suite's Deno permissions. That focused log is
`.state/research/ty2025-xsd-focused-pr-2026-10-04.log`
(SHA-256 `4a2a50aaf4c7fab2343c7e4793873398c6e62263a1b1483b0225773c874a2fc9`).
A clean corrected-source full batch remains open. Passing local tests do not establish route
completeness, IRS business-rule approval, or ATS acceptance.

## Property and distribution selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-property-distribution-four/`
contains four existing fixtures and 33 rendered pages. Form 8824 shows a
$20,000 recognized exchange gain, $60,000 deferred gain, and $40,000
replacement-property basis; Form 4797, Schedule D, and Form 1040 carry the
recognized amount once. Form 6252 shows an $80,000 sale, $40,000 basis,
50% gross-profit rate, $20,000 current payment, and $10,000 recognized
gain carried through Form 4797 and Schedule D. Form 8915-F shows $20,000
qualified disaster distribution and $1,000 ordinary pension distribution;
$6,667 disaster income plus $1,000 ordinary income reaches Form 1040 line
5b. Form 8829 shows 200/1,000 square feet, $14,000 indirect expenses,
$100 prior operating carryover, and $2,900 allowable home-office expense;
Schedule C profit is $47,100 and the Form 8995 deduction is $5,604.

All 33 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, and clipping. The manifest SHA-256 is
`585722713de97a99e4332c846b9d449386e99e4888ef321d33a4551964a34733`.
The read-only checker passed **4 cases / 33 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **119 distinct fixture IDs with completed page flags, 66
without, and 615 pages**. This is a manifest-completion count rather than a
recheck of older packets. Property, distribution, and prior carryover source
authenticity, wider branches, complete PDF review, IRS business rules, and
ATS acceptance remain open.

## Partnership Form 4797 and royalty selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-source-three/`
contains three existing fixtures and 18 rendered pages. The two-partnership
fixture prints separate $400 and $600 code L/R rows on Form 4797 line 10.
The six-partnership fixture prints its first three rows on the form and a
$400 attached subtotal; the continuation identifies rows four through six,
including the $50 loss. Both carry $1,000 to Form 4797 lines 17/18b,
Schedule 1 line 4, and Form 1040 line 8, yielding $31,000 AGI. The
royalty/personal-rental fixture prints $3,000 of royalties on Schedule E,
$9,000 of personal-property rental income on Schedule 1 line 8l, and a $50
expense on line 24b; Form 1040 reports $16,950 AGI and $163 EIC.

All 18 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, order, continuations, and clipping. The manifest
SHA-256 is
`e357687a08c64d161f567e3eb9bfae42fb93e7f7108a0b6e9a93ef02662cc97c`.
The read-only checker passed **3 cases / 18 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **122 distinct fixture IDs with completed page flags, 63
without, and 633 pages**. This counts manifest completion rather than
rechecking older packets. Issued K-1 and payer proof, wider source paths,
complete PDF review, IRS business rules, and ATS acceptance remain open.

A five-case attempt that also selected the existing W-2G withholding and
partnership/W-2G fixtures stopped before manifest creation at the retained
`W-2G payer copy content needs its exact attached PDF` guard. Those fixtures
remain unreviewed; the generated three-case selection did not bypass the
required payer-copy evidence.

## Schedule C and F selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-business-three/`
contains three existing fixtures and 33 rendered pages. The baseline
Schedule C and raised-products Schedule F each carry $80,000 profit,
$5,652 half-SE deduction, $11,304 SE tax, $74,348 QBI, and $11,720
income-limited Form 8995 deduction. The Schedule C simplified-home-office
case prints 1,200 total and 200 business square feet, deducts $1,000 on
line 30, and carries $19,000 profit, $1,342 half-SE deduction, $2,685 SE
tax, and $382 income-limited QBI deduction. The amounts reconcile through
Schedules 1/2/SE and Form 1040 without duplicate business entries.

All 33 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, continuations, and clipping. The
manifest SHA-256 is
`05d23144da6939c7bee8fd9dcaf731ae8b1540dd777e3ec7850b3ee145d6617d`.
The read-only checker passed **3 cases / 33 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **125 distinct fixture IDs with completed page flags, 60
without, and 666 pages**. This is a manifest-completion count rather than a
recheck of older packets. Business/farm source authenticity, wider expense
and at-risk paths, complete PDF review, IRS business rules, and ATS
acceptance remain open.

## Schedule 1-A qualified-tips selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-tips-four/`
contains four existing fixtures and 39 rendered pages. The Form 4070/
Form 4137 employee route prints $5,000 W-2 reported tips, $1,500
unreported tips on Form 1040 line 1c, $6,500 on Schedule 1-A lines
4b/4c and Form 1040 line 13b, and $115 Form 4137 tax through Schedule 2.
The two-employer route prints zero on lines 4a/4b, a $9,500 line 4c
worksheet with both employers, $2,500 unreported tips, and $191 Form 4137
tax. The NEC/MISC and NEC/MISC/K cash-basis routes each have $10,000
Schedule C profit and $706 half-SE deduction, limiting one combined
qualified-tips deduction to $9,294; their $1,413 SE tax reaches
Schedule 2 and Form 1040 once.

All 39 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, continuations, and clipping. The
manifest SHA-256 is
`86e2a218534488cd951fac98340b5dbd9d5c634f4824fc85856743f8243871a6`.
The read-only checker passed **4 cases / 39 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **129 distinct fixture IDs with completed page flags, 56
without, and 705 pages**. This is a manifest-completion count rather than a
recheck of older packets. Issued payer record authenticity, wider tips
combinations, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Mixed Form 1099-K business and personal selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-mixed-k-three/`
contains three existing fixtures and 39 rendered pages. The $2,800
Form 1099-K allocates $2,000 to Schedule C and $800 to the personal camera
sale. The $3,800 variant adds a $1,000 NEC duplicate but reports only
$3,000 combined Schedule C receipts. The $4,000 variant also identifies a
$200 payer error on Schedule 1's Form 1099-K top entry, without increasing
Schedule 1 line 10 or Form 1040 line 8. All three print the camera's $800
proceeds, $300 basis, and $500 long-term gain on Form 8949 and Schedule D;
Form 1040 line 7a includes it once.

All 39 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, continuations, and clipping. The
manifest SHA-256 is
`e14de2462ae7dfd5b4a639b785a2e04e8a5795b21fbc4cb015d68136e292d15b`.
The read-only checker passed **3 cases / 39 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **132 distinct fixture IDs with completed page flags, 53
without, and 744 pages**. This counts manifest completion rather than
rechecking older packets. Payer/source authenticity, wider 1099-K
classifications, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Form 1099-K personal sales and business refunds selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-k-other-four/`
contains four existing fixtures and 32 rendered pages. The personal-sale
case retains $1,500 Form 1099-K gross payments: an $800 short-term event-ticket
sale less $250 basis produces $550 gain, while a $700 personal-chair sale
below $1,000 basis uses Form 8949 code L and nets to zero. With $100
selling fees, the ticket proceeds become $750 and gain becomes $500;
the chair proceeds become $650 and its code L adjustment is $350. The
business-refund case keeps $3,000 gross on Schedule C line 1 and subtracts
a $400 refund on line 2 for $2,600 profit. Its fee variant also subtracts
$90 processing fees on line 10 for $2,510 profit. Schedules 1/2/SE,
Schedule D, and Form 1040 receive those amounts once per case.

All 32 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, continuations, and clipping. The
manifest SHA-256 is
`4f183bbc1feed585857a2d869ec9d409880238dcd0d472290b17b4e4ec66924e`.
The read-only checker passed **4 cases / 32 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **136 distinct fixture IDs with completed page flags, 49
without, and 776 pages**. This is a manifest-completion count rather than a
recheck of older packets. Payer/source authenticity, wider 1099-K
classifications, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Short- and long-term Form 8949 selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-8949-short-long/`
contains one existing fixture and six rendered pages. A $2,000 short-term
sale with $1,000 basis prints on Form 8949 box B and Schedule D line 2;
a $4,000 long-term sale with $2,000 basis prints on a separate Form 8949
box F copy and Schedule D line 10. Their $3,000 total reaches Form 1040
line 7a once and produces $33,000 AGI.

All six pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, the two Form 8949 copies, order, and clipping.
The manifest SHA-256 is
`bea8bb3e4ff1c91459dc59f88ea357279cd02159833d3edb513655376f281c50`.
The read-only checker passed **1 case / 6 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **137 distinct fixture IDs with completed page flags, 48
without, and 782 pages**. This counts manifest completion rather than a
recheck of older packets. Broker/source authenticity, wider capital-gain
paths, complete PDF review, IRS business rules, and ATS acceptance remain open.

## Form 8962 no-APTC policy-month selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-policy-four/`
contains four existing fixtures and 20 rendered pages. Two sequential
policies print $600 January–June and $700 July–December monthly SLCSP,
with a $50 monthly contribution; the resulting PTC is $7,200. Three
alternating policies preserve A-B-A-C coverage for $7,800 PTC. Four
sequential policies produce $8,400 PTC, and twelve separately sourced
one-month policies produce $7,800. Each total appears on Form 8962 line
26, Schedule 3 line 9, and Form 1040 line 31 once.

All 20 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, and clipping. The manifest SHA-256 is
`16206aa8aaf291c48dbb43e19c3cc99ebbbf761ec0290945d7c73657e8e59972`.
The read-only checker passed **4 cases / 20 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **141 distinct fixture IDs with completed page flags, 44
without, and 802 pages**. This counts manifest completion rather than a
recheck of older packets. Marketplace and payment authenticity, other policy
combinations, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Form 8962 uncovered-month and protected-payment selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-policy-gaps-four/`
contains four existing fixtures and 20 rendered pages. One policy leaves July
uncovered, giving $6,550 PTC across eleven covered months. Another leaves
April, August, and December uncovered, giving $5,850 across nine months. A
third covers only January and December, giving $1,200. The protected partial
payment case prints January's $400.51 paid premium as $401 and gives $7,051
PTC. Each total appears on Form 8962 line 26, Schedule 3 line 9, and Form
1040 line 31 once.

All 20 pages were rendered and checked against source and XML for owner,
form/year, amounts, marks, page order, and clipping. The manifest SHA-256 is
`8994ef45af3101e500a3d0dda8330c5ab4168dbda6f908c1a6f179f1a30b23a2`.
The read-only checker passed **4 cases / 20 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **145 distinct fixture IDs with completed page flags, 40
without, and 822 pages**. This counts manifest completion rather than a
recheck of older packets. Marketplace and payment authenticity, other policy
combinations, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Form 8962 successive and uncovered policy selected PDF packet (2026-10-04)

The selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-policy-next-four/`
contains four existing fixtures and 20 rendered pages. Three successive
four-month policies print $600, $700, and $800 monthly SLCSP and total $7,800
PTC. A separate case leaves September blank and totals $7,050. Four uncovered
months leave April, July, August, and December blank, totaling $5,200. The
sparse case prints only January, June, and December and totals $1,950. Each
credit appears on Form 8962 line 26, Schedule 3 line 9, and Form 1040 line 31
once.

All 20 pages were rendered and checked against source and XML for owner,
form/year, monthly rows, marks, page order, and clipping. The manifest SHA-256
is `672398c1d018b3f726f9dc560dc7ab4a2476abc0851da130923ce217bcfe294c`.
The read-only checker passed **4 cases / 20 pages**, including source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. The retained-artifact
inventory is now **149 distinct fixture IDs with completed page flags, 36
without, and 842 pages**. This counts manifest completion rather than a
recheck of older packets. Marketplace and payment authenticity, other policy
combinations, complete PDF review, IRS business rules, and ATS acceptance
remain open.

## Schedule SE filed-line rounding reconciliation (2026-10-04)

The shared Schedule SE calculation now rounds the filed line 6 earnings for
lines 10 and 11, rounds each tax component to whole dollars, and adds those
filed components for line 12. The sourced ATS Scenario 12 $24,328 Schedule C
profit yields $2,786 Social Security tax and $652 Medicare tax, $3,438 on
Schedule SE line 12 and Schedule 2 line 4, and $1,719 on Schedule 1 line 15.
This follows the [2025 Schedule SE line 12 instruction](https://www.irs.gov/pub/irs-prior/f1040sse--2025.pdf)
and the [Form 1040 whole-dollar rounding rule](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf).

The focused Deno command used the full suite permissions and four Schedule SE
calculation, native, PDF, and Schedule 2 reconciliation files. It passed
**77/77** with zero failed in 3 seconds. The retained log is
`.state/research/ty2025-schedule-se-rounding-focused-2026-10-04.log`
(SHA-256 `17ad95c13209e760e8166d5a675f54371c77bcb65548be29d3a3a15455afb8d0`).
The Form 7206 source fixture was updated to the same half-tax amount and
regenerated as a complete XML/PDF return against the local TY2025v5.4 XSD.
Another focused command over four full-return and ATS-source files passed
**59/59** with zero failed. Its retained log is
`.state/research/ty2025-schedule-se-rounding-e2e-2026-10-04.log`
(SHA-256 `34c664a66ac97e7217c9bc0c4305297458cc055a21ed80e10f35549bc5143b7e`).
An adjacent batch over 11 income, QBI, health-plan, Schedule J, and Schedule 1
test files passed **225/225** with zero failed. Its retained log is
`.state/research/ty2025-schedule-se-rounding-adjacent-2026-10-04.log`
(SHA-256 `4c1ef288e86ae2c1d6fdf94d2906b9539e68882e05ec57fb78ec456e729c27c7`).
The CLI's above-threshold Schedule C/QBI return now expects the recalculated
filed-line totals; its return and health-plan command cases passed **10/10**.
That log is `.state/research/ty2025-cli-se-rounding-batch-2026-10-04.log`
(SHA-256 `9f2d86707a8475406d2ea416e11898b63a44bbd14f9d30c06564dfcc2bd7e8b7`).
The prior full runs were stopped while reconciling the affected source fixture
and expectations; a clean full `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test`
result remains pending. The other Scenario 12 source conflicts and ATS
acceptance remain open.

## Schedule SE affected-packet replay (2026-10-04)

The filed-line change was replayed against all 15 previously reviewed selected
fixtures that include Schedule SE. The current packet is
`.state/research/ty2025-filled-pdf-review/2026-10-04-current-se-replay/`.
Six regenerated PDF/XML pairs are byte-identical to their reviewed packets.
Nine pairs changed; page-by-page 90-dpi raster comparison found 39 changed
pages among the packet's 192 pages. Those 39 pages were visually rechecked for
form/year, owner, filed amounts, marks, order, and legibility, including the
three qualified-tip deductions, two 1099-K tax/refund totals, the mixed-K
half-tax, simplified-home-office half-tax, Form 7206 health-plan deduction,
and Form 8829/Form 8995 QBI limit. Previously checked pages with identical
rasters retained their visual evidence. The raster comparison and contact
sheets are retained under `.state/research/ty2025-current-se-raster-compare/`.

The read-only checker passed **15 cases / 192 pages**, with current source
replay, PDF/XML/source hashes, page origins, and local TY2025v5.4 XSD. The
manifest SHA-256 is
`7558ea7fced1ea768f26a9a65e74efa065568b8299e76087962c1eab515e7cdd`;
the checker log is `.state/research/ty2025-current-se-replay-check-2026-10-04.log`
(SHA-256 `57400da22b11613c7ead8b9fde07c899499940967060f27f260cc9c0a8bdacf9`).
This refreshes 15 members of the earlier 149-fixture, 842-page completed
checklist inventory; it does not add distinct fixtures or pages. Complete PDF
review, IRS business rules, and ATS acceptance remain open.

## Form 4972 Part II selected PDF packet (2026-10-04)

The current selected packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-4972-part-ii/`
contains the existing Form 4972 Part-II-only fixture and five rendered pages.
The reviewed 1099-R has $100,000 gross/taxable distribution and $30,000 box 3
capital gain. Form 4972 lines 6 and 7 print $30,000 and $6,000; Part III stays
blank. Form 1040 lines 5a/5b carry the $70,000 ordinary share once, line 16
checks Form 4972 and includes its tax, and Schedule 1-A's $6,000 senior
deduction reaches line 13b. All five pages were visually checked for owner,
form/year, amounts and marks, page order, and clipping against current source
and XML.

The read-only checker passed **1 case / 5 pages** with artifact hashes,
source replay, page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`bcf80c7e77c851ec4c6fecd95e0e3a50be7a86bb5ceb025699e4d726026ee39f`;
the checker log is `.state/research/ty2025-4972-check-2026-10-04.log`
(SHA-256 `5948f6f2ac9b0f0d0f72de5885faf61d471c63229ad1762295017d8d8c2b7a56`).
The distinct completed inventory becomes **150 fixture IDs / 847 pages**,
with 35 fixture IDs still without completed page flags. Other Form 4972
elections and authentic plan/source eligibility, complete PDF review, IRS
business rules, and ATS acceptance remain open.

A separate selected attempt including the existing Form 461 excess-business-loss
fixture stopped before XML/PDF output at its already tested Form 8995 net-QBI-
loss carryforward guard. No Form 461 page review or XSD result is claimed.

## Schedule 1-A rounded-tip expectation reconciliation (2026-10-04)

The first broad run after the Schedule SE change reached the Schedule 1-A PDF
test and reported a stale $9,294 expectation for a $10,000 net-profit trade.
The current filed half-SE deduction is $707, so the qualified trade tips are
$9,293. The same old amount appeared in three source/XML fixture assertions.
Those four assertions now match the filed-line calculation and the visually
rechecked current PDFs. Each affected test passed directly: one Schedule 1-A
PDF case and three complete source-to-native-XML/XSD cases, each with zero
failures. The focused logs are
`.state/research/ty2025-se-tips-{nec,tip1,tip2,tip3}-2026-10-04.log`.
The first broad run was deliberately stopped after this failure so a clean
run could start with the corrected expectations; its interrupted log is
`.state/research/ty2025-full-test-df354df5-2026-10-04.log` (SHA-256
`891a5943a9a2501a41b869f089e716a93372eaff78e6802816722fd918fe4316`).
A clean full suite remains pending.

## Form 6251 ISO AMT selected PDF packet (2026-10-04)

The selected `single-iso-amt` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-iso-amt/` has six
rendered pages. Its Form 3921 source gives a $240,000 exercise-date spread,
printed on Form 6251 line 2i. Part I totals $440,000 AMTI; Part II applies the
$88,100 exemption, prints $93,750 tentative tax and $37,067 regular tax, and
returns $56,683 AMT. Schedule 2 lines 2/3 and Form 1040 line 17 each carry
that amount once, leading to $93,750 total tax and $58,750 owed after $35,000
W-2 withholding. Form 6251 Part III stays blank without preferential income.

All six pages were visually checked against source and native XML for owner,
form/year, amounts, signs and marks, right-hand computation, page order, and
clipping. The read-only checker passed **1 case / 6 pages** with source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`d64f14f3d43cc38a7f77ddb598f51aa95c766ca921583cc9ef16a2aa9a658b16`;
checker log `.state/research/ty2025-iso-amt-check-2026-10-04.log` has SHA-256
`1bd559545ef85586bbb1be3062e719d1143f8f6832b663de36e910feb302f012`.
The distinct completed inventory becomes **151 fixture IDs / 853 pages**,
with 34 fixture IDs still without completed page flags. Authentic Form 3921
and exercise evidence, other AMT adjustments, complete PDF review, IRS
business rules, and ATS acceptance remain open.

## Schedule J farm averaging selected PDF packet (2026-10-04)

The selected `single-schedule-j-farm-income-averaging` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-j-farm/`
contains 13 rendered pages. Schedule F's $100,000 raised-product sales reach
Schedule 1 once; Schedule SE adds its $11,451 Social Security and $2,678
Medicare components to $14,129 and deducts $7,065 on Schedule 1. Form 8995
limits the QBI deduction to $15,437. Schedule J elects $15,000 of farm income,
uses three synthetic $10,000 taxable-income/$1,000 section 1 tax base-year
records, and prints $7,112 on line 23 and Form 1040 line 16.

All 13 pages were rendered and visually checked for owner, form/year,
amounts, signs and marks, page order, and clipping against current source and
native XML. The read-only checker passed **1 case / 13 pages** with source
replay, hashes, page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`ce6c6fcf5de42395a7eaf6bf6705c85e74fc38d318b054771973e8a19416884b`;
checker log `.state/research/ty2025-schedule-j-check-2026-10-04.log` has
SHA-256 `bbcd7cca0469542df8c9e790a03870dad89270b768e6c78edd6e20639ad69cd9`.
The distinct completed inventory becomes **152 fixture IDs / 866 pages**,
with 33 fixture IDs without completed page flags. Verified prior filed
returns, other Schedule J elections, complete PDF review, IRS business rules,
and ATS acceptance remain open.

## Form 8582 nonparticipating rental-loss selected PDF packet (2026-10-04)

The `single-nonparticipating-rental-loss` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-rental-loss/` contains
six pages. Schedule E prints $5,000 rent and $10,000 repairs for Example
rental, with a $5,000 pre-limitation loss and no current deductible loss.
Form 8582 Part I carries the $5,000 passive loss, Part V identifies the
activity, and Parts VII/VIII leave the full $5,000 disallowed with zero
allowed. Form 1040 retains $90,000 W-2 income/AGI and a $745 refund.

All six pages were visually checked for owner, form/year, amounts, blank
current-loss lines, activity identity, page order, and clipping against source
and XML. The read-only checker passed **1 case / 6 pages** with source replay,
artifact hashes, page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`1483e1a3e62c9e83c451e1de2c7cb785c586cacae435043b11c1911f2ea05f03`;
checker log `.state/research/ty2025-rental-loss-check-2026-10-04.log` has
SHA-256 `1bd559545ef85586bbb1be3062e719d1143f8f6832b663de36e910feb302f012`.
The distinct completed inventory becomes **153 fixture IDs / 872 pages**,
with 32 fixture IDs without completed page flags. Authentic rental activity
and carryover records, other Form 8582 branches, complete PDF review, IRS
business rules, and ATS acceptance remain open.

## Form 8912 reported bond selected PDF packet (2026-10-04)

The `single-reported-tax-credit-bond` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-bond-credit/` has seven
pages. Form 8912 Part III identifies a 2017 Town Energy Authority bond,
issuer EIN, and identifier `BOND1097` with $100 reported credit. Part I and
Part II allow $100 against $3,887 regular tax; the attached Form 6251 pages
show zero AMT. Schedule 3 line 6k and Form 1040 line 20 each carry the $100
once, leading to a $3,213 refund after $7,000 W-2 withholding.

All seven pages were visually checked for owner, form/year, issuer identity,
amounts, marks, page order, and clipping against source and native XML. The
read-only checker passed **1 case / 7 pages** with source replay, artifact
hashes, page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`b0538b361f9f8e7a8844a55be36692b47f01c79561d6833f3349b4fa350aeead`;
checker log `.state/research/ty2025-bond-check-2026-10-04.log` has SHA-256
`e0d026db6d7f7c6624f1e1806791915948d88234d55150b86d2e2df5f93edc90`.
The distinct completed inventory becomes **154 fixture IDs / 879 pages**,
with 31 fixture IDs without completed page flags. Issued Form 1097-BTC and
bond authenticity, other Form 8912 routes, complete PDF review, IRS business
rules, and ATS acceptance remain open.

## Schedule SE whole-dollar deduction and Form 8881 review (2026-10-04)

The prepared Form 8881 packet exposed a filed-line mismatch: a $1,413
Schedule SE tax produced a $707 printed half-tax deduction, but Form 1040
subtracted the unrounded $706.50 and printed $129,294 AGI from $130,000
income. The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi)
require consistent whole-dollar rounding when that convention is used. The
shared Schedule SE calculation now rounds line 13 before routing the amount
to Schedule 1, AGI, QBI, and Form 8990's final reconciliation. The corrected
Form 8881 return prints $130,000 − $707 = $129,293 AGI; the farm-income
averaging return prints $100,000 − $7,065 = $92,935 AGI. Focused Schedule SE
node/PDF tests passed 50/50 and CLI/Form 8990 tests passed 13/13. The first
broader rerun was stopped after stale CLI expectations and an unrounded
Form 8990 reconciliation were found; a clean corrected-source rerun is in
progress and is not yet a passing gate.

The current selected packet is
`.state/research/ty2025-filled-pdf-review/2026-10-04-rounded-se-replay/`.
It includes the 15 previously reviewed Schedule SE cases, the 13-page
Schedule J case, and the 24-page Form 8881 case. Seven of the older 15
packets changed on 21 text-bearing pages; Schedule J changed on four pages,
and Form 8881 changed on four pages. All 29 changed pages were rendered and
visually rechecked for current amounts, owner, form/year, marks, order, and
legibility. The unchanged pages retain their prior visual checks. The read-only
checker passed **17 cases / 229 pages** with source replay, artifact hashes,
page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`39a65059ecd610f5e23ea59ec1a39fe524adb740aa11a16df08239c2ac08d8a1`;
checker log `.state/research/ty2025-rounded-se-replay-check-2026-10-04.log`
has SHA-256 `99e8e948d547d17b52492e49c6a93e4a3e066efd8903668d5ad564e9288462bf`.

The Form 8881 packet shows $750 startup and $500 auto-enrollment credits on
Form 8881 and Form 3800, $1,250 on Schedule 3 and Form 1040 once, and a
$186 refund after $20,000 withholding. Its 24 pages include nine Form 3800
continuation pages in correct order; all were inspected in the initial packet,
with changed pages rechecked after the deduction correction. The distinct
completed inventory is **155 fixture IDs / 903 pages**, leaving 30 fixture IDs
without completed page flags. Source authenticity, wider credit combinations,
full filled-page coverage, IRS business rules, and ATS acceptance remain open.

## First-joint-year Form 2210-F selected PDF packet (2026-10-04)

The `mfj-form2210f-first-joint-filing` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-2210f-joint/` has three
pages. Form 1040 prints $200,000 W-2 income, $26,898 current tax, and $1,000
withholding. Form 2210-F checks Box B because the taxpayers filed separate
2024 returns before their joint 2025 return; the two prior tax amounts total
$9,000. Its $8,000 underpayment over 45 days yields a $69 penalty, which
matches Form 1040 line 38 and a $25,967 amount owed. All pages were visually
checked for taxpayer identity, filing status, amounts, marks, page order,
and legibility. The read-only checker passed **1 case / 3 pages** with source
replay, artifact hashes, page origins, and local TY2025v5.4 XSD. Manifest
SHA-256 is `ff10b530d1d65fa97604f915e96586ebbbfeccbdba69f32d17f20e2d346137f6`;
checker log `.state/research/ty2025-2210f-joint-check-2026-10-04.log`
has SHA-256 `2f089b45a5f2b7205a7300eb8bc598e05f2e855216d2bca710d97f7dd5748a82`.
The distinct completed inventory is **156 fixture IDs / 906 pages**, leaving
29 fixture IDs without completed page flags. Authentic prior returns and
payment records, other penalty paths, whole-batch review, IRS rules, and
ATS acceptance remain open.

## Foreign-interest excess-credit selected PDF packet (2026-10-04)

The `single-foreign-interest-current-excess` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-foreign-interest/` has
eight pages. Schedule B and Form 1040 report $50,000 Canadian Bank interest.
Form 1116 allocates the $15,750 standard deduction to its sole passive
foreign source, leaving $34,250 foreign taxable income. Its $9,000 reported
U.S.-dollar foreign tax is limited to a $3,875 current credit, which reaches
Schedule 3 and Form 1040 once. The attached Form 1116 Schedule B carries the
$5,125 excess in the current-year column. Both parent and carryover pages
show the passive category and same taxpayer identity; all eight pages were
visually checked for amounts, marks, order, and legibility. The read-only
checker passed **1 case / 8 pages** with source replay, artifact hashes,
page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`59cf89bb03caf52122772e56a0f2fb7acf26f8d5667ab0212f9e300f33f9ee9a`;
checker log `.state/research/ty2025-foreign-interest-check-2026-10-04.log`
has SHA-256 `05ecc0766b5f27593cf7a552b5348215760b5535bf57c02a04d70a286804899b`.
The distinct completed inventory is **157 fixture IDs / 914 pages**, with 28
fixture IDs lacking completed page flags. Authenticated foreign tax and prior
return records, wider category/carryover routes, all-case page review, IRS
business rules, and ATS acceptance remain open.

## Annual-method APTC repayment selected PDF packet (2026-10-04)

The `single-marketplace-aptc-repayment` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-aptc-repayment-reviewed/`
has six pages. Its Form 8962 review focus was corrected to describe the
annual line 11 calculation for one full-year policy; monthly rows and the
allocation page are blank as printed. The source Form 1095-A has $9,600
premiums, $7,200 SLCSP, and $8,400 APTC. Form 8962 shows $45,180 household
income at 300% of FPL, a 0.0600 applicable figure, $4,489 allowed PTC,
and $3,911 excess advance credit limited to a $1,625 repayment. Schedule 2
line 1a and Form 1040 line 17 carry the $1,625 once, leaving an $82 refund
after $5,000 withholding. All six pages were visually checked for owner,
form/year, amounts, marks, page order, and clipping. The read-only checker
passed **1 case / 6 pages** with source replay, artifact hashes, page origins,
and local TY2025v5.4 XSD. Manifest SHA-256 is
`63edd39122912209986bd8e678bdd18a772ac1b68d094817ceb39f67cc3c0276`;
checker log `.state/research/ty2025-aptc-repayment-check-2026-10-04.log`
has SHA-256 `1bd559545ef85586bbb1be3062e719d1143f8f6832b663de36e910feb302f012`.
The distinct completed inventory is **158 fixture IDs / 920 pages**, leaving
27 fixture IDs without completed page flags. Authenticated policy and
household records, other PTC allocation routes, complete page review, IRS
business rules, and ATS acceptance remain open.

## Situation 4 shared-policy selected PDF packet (2026-10-04)

The `single-situation4-nonenrolled-other-taxpayer` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-situation4-nonenrolled/`
has five pages. Form 8962 Part IV prints one allocation to the other taxpayer
for months 01–12, with 0.80 in each premium, SLCSP, and APTC percentage
column. Its monthly rows carry $400 premium, $480 SLCSP, and $160 APTC after
allocation; $4,800 allowed PTC minus $1,920 advance credit yields $2,880
net PTC on Form 8962 line 26, Schedule 3 line 9, and Form 1040 line 31 once.
The printed and native `JOE-JANE-SHARED` policy number is the required last
15 characters of the `TX-JOE-JANE-SHARED` Form 1095-A source; the
[2025 Form 8962 instructions](https://www.irs.gov/instructions/i8962)
explicitly require that suffix for longer policy numbers. All five pages
were visually checked for the filer, other taxpayer SSN, amounts, marks,
order, and legibility. The read-only checker passed **1 case / 5 pages**
with source replay, artifact hashes, page origins, and local TY2025v5.4 XSD.
Manifest SHA-256 is
`b9d0f8fa5da6f7ce6421d89d767f989c25f43605ce8fefa6905293ab610e1101`;
checker log `.state/research/ty2025-situation4-check-2026-10-04.log`
has SHA-256 `5948f6f2ac9b0f0d0f72de5885faf61d471c63229ad1762295017d8d8c2b7a56`.
The distinct completed inventory is **159 fixture IDs / 925 pages**, with 26
fixture IDs lacking completed page flags. The synthetic allocation and family
references are not authenticated source bytes; other shared-policy cases,
complete page review, IRS business rules, and ATS acceptance remain open.

## Full regression after Schedule SE rounding (2026-10-04)

The diagnostic full run found three old full-return assertions that still
expected fractional half-SE deductions: two Form 7206 cases and one
Schedule C/qualified-dividend case. Their filed-dollar expectations were
corrected and each affected focused case passed. The subsequent clean
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` run on `a5e0c448`
passed **11,121 tests, zero failed**, in 33m33s. Deno was 2.9.4
(aarch64-apple-darwin), with V8 15.0.245.2-rusty and TypeScript 6.0.3.
The log is
`.state/research/ty2025-full-test-rounded-se-green-2026-10-04.log` with
SHA-256 `d7ce83371e3775d81f8b8b2568cfee7f11a7c761a243e046d1474cbfcadecc5d`.
The later documentation-only commit does not change tested code or fixtures.
This local batch does not establish every-route completeness, every-page
visual parity, IRS business-rule approval, or ATS acceptance.

## Sequential-policy Form 8962 filled-page review (2026-10-04)

The two-case packet at
`.state/research/ty2025-filled-pdf-review/2026-10-04-coverage-gaps/`
contains ten filled pages. The four-policy case leaves March, June,
September, and December blank on Form 8962, prints eight covered monthly rows,
and carries $5,600 net PTC through Schedule 3 line 9 and Form 1040 line 31 to
a $7,113 refund. The five-policy case covers all twelve months with five
separate sequential source policies; its $8,200 net PTC reaches those return
lines once and produces a $9,713 refund. Both page sets were rendered and
visually checked for 2025 form/year, filer, amounts, checkboxes, all monthly
rows, page order, continuation, and legibility. The read-only checker passed
**2 cases / 10 pages** with source replay, artifact hashes, page origins, and
local TY2025v5.4 XSD. The manifest SHA-256 is
`d4c148b79edee95905f45ab4095bb8ed55581b4f2fa56a1848008749cd4d052d`;
checker log `.state/research/ty2025-coverage-gap-check-2026-10-04.log`
has SHA-256 `393465b70fc560fe3eb4866115469fb80a7e9dc16229bafaa70af0040460fbd9`.
The distinct completed inventory reaches **161 fixture IDs / 935 pages**,
with 24 fixture IDs lacking completed page flags. Marketplace source
authenticity, other policy combinations, the complete all-page review, IRS
business rules, and ATS acceptance remain open.

## Corrected-SLCSP Form 8962 filled-page review (2026-10-04)

The three-case packet at
`.state/research/ty2025-filled-pdf-review/2026-10-04-corrected-slcsp/`
contains 18 filled pages. Two alternating-policy cases preserve their source
Form 1095-A column B totals while applying dated corrected SLCSP amounts only
to covered months. Their Form 8962 lines 24/25 show $1,304/$2,400 and
$1,354/$2,400, respectively, producing $1,096 and $1,046 repayments on
Schedule 2 line 1a and Form 1040 line 17. The five sequential-policy case
applies five separate $650 determinations in their own months and carries
$1,346 excess APTC once. All 18 pages were rendered and visually checked for
2025 form/year, filer, monthly amounts and marks, page order, continuation,
and legibility. The read-only checker passed **3 cases / 18 pages** with
source replay, artifact hashes, page origins, and local TY2025v5.4 XSD.
Manifest SHA-256 is
`a6a31bc5991094bc324fdbb7c01313ae39f306b9ad5409831b28b2d8d70d9075`;
checker log `.state/research/ty2025-corrected-slcsp-check-2026-10-04.log`
has SHA-256 `050b0d27f2d818512901e8b401c0984ece08966dcb982101cfa5af6ed6004d55`.
The distinct completed inventory reaches **164 fixture IDs / 953 pages**,
with 21 fixture IDs lacking completed page flags. Authenticated marketplace
correction notices, other policy combinations, complete all-page review, IRS
business rules, and ATS acceptance remain open.

## Remaining shared-policy Form 8962 filled-page review (2026-10-04)

The three-case packet at
`.state/research/ty2025-filled-pdf-review/2026-10-04-shared-policy-remaining/`
contains 16 filled pages. The single-filer Situation 4 case prints two
nonoverlapping Part IV allocation rows for the same policy: 20% in January–June
and 80% in July–December. Form 8962 line 24 shows $7,200 PTC, line 25 shows
$4,800 allocated APTC, and $2,400 reaches Schedule 3 and Form 1040. The MFS
repayment case prints 50% APTC allocation with blank premium/SLCSP percentages;
$4,800 allocated APTC is limited to a $750 repayment on Schedule 2 and Form
1040. The MFS exception case marks box A and prints 50% premium/APTC
allocation; $2,400 net PTC reaches Schedule 3 and Form 1040 once. All 16 pages
were rendered and visually checked for filer and spouse identity, 2025
form/year, monthly amounts, Part IV percentages, checkboxes, page order, and
legibility. The read-only checker passed **3 cases / 16 pages** with source
replay, artifact hashes, page origins, and local TY2025v5.4 XSD. Manifest
SHA-256 is `71ee1acdec58bafecf66ee102aa458f2f2e95eb565431ae703719121fda74063`;
checker log `.state/research/ty2025-shared-policy-check-2026-10-04.log`
has SHA-256 `3fa501432b89fa15592b7a94c699fba0f23f3dcf8a5145ebf7d8ccd30f7a7838`.
The distinct completed inventory reaches **167 fixture IDs / 969 pages**,
with 18 fixture IDs lacking completed page flags. Authenticated policy and
agreement records, complete all-page review, IRS business rules, and ATS
acceptance remain open.

## Trust clean-electricity investment-credit filled-page review (2026-10-04)

The `single-trust-clean-electricity-investment-credit` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-clean-electricity-credit/`
contains 17 filled pages. The selected Form 3468 pages print Solar Trust,
its EIN and facility, the 2024 construction and 2025 service dates, and
$10,000 qualified basis at 30%, yielding a $3,000 Part V credit. Form 3800
Part III line 1v records the trust EIN and $3,000 nonpassive source credit;
its $8,973 regular-tax-over-TMT limit allows the full $3,000 on line 38.
Schedule 3 line 6a and Form 1040 line 20 each carry $3,000 once, producing
a $7,933 refund. All 17 pages, including all nine Form 3800 pages and two
Form 6251 pages, were rendered and visually checked for 2025 form/year,
filer, source amounts, marks, page order, blank continuation rows, and
legibility. The read-only checker passed **1 case / 17 pages** with source
replay, artifact hashes, page origins, and local TY2025v5.4 XSD. Manifest
SHA-256 is `2581e3ea295c15ceb76b379e0face57adb50935597271afd2076d695dab8ad3f`;
checker log `.state/research/ty2025-clean-electricity-credit-check-2026-10-04.log`
has SHA-256 `a058a56b23112db02c64309b945bb37ef04a8a7efd74461840737b16bd48e1a2`.
The distinct completed inventory reaches **168 fixture IDs / 986 pages**,
with 17 fixture IDs lacking completed page flags. Issued K-1 and property
statement bytes, other business-credit routes, complete all-page review,
IRS business rules, and ATS acceptance remain open.

## Geothermal production-credit filled-page review (2026-10-04)

The `single-geothermal-general-business-credit` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-geothermal-credit/`
contains 17 filled pages. Form 8835 identifies the geothermal facility,
construction and service dates, coordinates, and 1,500 kW nameplate capacity.
Its 100,000 kWh production at $0.006 yields a $600 specified credit on line
15. Form 3800 Part III line 4e records $600, its $8,973
regular-tax-over-TMT limit permits the full credit, and Schedule 3 line 6a
and Form 1040 line 20 each carry $600 once. Total tax is $24,467 against
$30,000 withholding, yielding a $5,533 refund. All 17 pages, including nine
Form 3800 pages, two Form 6251 pages, and three Form 8835 pages, were
rendered and visually checked for 2025 form/year, filer, source amounts,
marks, page order, blank continuation rows, and legibility. The read-only
checker passed **1 case / 17 pages** with source replay, artifact hashes,
page origins, and local TY2025v5.4 XSD. Manifest SHA-256 is
`47f7c8c36f2ba6ae31fc2ec326d101c327cd27e3a81b3f2133671c31a835846c`;
checker log `.state/research/ty2025-geothermal-check-2026-10-04.log` has
SHA-256 `a058a56b23112db02c64309b945bb37ef04a8a7efd74461840737b16bd48e1a2`.
The distinct completed inventory reaches **169 fixture IDs / 1003 pages**,
with 16 fixture IDs lacking completed page flags. Issued source bytes, other
business-credit routes, complete all-page review, IRS business rules, and
ATS acceptance remain open.

## Orphan-drug clinical-testing credit filled-page review (2026-10-04)

The `single-orphan-drug-clinical-testing-credit` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-orphan-drug-credit/`
contains 16 filled pages. Form 8820 uses its September 2018 revision and
prints one FDA-designated drug, the application number and designation date,
$10,000 qualified clinical testing expenses, and the reduced section 280C
election. Its 19.75% calculation yields $1,975 on line 4. Form 3800 Part
III line 1h and line 38, Schedule 3 line 6a, and Form 1040 line 20 carry
$1,975 once. Total tax is $23,092 against $30,000 withholding, yielding a
$6,908 refund. All 16 pages, including nine Form 3800 pages, two Form 6251
pages, and two Form 8820 pages, were rendered and visually checked for
form/revision, filer, source amounts, marks, page order, blank continuation
rows, and legibility. The read-only checker passed **1 case / 16 pages**
with source replay, artifact hashes, page origins, and local TY2025v5.4 XSD.
Manifest SHA-256 is
`02cf1d73c0c557acd9e029ee6bda4ae8987d374cdad04427e6df7a5400329279`;
checker log `.state/research/ty2025-orphan-drug-check-2026-10-04.log` has
SHA-256 `468671a473943deef8fe25c6c99cad44e0cff856f622e5ec8a1fc8797f0e7937`.
The distinct completed inventory reaches **170 fixture IDs / 1019 pages**,
with 15 fixture IDs lacking completed page flags. The separate new-markets
credit fixture failed closed on its existing authenticated CDE-status and
recapture-history guard; no review flag was claimed for it. Issued source
bytes, other business-credit routes, complete all-page review, IRS business
rules, and ATS acceptance remain open.

## Empowerment-zone employment-credit filled-page review (2026-10-04)

The `single-empowerment-zone-employment-credit` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-empowerment-zone-credit/`
contains 17 filled pages. Form 8844 uses its March 2020 revision and
calculates 20% of $10,000 qualified wages for a $2,000 credit. Schedule C
prints $8,000 of wages after the matching $2,000 reduction against $8,000
receipts, leaving zero net profit. Form 3800 Part III line 3 and Section B
allow the $2,000 credit; Schedule 3 line 6a and Form 1040 line 20 each carry
it once. Total tax is $15,867 against $20,000 withholding, yielding a
$4,133 refund. All 17 pages, including two Schedule C pages, nine Form
3800 pages, two Form 6251 pages, and Form 8844, were rendered and visually
checked for form/revision, filer, source amounts, marks, page order, blank
continuation rows, and legibility. The read-only checker passed **1 case /
17 pages** with source replay, artifact hashes, page origins, and local
TY2025v5.4 XSD. Manifest SHA-256 is
`b078ee71dfa7167a74ba08a09020b4d6d76d7ca20ed1055a2689f981290bae91`;
checker log `.state/research/ty2025-empowerment-zone-check-2026-10-04.log`
has SHA-256 `6e446273def30c24af0e0436519ccdae1377579228b6363f9c256b63a02aaeb1`.
The distinct completed inventory reaches **171 fixture IDs / 1036 pages**,
with 14 fixture IDs lacking completed page flags. Issued payroll and zone
evidence, other business-credit routes, complete all-page review, IRS
business rules, and ATS acceptance remain open.

## Two-facility Form 8835 filled-page reviews (2026-10-04)

The `single-two-geothermal-business-credits` and
`single-wind-and-geothermal-business-credits` packets in
`.state/research/ty2025-filled-pdf-review/2026-10-04-two-geothermal-credit/`
and `.state/research/ty2025-filled-pdf-review/2026-10-04-wind-geothermal-credit/`
contain 20 filled pages each. Both print two distinct 2025 Form 8835 copies,
each with 100,000 kWh at $0.006 and a $600 source credit. The first packet
has separate 10 and 20 Plant Rd geothermal sites. The second has a 30 Wind
Farm Rd wind site on Form 8835 line 1a and a 10 Plant Rd geothermal site on
line 1c. Form 3800 Part III line 4e and two Part V line 4e rows carry
$1,200; Schedule 3 line 6a and Form 1040 line 20 carry it once. The
$25,067 regular tax and $16,094 TMT permit the full credit, yielding
$23,867 total tax and a $6,133 refund against $30,000 withholding. Every
page in the first packet was rendered and visually reviewed. For the second,
17 pages were pixel-identical to the first packet and all three changed
pages were visually reviewed. Both read-only checkers passed **1 case /
20 pages** with source replay, artifact hashes, page origins, and local
TY2025v5.4 XSD. The first manifest SHA-256 is
`f0c4e16fbc6a8e1b40b98a6a8a42bfb7b5cce75c6df3c14a3340c624f416857b`;
its checker log `.state/research/ty2025-two-geothermal-check-2026-10-04.log`
has SHA-256 `3af40e3d3da643db93c766915d3c50a7f94ed1af38d242aedcd523c341f0c652`.
The second manifest SHA-256 is
`3ff06e324b39be2e9fcf34359071baaff948e88d8a8a86922eb83d547bbdd6e6`;
its checker log `.state/research/ty2025-wind-geothermal-check-2026-10-04.log`
has the same SHA-256 as the first log because the selected-scope output was
identical. The distinct inventory reaches **173 fixture IDs / 1076 pages**,
with 12 fixture IDs lacking completed page flags.

## Two-business Form 8995-A loss-netting filled-page review (2026-10-04)

The `single-form8995a-two-business-loss-netting` packet in
`.state/research/ty2025-filled-pdf-review/2026-10-04-form8995a-loss/`
contains 12 filled pages. Two Schedule C copies print North Works' $1,300
profit and South Shop's $1,000 loss; Schedule 1 carries their $300 net
income. Schedule C (Form 8995-A) nets those source businesses to $300
qualified business income. Parent Form 8995-A applies its $50 W-2-wage
limit and carries $50 to Form 1040 line 13a. Form 8960 prints zero net
investment income tax. All 12 pages were rendered and visually checked for
form/revision, filer, source amounts, marks, page order, blank continuation
rows, and legibility. The read-only checker passed **1 case / 12 pages**
with source replay, artifact hashes, page origins, and local TY2025v5.4
XSD. Manifest SHA-256 is
`05b13979c27a01ecb9d90b1dc7119a3078ce3f96e387ddb38bec90b37dee5fa4`;
checker log `.state/research/ty2025-form8995a-check-2026-10-04.log` has
SHA-256 `5076c7d89f7c49c2e1e4c310b30bb9697b2127b056feb0cec8b8d5c081e5c637`.
The distinct completed inventory reaches **174 fixture IDs / 1088 pages**,
with 11 fixture IDs lacking completed page flags. The separate Form 461
fixture failed closed on its existing sourced net-QBI-loss carryforward
requirement. Issued business source records, other QBI branches, complete
all-page review, IRS business rules, and ATS acceptance remain open.

An additional repeated-instance archive check reuses this source fixture. It
asserts two distinct native Schedule C document IDs, two two-page PDF origins,
and byte-identical return XML inside the local submission ZIP. On 2026-10-04,
`deno test -A forms/f1040/2025/pdf/joint-mixed-source-return.test.ts` passed
**3/3** after correcting the test Submission ID to the processing date's
Julian day. This is local source-to-package evidence for one two-business
shape, not the remaining repeated-owner or IRS acceptance gate.

## Schedule C conditional-answer review invalidation (2026-10-04)

The current source/native/PDF guard leaves Schedule C line J unanswered when
line I is No, and line 47b unanswered when line 47a is No, following the
[2025 form](https://www.irs.gov/pub/irs-prior/f1040sc--2025.pdf). Twelve
checked-in synthetic fixtures formerly supplied the inapplicable J = No answer.
All 12 had completed page flags in older selected review manifests, covering
**170 pages**. A direct replay of all 12 corrected fixtures through the
return graph, prepared native bundle, and full printable PDF passed with
unchanged 10–24-page counts. The current-source selected packet is at
`.state/research/ty2025-filled-pdf-review/2026-10-04-schedule-c-conditional-12/`.
All 12 native returns passed the local TY2025 v5.4 XSD. A rendered comparison
against the SHA-verified prior packets found 130 pixel-identical pages and 40
changed pages: 12 Schedule C line J checkbox corrections and 28 pages with
current whole-dollar calculations. The changed areas were visually checked;
the unchanged page areas retained their prior visual review. The current
selected-scope checker then passed **12 cases / 170 pages**, including source,
XML, PDF, template-cache, page-checklist, and XSD replay; see
`.state/research/ty2025-schedule-c-conditional-check-complete.log` and
`.state/research/schedule-c-conditional-visual-diff/comparison.json`. The
earlier **174 fixture IDs / 1,088 pages** remains a historical cross-packet
inventory rather than a single current-head full-inventory checker result.
IRS business-rule and ATS acceptance gates remain separate.

## Current 186-fixture native eligibility probe (2026-10-05)

The current checked-in planner has **186** source fixtures, including a new
four-account Form 6781 case. A read-only probe
executed each source through the return graph and prepared native MeF bundle:
**175** reached a native return and **11** stopped at explicit guards. The
blocked set comprises one Form 8862 prior-notice proof case, two W-2G payer-copy
cases, seven direct Form 8874 New Markets credit cases requiring authenticated
CDE/recapture history, and one Form 8995 loss case needing a sourced QBI
carryforward. The exact IDs and errors are retained in
`.state/research/ty2025-fixture-probe-after-6781.log`, with the 175-case
generation selection in `.state/research/ty2025-exportable-175-selection.json`.
This is native eligibility evidence, not a 186-case PDF or visual-review pass;
the guarded cases remain on their existing checklist routes.

## Current 175-case filled-PDF review replay (2026-10-05)

The selected current-source packet at
`.state/research/ty2025-filled-pdf-review/2026-10-05-exportable-175-final/`
contains **175** source JSON, native XML, and filled-PDF trios totaling
**1,091 pages**. All 175 native returns passed the locally cached TY2025
v5.4 XSD. The 11 explicitly guarded fixtures are listed as exclusions in its
manifest. The final manifest SHA-256 is
`6b1c6635e516488b3c8ca274d787c2fad9bb35f0c84d6a707209811bde08d820`.

Every current PDF and page-origin list matched a previously completed visual
review byte for byte. The provenance map at
`.state/research/ty2025-exportable-175-review-provenance.json` records the
prior reviewed manifest selected for each case. Sources matched exactly for
173 cases. The other two source differences were a signed-payment evidence
byte/digest and a review-focus wording correction; their PDF bytes were
unchanged. Native XML bytes matched for 125 cases; the remaining XML changes
removed empty Schedule 1 documents or shifted document IDs, with no changed
tax-field leaf values. Current-source page flags retain the exact-PDF visual
observations, and the read-only checker passed **175 cases / 1,091 pages**,
replaying source, XML, PDF, template cache, page origins, artifact hashes, and
local XSD. Its log is
`.state/research/ty2025-exportable-175-final-check.log`.
This completes the selected eligible packet review, not the frozen board's
all-route PDF requirement or IRS business-rule and ATS acceptance gates.

## Source/PDF full regression checkpoint (2026-10-05)

After the source-copy, Form 6781, and Form 4852 fixture corrections, the full
`PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` command passed
**11,170/11,170**, zero failures, zero ignored, in 33m47s. The code commit was
`a7666ae0`; the subsequent `fd3813f2` commit changed only ATS documentation
during the run. The retained log is
`.state/research/ty2025-full-test-2026-10-05-after-source-pdf.log` with
SHA-256 `336eeb4c3edde047cb261659d8b0ffa077065507717d77cd70570e61d03ea4b8`.
Tool versions: Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, and Poppler
`pdftotext` 26.09.0. This checkpoint predates the later Form 8888/8853 and
Form 8880/8839 edits.

## Bounded refund, MSA, adoption, Saver's Credit, and ATS review (2026-10-05)

The Form 8888 spouse-account guard and bounded Form 8853 PDF correction passed
25 focused native/PDF tests. The filed Archer MSA PDF at
`.state/research/ty2025-filled-pdf-review/2026-10-05-form8853-bounded/`
has one visually inspected page; PDF SHA-256 is
`51629ead08afa21309bcf7cce4c5dae33647671ebae6ceec353bda5c6ad82436`.
Form 8839 now selects only its applicable page 1. The reviewed one-child
packet at `.state/research/ty2025-filled-pdf-review/2026-10-05-form8839-page/`
has four pages total and one visually inspected Form 8839 page; PDF SHA-256 is
`41498d4497f6462c838eb7ec2de9e7c0f6db5f7922b346f6a86159506521a8ca`.
The new Form 8880 W-2 source guard passed 22 focused native/PDF tests; the
wider related batch covering Form 8880, Form 8839, and ATS cases passed
**139/139**. Deno check, lint, formatting, and `git diff --check` passed on the
edited code. A full `deno task test` rerun after the final code edits is in
progress; no full-batch pass is claimed for that head yet.

## Form 8396 corrected selected packet (2026-10-05)

The new selected packet at
`.state/research/ty2025-filled-pdf-review/2026-10-05-exportable-175-after-8396-8880/`
was generated from the 175-case selection and passed local TY2025 v5.4 XSD
validation for every native return. It has **1,090 filled pages**. All 175
source JSON and native XML files match the prior reviewed packet byte for
byte. Among PDFs, 174 match byte for byte; only the existing Form 8396 case
changed from five pages to four by removing its IRS instructions and
record-only worksheet. The four retained pages are pixel-identical to their
previously reviewed pages at 120 dpi. The corrected Form 8396 page was also
rendered and visually inspected; its certificate, $6,000 eligible interest,
20% rate, $5,075 line-8 limit, and $1,200 credit remain legible. Comparison
provenance is in
`.state/research/ty2025-exportable-175-after-8396-8880-provenance.json`.
The regenerated manifest SHA-256 is
`7f1e13e1f20fa48f203a0f667a9bbbc1071bc44a17155646f1c0a29f57e4bf89`.
Review flags were transferred only after those exact-byte/pixel checks. The
read-only checker passed **175 cases / 1,090 pages**, including source replay,
artifact hashes, page origins, template cache, and local XSD. Its log is
`.state/research/ty2025-exportable-175-after-8396-8880-check.log` with
SHA-256 `2f6cc311fee74671e57271edd2a209a6e934987a808bdeb099b5e24ac2fe2de7`.
This selected packet does not close the frozen
all-route PDF, IRS business-rule, or ATS gates.

## Form 4255 and annual Form 8854 bounded page audit (2026-10-05)

Two registered but source-gated PDF descriptors now retain only their populated
official form pages. Form 4255's EP-only candidate keeps Part I pages 1–3 and
excludes the recapture-only Parts II and III on pages 4–5; the guard rejects
nonzero recapture amounts. Annual Form 8854 keeps shared Part I page 1 and
Part III pages 4–5, excluding initial-statement Sections B/C on pages 2–3.
Neither edit changes source, native MeF, or the positive-export gates described
in the [Form 4255](ty2025-form4255-pdf-gap.md) and
[Form 8854](ty2025-form8854-pdf-gap.md) gap notes.

The two focused test files passed **6/6** tests. `deno check`, `deno lint`, and
`git diff --check` passed on their four descriptor/test files. Direct staged
descriptor PDFs were assembled with the same page selection used by the packet
builder. Each has three pages; all six were rendered and visually inspected.
Form 4255 retained its EP rows and line 3 totals; Form 8854 retained its
annual identity, deferred-property row, and no-distribution answers. These
checks do not establish an authenticated full-return export or XSD validation
for either gated route, and they do not alter the 175-case selected manifest.

## Current-source Schedule A line 8a replay (2026-10-05)

The Schedule A export guard now requires retained Form 1098 for a positive
line 8a. Four unrelated Form 8283 selected fixtures had supplied an artificial
$12,000 line 8a with no Form 1098; their current sources omit that claim. The
historical gift-packet amounts above refer to the older source and are
superseded for these four cases by this review:

| Selected case | Noncash gift | Itemized deduction | Form 1040 tax | Refund |
| --- | ---: | ---: | ---: | ---: |
| Ordinary noncash gift | $1,200 | $25,200 | $11,376 | $4,624 |
| Capital-gain reduction gift | $3,000 | $27,000 | $10,980 | $5,020 |
| Donor-prepared manuscript reduction | $300 | $24,300 | $11,574 | $4,426 |
| Two short-term reduced gifts | $1,400 | $25,400 | $11,332 | $4,668 |

The selected packet at
`.state/research/ty2025-filled-pdf-review/2026-10-05-exportable-175-after-line8a/`
contains 175 current-source JSON/native XML/filled-PDF trios and 1,090 pages.
Compared with the prior checked packet, 171 trios are byte-identical. Only the
four listed source/XML/PDF trios changed. Their page counts, origins, and
owners are unchanged; eight changed Form 1040 page 2/Schedule A pages were
rendered and visually inspected, and their other 11 pages are pixel-identical
at 120 dpi. The changed pages show blank line 8a, the sourced state tax and
noncash gift, and the corrected Form 1040 tax/refund; source pending values and
native XML reconcile. Comparison and page hashes are retained in
`.state/research/ty2025-line8a-packet-provenance.json` (SHA-256
`32aed4ef7e0333ae8a8c71b782e33e0489398407bdf02b80a073b98222904faf`).

The selected manifest is SHA-256
`2fe95f99e128772497bd86294e422ecd402df0dbb2a217ae7153e15abb3aa186`.
The read-only checker passed for all 175 cases and 1,090 pages, including
source replay, artifact hashes, page flags/origins, and local TY2025 v5.4 XSD;
its log is `.state/research/ty2025-exportable-175-after-line8a-check.log`
with SHA-256
`2f6cc311fee74671e57271edd2a209a6e934987a808bdeb099b5e24ac2fe2de7`.
This selected review does not complete the 11 guarded fixtures, all-route
business-rule review, IRS ATS-effective schema validation, or IRS acceptance.

## Full regression after Schedule A source-presence guard (2026-10-05)

The same `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` command ran
against the Schedule A source-presence code later committed as `430dc5aa`.
It finished with **11,181 passed, 2 failed, 0 ignored** in 33m47s. Its log is
`.state/research/ty2025-full-test-2026-10-05-after-line8a-pages.log`, SHA-256
`90b8b53b53a669f5a828de75138a7a83a3b3101ec3650233536f8df05bbac595`.
Both failures were older artificial line 8a fixtures with no Form 1098: the
Form 4952 investment-interest case and the single $33,000 itemized XSD case.
Each now retains a matching $20,000 or $18,000 deductible Form 1098 box 1
source and passes its focused test. No production guard was loosened. The
combined parity, Form 5329 page, and ATS corrections require a fresh full run;
that run is tracked separately below.

## Current-source Form 5329 page replay (2026-10-05)

The selected packet at
`.state/research/ty2025-filled-pdf-review/2026-10-05-exportable-175-after-f5329/`
has **175 source/native XML/filled-PDF trios and 1,087 pages**. All source JSON
and native XML artifacts are byte-identical to the preceding 1,090-page
packet. The PDFs are byte-identical for 173 cases. Only the early-IRA Form 5329
case and the paired-HSA current-excess case changed: the former drops blank
Form 5329 pages 2–3 and retains its populated Part I page; the latter drops
blank Form 5329 page 3 and retains the Part VII HSA page before two Form 8889
owner copies. All 15 retained pages across these two cases are pixel-identical
to their previously inspected pages at 120 dpi. The three dropped pages were
also visually inspected as blank; the current Form 5329 and following Form
8889 order was checked. Page mapping and hashes are in
`.state/research/ty2025-f5329-packet-provenance.json` (SHA-256
`5e61c895cdafc3dcf02b6ea480d2264d7a29c15487c7a8fdf98562cc72b60d83`).

The selected manifest is SHA-256
`1e66007c0a44861da4e3003aebd3817cfc8c2da51faca0a04a66f6680a44d57a`.
The read-only checker passed all 175 cases and 1,087 pages, including source
replay, PDF/XML hashes, page flags/origins, and local TY2025 v5.4 XSD. Its log
is `.state/research/ty2025-exportable-175-after-f5329-check.log`, SHA-256
`162abbb33324c314c43db3642a0b1ccc87317b8ec144c4ae7f4c57211fdc2051`.
The 11 guarded cases, wider filing routes, business rules, ATS-effective schema,
and IRS acceptance remain open.

## Integrated full regression (2026-10-05)

After sourcing the two rejected Schedule A fixtures and integrating exact Form
1098 line 8a parity, Form 5329 page selection, and the partial NR2 ATS source
correction, `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` passed
**11,188 tests, 0 failed, 0 ignored** in 33m46s. The code snapshot was committed
as `632d3a46`; subsequent commits through `c51194ea` changed only documentation.
The log is `.state/research/ty2025-full-test-2026-10-05-integrated.log`,
SHA-256 `73562b8c5ac74b2048632db29e1bde55be8fba2652776b3083f89cbeef607c9a`.
The run used Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, and Poppler
`pdftotext` 26.09.0. No ignored-test reason applies. The selected 1,087-page
packet passed separately above. These local checks do not close the 52 open
board TODOs, IRS business-rule review, current ATS schema date, or acceptance.

## Current-source Form 6251 page replay (2026-10-05)

The selected packet at
`.state/research/ty2025-filled-pdf-review/2026-10-05-exportable-175-after-f6251/`
contains 175 source/native XML/filled-PDF trios and 1,073 pages. All source JSON
and native XML artifacts are byte-identical to the preceding checked packet.
Fourteen PDFs change: each omits its blank Form 6251 Part III page 2. The 14
removed pages pixel-match the blank official Form 6251 template at 120 dpi;
all 201 retained pages across those returns pixel-match the prior inspected
packet. The remaining 161 PDFs are byte-identical. Page-origin replay and
review notes are retained in the new manifest.

The read-only checker passed all 175 cases and 1,073 pages, including source
replay, PDF/XML hashes, page flags/origins, and local TY2025 v5.4 XSD. Its log
is `.state/research/ty2025-exportable-175-after-f6251-check.log`, SHA-256
`4fdfb30922622dbddf7167a04456d8ffdd26e751f7d769c893b8dd5d713c8a9d`; the
Form 6251 pixel comparison log is `.state/research/ty2025-f6251-page-replay.log`,
SHA-256 `37a4237882d037ad48064d6cb7dfdc9a54a63ff04ec2b78d08a85119c2b6f204`.
The manifest SHA-256 is
`1b2584447d6fb72b1f2a843668ba5ff2c61dad592d9d74d52e387394ed1d19d8`.
The 11 guarded cases, wider filing routes, business rules, ATS-effective schema,
and IRS acceptance remain open.

## Focused follow-up checks (2026-10-05)

After the prior clean integrated 11,188-test run, the Form 6251 page selector
passed 14/14 focused tests. Manual Form 4835 at-risk inputs now fail closed;
the related Form 6198 suite passed 10/10 and `deno check` passed. ATS Scenario 3
Form 4835 source facts passed 6/6 focused tests. ATS Scenario 5 education-source
distinctions passed 32/32 focused source tests. These focused results do not
replace a full regression or establish complete ATS scenario acceptance.
The new Form 8863 dependent-identity guard and updated positive-return fixture
passed all 8 focused tests, including TY2025 v5.4 `Return1040.xsd` validation.

The bounded Form 8911 personal-use charger route passed four direct PDF
projection cases and three Schedule 3 line 6j cases. Its selected graph fixture
passed the local TY2025 v5.4 XSD and now checks the native parent/Schedule A
amounts against both registered PDF projections, including rejection when the
finalized Schedule 3 credit changes. The focused graph/XSD command was
`deno test --allow-read --allow-write --allow-run=xmllint --allow-net=www.irs.gov --filter='single-personal-home-charger-credit' forms/f1040/2025/pdf/review-fixtures.xsd.test.ts`
(1 passed, 0 failed, 186 filtered out); the direct command
`deno test forms/f1040/2025/pdf/forms/f8911.test.ts forms/f1040/2025/pdf/forms/schedule3_line6d.test.ts`
passed 7/7. Filled-page visual review, other Form 8911 shapes, the full batch,
and ATS acceptance remain open.

After adding the Form 8863 student-identity guard, the selected LLC fixture was
corrected to identify the primary filer as its student. The regenerated Form
8863 page was visually inspected; its four companion pages are text-identical
to the previously reviewed PDF. The read-only selected-packet checker then
passed all 175 cases and 1,073 pages, including regenerated source/XML/PDF hash
replay and local TY2025 v5.4 XSD. Log:
`.state/research/ty2025-exportable-175-after-f8863-identity-check.log`,
SHA-256 `4fdfb30922622dbddf7167a04456d8ffdd26e751f7d769c893b8dd5d713c8a9d`;
updated manifest SHA-256
`590c79d23d81f155440ed030510a4ed961bcc956a1f1c2da05ae25a80936765d`.

A new joint-owner unemployment replay uses separate taxpayer and spouse 1099-G
copies: $7,000 gross less $600 repaid reaches Schedule 1 and Form 1040 as
$6,400, and $400 withholding reaches line 25b. Native XML validates against
local TY2025 v5.4 XSD; the filled PDF text contains both amounts. Changing the
spouse copy's recipient TIN rejects in native and PDF export. The focused
`joint-mixed-source-return.test.ts` case passed 1/1 with `xmllint` and
`pdftotext`; this bounded synthetic joint-owner check does not complete the
broader source/duplicate/correction matrix or visual review.

## Integrated real-Poppler full regression (2026-10-05)

The full `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` run started
at code commit `8c0cb4e2` on October 5 at 16:42 UTC and completed at 17:16
UTC. It passed **11,197 tests, 0 failed, 0 ignored** in 34m04s. Tool versions:
Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, and Poppler 26.09.0. The
complete log is `/tmp/opentax-deno-task-test-poppler-2026-10-05.log`, SHA-256
`9ecc6822ecd5a89944baa03af3bed2d3acc0ec2f65c105fd33714b8d898b6da3`.
No ignored-test reason applies. The four Form 8863 fixtures corrected after
the previous run and the three Form 3800 page counts now pass with the real
Poppler tools; the temporary PDFKit extraction differences also disappear.

The later Form 7217 liquidating section 732(c) case was added after the XSD
file had loaded in this full run and passed its own focused local-XSD test
1/1. The full result therefore covers the `8c0cb4e2` code snapshot, while
later focused evidence is recorded separately. Neither result proves every
retained filing route, IRS business rules, the ATS-effective package, or IRS
acceptance.

## Focused two-loan purchase-points limit after full regression (2026-10-05)

At integrated commit `cebb61cb`, the bounded purchase-points route applies
the 2025 Publication 936 Table 1 ratio to both reported interest and points.
A $300,000 July principal-home mortgage plus a $650,000 full-year elected
second-home mortgage produces a $950,000 combined average and 0.789 ratio.
The $18,000 interest claim becomes $14,202 and $3,000 points become $2,367,
for $16,569 on Schedule A and Form 1040. Wrong points, interest, and filed
PDF-projection totals reject. A three-page filled PDF was generated and the
Schedule A projection was checked against that amount; this does not replace
per-page visual inspection or issuer-byte authentication.

The integrated source/native/PDF focused set passed 82/82, log
`/tmp/opentax-f1098-points-integrated-focused.log`, SHA-256
`95471d1bbb80552744aed37332ef82d5a80df89fe41c50fe0380c2b2e991e5d1`.
The original under-limit and new over-limit full-return XSD cases passed 2/2,
log `/tmp/opentax-f1098-points-integrated-xsd.log`, SHA-256
`87c042be1696d75a3a357c49a68a37a017cde8d150e62dbab2756eb76010f8e7`.
The 11,197-test full run above predates this code change; current-head full
regression, other mortgage combinations, business rules, and ATS remain open.

The same capped-points source was regenerated through the actual prepared
return and PDF builder. The resulting three-page packet at
`/tmp/opentax-f1098-capped-points.pdf` has SHA-256
`d1ec58951419c720351d791526b33f2959117d79e7a498f6005e05957b4359eb`.
All three rendered pages were inspected at 1200-pixel scale: the filled
Schedule A page visibly prints **16,569** on lines 8a, 8e, 10, and 17; Form
1040 page 2 visibly prints **16,569** on line 12e. Poppler text extraction
confirms those line amounts, and the prepared native XML contains the matching
`RptHomeMortgIntAndPointsAmt`. The source is synthetic; lender-issued bytes and
IRS business-rule/ATS acceptance are still unverified.

## Focused MFS two-loan mortgage-limit route (2026-10-05)

`deno test -A forms/f1040/nodes/inputs/f1098/index.test.ts` passed 59/59.
`deno test -A --filter 'MFS two-loan interest uses' forms/f1040/2025/mef/xsd-validation.test.ts`
passed 1/1 against the local TY2025 v5.4 XSD and built a three-page filled
PDF. `deno check` passed for both changed tests. The $900,000 average debt,
$375,000 MFS limit, 0.417 ratio, and $36,000 reported interest produce
$15,012 on Schedule A and Form 1040. Missing workpaper evidence rejects.
The actual prepared packet `/tmp/opentax-f1098-mfs.pdf` has SHA-256
`8a5403a8a9fcf63ede5879a64d96708921e888c5b09fa22122574b0a7459ffbd`.
All three pages were rendered and visually reviewed at 1,200-pixel scale;
the MFS and spouse-itemizing marks, Schedule A lines 8a/8e/10/17, and Form
1040 line 12e match the prepared native amount. Poppler text confirms them.
This focused evidence follows the 11,197-test full run above; no current-head
full regression, source-byte authentication, IRS business
rules, or ATS acceptance is claimed.

The reusable MFS fixture `mfs-two-loan-mortgage-limit` increases the planner
to 187 synthetic cases while keeping 116 registered PDF descriptors and 85
covered PDF keys. Its selected packet under
`/tmp/opentax-mfs-review-20261005/` passed the read-only checker for one
case and three pages, including source/PDF/XML hashes, page origins, complete
visual checklist, and local TY2025 v5.4 XSD. The completed manifest SHA-256
is `3525619e478c9f2a05d6d6364a0737687dbea658345085e81e9614926dda2bd7`;
the PDF SHA-256 is
`e648b0a02b021f6b3ccb63662ef71683dc4fbc598fbd030ceacb51edee6ecafc`.
An independent regeneration after fixture formatting produced identical
source, XML, and PDF hashes. The selected packet has not been merged into the
earlier 175-case manifest; the 11 guarded cases and other route gaps remain.

The bounded three-country Form 1116 interest and mixed interest/dividend
tests correct Germany's IRS country code from `DE` to `GM`. Both assembled
returns pass local TY2025 v5.4 XSD and build PDFs with two Form 1116 parent
and two Schedule B pages. A Germany+`DE` source rejects in the interest
native/PDF path. Seven focused tests pass; page presence does not substitute
for visual inspection or other country-code coverage.

## Integrated follow-up and full-regression failure (2026-10-05)

The full `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task test` run at
`45f51899` passed 11,210 tests and failed one in 34m24s. The only failure
was an older positive W-2G end-to-end source fixture with no calendar year;
the strengthened production guard correctly requires 2025. Its log is
`/tmp/opentax-deno-task-test-45f51899.log`, SHA-256
`143b2cbb20f8f5123169d4358a9b2e351076a975519242747086bd092014380e`.
The fixture now supplies 2025, and its focused test passes 1/1.

The integrated W-2G, A2A archive, Form 1098-E, Form 1116 XSD/PDF, and K-1
country-code suites pass 163/163 with real Poppler. The log is
`/tmp/opentax-integrated-followup-focused.log`. The A2A archive suite passes
28/28 and the Form 1098-E phaseout/reconciliation suite passes 14/14. The
central country-code allowlist comes from the local TY2025 `efileTypes.xsd`;
German `GM` passes while ISO `DE` and `ZZ` reject. A new full regression on
the integrated head is pending; local XSD does not establish IRS business-rule
or ATS acceptance.

The next full command at `536d8b7c` exposed an obsolete Form 1116 negative
test that expected a final-export error after the shared validator had already
rejected ISO `DE` at source intake. The test now asserts both intake rejection
and final rejection of a tampered retained source; its four-case suite passes.
The long run was stopped after code integration began, so its partial output
is diagnostic only and has no full-pass claim.

On the integrated follow-up branch, the Form 1116, RRB pension/withholding,
Form 1040 PDF, and ATS Scenario 13 suites pass **112/112** in
`/tmp/opentax-integrated-oct5-focused-a.log`. The SSA/lump-sum and A2A
archive/submission suites pass **108/108** in
`/tmp/opentax-integrated-oct5-focused-b.log`. These runs cover the newly
integrated code paths but not the repository-wide gate. A fresh full command
is pending after integration.

The next isolated integration of SSA/RRB issued-copy identity, Schedule B IRS
country codes, and Form 1116 printable country names passed **178/178** focused
tests in `/tmp/opentax-integration-oct5-focused.log`. The corrected
three-country Form 1116 packet was rendered and reviewed on all eight pages;
its hashes, source/native/PDF reconciliation, and local XSD result are recorded
in the [Form 1116 gap note](ty2025-form1116-main-pdf-gap.md). The complete
repository-wide run on this later code has not yet been performed.

The following isolated Form 8283, Form 6251/Form 59E, and Form 8962 source
guards passed **25/25** combined focused tests after cherry-pick into one
integration worktree at `96f9267d`. The command was
`deno test -A forms/f1040/2025/pdf/form8283-unrelated-use-equipment.test.ts forms/f1040/2025/form6251_circulation_source.test.ts forms/f1040/nodes/inputs/f59e/index.test.ts forms/f1040/2025/form8962_two_dependent_magi.test.ts`.
The full repository command is running separately at the preceding PR head
`9d700e2d`; these later guards require a new current-head full rerun.

The Form 2210-F return-reference, first-year Roth Form 8606 owner, and Form
8995 zero-deduction business-loss guards passed **147/147** integrated focused
tests at `07252bcf`, using the calculator/source/native/PDF suites plus local
Form 8995 full-return XSD checks. The first run had four fixture XSD failures
solely because this isolated worktree lacked the ignored local schema cache;
linking the existing read-only cache and rerunning the same command passed.
The log is `/tmp/opentax-integration-next-focused-b.log`. The full repository
run on these latest guards is still pending.

Form 4255 staged-row uniqueness and Form 8889 PDF owner/value projection pass
**32/32** combined focused source/native/PDF tests at `a9019231`; the log is
`/tmp/opentax-integration-next-focused-c.log`. The Form 8889 agent also ran
74 wider HSA route cases successfully. The main full regression still targets
the preceding `9d700e2d` commit, not these later isolated guards.

The revised shared-record Form 8962 corrected-SLCSP guard passed **3/3**
integrated three- and four-policy end-to-end tests at `fb29e07e`; the log is
`/tmp/opentax-integration-next-focused-d.log`. A broader adjacent agent run
passed 5/5. The rejected first proposal would have barred a legitimate shared
record and was never integrated.

All 17 affected source, calculation, native, PDF, and full-return XSD test
files for the nine later guards were then run together at `797300ba` in the
isolated integration worktree: **207 passed, 0 failed**. The command output is
`/tmp/opentax-integration-next-focused-all.log`; the local TY2025 v5.4 XSD
cache was linked read-only from the main checkout. This combined focused
result does not replace the pending repository-wide regression.

The next Form 7206, Form 1116 Schedule B, and 2025 refinance Form 1098
integration passed **42/42** focused tests with real Poppler and the read-only
TY2025 v5.4 schema cache after a Form 7206 ambient Schedule SE interaction
was fixed. The exact command and output are in
`/tmp/opentax-integration-next-focused-f.log`. The full run on this combined
branch remains pending; the live full run still targets `9d700e2d`.

The real-Poppler repository-wide `PATH=/tmp/opentax-poppler-env/bin:$PATH deno
task test` run at `9d700e2d` began `2026-10-05T19:48:03Z` and ended
`2026-10-05T20:29:49Z`: **11,225 passed, 0 failed, 0 ignored** in 41m26s.
The log is `/tmp/opentax-deno-task-test-9d700e2d.log`, SHA-256
`f5f726c6a7c69b823ae44b7d07b36deaffb7adc0b19cc1cb876714112c2fbbf0`.
The one-shot launchd job exited 0 without restarting.

The subsequent exact-commit run at `615809a4` began
`2026-10-05T20:15:39Z` and ended `2026-10-05T20:57:33Z`: **11,220 passed,
1 failed** in 41m27s. Its log is
`/tmp/opentax-deno-task-test-615809a4.log`, SHA-256
`ae08f24ecf1d361d607e07618bd17cc680a62ad38e5631ef9d6ef1c3272c8571`.
The sole failure was the EIC duplicate-dependent negative test expecting its
later EIC diagnostic after the new Form 8962 duplicate-SSN source guard had
already rejected the input. The test now asserts the source-stage diagnostic;
its EIC and Form 8962 focused suites pass **10/10** in
`/tmp/opentax-eic-8962-regression-fix.log`. A new full run is required.
Both runs used Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, and Poppler
26.09.0.

The exact-code-head rerun of `PATH=/tmp/opentax-poppler-env/bin:$PATH deno task
test` at `a268f60c` began `2026-10-05T21:00:46Z` and ended
`2026-10-05T21:41:29Z`: **11,233 passed, 0 failed, 0 ignored** in 40m17s.
The one-shot job exited 0. Its log is
`/tmp/opentax-deno-task-test-a268f60c.log`, SHA-256
`31aef7bcbf30ed92b677897f7b8d85775a213f0a9021c7cad5b3bedda4d49890`.
Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, and real Poppler 26.09.0 were
used. The corrected EIC negative assertion passed in the full batch. This
regression pass does not close the remaining source-proof, visual-review,
IRS business-rule, or ATS acceptance gates.


## October 6 positive-route integration

Code at `a3c048f82` integrates Form 8962 one-policy family cap tiers, the MFS Form 6251 basis crossover (including spouse identity), the above-$5,000 Section A patent route, and the full-return Form 8864 discovery/allocation repairs. Source, native, XSD and filled-PDF verification across the four route suites passed 19/19; `/tmp/opentax-positive-integration-oct5.log` records the command and output. The final Form 8864/review-source/scope check passed 4/4 in `/tmp/opentax-8864-final-oct6.log`, including wrong allocation and AMT negatives. The earlier broader Form 8864 affected suites passed 27/27 in `/tmp/opentax-8864-focused.log`. Each full-return case validates XML against the local TY2025 v5.4 schema; the patent test performs that step when the ignored cache is present, as it was for this replay.

Root visually inspected all 23 Form 8864 pages, all five patent packet pages, and the eight-page MFS packet, then rechecked its corrected spouse identity on page 1. Artifact hashes and source limits are in the matching gap notes. The Form 8962 cap fixtures generated filled PDFs and tested their line 28/29 projections; that is not a complete manual page-review claim.

The planner reports 188 source fixtures, 116 descriptors, 113 distinct PDF keys, 86 fixture-covered keys and 27 uncovered keys. Neither these counts nor focused passes close parent TODOs or IRS gates. The latest whole-repository green baseline remains `a268f60c`; the new integrated code needs its own full regression.

## October 6 isolated filing and review checkpoint

The stable full regression of `8aa4beeec` remains live under the one-shot
launchd job `opentax-full-regression-8aa4beeec`, PID 44462, started
`2026-10-05T22:02:12Z`. Root revalidated the live process at 22:17 UTC;
its log `/tmp/opentax-deno-task-test-8aa4beeec.log` was progressing through
full-return XSD cases. No terminal result is asserted for that run.

Later changes are committed in `/tmp/opentax-root-integration-oct6`, through
code snapshot `2347f6ce0`. They have not changed the running main-checkout
code. With real Poppler on PATH, these exact focused commands passed:

- `deno test -A forms/f1040/2025/form4972_two_spouse_nua_capital.test.ts forms/f1040/2025/pdf/form4952-misc-royalty-interest-traced-debt-route.test.ts forms/f1040/2025/pdf/form4952-misc-royalty-traced-debt-route.test.ts`: 4 passed, 0 failed.
- `deno test -A forms/f1040/2025/form8995a_schedule_c_positive.test.ts forms/f1040/2025/pdf/form1040-required-zero-lines.test.ts forms/f1040/2025/pdf/forms/f1040.test.ts`: 34 passed, 0 failed.
- `deno test -A forms/f1040/2025/form4972_partial_nua_death_estate.test.ts forms/f1040/2025/form8839_public.test.ts scripts/ty2025-pdf-review-source.test.ts`: 6 passed, 0 failed.

The Form 8995-A cents tests include negative half-dollar rounding and a valid
$1 difference between individually rounded business rows and the rounded raw
aggregate. Raw Schedule C/Schedule 1 QBI is retained separately. Root reviewed
all twelve pages of that packet, all seven royalty/interest pages, all six
separate-spouse Form 4972 pages, and all three combined beneficiary pages.
The beneficiary and spouse artifacts predate the separately verified Form
1040 line 15 zero-print repair; their blank zero line is superseded by that
repair. The corrected two-page Form 1040 fixture was rendered and its page 2
visually inspected with zero on both lines 15 and 22.

The held review generator/checker now use the public return execution path
and replay exact optional attachment bytes. Form 8839's native adoption-final
and phaseout indicators were corrected to `X`, as required by the local IRS
schema. The selected adoption fixture generated identical source/XML/PDF
hashes on two runs and passed complete source/XML/PDF/XSD replay after root
inspected all four pages and completed its visual checklist. Retained packet:
`.state/research/ty2025-filled-pdf-review/2026-10-06-reviewed-adoption/`;
manifest SHA-256 `7594aee8e6a51487d98a994bb0afb70dcd466f2b76284729cbac5028c010531b`.
The checker command was `deno run --allow-read --allow-run=xmllint
scripts/check-ty2025-pdf-review.ts /tmp/opentax-8839-selected-review
/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd`;
result: selected scope, 1 case, 4 pages, hashes and XSD confirmed. Altered
attachment bytes reject even with an updated manifest source hash.

The planner now reports 189 fixtures, 116 descriptors, 113 unique keys,
87 covered keys and 26 uncovered keys. Source attachments are visibly
synthetic and do not prove independent issuer authenticity. These isolated
passes do not replace full regression, IRS business rules or ATS acceptance.

## October 6 combined isolated positive routes

At isolated integration commit `a195fc374`, real-Poppler `deno test -A` of the Form 8853 partial-medical, Form 8995 WOTC, Form 4972 combined annuity, and two-school Form 8863 full-return tests passed **10/10**, zero failed, in 25 seconds. Log: `/tmp/opentax-four-route-integration-oct6.log`. These tests execute public return preparation, complete local TY2025 v5.4 XSD and PDF generation; the AOC case at this checkpoint had preparation evidence only, while the LLC case had full XSD. Agent rendered-packet reviews are recorded in the individual route notes; root additionally inspected the final cents Form 4972 and Archer MSA pages. This does not validate main code, source authenticity or IRS acceptance.

The main `8aa4beeec` full regression remains running under launchd PID 44462; no restart occurred. New code remains isolated pending its terminal result.

The two-school LLC/AOC selected reusable review packet at isolated `eb58acd69` passes the read-only checker: **2 cases, 10 visually inspected pages**. Planner: 191 fixtures, 116 descriptors, 113 keys, 87 covered/26 uncovered. Retained directory: `.state/research/ty2025-filled-pdf-review/2026-10-06-two-school-credits/`; manifest SHA-256 `8137b9d0adf452950b5fc19bdc2da9160c5dd41e644c97c9fec3a537a2218093`. Log `/tmp/opentax-two-schools-selected-check.log`. No full-inventory or source-authentication claim.

## Assembled release regression started October 5, 22:33 UTC

The eleven isolated completed slices were merged with main's documentation in `/tmp/opentax-release-integration-oct6` at `17462812a8dc47c30e50cbd0e0d8c1f2d701a222`. Only documentation conflicted; frozen checklist, ledger and current checkpoint were retained, and both validation evidence sections were preserved. Five concrete affected full-return suites passed **15/15**, zero failed, in 39 seconds (`/tmp/opentax-release-integration-oct6.log`).

A new real-Poppler `deno task test` started on that stable isolated snapshot at **2026-10-05T22:33:26Z**, one-shot launchd job `opentax-full-regression-17462812a`, wrapper PID 59904, Deno test PID 59911 confirmed live. Tool versions remain Deno 2.9.4 / TypeScript 6.0.3 / libxml 2.9.13 / Poppler 26.09.0. Log: `/tmp/opentax-deno-task-test-17462812a.log`; terminal status and digest will be in `/tmp/opentax-full-regression-17462812a.status`. No completion claim yet. The original main-snapshot `8aa4beeec` run remains live under PID 44462 and was not restarted. Later agent work stays outside both stable code snapshots.

The assembled `17462812a` full run remains live but has five observed failures. Focused reproduction identified reviewed-adoption raw-executor diagnostics and optional Form 4972 artifact env permissions. In separate checkout `/tmp/opentax-next-root-oct6`, `4a29d8a94` and `c0bd2aa0f` fix them: public source execution and exact attachment bytes retain every calculation tamper probe, and optional artifact output checks permission before reading env. Restricted task-mode focused checks pass 7/7 and 3/3; the original full snapshot remains untouched and needs its terminal count. Root `c58fe2f81` multi-interest/royalty route passes 3/3, full XSD and eight-page review, including the repaired line 7 zero. Packet retained `.state/research/ty2025-filled-pdf-review/2026-10-06-form4952-multi-interest/`. No new full pass is asserted.

At isolated combined code `60ee0c1b8`, restricted task-mode integration of the public calculated-return replay audit, Archer exceptions, Form 8995-A WOTC, Form 3800 filed rounding and cent-valued Schedule C loss cases passes **19/19**, zero failed, in 48 seconds. Log `/tmp/opentax-next-three-route-integration.log`. This includes full local XSD/PDF positives and source tampering; it is not a completed full regression. Both live regression snapshots remain unchanged.

## Completed stable main regression, October 5 22:47 UTC

Snapshot `8aa4beeec` completed `deno task test` with real Poppler: **11,245 passed, 0 failed, 0 ignored**, reported duration 44m34s. Wrapper start `2026-10-05T22:02:12Z`, end `2026-10-05T22:47:12Z`, exit 0; launchd confirms not running and last exit code 0. Log `/tmp/opentax-deno-task-test-8aa4beeec.log`, SHA-256 `adf8354651854ec9ce9c3f8ca6d1594ea463107aaea19366a0027245786ff06c`. Versions: Deno 2.9.4, TypeScript 6.0.3, libxml 2.9.13, Poppler 26.09.0. No code changed in its checkout during the run. Later isolated code is not covered by this pass; its complete rerun remains required. The separate `17462812a` process remains live under PID 59904 and was not restarted.
The QBI visual review also exposed required zero amounts omitted on Form
8995-A Schedule C column (c)/line 6 and the parent's unmapped line 40. At
`c246f53f1`, the supported loss-netting route prints these zeros using the
canonical cached AcroForm fields. The same five-test suite passed again,
including actual full-PDF text assertions for the loss-business adjusted
income and both carryforward fields. Root rendered and inspected the
corrected parent page 2 and Schedule C; the other ten pages were unchanged.
This correction is part of the already recorded bounded QBI slice, not a
new parent completion. Integration into main and its full regression remain
pending while the stable full run is live.

## Integrated repair regression started October 5 22:50 UTC

Main merge `762db9012b0e273f7cd72595a2ef067d9da4b367` incorporates the fourteen recorded source/PDF slices and task-permission replay repairs. The board was compacted before integration. The merge preserved both unique validation sections and the frozen checklist. A separate stable checkout `/tmp/opentax-fixed-regression-oct6` started the same real-Poppler `deno task test` at `2026-10-05T22:50:51Z`; launchd job `opentax-full-regression-762db9012`, wrapper PID 66092 confirmed running. Log `/tmp/opentax-deno-task-test-762db9012.log`, terminal record `/tmp/opentax-full-regression-762db9012.status`. Earlier isolated `17462812a` continues unchanged; its known five failures have focused repairs in this newer snapshot. No new full-pass claim. Later Medicare, multi-business QBI and missing-1098-T work remains outside both stable running snapshots.

## Combined Medicare, multiple-business QBI and education income integration

Main combines `cdf5349b6`, `1f99a3f6f`/`0c0b09c46` and `58c898917`/`3bca8f9f2`/`1f4adfb59` through main `e3847e991`. The exact restricted task-mode command covering `calculated_return_replay.test.ts`, `form8995_multiple_schedule_c.test.ts`, `form8853_medicare_2025.test.ts` and `pdf/form8863-missing-1098t.test.ts` passes **26/26**, zero failed, in 1m5s. It uses the full task's allow-read/write, allow-run=xmllint,deno,pdftotext,pdftoppm, three Schedule1A env permissions and IRS-only network permissions. Log `/tmp/opentax-medicare-qbi-education-integration.log`. Root additionally reviewed Medicare prior-account, spouse, death and cents pages. The positive packets and route limits are retained in the respective gap notes. Earlier live full snapshots remain stable; neither full run covers these later routes.

## Reusable QBI overflow and current-loss packet review

At `e2df22cd5`, the new held fixtures use the same shared source factory as the positive full-return tests (restricted 4/4 pass, `/tmp/opentax-qbi-held-factory.log`). Their complete review includes **2 cases, 32 pages**: six-business overflow 22 pages and current net loss 10 pages. Root inspected all pages, including every two-page Schedule C copy, 1040/Schedules 1/2/SE, Form 8959 and Form 8995 plus continuation. Metadata was corrected to expect every actual Schedule C copy and the source W-2 Form 8959 withholding reconciliation; the generator rejects incomplete inventories. The final read-only checker passes exact source/calculation/XML/PDF/hash/page-origin/local-XSD replay (`/tmp/opentax-qbi-selected-check.log`). Retained packet `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-overflow-loss/`, manifest SHA-256 `cacf8996739710497b147512e1814d6aef696e9e26eede21816af4f358d3f964`. Planner: 193 fixtures, 116 descriptors, 113 keys, 87 covered, 26 uncovered. This selected review does not prove the full inventory, source authentication or IRS acceptance.

## Reusable taxable scholarship phaseout review

The retained public source from the proven missing-1098-T phaseout return is registered in the held review inventory. Root inspected all **seven pages**, including Schedule 1 line 8r $6,000, Form 1040 wages $75,000/AGI $81,000/tax $9,275, Schedule 3 credit $1,350, Form 8863 factor .900/total AOC $2,250/refundable $900 and school current/prior No/No indicators. The read-only checker confirms **one selected case, seven pages**, exact source/calculation/XML/PDF/hash/page-origin/local-v5.4-XSD replay; log `/tmp/opentax-education-phaseout-selected-check.log`. Retained `.state/research/ty2025-filled-pdf-review/2026-10-06-scholarship-phaseout/`, manifest SHA-256 `e4d69a6489f8645c03943562d59f935c176be1c671a5c7a9fd03e625ba96b414`. Restricted calculated-return numeric tamper audit passes 1/1 with 194 fixtures (`/tmp/opentax-calculated-replay-194.log`). Planner stays at 116 descriptors/113 keys, 87 covered/26 uncovered. Historical selected packets retain their original inventory snapshot; this is not all-inventory or IRS acceptance evidence.

## Uncovered Form 8853 held-review route and mixed-school integration

At `a6fc7a7e5`, the Medicare source factory is shared with its positive/negative full-return tests. Restricted tests plus the all-fixture calculated-return tamper audit pass **13/13** (`/tmp/opentax-medicare-held-factory.log`). Root inspected all seven held-review pages, including the age65 box/zero tax on Form1040, $9,000 unreduced MSA income, Schedule2 $100 and Form8853 SectionB $12,000/$3,000/$9,000/exception/$100. Read-only complete replay passes one selected case/seven pages (`/tmp/opentax-medicare-selected-check.log`). Retained packet `.state/research/ty2025-filled-pdf-review/2026-10-06-medicare-msa/`, manifest SHA-256 `7f221c7e65ff64a120ac8c95c444eefc544c41e6f3de55775018e459bbae8696`. Planner now reports 195 fixtures, 116 descriptors, 113 keys, **88 covered/25 uncovered**; Form8853 is newly covered by an actual positive source route.

Main `0f8b46edb` incorporates mixed-school `2f4a467d9` after source review: each institution's taxable income now joins independently to finalized income. The isolated 134/134 regression, four full-XSD positives and all 24 visually reviewed pages are recorded in the mixed-school gap note. Main restricted replay/mixed-school/missing-form integration is running (`/tmp/opentax-mixed-school-held-integration.log`); no terminal result is claimed yet. Earlier stable full runs remain unchanged and do not validate these later changes.

## Both-holder Medicare MSA and investment-income QBI integrated proof

Main `26bdcb2bb` incorporates joint MSA `88b869ff8` and owned investment QBI `26bdcb2bb`. Restricted integration with allow-read/write, allow-run=xmllint,deno,pdftotext,pdftoppm and IRS-only network permissions passes **25 passed, zero failed, 1m21s**. Files: `calculated_return_replay.test.ts`, `e2e/form8853_joint_medicare_2025.test.ts`, `e2e/form8853_medicare_2025.test.ts`, `form8995_multiple_schedule_c.test.ts` and `form8995_multiple_investment.test.ts`, under `forms/f1040`. Log `/tmp/opentax-joint-msa-qbi-investment-integration.log`. Root reviewed the controlling and both owner cents PDF copies; control $1,798 taxable/$900 tax sums separately filed owner $899/$450 lines. Native owner statements use distinct primary/spouse roots under the single controlling Form8853 document. Registry now has 150 native descriptors and 116 PDF descriptors; planner remains 195 fixtures/113 keys/88 covered/25 uncovered.

The earlier mixed-school main integration also completed **16 passed, zero failed, 33s**, log `/tmp/opentax-mixed-school-held-integration.log`. These focused checks do not establish a full-current-main regression. Both stable full jobs were confirmed running after these integrations and remain unchanged.

## Reviewed aggregation source and uncovered ScheduleB packet

Main `3edcd764d` carries a public two-ScheduleC aggregation source through actual W2/SE adjustments and the full return. Restricted task-mode integration covering aggregation public/negative tests, source/input tests, calculated-return replay and ScheduleSE/Form8959 checks passes **39 passed, zero failed, 7s**, log `/tmp/opentax-aggregation-final-integration4.log`. The complete selected read-only checker passes **one case,17 pages**, log `/tmp/opentax-aggregation-selected-check.log`, retained `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-aggregation/`, manifestSHA256 `fdced759bdf15a95199115a2b8104f18b91a7f0902cd6fbbc9aedff148efbe49`. Root inspected every page and re-rendered the corrected SE, additionalMedicare and parent carryforward pages. Planner is196fixtures/116descriptors/113keys/**89covered/24uncovered**; ScheduleB is newly covered. Authentication, wider election/owner routes, business rules and ATS remain open. Both earlier stable full jobs remain confirmed running; they do not cover this change.

## Distinct QBI investment integration and terminal older full regression

Main `4dd925cd6` integrates distinct qualified-dividend and ScheduleD capital source identities, source-aware component rounding, raw scalar finalization and real calendar-date validation. The actual combined source/replay/aggregation/multiple-C/new-and-existing-investment suite passes **13 passed,zero failed,56s**, log `/tmp/opentax-aggregation-distinct-qbi-integration.log`. It includes four new full-v5.4-XSD native/PDF returns and five existing investment XSD positives; aggregation remains positive after integration. The new isolated 391-case relevant regression and 52 dual-export source/tamper variants are recorded in the QBI gap. This is focused evidence, not a current-main full-pass claim.

The preserved older full snapshot `17462812a8dc47c30e50cbd0e0d8c1f2d701a222` finished at `2026-10-05T23:21:05Z`, exit1, duration47m6s: **11,252 passed,5failed,0ignored**. Start `2026-10-05T22:33:26Z`, launchd `opentax-full-regression-17462812a` confirms notrunning/last exit1. Log `/tmp/opentax-deno-task-test-17462812a.log`, SHA256 `e727591745fe070c394a28c70b4dfa55d3035bc4b9ff3848fbcca8fd2673d5c8`. Versions unchanged:Deno2.9.4,TypeScript6.0.3,libxml2.9.13,Poppler26.09.0. The only failures are the known reviewed-adoption raw-executor replay and four optional Form4972 artifact-directory environment accesses: partialNUA/death/estate; combinedannuity; annuitycents; two-spouseNUAcapital. All have focused fixes already integrated in762. Its stable full run remains confirmedlive (wrapper66092); it was not restarted and no terminal pass is claimed. Later source routes remain outside that snapshot.

## Form 8863 claimant ownership main integration — October 6

At `f644a8cc0`, the restricted real-Poppler owner, missing-1098-T, mixed-school and calculated-return replay suites passed **24 tests, zero failed**, in 51 seconds. Log: `/tmp/opentax-education-owner-integration.log`. Command: `deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/pdf/form8863-claimant-owner.test.ts forms/f1040/2025/pdf/form8863-missing-1098t.test.ts forms/f1040/2025/pdf/form8863-mixed-schools.test.ts forms/f1040/2025/calculated_return_replay.test.ts`. The five complete XSD/PDF packets and all-page review are detailed in the [claimant ownership evidence](ty2025-form8863-dependent-claimant-review.md). This does not prove the complete current-head regression or IRS acceptance.

## Public accounting SSTB main integration — October 6

At `1af9977fb`, typed restricted real-Poppler tests for public accounting SSTB, sourced aggregation, distinct capital contributions and calculated-return replay passed **8 tests, zero failed**, in29seconds (`/tmp/opentax-sstb-main-integration.log`). The isolated SSTB node/native/PDF suite passed49/49 and existing QBI regressions59/59. Complete selected replay and all15 rendered pages pass; retained manifest `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb/review-manifest.json` SHA-256 `eacd450cbafc7358525fd3dced19080fe4fe02b2e6ed69cf03a7c580a9febc4e`. Details and boundaries are in the [advanced-QBI gap](ty2025-form8995a-gap.md). This does not prove current-head full regression or IRS acceptance.

## Owner-only SSTB main integration — October 6

At `b2c465c1a`, restricted typed real-Poppler SSTB, education owner and calculated-return replay suites pass **12 tests, zero failed**, in27seconds (`/tmp/opentax-sstb-zero-main-integration.log`). Isolated ScheduleC/SSTB tests pass107/107. Full v5.4 XSD and all15 rendered pages pass exact selected replay; manifest `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-no-payroll/review-manifest.json` SHA-256 `261041c4b2dd6cb9735d57000452d843b59cc2bcd5dc4b79bf80964cba4d4b46`. Planner198 fixtures/90 covered of113 keys/23uncovered. Earlier selected inventories remain generation snapshots. No complete current-head regression or IRS acceptance is claimed.

## Terminal fixed full regression — October 6

Stable isolated commit `762db9012b0e273f7cd72595a2ef067d9da4b367` completed the exact full **`deno task test`** with real Poppler: **11,271 passed, 0 failed, 0 ignored**, exit0; Deno test elapsed48m0s, wrapper wall48m36s. Start2026-10-05T22:50:51Z; end2026-10-05T23:39:27Z. The launchd job `opentax-full-regression-762db9012` is terminal/not running with last exit0. Log `/tmp/opentax-deno-task-test-762db9012.log`, status `/tmp/opentax-full-regression-762db9012.status`; log SHA-256 `372b658aeb2da61d51b6ad7b50da6094f4f6ae6db39248534556a41eca9261c1`. Toolchain Deno2.9.4/TypeScript6.0.3, libxml2.9.13 and Poppler26.09.0. The wrapper retained full-command exit status and digest. All five previously failing4972 artifact-permission and calculated-return public adoption replay cases pass. This stable snapshot predates later source routes, so current-head full regression remains required; local XSD/tests do not prove IRS acceptance.

## Archer contributions and self-employed education main integration — October6

Code snapshot `991a283c7` passes restricted typed real-Poppler source suites for Archer contributions, self-employed education, existing education owners, both SSTB routes and calculated-return replay: **34 tests, zero failed**, 1m35s; log `/tmp/opentax-archer-education-main-integration.log`. Archer isolated437/437 and15full-XSD/PDF packets/all110 rendered pages; education isolated369/369 and5full-XSD/PDF packets/all72pages. Archer evidence `/tmp/opentax-f8853-contributions/.state/research/2026-10-06-form8853-contributions/PROOF.md`; education evidence `/tmp/opentax-f8863-self-employed-evidence/`. Final visual documentation is integrated atce461b643. Source limits remain in their gap documents. The separate full11271-test checkpoint covers older762db9012, not this newer code.

## Patron ScheduleD main integration — October6

At code snapshot `86d448902`, restricted typed real-Poppler patron, SSTB, aggregation, self-employed education and calculated-return replay suites pass **14 tests, zero failed**,57seconds (`/tmp/opentax-patron-main-integration2.log`). An initial merge assembly failed parsing; the complete four conflicted files were reconstructed from their original three-way inputs, preserving both source branches, then this exact combined suite passed. Isolated patron16-file regression311/311;35 source mutation variants reject both native andPDF. Three complete localv5.4XSD packets and44-page visual/selected replay pass; retained `/tmp/opentax-qbi-patron-source-oct6/.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-patron-final-v2`. Main planner201fixtures,116descriptors,113keys,91covered,22uncovered. The fixed full11271-test checkpoint predates this code; broad business rules/IRS acceptance remain open.

## Material-capital education main integration (October6)

At3d8ab750e, typed restricted real-Poppler tests for material-capital, personal-service education and patron QBI passed16/16 in1m5s. Log `/tmp/opentax-material-capital-main-integration2.log`. The first invocation referenced a nonexistent patron test filename and executed no tests; the corrected invocation above is the proof. Source proof, seven full local v5.4 XSD/PDF packets and100-page review are documented in `ty2025-form8863-material-capital-support-review.md`. Broader parents and IRS acceptance remain open.

## Patron phase-in main integration (October6)

At5abcfba2b, typed restricted real-Poppler patron phase-in, prior patron sources and SSTB tests passed8/8 in1m24s. Log `/tmp/opentax-patron-phase-main-integration.log`. Detailed12 full-XSD/PDF returns,71 dual-export mutations,53 isolated regressions and61-page review are in the Form8995A gap. Current main still requires a new full regression; the prior11271 checkpoint is an older snapshot.

## Combined joint SSTB/SHOP/patron/education main proof and full regression

Code snapshot `ea23fbb91` passes54/54 typed restricted real-Poppler builder, joint SSTB, patron phase-in, owned Form8941 and material-capital education checks in1m52s. Log `/tmp/opentax-joint-shop-patron-main-integration.log`. SHOP integration conflicts were two first-line imports; both patron filed-business and8941 source-reconciliation imports were retained. No tests ran during mutation. Joint source visual/replay proof is retained in `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-joint`; SHOP and material-capital packets also copied into main ignored research directories. Planner207 fixtures/116 descriptors/113 keys/92 covered/21 uncovered. Frozen main checklist remains52 open parents.

Exact full `deno task test` launched from detached `/tmp/opentax-full-regression-current-oct6` at `ea23fbb91`, real-Poppler PATH, using launchd job `opentax-full-regression-ea23fbb91`. Status `/tmp/opentax-full-regression-ea23fbb91.status`, log `/tmp/opentax-deno-task-test-ea23fbb91.log`; wrapper records exact commit/start/end/exit/logSHA256. Running is not a pass. Previous11271 clean batch is a distinct older snapshot. No IRS business-rule or acceptance claim is made.

## Joint patron main integration (October6)

At16bc05f5a, typed restricted real-Poppler joint patron, Single patron phase-in, ownedSHOP and accountingSSTB tests pass16/16 in2m11s. Log `/tmp/opentax-patron-joint-main-integration.log`. Merge retained both joint/SHOP fixture imports and dynamic patron threshold/range plus shared percentage helper. Source/8full-XSD/PDF/46-page visual evidence and178 regressions are in the Form8995A gap. Detached full runea23fbb91 remains live and does not cover this later joint-source commit.

## Part-year SHOP main integration (October6)

Atad738cc0f, typed restricted real-Poppler part-year/legacySHOP and joint patron/SSTB checks pass18/18 in1m42s. Log `/tmp/opentax-shop-partyear-main-integration.log`. Three full local-XSD/PDF packets and67-page review are retained under main ignored `.state/research/2026-10-06-form8941-partyear/`; exact source/rating-period/payroll rules are in the Form8941 gap. Detachedea23 full regression remains a live older snapshot and does not cover laterpart-year/joint changes.

## Required-service scholarship and Colorado MFS main proof (October6)

At `b056c59ae`, typed restricted real-Poppler service-scholarship, material-capital, SSTB, part-yearSHOP and joint patron checks passed **31/31** in2m17s. Log `/tmp/opentax-service-mfs-main-integration.log`. The service source commit merged clean; MFS had only an appended gap-document conflict, and both source proofs were retained. Seven service packets/51 pages and one MFS packet/15 pages were fully reviewed with local complete v5.4 XSD; MFS exact source/hash/page-origin replay passed. Artifacts copied into main ignored research directories `2026-10-06-form8863-service-scholarship` and `ty2025-filled-pdf-review/2026-10-06-qbi-sstb-mfs`. Planner212 fixtures/116 descriptors/113 keys/92 covered/21 uncovered. The frozen checklist and future section remain byte-identical with52 open rows. Detached full run `ea23fbb91` remains live and does not cover these later source commits; no full-batch or IRS acceptance claim is made for them.

## Family SHOP and ordinary noncommunity MFS integration (2026-10-06)

Code snapshot `6d53aa586` integrates family SHOP `f0ac40e72` as `0c5ae18df` and ordinary noncommunity MFS `da157ea5d`. The exact typed main command was:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/e2e/form8941_family_2025.test.ts forms/f1040/e2e/form8941_owned_2025.test.ts forms/f1040/e2e/form8941_partyear_2025.test.ts forms/f1040/nodes/inputs/f8941/index.test.ts forms/f1040/2025/form8995a_sstb_schedule_c.test.ts
```

Terminal result: **36 passed, 0 failed**, no ignored tests, in1m24s; checked at00:19 UTC. Log `/tmp/opentax-family-noncommunity-main-integration.log`, SHA256 `46e673ba5b950c5ece7729941631839cf20343dfe7c6234eb1d5bb9477fda3a4`. This checks five new family full-XSD/PDF packets, six earlier employee-only packets, eleven Form8941 source units and eight SSTB source/native/PDF tests. It preserves the full determined premium-credit deduction reduction independently of tax use and verifies domicile/property records independently of mailing address. It is a focused integration result, not the full regression or IRS acceptance.

Isolated family proof retains34 passing tests,30 actual dual-export mutations,9 public conflicts and all113 visually reviewed packet pages. Isolated ordinary noncommunity MFS proof retains8 focused and165 related passing tests,30 new synchronized native/PDF mutations and all60 pages of four complete packets. Artifacts are copied into ignored main `.state/research/2026-10-06-form8941-family/` and `.state/research/ty2025-filled-pdf-review/2026-10-06-qbi-sstb-noncommunity/` with adjacent rendered contacts. Source planner now217 fixtures,116 descriptors,113 keys,92 covered and21 uncovered. Frozen checklist/future section is byte-identical to `aa10c619a` and retains52 unchecked parent rows. Full batch `ea23fbb91` remains independently live and excludes these later changes.

## Reviewed Form8994 public main integration (2026-10-06T00:30:25+00:00)

Code `6559e695b` incorporates isolated `a9671d69d`. Typed restricted real-Poppler command: `deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/form8994_public_source.test.ts forms/f1040/e2e/form8941_family_2025.test.ts forms/f1040/2025/form8995_wotc_coexistence.test.ts forms/f1040/2025/form8995a_sstb_schedule_c.test.ts`, using the recorded Poppler/Deno PATH. Terminal **20 passed,0 failed**, no ignored,1m22s. Log `/tmp/opentax-form8994-main-integration.log` SHA256 `c4c736632ad4fb1f0fc612aed635c66d430b38092f24c3dd950adaad1f83d123`. Actual public Form8994 full/partial/zero and cent-valued credit packets preserve full determined1250 wage reduction before SE/QBI while current use1250/693/0 is independently allocated; source/byte/owner/totals rejects execute. Family SHOP, WOTC and SSTB compatibility pass. Isolated19 focused/232 related and held3 local-XSD packets/67 reviewed tax pages plus6 source pages are retained under ignored `.state/research/ty2025-filled-pdf-review/2026-10-06-form8994-direct/` with rendered neighbors. Public source/QBI/packet discovery corrections are described in the Form8994 gap. Full regression, wider employers/credits, external issuer authenticity and IRS acceptance remain open.

## Paired parent/child scholarship main integration (2026-10-06T00:32:44+00:00)

Code `5dfe1aa9a` integrates isolated `917b0d87c`. Exact typed restricted command with recorded real-Poppler PATH: `deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/pdf/form8863-parent-child-scholarship.test.ts forms/f1040/2025/pdf/form8863-service-scholarship.test.ts forms/f1040/2025/pdf/form8863-material-capital.test.ts forms/f1040/2025/form8994_public_source.test.ts`. Terminal **24 passed,0 failed**, no ignored,1m26s. Log `/tmp/opentax-parent-child-main-integration.log` SHA256 `6a56b10719e51c128a3913506dd1afb2b6e45abaaf95705954de0f890e872b71`. Three actual parent/child pairs (serviceW2, service8r, student-bank-paid tuition) retain issued school/payment/award/support records, child-owned income13000 and derived dependent deduction13450, no duplicate credit, parentAGI75000 excluding child income, education1000/1500 and ODC500. Six complete local-XSD/PDF packets/33 pages were visually reviewed in isolated proof. Combined prior source regression421/0 and final focused5/0 are sequenced precisely in the paired review note; this main gate verifies final edits and prior service/material/8994 compatibility. Original ignored evidence copied to `.state/research/2026-10-06-form8863-parent-child/`. Positive child tax/Form8615, wider dependency/source branches and external authenticity/IRS acceptance remain open.


## SHOP composite/list main integration — 2026-10-06

Code `35afc890a`, real Poppler and typed Deno focused command covering arrangement, family, public8994 and held scope tests: **25 passed,0 failed**,1m46s. Log `/tmp/opentax-shop-arrangements-main-integration.log`, SHA256 `8d8d1cd864621e6bb4efb2f7208f39dbf2aaacd5e92df518749cfad280d9692f`. Isolated agent proof:47/47 compatibility plus15/15 final order; ten full-XSD/PDF packets,242 pages inspected,33 prepared-source and27 public-source conflicts rejected. One-QHP Albany records only; multiple plans, eligibility changes, authentication and IRS acceptance remain open. Full batchea23 does not include this change.


## Owner-specific ScheduleSE and ordinary joint QBI — 2026-10-06

Isolated62747389e integrated at0cc6c8389. Final main typed integration **28 passed,0 failed**,1m40s; owner public/source/cents, pure calculations, public8994, joint patron, SSTB and held scope checks. Command: `deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/schedule-se-owner-public.test.ts forms/f1040/nodes/intermediate/forms/schedule_se/owner-calculation.test.ts forms/f1040/2025/form8994_public_source.test.ts forms/f1040/2025/form8995a_patron_joint.test.ts forms/f1040/2025/form8995a_sstb_schedule_c.test.ts scripts/ty2025-pdf-review-scope.test.ts`. Real Poppler PATH used.

Log `/tmp/opentax-owned-se-main-integration.log`, SHA256 `96f2e20ec540ac0f06b66b4cdfe320279517f8575cd33d0d3c981b120a2f7cbd`.

Log `/tmp/opentax-owned-se-final-proof.log`, SHA256 `a8bd2efd829f842bf2c84cb3a5ad03825d04862ca71f0e04fe752a240b3339f6`.

Log `/tmp/opentax-owned-se-c-repair.log`, SHA256 `17deaff3cf1058d3db4fe3627760af0fdfc0734e714c22e0a273abd1c92d4af7`.

Isolated final13/13,104/104 repaired ScheduleC checks and earlier79/79; broader337/339 initially exposed two missing MFJ proprietor/activity source facts, now repaired. Four complete localXSD/PDF packets contain52 pages, all inspected in13 contact sheets; final hashes match retained manifest. Eight complete-return QBI/source mutations and four owner-instance/source/identity mutations reject both native and PDF. Two cent boundary sources pass final prepared native export. Main held metadata includes8959/8960 as actually emitted. Planner222 fixtures,116 descriptors,113keys,93 covered/20 uncovered. [Owner gap](ty2025-schedule-se-owner-gap.md) records limits. Full regressionea23 lacks this code; IRS acceptance/authentication remain open.


## Reviewed Form8978 main integration — 2026-10-06

Codea842e9599, actual typed focused command covering public8978/PDF8978/owner-SE/public8994/held scope: **17 passed,0 failed**,46s with real Poppler. Log `/tmp/opentax-form8978-main-integration.log`, SHA256 `18c3670e0d7c2ee467c1678915017358ec288cddedc054787ec2c8e2fe4e1dae`. Isolated28/28 and53/53; held3 complete localXSD/replayed returns,19 tax pages and27 exact attachment pages inspected. Reviewed prior-year computations and supplied synthetic PDF bytes are bound, not authenticated. Full batch and business-rule/acceptance gates remain open; [exact limits](ty2025-form8978-pdf-gap.md).


## Positive child-tax/Form8615 main integration — 2026-10-06

Code72bd53a19, typed real-Poppler focused command covering paired positive child tax, earlier paired education, public8978 and owner-SE: **19 passed,0 failed**,1m6s. Log `/tmp/opentax-positive-child-tax-main-integration.log`, SHA256 `4b42fd0d80e8c403ff0f1bb7b793b99b64e930daa1ec911a8f8fced4c741907e`. Final isolated454/454 across24 selected existing/new files plus6/6 source/artifact checks. Six full Return1040v5.4 XMLs and36 filled PDF pages inspected; child AGI22000/SD15750/TI6250 yields8615 tax1375 using actual selected parent TI59250/pre-credit7955. Parent income/AOC/ODC remain separate. Source/header/support/parent-choice/duplicate-credit and standalone slice conflicts reject. [Exact limits](ty2025-form8863-parent-child-kiddie-tax-review.md) retain wider sibling/parent/special-tax/authentication scope. Full batchea23 predates this code.


## Terminal full batch at ea23fbb91 — 2026-10-06

Exact isolated `deno task test`, real Poppler26.09.0/Deno2.9.4/TS6.0.3/libxml2.9.13. Commit `ea23fbb91f9f9be2710f534b59e42267041c87a7`, start2026-10-05T23:57:45Z, end2026-10-06T00:54:03Z, exit1. **11,386 passed,2 failed,0 ignored**,55m8s test duration/56m18s wall. Log `/tmp/opentax-deno-task-test-ea23fbb91.log`, SHA256 `3f3dca6c256779f1c97105d1eda3788c8e4eb56208f140908a2196cc0ee56ecf`; status `/tmp/opentax-full-regression-ea23fbb91.status`. Actual wrapper/Deno PIDs86079/86085 are terminal.

Failures: `2025 parent PDF marks Form8814 dividends and direct child gain` expects the old checkbox domain key; `Form8959 PDF rejects a print line that differs from upstream deposits` expects inapplicable SE/RRTA lines in a wage-only PDF. Verify source/template decisions and repair tests, then rerun the full exact command on a fresh stable snapshot. This earlier snapshot excludes later joint patron/partyear SHOP/service grants/MFS/arrangements/8994/education/owner-SE/8978/child tax changes; it is not a full pass for current code.


## Full-regression failure expectation repairs

Both retained failures are corrected against current template/source behavior: Form1040 fieldc1_43 is the separate ScheduleD-not-required checkbox, asserted true for the direct8814 child gain and false with ScheduleD; wage-only8959 omits inapplicable SE/RRTA parts while retaining exact tax/withholding values and upstream-source rejection assertions. Final typed focused batch **28 passed,0 failed**. Log `/tmp/opentax-full-expectation-repairs-final.log`, SHA256 `e8c2349d88922fd5d82938e4d9de8d76b179d11bf2d4ef6474759aaed4b86e91`. The full exact command still needs a fresh stable-snapshot rerun.


## Joint primary WOTC integration — October 6

Main commit `1a490fc55`: **42 passed, 0 failed (55s)** across joint WOTC, owner-SE, reviewed8978, Form8814, supporting tax projections and review scope. Log `/tmp/opentax-joint-wotc-main-integration.log`, SHA256 `381cc2d113d5a206ed5136cdca4b0c8b9a504b7b401bf7c0cbeaf6d4f54deaf7`. The five isolated complete packets and130-page visual proof are retained under `.state/research/ty2025-filled-pdf-review/2026-10-06-joint-wotc`; source authentication and acceptance remain open.


## Mixed C/F, multiple-QHP SHOP and joint WOTC main integration — October 6

Code snapshot `51fd0f34c`, recorded at `04dba771b`: **35 passed, 0 failed (2m39s)** with type checking and real Poppler. Command:

```sh
PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin deno test -A forms/f1040/2025/schedule-se-owned-farm-public.test.ts forms/f1040/2025/form8995a_joint_wotc.test.ts forms/f1040/e2e/form8941_multiple_plans_2025.test.ts forms/f1040/e2e/form8941_arrangements_2025.test.ts forms/f1040/2025/schedule-se-owner-public.test.ts scripts/ty2025-pdf-review-scope.test.ts
```

Log `/tmp/opentax-cf-shop-wotc-main-integration.log`, SHA256 `e94a33f62a0ebc13ccb2a9b00f5a80ea61e93e69265d035435371ef9e444ecc4`. Source/XML/PDF packets, manifests and complete page images are retained in main ignored evidence under `.state/research/2026-10-06-owned-farm-se` and `.state/research/2026-10-06-form8941-multiplan`. Their final visual claims cover86 and143 pages respectively; broad parent and IRS gates remain open.

## Fresh repaired full regression launch — October 6

Exact `deno task test` is running in the stable detached checkout `/tmp/opentax-full-regression-repaired-oct6` at `04dba771b`. It includes the two full-batch expectation repairs plus integrated later sources, ordinary mixed C/F, joint WOTC and multiple-QHP SHOP. Deno2.9.4, TypeScript6.0.3, libxml2.9.13 and real Poppler26.09.0 use the same task PATH. Launchd label `opentax-full-regression-repaired-oct6`; wrapper `/tmp/opentax-full-regression-repaired-oct6.zsh`, status `/tmp/opentax-full-regression-repaired-oct6.status`, log `/tmp/opentax-deno-task-test-repaired-oct6.log`.

Launch status:

```
commit=04dba771bc909c83325da70e64086dcfd3e1b66c start=2026-10-06T01:04:29Z
```

Result and final log hash remain pending. The earlier ea23fbb91 process is terminal with exit1; this is its required fresh full rerun, not a duplicated live batch. The stable tree must remain untouched during execution.


## Pending source/visual repairs discovered after the full launch

The sibling family audit found Form8615 fractional ratios incorrectly rounded/blanked by the shared PDF numeric filler. An isolated descriptor-specific repair and all-page proof are running. The spouse/both-employer WOTC audit found the inherited joint fixture used the same EIN for an external W2 employer and the reviewed ScheduleC employer. Distinct employer identity plus actual source conflict rejection and business-specific common-control ownership attribution facts are being implemented. The published primary-MFJ WOTC synthetic proof and current stable full batch predate these corrections. No whole-parent support or IRS acceptance is claimed from either result.


## Terminal repaired snapshot type check — October 6

Stable `04dba771b` full `deno task test` exited1 before executing tests:45 TypeScript2345 errors, all in legacy `schedule_se.test.ts` and ATS `scenario_1040_03_input.test.ts`. Those single-document assertions did not narrow the new string-or-owner-document-array return type. Start01:04:29UTC/end01:05:14UTC; log SHA256 `7fff2e2be00b863f1b9689dc36ccb0b0b914b1b7d550b7a2a9d63a1d32c2df66`. Runtime pass/fail totals are unavailable because tests did not run. The old launch is terminal; a fresh full command is required after explicit shape assertion repair.


## ScheduleSE full-batch test contract repair

Single-document legacy/ATS assertions now narrow the builder result explicitly. The retained multiple-spouse-source case now supplies actual two-business/two-farm source records, owner calculations and reconciled Schedule1/2 totals, expects one spouse document and rejects omitted owner calculations. This replaces a stale identity-only fixture; no production source guard was relaxed. Final typed check:31 passed,0 failed (605ms), log `/tmp/opentax-se-full-type-repair-final5.log`, SHA256 `0b6044a44912e3dc1a954787f5b8416925cf9f01d16df3b867cc9252b472b619`. Earlier diagnostic focused runs exposed missing fixture fields, now corrected.


## Owner-contract repaired full regression launch

Exact `deno task test` started in stable detached `/tmp/opentax-full-regression-repaired-v2-oct6` at `bc6cafec6`, using the same real Poppler/Deno/libxml PATH and task permissions. Launchd label `opentax-full-regression-repaired-v2-oct6`; wrapper/status/log use the same prefix, with log `/tmp/opentax-deno-task-test-repaired-v2-oct6.log`. Prior full process is authoritatively terminal. Launch status:

```
commit=bc6cafec63f68ce91c9346d67f137a77fb6b3789 start=2026-10-06T01:08:44Z
```

This result remains pending and predates the agents' pending family PDF and WOTC employer source repairs. Root optional-farm audit found an actual current export rejection in isolated source probe; it is not counted as support.


## Sibling/selected-parent main integration

Main `8e492a227`:47 passed,0 failed (42s), with type checking and real Poppler. Files: sibling-parent-selection, prior parent-child kiddie tax, Form8615 PDF descriptor, ScheduleSE native descriptor and ATS Scenario3 source/PDF tests. Log `/tmp/opentax-sibling-main-integration.log`, SHA256 `16a37194b8557523faa56cd9081037cb9efef45e5cdf82579896870302ce08c5`. Seven full XSD/PDF packets/all38 visually reviewed pages and21 matching hashes copied to ignored `.state/research/2026-10-06-sibling-parent-selection`. Running full bc6cafec6 snapshot predates this family source/ratio repair; no complete latest-head regression is claimed.


## Corrected owner-WOTC main integration — October 6

Main `15d49d055a287f74e442d7b0affa52c0c61d94d3`: exact typed Deno test command with real Poppler passed28, failed0 (2m34s). Files: new owner-WOTC, prior primary-WOTC, ordinary owned C/F, sibling/selected-parent PDF, multiple-QHP SHOP and review scope. Log `/tmp/opentax-corrected-owner-wotc-main-integration.log`, SHA256 `0a7cb570b32db47d836c88a5c535d477a9418d482aa6529d48c531c52aa2e926`. Permissions: read/write, run xmllint/deno/pdftotext/pdftoppm, network www.irs.gov. Eight complete new packets/all220 reviewed pages copied to ignored research storage. Prior primary route reran against corrected external W2 employer identity; its completion is restored. New spouse/both-owner completion is recorded separately. Planner240 fixtures/116 descriptors/113 keys/95 covered/18 uncovered. The live full bc6cafec6 snapshot predates these repairs and the sibling ratio change; latest-head full regression and IRS acceptance remain unproven.


## Actual controlled-group WOTC main integration

Main1f42620dd:19 typed checks passed,0 failed (1m46s), with real Poppler; actual controlled-group, independent spouse/both-owner and primary-owner WOTC plus generic owner-SE sources. Log `/tmp/opentax-controlled-main-integration.log`, SHA256 `84e97048d5206cc754a58393136edff72866b3797eb58f83156ab2b1342da663`. Three full XSD/replayed packets/all93 reviewed pages copied into ignored main research. This bounded completion does not close wider group source authentication or credit/owner parents. Running fullbc6cafec6 predates these production changes.


## Optional farm, remarried MFJ and seasonal SHOP main integration

Main `173d3739b`:48 typed checks passed,0 failed (2m22s), with real Poppler. Exact command:

```sh
deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/schedule-se-owned-farm-optional.test.ts forms/f1040/2025/pdf/form8863-remarried-mfj-parent.test.ts forms/f1040/e2e/form8941_workers_2025.test.ts forms/f1040/2025/form8995a_controlled_wotc.test.ts forms/f1040/2025/form8995a_joint_owner_wotc.test.ts forms/f1040/2025/mef/forms/schedule_se.test.ts scripts/ty2025-pdf-review-scope.test.ts
```

Log `/tmp/opentax-farm-family-shop-controlled-main.log`, SHA256 `e4d991f371a8237bbe3e53a149fb1c6efb1155c9310fb48bba1162e984c81267`. Optional-farm nine full-XSD/replayed packets/all123 reviewed pages, remarried MFJ six full-XSD packets/all36 reviewed pages and seasonal SHOP three full-XSD packets/all69 reviewed pages are retained in ignored main research. Actual planner253 fixtures/116 descriptors/113 keys/95 covered/18 uncovered. This combined check includes controlled and independent joint-owner WOTC compatibility. The still-running full `bc6cafec6` batch predates these production/source repairs; latest-head full regression, broader parent completion and IRS acceptance remain unproven.


## Actual remarried MFS main integration

Main `2850dc05e`:24 typed checks passed,0 failed (1m28s), with real Poppler. Exact command:

```sh
deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/2025/pdf/form8863-remarried-mfs-parent.test.ts forms/f1040/2025/pdf/form8863-remarried-mfj-parent.test.ts forms/f1040/2025/pdf/form8863-sibling-parent-selection.test.ts forms/f1040/2025/pdf/form8863-parent-child-kiddie-tax.test.ts
```

Log `/tmp/opentax-remarried-mfs-main-integration.log`, SHA256 `8d33cfe09d8d824bac34ee69743cd506503b62d1db6073890983059ebf65fbb0`. Eight complete local-XSD packets/all33 visually reviewed pages and24 matching source/XML/PDF hashes retained in ignored `.state/research/2026-10-06-remarried-mfs-parent`. Selected480/0 and final6/0 isolated checks are recorded in the route proof. Actual separate property-tax/standard-deduction returns and both parent identities are checked; prior MFJ/sibling/kiddie-tax compatibility passes. Stable fullbc6cafec6 still runs and predates this source work; two failures are now observed in CLI spouse SEHI and an older8995-A negative expectation, with final full totals and causes pending. No latest-head full pass or IRS acceptance is claimed.


## Same-proprietor SHOP main integration

Main `6b3e9cbd1`:20 typed checks passed,0 failed (1m22s), with real Poppler. Exact command:

```sh
deno test --allow-read --allow-write --allow-run=xmllint,deno,pdftotext,pdftoppm --allow-net=www.irs.gov forms/f1040/e2e/form8941_common_control_2025.test.ts forms/f1040/e2e/form8941_workers_2025.test.ts forms/f1040/e2e/form8941_multiple_plans_2025.test.ts forms/f1040/2025/form8995_multiple_schedule_c.test.ts scripts/ty2025-pdf-review-scope.test.ts
```

Log `/tmp/opentax-aggregate-shop-main-integration.log`, SHA256 `78feebe323d2be6514b60dc8dc90d53b0d8e5ab76a02ec2bd06ca44afd30d9e5`. One complete local-XSD packet/all25 visually reviewed pages plus actual source/math/limits proof retained in ignored `.state/research/2026-10-06-form8941-common-control/PROOF.md`. Group source/person/coverage and allocation mutations reject; seasonal, multiple-QHP and multiple-ScheduleC compatibility passes. Stable fullbc6cafec6 remains running, predates these changes and has two observed failures; no latest-head full pass or IRS acceptance is claimed.

## October6 owned C/F filed-operand main proof

At68f876474, the exact21-case selected main integration batch passed21/0 in2m16s. Commands and logs are retained in the [whole-dollar proof](ty2025-owned-cf-whole-dollar-reconciliation.md). Ten registered source-backed full local-XSD returns produced130 flattened PDF pages; all130 current pages were rendered and reviewed,30 source/XML/PDF hashes retained, and main held replay passed. Main planner actually reports264 fixtures,116 descriptors,113 keys,95 covered keys and18 uncovered. The full regression atbc6cafec6 remains live and has two observed failures; its current result and later-head full proof are unproven. This bounded MFJ route does not close52 parent TODOs or IRS acceptance.


## Full regression checkpoint bc6cafec6 (terminal October6)

Stable detached checkout `/tmp/opentax-full-regression-repaired-v2-oct6` ran the unchanged `deno task test` with Deno2.9.4/TypeScript6.0.3, libxml2.9.13 and real Poppler26.09.0 on PATH. Commit `bc6cafec63f68ce91c9346d67f137a77fb6b3789`; started2026-10-06T01:08:44Z, ended02:14:42Z, exit1; terminal result **11,494 passed,8 failed,0 ignored**,65m24s test time. The stable checkout predates later source/production changes and does not prove latest-head regression.

Failures: CLIissue60 spouse Medicare7206; Form8995A stale negative error wording (already repaired); three Form7206 MFJ policy/Medicare/mixed-month E2E cases; MFJ scenarios15/16 owner-source calculations; ATS02 XSD fixture’s nonstatutory spouse W2 lacks issued-source identity. Current-source investigations and repairs remain in progress; rerun the same full command after phase changes/repairs are integrated. No passing full checkpoint is claimed.

Log `/tmp/opentax-deno-task-test-repaired-v2-oct6.log`, SHA256 `c986b2f4b22005c9416fcd2821b1e94c549dd6e158a9293f1446e866a6071512`; terminal status `/tmp/opentax-full-regression-repaired-v2-oct6.status`. Both process handles are terminal; no duplicate batch was started while live.

Current owner-fixture repair integrates atd53559b3f. Existing MFJ scenarios15/16 now retain actual taxpayer proprietor/business/name/EIN facts and assert no graph diagnostics; original SE/QBI/income-cap amounts remain unchanged. ATS02 retains an explicit source reference for its independently owned nonstatutory spouseW2, preserving statutoryW2→C routing. These three focused cases pass3/0 on main in4s, including full ATS02 localXSD. This repairs calculation/source fixtures without claiming additional positive filing support or IRS acceptance. Main log `/tmp/opentax-full-owner-fixtures-main.log`, SHA256 `e3264cb66040b0918bb76e0ba4aef4d5b7c00f64535f847b3e9bd3aa57e889a6`; four7206 failures still await source repair and a fresh full batch.

## Spouse Medicare current-main integration, October6

At `4dc5a8fcb`, the exact combined seven-file Deno gate retained in `/tmp/opentax-medicare-farm-cf-main-integration.log` completed25 passed/0 failed in1m35s. It covers CLI issue60, five existing7206 E2Es, spouse Medicare filled-PDF sources, farmWOTC positive/conflict routes, signed C/F and native8995-A. Log SHA256: `e4c6a25cb6b9af2c4a9607c7ffa49e362c12020e3a880561e8f6598cf09e7ca9`. Three reviewed packets/nine manifest hashes copied and verified in `.state/research/2026-10-06-spouse-medicare-qbi-reviewed`. Earlier full batch11,494/8 remains the authoritative full-run result pending rerun.

## Main sourced farm losses, October6

At68e6312d6, `/tmp/opentax-farm-loss-main-integration.log` terminal result: ok | 22 passed | 0 failed (2m5s). Exact six-file command includes farm loss/positive/conflicts, signedC-F, spouse Medicare PDF and native8995-A. SHA256 `32a2aa4658fcd6d732fdd3c5886474339bed0693b645b316aa9f5595c03d0a0c`. Current held replay verifies6 cases/149 pages in `/tmp/opentax-farm-loss-main-held.log` SHA256 `7946a832c787878ba56a58576ebeb1bb43af39e63d93af4e64dbfb549ab7bda8`; only declared exclusion scope updated to current catalog, source/artifact hashes remain frozen.

## Interpreter, excluded-month and monthly-tier current-main gate

At0ca0b85cc, six-file gate `/tmp/opentax-interpreter-zero-tier-main.log`:33 passed/0 failed,1m25s; source tests cover8826, zero/positive Medicare, tier-change SHOP, three-business and independent-spouse SHOP. SHA256 `f3e877526a92e8379e95d634af20b154446d54424ee07b4640b3bdf58adc14ff`. Current held8826 replay3 cases/68 reviewed pages: `/tmp/opentax-8826-main-held.log`, SHA256 `d1bc9adc9be1485cfc28300f012038324589e2e30c2b98252ac009b7eeaf96ee`. Six excluded-health hashes verified; current tier PDFs equal reviewed hashes and current fullXML passesXSD despite regenerated timestamps. Planner283 fixtures/116 descriptors/113 keys/95 covered/18 uncovered. Phase-wide full rerun and IRS acceptance remain required.

## Fresh full regression, source-v3 October6 (running)

Stable detached checkout `/tmp/opentax-full-regression-source-v3-oct6`, commit `fbacc539ce451cf4d627085edf33f240a11f6335`, exact `deno task test`, start `2026-10-06T02:29:48Z`. LaunchAgent `opentax-full-regression-source-v3-oct6`; confirmed wrapper26565 and child26572 live. Log `/tmp/opentax-deno-task-test-source-v3-oct6.log`, status `/tmp/opentax-full-regression-source-v3-oct6.status`. Real PATH includes Poppler26.09.0, Deno2.9.4 and libxml2.9.13. Local cached IRS schema tree is linked read-only by convention; checkout stays fixed. Final totals/log digest are pending; prior11,494/8 remains authoritative full result.

## Independent farm and daily-billed SHOP main verification

Mainbf1370de3 independent farm/ownerW2/nativeSchedule3/farm-loss gate142/0(28s); `/tmp/opentax-two-farm-main-integration.log` SHA256 `2aa5eb4d42ffa253070a552b4611f593b20ea93f14e8eabc2de70a04add0b86c`. Current held replay4 cases/118 pages, `/tmp/opentax-two-farm-main-held.log` SHA256 `50ae02172d7bf93cd1d544165b4f14ae36c63e7df2aeff42ed39f3a5f8e14226`. Main41e675163 daily-billed/monthly-tier/three-business gate35/0(51s); `/tmp/opentax-partmonth-tier-main-integration.log` SHA256 `b037f91f04b58e91dff6ee85bcabe4d175cc05a2da333ca5f86071413f8f5bc9`. Two reviewed part-month PDF hashes copied/verified. Earlier fullsource-v3 run remains live but predates these changes; observed replay and Pub974 module-init failures are under repair.


## October6 issued K1, controlled farms and schema-cycle verification

Main source integration83b74af8f: Form8611 gate97/0 (10s), held replay2 cases/12 pages; controlled/independent/loss farm and exact Pub974 cycle gate11/0 (52s), controlled held replay4 cases/122 pages. Exact planner at69a748ccc:293 fixtures,116 descriptors,113 keys,96 covered and17 uncovered. These are structural/source/artifact proofs; wider parent scope and IRS business-rule/acceptance evidence remain incomplete.

- `/tmp/opentax-f8611-main-integration.log` SHA256 `ec46839e4a402ba839b95b9704a9d3ec90258019868dc3e17fa45f95fe3ca0a0`
- `/tmp/opentax-f8611-main-held.log` SHA256 `61e5149245a51d6911444587b8b5699715d1b965b67a909c4def8a86f875e43b`
- `/tmp/opentax-cycle-controlled-farm-main.log` SHA256 `9303173cd91593699c2a3cfd27ed4a9f22fb53662c2799b0637f286dda2e23e7`
- `/tmp/opentax-controlled-farm-main-held.log` SHA256 `364abce19b76d15051c7d2a53072491fd9b231c3b6b18e76421eb5b55a7f7a53`

Independent spouse health plans current mainfa0e3272e:57/0(31s), exact owned-source/zeroMedicare/native8995/Pub974 gate. Six complete packets/all101 reviewed pages and18 hashes retained under `.state/research/2026-10-06-independent-spouse-health-plans-reviewed`. Log `/tmp/opentax-independent-health-main.log` SHA256 `942422b5c8c7914ab414879b5ff571d8060dc9f7717874b863af43b089cd3aed`. IRS acceptance and broader parent scope remain unproven.


FarmSHOP8c9a77447 currentmain gate16/0(1m29s); log `/tmp/opentax-farm-shop-current-main.log` SHA256 `fee152e078cb70db6e5f04de3c6606140198ca012282ca558960f5dd4057fad2`. Four complete packets/all92 reviewed pages, fullXSD and byte-identical mainPDFs; [source proof](ty2025-form8941-owned-farm-shop-review.md). Broader source branches/IRS businessrules/ATS remain open.


## 2026-10-06 complete-source Form4972 NUA integration

Main747ec258c:14-file source/preservation gate233/0(31s), five complete2025v5.4XSDreturns and80native/PDFtamper rejections. Held checker5cases/all27reviewedpages; all main PDFs byte-identical to reviewed isolated/held outputs. Actual planner298fixtures/116descriptors/113keys/96covered/17uncovered. Evidence and digests: [review](ty2025-form4972-multiple-nua-source-review.md). Earlier isolatedpreservation231/1 was a supersededfive-copyrejection assertion; correctedpreservation232/0. Mainlog `/tmp/opentax-form4972-multiple-nua-current-main.log`; heldlog `/tmp/opentax-form4972-multiple-nua-main-held-check.log`. No full-suitepass or IRSacceptance inferred.


## October6 mixed C/F SHOP current-main verification

Main52/0(56s), two full-XSD packets/all52 pages reviewed; actual senior deduction1,455 reduces Form8995 line11 to131,552/deduction26,310. Full evidence and hashes: [mixed SHOP review](ty2025-form8941-mixed-cf-shop-review.md). Broader parent remains open.


## October6 three-member mixed SHOP

Main15/0(1m27s);3full-XSD packets/all80reviewedpages; allmainPDFs match reviewed outputs. [Evidence and boundaries](ty2025-form8941-mixed-three-shop-review.md).


## October6 mixed-owner WOTC and deducted tips

Combined currentmain62/0(3m2s);priorWOTC12/0(1m13s). RefreshedWOTCheld4/all122pages and ninecurrenttipsPDFs/all147reviewedpages preserve reviewedPDFbytes. [WOTC source review](ty2025-form8995a-gap.md), [tip source review](ty2025-qualified-business-tips-qbi-source-review.md). Actualcatalog302 includesfournewWOTCfixtures.


## October6 complete-source Form4972 annuity combinations

Main247/0(1m13s);mainheld7/all38pages,oldNUAheld5/all27pages;allreviewed source/XML/PDFbytes retained. Actualcatalog309. [Full proof](ty2025-form4972-multiple-annuity-source-review.md).


## October6 independent C/F health plans

Main22/0(2m13s); fresh held7/all212reviewedpages; all seven main PDFs match reviewed outputs. Actual catalog316. [Source review and boundaries](ty2025-form7206-independent-spouse-plans-review.md).

## Integrated source verification checkpoint (2026-10-06)

Current main42cccdf15/f0d852496 integrates explicit tip-health plan sources and two-farm health. Actual catalog347/347 unique. Nine current tip-health PDFs equal149 previously reviewed pages, with27 fresh source/XML/PDF hashes retained. Combined eight-file source/conflict gate running. Corrected observed fullV3 failure replay passes2/0(42s), calculated-return and NEC source native/PDF replay, log `/tmp/opentax-v3-observed-source-failures-current-main-v2.log`; preceding zero-selected invocation is not proof. Six exact public-source XML cases are running in their actual `review-fixtures.xsd.test.ts`. Full immutable V3 remains live at01h15m. No full-suite success claimed.

The exact six old public-source failures now pass6/0(16s),342 filtered in `/tmp/opentax-v3-six-public-sources-current-main.log`; this is deliberately six-route evidence rather than a whole catalog pass. Together with2/0 actual calculated-return/NEC replay, these prove focused repairs for eight observed fullV3 source failures; module-initialization repairs have separate prior focused evidence and latest full batch remains required.

## Immutable full regression V3 terminal result

Commitfbacc539ce451cf4d627085edf33f240a11f6335 exact `deno task test`:11,577 passed/14 failed,82m15s, exit1, start2026-10-06T02:29:48Z/end03:52:41Z. Wrapper/PIDs26565/26572 are gone. Final log `/tmp/opentax-deno-task-test-source-v3-oct6.log` SHA256 `63f952cccb1fc91d4babb95a6a2e4b5146c051b2d290d6319fcd7946c7e5ab8c`. Terminal adds qbi_aggregation/index.test.ts and intermediateform8995a/index.test.ts initialization failures to12 already mapped. Exactcurrent-main two-module gate running;12 prior targeted repairs passed. No ignored total is printed in full summary; ignored reasons will be audited from log. Latest samefullcommand remains required.

Final14failure audit: exact last two module files currentmain44/0(49ms), `/tmp/opentax-v3-final-module-failures-current-main.log`; all14 have targeted repaired-main proof. FullV3 contains0 actual ignored result lines (test names mentioning ignored are passing tests). Toolversions verified Deno2.9.4/TS6.0.3/libxml2.9.13/Poppler26.09.0. Same fullcommand launches on a fresh immutable current checkout next.

Repaired same-command V4 launched immutable181575242db2afcb5fcceb25088e3311f7aa9d78 at03:53:35UTC, live wrapper44964/Deno44970; output `/tmp/opentax-deno-task-test-source-v4-oct6.log`, status `/tmp/opentax-full-regression-source-v4-oct6.status`. Typechecking observed. Actual source revisions are those alreadyverified33/0,51/0 and exact14failuretargetedrepairs; later isolated work is not included. Final counts/ignored/errors remain unproven.

## October 6 current registry and planner reconciliation

At code `2899d051b`, live imports contain **150 native descriptors (146 unique pending keys)** and **116 PDF descriptors (113 unique keys)**. Exact source-only planner: **365 fixtures, 96 expected keys, 17 uncovered keys**. Commands: `deno run --allow-read scripts/plan-ty2025-pdf-review.ts` and live `ALL_MEF_FORMS`/`ALL_PDF_FORMS` imports. Planner evidence `/tmp/opentax-pdf-planner-2899.json`, SHA-256 `95d99e58c4c2ed8e1895a9c1e1d0fc941dffdc4340a5e55452e549687d34e6ad`; key comparison `/tmp/opentax-registry-parity-2899.json`, SHA-256 `5f7b509b6b5d2f4bf101d902fdb6b9fb9934d72f4558ff9e6aea781bd73356d4`.

Uncovered keys: `f4255`, `f5471_parent`, `f5471_schedule_e`, `f5471_schedule_h`, `f5471_schedule_i1`, `f5471_schedule_j`, `f5471_schedule_m`, `f5471_schedule_p`, `f5471_schedule_q`, `f5471_schedule_r`, `f8854`, `f8854_annual`, `f965`, `form8582cr`, `form8990`, `form8992`, `form8992_schedule_a`. Key comparison still identifies `form8621` as a native parent without a matching PDF descriptor; statement/source keys require individual packet review. `f4835_at_risk` emits Form6198 using the existing PDF route, and native `f8911` has the separate PDF companion key `f8911_schedule_a`; key names alone are not absence/support decisions. These counts establish inventory only. Named-form parents are part of the current goal; none is deferred from execution or approved for exclusion.

## Current-main mixed C/F loss-owner health proof

Exact source2899d051b compatibility five-module gate28/0(3m18s), `/tmp/mixed-cf-loss-health-main2899-compat.log`; heldchecker6/all182pages terminal0, `/tmp/mixed-cf-loss-health-main2899-check.log`. All six PDF/XML/sourcefiles byte-identical with no timestamp delta; copy/origin/owner metadata identical. Digest report `/tmp/opentax-mixed-cf-loss-health-main-replay-oct6/.state/research/mixed-cf-loss-health-main2899-digest-report.json` SHA1845f1d935c25142eabf5afa9f99c761ea8db843cd48135ed0ef477a77116d65; manifest5f20c9735bd7d810e971ab0e44e3d7b96299ed7eea6bc622d6a8357e15f85702. Original artifacts intact. Current fullV4 live44964/44970 at14m10s; no latestfullgreen orIRSacceptance. Multiple-copy death/estate main2b3a source integrated; currentmain replay remains pending.

# Detached exact-main Form 4972 death/estate replay

Checkout: `/tmp/opentax-form4972-beneficiary-death-estate-main-replay-oct6`, detached at `2b3a2e17b43dd678b61e2a57001eaed62d7d2d46`. No tracked edits.

- Current-main 26-packet source/native/full TY2025 v5.4 XSD/flattened PDF/negative suite: **3 passed, 0 failed (1m34s)**. Log `/tmp/opentax-form4972-beneficiary-death-estate-current-main-replay-oct6.log`, SHA-256 `a4b3bf2969d261a8280322e898fa4d2d35d3817ef518492665b9f5b73599ba3c`.
- Read-only comparison script `/tmp/verify-form4972-death-estate-main-oct6.py`: **26/26 PDF bytes equal** reviewed isolated originals; all input and pending JSON equal; native XML trees equal after removing only `ReturnTs`. Each PDF has three pages, so the same **78/78 reviewed page bytes** were retained. For every packet, owner SSN/name, 2/3 exact issued references, one IRS4972 identity, Form1040 referenceDocumentId join and line16 special tax were checked. Log `/tmp/opentax-form4972-beneficiary-death-estate-current-main-compare-oct6.log`, SHA-256 `ba4c6279f6c076efe40b7d6fa9943ef492dc04196e64b9f8ee89523e97b2f892`.
- Seven-file prior Form4972 source preservation (multiple partial beneficiary, multi-1099-R, NUA, annuity, single partial NUA/death/estate/annuity, partial death/annuity/estate, partial NUA/estate): **15 passed, 0 failed (1m18s)**. Log `/tmp/opentax-form4972-beneficiary-death-estate-current-main-preservation-oct6.log`, SHA-256 `81c62fa706ae7714b881dc4bbcf1f272432a65b0afb3e93cec98e1a8a15e1402`. Existing two/three-copy no-death PDFs stayed byte equal to previously reviewed originals.

Full packet artifacts live under the isolated checkout `.state/research/2026-10-06-form4972-beneficiary-multicopy-death-estate/`. The reviewed originals are under `/tmp/opentax-form4972-beneficiary-multicopy-death-estate-oct6/.state/research/2026-10-06-form4972-beneficiary-multicopy-death-estate/`. This is local XSD/PDF/source proof, not IRS acceptance or external document authentication.

## Current-main senior/independent-health source ordering proof

Exactsource2d3638ca33ca3e18bd3bc31f5137b4592f2536ac: focused6/0 `/tmp/opentax-owner-health-senior-main-focused.log`; retained-input replay5/0 `/tmp/opentax-owner-health-senior-main-replay.log`; six-file general/health/tip/mixedCF/newloss/Pub974 compatibility111/0(2m36s) `/tmp/opentax-owner-health-senior-main-compat.log`. Freshmanifest `/tmp/opentax-owner-health-senior-main-evidence-2d3638ca3/current-main-replay-manifest.json` SHAad85f55b7a44aa54521256dc2555fc6cdcccfa46b3a4e6a86358588073615c70 confirms all5 sourceJSON/PDFbytes identical (95pages), source/pending unchanged, XML onlyReturnTs and0fields/widgets; original15hashes unchanged. This closes actualsenior+independenthealthsourceordering slice, notwholeparent or externalproof. FullV4 wrapper44964/Deno44970 verifiedlive21m30s; unchangedimmutable181575242 excludeslatestphases, latestfullgate stillrequired.

## Current-main complete ordinary state-refund source proof

Exact source b4187c06a: six-module source gate119/0(47s), log `/tmp/opentax-state-refund-current-main-source-proof.log`, SHA2565d94087c33de0803ac6f5e93d5d955ecc0916790aa59af026ad8b501f4d2576d. Immutable main replay `/tmp/opentax-state-refund-current-main-replay-oct6` regenerated8/all30 reviewedpages with exact source/pending/XML/PDF bytes and full2025v5.4 XSD. Checker terminal0 `/tmp/opentax-state-refund-current-main-artifact-check-v2.log`, SHA256dc6a6599abe036a39936c38768a09fe26732cd40448947d8669ac2d426bcdfc2. Initial checker stopped before validation on a dangling cache symlink; replaced only that replay cache with a real copy and reran the same checker. Original retained packets unchanged.

Source inventory has no count cap, separates samepayer MFJ recipients, retains issuedzero-taxable copies and separately sourced unemployment; zero-taxable refund-only packet prints1040alone. Positive taxable refunds retain completed AMT computation at zeroAMT without inventing a6251 attachment. Broader tax-benefit workpapers, recovery years/corrections/business classifications, authenticity, IRS business rules and acceptance remain open. Form4852 derivednative26/0 isolated593f1cc34 remains guarded; fullroute delegated after compactfe9765617. FullV4 same44964/44970 confirmedlive33m27s; latestfull stillrequired.

## Current-main fractional beneficiary verification (2026-10-06)

Integrated source51223187d passes fresh focused15/0(1m9s) and complete36-file preservation298/0(3m7s). Logs: `/tmp/opentax-form4972-fractional-current-main-focused.log` and `/tmp/opentax-form4972-fractional-current-main-preservation-v2.log`. The first preservation run294/4 failed solely because pdftotext was absent from PATH; all four failures were inspected, and the same batch was rerun with verified Poppler tools. No production fix was required for that environment failure.

Read-only main comparison `/tmp/opentax-form4972-fractional-current-main-comparison.json` proves all17 source/pending pairs and PDFs exact against the terminal reviewed snapshot, preserving51 inspected pages and32 issued native source copies. Complete XML differs only in ReturnTs; focused proof independently validates all17 complete returns against local TY2025v5.4 XSD. Original manifest digest4fee7ab230c79332a3940fb5cc69ae10cd34e033a9ab7358a8d177bcdec49b35 remains unchanged. Root additionally inspected the half-dollar Form4972 page and combined NUA/death/estate/annuity contact sheet. No issuer authenticity or IRS acceptance is claimed.

Preservation log SHA256: `d4cfcc6c5c8e8b6f9f52faba17583ef3705a36199bd4b7fa0cdea264742e4316`; comparison SHA256: `a3e0edce206b5f506bd2045cab44073842260251b1088040afa047b36ee57d0c`.

## Separate paired beneficiary current-main gate

Main df66b8386: deno test --allow-all forms/f1040/2025/form4972_paired_beneficiary_source.test.ts terminal4/0(57s). Prior36file preservation2dd06b857 terminal298/0(3m7s), exit0.17publicreturns/fulllocalv5.4XSD/68reviewedpageinstances/64issuedcopies; source/PDF exactoriginal, XMLexceptReturnTs.16finalnative/PDFconflicts reject. Logs and comparison in paired source proof. Full regression181575242 remainslive44964/44970 at61m53s; latestfullpassing suite/IRSack stillrequired.

## Shared-participant beneficiary source integration — October6

Main4f99acaa0 commands: `PATH=/tmp/opentax-poppler-env/bin:/Users/atul/.deno/bin:$PATH deno test --allow-all --filter "shared participant" forms/f1040/2025/form4972_shared_participant_source.test.ts` passed4/0(17s), four earlier imported paired tests filtered; single-copy file filtered to the beneficiary annuity ten-year-only case passed1/0(3s), five filtered. Logs /tmp/opentax-form4972-shared-main-focused.log and /tmp/opentax-form4972-single-part3-main-focused.log. These filters do not claim a full suite. Same37-file isolated preservation08ba52b14 passed303/0(4m12s), exit0, /tmp/opentax-form4972-shared-participant-preservation-v2.log. Main production exactly matches the tested isolated source. Six complete prepared returns validate localv5.4XSD and produce23 visually reviewed PDF pages/26 native issued copies. All main source/pending/PDF bytes equal reviewed snapshots; XML onlyReturnTs; comparison /tmp/opentax-form4972-shared-single-main-comparison.json. The outside-beneficiary inventory record is not transmitted. Parent/full latest regression/IRS business rules/ATS gates remain open.

## Form8621 registered parent current-main proof

Maina2ae96eba seven focused files (`f8621` node, nativeXSD/fx, parentPDF/source/excess, current1294 source, Schedule1 source replay) pass36/0(23s), /tmp/opentax-form8621-current-main-focused.log. Same Schedule2 native/PDF and Form8978 source command passes56/0(11s), /tmp/opentax-form8621-current-main-preservation.log. Five actual prepared fullXSD packets retain38 reviewed pages; all five main PDFs byte-equal final-v6 hashes in [source proof](../../forms/f1040/2025/form8621_parent_source_proof.md). Actual registries now151native/117PDF; planner365fixtures/114keys96covered18uncovered including form8621 not yet catalogued. No fulllatest/sourceauth/IRS acceptance claim.


## Full V4 terminal and age-derived QBI expectation repair

Immutable181575242 `deno task test`: 11,794 passed / 1 failed, exit1, 95m00s runner, start2026-10-06T03:53:35Z/end05:29:40Z. Log `/tmp/opentax-deno-task-test-source-v4-oct6.log`, SHA2568bb441d743001c8f067474a04385b8b92fbe41544570744abb66c5d0e6a678a4. Sole failure was the e2e age-derived Form8995 expectation: sourced dividends26,000 minus standard17,750 and actual senior6,000 equals pre-QBI2,250; 20% cap450, taxable1,800. Corrected expectations explicitly assert the senior deduction. Focused actual-main test1/0,17 filtered,19ms; `/tmp/opentax-form8995-age-terminal-repair-v1.log`. Production unchanged. Latest full passing gate still required.


## Current-main retained substitute proof

Main488d0d288 with fixture803890382: Form4852 focused34/0(41s),15-module compatibility364/0(1m37s); held10 fullXSD packets/70 reviewed pages source/pending/XML/PDF/origin/retainedbytes exact with original manifests. Main manifest SHA25659eed07322855284a755e03b6d20d7ea6880a83d5f01e72c29e3b0fc34a8d2dd; originalvisual SHA256e4ec9bb90198147579feaf29a81a49d1d720a633c7fb164997362adb0ea41321. Logs `/tmp/opentax-form4852-current-main-focused-v2.log`, `/tmp/opentax-form4852-current-main-preservation.log`, `/tmp/opentax-form4852-current-main-held-replay.log`. Prior focused33/1 was unavailable prior-year template URL, fixed to official IRS archive; no production expectation weakened. External authenticity, broader retirement, J/T and IRS gates remain open.


## Main full-share exact-cent proof

Main5639ddfc0: combined exact-cent/native/shared-beneficiary gate16/0(1m57s), `/tmp/opentax-form4972-full-share-cents-current-main-focused.log`; isolated38-file source preservation311/0. Eight main fullXSD packets/42 reviewed pages/75 native copies exactly equal immutablee201 source/pending/PDF, XML onlyReturnTs; comparison `/tmp/opentax-form4972-full-share-cents-current-main-comparison.json`. Retained4852 replay after cent integration10/70 exact, `/tmp/opentax-form4852-current-main-cent-preservation-replay.log`. Originals/oracle/manifest preserved. Broader eligibility/authentication/prior history/ScheduleJ/AMT/IRS gates remain open.


## Current-main charitable inventory and QEF refigure

Main4a45410da: source16/0(1m57s),18-file preservation159/0(1m32s), logs `/tmp/opentax-form8283-current-main-source.log` and `/tmp/opentax-form8283-current-main-preservation.log`. All16source/pending/origin/XML/PDF packets,208returnpages and330attachments exactly match sealed reviewed originals exceptReturnTs. Original383attachmentpages+208returnpages=591 reviewed; all selected source/attachment bytes unchanged, file inventories exact. `/tmp/opentax-form8283-current-main-final-comparison.json`; originalmanifest548130a532121f4975d51e02425bb327e3ef23a5b8d3a37e1536efe10288c796. External authenticity, accepted-prior carryover and other FMV reasons/return combinations remain open.

Main4a45410da: source7/0(25s) and seven-module36/0(32s); `/tmp/opentax-form8621-qef-agi-current-main-focused.log` and `/tmp/opentax-form8621-full-refigure-current-main-focused.log`. Full-return QEF counterfactual refigures sourced medical floor473 and senior MAGI phaseout462 rather than440 regular-only difference; finalsourcegraph conflicts rejected. All7fullXSD PDFs/55reviewedpages exactly match prior5/38 plus new2/17 originals; `/tmp/opentax-form8621-full-refigure-current-main-pdf-comparison.json`. Prior related56/0 preserved isolated source proof; latestfull remains live, not a completed gate. AMT/ScheduleJ/Form8615, mixed two-pass, multiple elections, external accepted-filing authenticity and IRS gates remain open.


## Current-main Roth/disposition/QEF tax-method/preferential-AMT proof sealed

Productiond6d087c5a contains9ba8283/63aadRoth/764QEF/0bnon-QEF-preservation and842preferential-AMT integration. Compatibility505/0(6m0s), initial764; freshfinal25/0(2m39s) at0b,7/0(23s) oldQEF,5/0(57s) preferentialAMT atd6. Logs `/tmp/opentax-three-integrations-current-main.log`, `/tmp/opentax-three-integrations-current-main-final-packets.log`, `/tmp/opentax-form8621-post-method-main-held.log`, `/tmp/opentax-form4972-preferential-amt-current-main.log`.

NewRoth9/52 plusoriginal485210/70 exact source/pending/retainedbytes/XML/PDF/origins; logs `/tmp/opentax-form4852-roth-current-main-replay-v2.log` and `/tmp/opentax-form4852-post-roth-retained-current-main.log`. Originalmanifests708a61f558ee45082015120b3c4b8f7697d8906cb883aee717a42106332c2bfa and59eed07322855284a755e03b6d20d7ea6880a83d5f01e72c29e3b0fc34a8d2dd unchanged. Initialreplay discovered extra nonfarm_qef_ordinary:0;0b emits onlynonzero QEF, preserving unrelated source inventories.

New8283five169page packets125files/95attachments exact; original16/591packet426files exact, XMLonlyReturnTs. `/tmp/opentax-three-integrations-main-exact-comparison.json`, `/tmp/opentax-form8283-post-disposition-old16-main-comparison.json`. Originalreviewmanifest35eaf29059b2c4662c214b2f537227fe0f0eae3556074cbfaa8a1d9350e079dd unchanged. All new/old reviewed forms/signatures remain synthetic source contracts, not external authenticity.

QEFthree36page current-main PDFs exact a7b62dd2f8b848bc88d46a3a37611cf108c0846c127f59c7fff8616f6110bc40/dd48ecae40224e57e01b3bd3d9f993f9279cb5ec19ab9ceb9ba02d8d6096b01c/a69cd6e8ccdf3a2623757af7139f1d288c95eb7c248931829b390eb21cefa554. Allprior7/55PDFhashes exactlypreserved; `/tmp/opentax-form8621-post-method-main-held-comparison.json`.

PreferentialAMT main8/76packet40files source/pending/origin/XML/PDF/text exact reviewed842original, XMLonlyReturnTs; `/tmp/opentax-form4972-preferential-amt-main-comparison.json`. Independent Decimal sourceoracle, eight1986owner worksheets, fullPartIII, single/MFJ phaseout,128finalmutations, original8/42centproof32files preserved. Rootmanifestdd48537bbe308d32d4f6e62a5975f802083a4ee400bd3e298630f3ef28ed47b5. Repair directPDF exemption drift; earlier failures were expected-key fixture, missing unitexemptionfacts, directcapitaldistribution routing and rawNIITcent oracle formatting, all individually resolved without weakening source guards. Isolatedfinal2/0+53/0; fullgate unaffected immutable4a stilllive, no latestfull/IRS claim.

Four bounded ledger entries added, actual1454; frozen52/future unchanged. Remoteorigin/main checkedmatchesGitHuba75f0bcab3f42824bc257dc3f354168147274111. Publication remains0fd pending nextpush; reviewed completebranch730files pluscurrentdelta beforePRrewrite.


### Current-main QEF/adoption composition (October6)

Source8917c6276 +artifact-onlya25499380, exact four-module gate13/0(41s), log `/tmp/opentax-form8621-qef-adoption-current-main-focused.log`. Full2025v5.4XSD source packet9pages, PDF313ed601462c763eb346d13b95a8bdb36b0488dac518ffaa2a38cbe47fb71db7/origins exact, XML onlyReturnTs against reviewed isolated569eaf383. Allprior10packets/91PDFpages hashes exactly preserved; comparison `/tmp/opentax-form8621-qef-adoption-current-main-comparison.json`. Actual/adoption credit $6,000 nonrefundable and $5,000 refundable; Form8621 9a/9b/9c7,895/7,455/440. No authenticity/actual carryforward/IRS acceptance claim.


### Current-main complete Roth payment inventories (October6)

7da4282d3:21module211/0(1m21s), three-module mixedsource6/0(1m29s), full2025v5.4XSD held6packets/57reviewedpages exactsource/pending/XMLonlyReturnTs/PDF/origins/retainedbytes. Immutable reviewed copy `.state/research/form4852-roth-inventory-reviewed`; manifest595ea6feb5b508e53a429df1ae7932b0f0fb168c31fc4470cdf8500764a8068f and visual17b2bbbbf5c6ead2b3bde7ae48596bdbe6720c5f7dcc28472787a6ce0fdda549. OriginalisolatedRoth9/52 andretained485210/70 exactcurrent-main replay. Logs `/tmp/opentax-roth-inventory-main-related.log`, `/tmp/opentax-roth-inventory-main-focused.log`, `/tmp/opentax-roth-inventory-current-main-replay.log`, `/tmp/opentax-roth-inventory-prior-roth-main-v2.log`, `/tmp/opentax-roth-inventory-prior-substitutes-main.log`. First priorRoth attempt used mutable source with stalezeroQEFpending; untouched originalsource passes withoutproduction change. Source conversion/prior-consumption/authentication/IRS parent gates remain open.


## Current-main shadow-credit and zero-deferral proof sealed

Main e70d585b5: four-module76/0(13s), remainingtaxworksheet/source-preservation53/0(38s). Logs /tmp/opentax-form8621-qef-adoption-extended-current-main.log and /tmp/opentax-form8621-qef-adoption-extended-main-preservation.log. Actualused/shadowunused credit case8621 9a/9b/9c85/0/85, zero-tax1dollarQEF case7455/7455/0; two9pagefull2025v5.4XSD packets exactsource/pending/PDF/origins/XMLexceptReturnTs. PDFs e8d849fc136308e422c5b170f11c00bbf6da29fec91520ba7f5706c30abe5256 and ba4ce42961e9fd7ca17b31ee7dff00cf82942d2cbc353bc9e73ab8d009dce36b. Rootalsoinspectedall18pages via sixcontactmaps; amounts/identity/checkboxes/order legible. Originaladoption9pagepacket exact313ed601462c763eb346d13b95a8bdb36b0488dac518ffaa2a38cbe47fb71db7 andallprior10/91PDFs exact. Comparisons /tmp/opentax-form8621-qef-adoption-extended-main-comparison.json and /tmp/opentax-form8621-qef-adoption-extended-main-prior-comparison.json. Counterfactualflag internalonly; actualfullyusedguard remains. No actualcarryforward/authentication/IRS/full-parent completion claim.
