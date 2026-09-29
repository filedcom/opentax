# TY2025 Form 3800 printable packet gap

Status: the native `IRS3800` builder is registered and source-aware, but no Form
3800 PDF descriptor is registered. The PDF preflight now stops an active Form
3800 source rather than producing a printable packet without its parent form.
This is a temporary safety boundary, not a Form 3800 implementation or an
approved exclusion. No complete Form 3800 PDF, filled-PDF, or ATS pass is recorded.

The [official 2025 Form 3800](https://www.irs.gov/pub/irs-pdf/f3800.pdf) says to
include all nine pages with the return. Pages 1-2 carry Parts I and II and the
allowed credit on line 38. Pages 3-4 carry current-year credit rows in Part III.
Pages 5-7 carry Part IV carryovers, followed by detailed source rows in Parts V
and VI. A printable route must preserve all required pages and row
continuations, not just line 38 or the first source credit.

The current native code assembles Part I/II numbers from
`calculateForm3800Nonpassive`, source-linked current and passive credit rows,
carryovers, and Part V/VI details, then checks that the source-row tax use sums
to lines 17, 26, 37, and 38. It also checks Form 1040, Schedule 3, Form 6251,
and required source-document IDs. That is the calculation foundation for a PDF
route, but the PDF builder does not currently receive the native bundle's
reserved document IDs, and there is no shared typed projection of all printable
line and row positions. Copying XML strings into PDF fields would lose the
source joins and page/row cardinality checks.

The passive Part V and VI rows and nonpassive Part V rows now remain typed and
source-linked through `Form3800DocumentParts`; native detail XML is serialized
at the document boundary. The nonpassive rows retain the source credit, applied
amount, pass-through EIN or source document, and any transferred amount and
registration number. This removes the need for a printable route to parse those
values back out of XML. Exact field projectors now exist for the modeled Parts
I-VI and the header, but they are not connected to a filed-return builder. The
official form has 15 Part V and 35 Part VI breakdown slots. A PDF-only capacity
preflight now rejects extra breakdown rows instead of truncating them, without
limiting valid native XML. It is not connected to a Form 3800 PDF descriptor
yet. The remaining build step is to pass the native builder's finalized typed
parts and reserved document IDs through a single prepared-return artifact to PDF
assembly, then connect this preflight before PDF output.

The official TY2025 fillable form's AcroForm has 1,921 fields. The inspected
field counts by physical page are 27, 22, 370, 170, 333, 252, 162, 270, and 315.
`f3800_fields.ts` records the exact header and Parts I-II paths, all Part III
and IV row-path sequences, all 15 two-table Part V paths, and all 35 Part VI
paths. A source-backed Parts I-II projector now checks line 38 against final
Schedule 3 line 6a and source tax use against lines 17, 26, and 37 before
filling the corresponding 39 PDF fields. A Part III projector now maps the
currently modeled source row columns and 2/5/6 subtotals from typed amounts and
metadata; the native path does not model elective payment columns (h) or (j).
The field-map and projection cases passed in a focused 19-test run on
2026-09-29; they do not validate a filled nine-page packet.

Part IV top-level carryover rows now retain source keys, latest originating
year, entity identity, and all tax-use amounts as one typed row. Native XML is
generated from that row only at document assembly; there is no cached XML copy.
This makes its printable columns available without parsing XML. The pure Part IV
projector now maps columns (a)-(i), including year, entity, aggregate count, tax
use, and lines 5/6/7 subtotals, and rejects lost source identity or an
impossible carryforward. Its cases passed in that focused run.

Parts V and VI now have pure source projections onto the exact page 8 and 9
fields. Part V combines nonpassive facilities and passive current sources,
checks per-line amounts and tax use against Part III, and prints transfer sales
without inventing purchased credits. Part VI checks each originating-year source
against its Part IV aggregate and preserves EIN, allowed credit, tax use, and
carryforward. Both projections use the PDF-only 15/35-row capacity check. Their
positive, tamper, and overflow cases passed in that focused run. Header projection
uses the finalized filer identity and the native transfer-statement IDs to mark
the two yes/no questions and statement count. It rejects a transfer election
that has no matching source-row sale or lacks reserved statement IDs. The
revised-carryforward checkboxes are not guessed; a nonzero line 4 or 34 is a
PDF-only rejection until a typed answer is available. Header cases passed in
that focused run.

The remaining integration is substantive. The native Form 3800 builder now calls
the exported `prepareForm3800DocumentParts`, which obtains reserved Form 8835
and binary-attachment IDs from `MefBuildContext` and returns the same typed
parts that native XML serializes. The PDF descriptor contract receives raw
pending forms and filer identity, not those reserved IDs or the reconciled
parts. Rebuilding the tax allocation from raw pending forms would duplicate
native logic; inventing IDs just for the PDF would break the source join. The
native build must expose its already validated typed parts to the PDF packet
without a second allocation path. Part III aggregate/detail joins also need
final-return review. The native route does not model purchased transfer credits
or elective payment elections, so those Part V columns must remain blank on this
supported route. Until that data path is wired, one full batch is green, and all
nine filled pages are visually checked, the Form 3800 descriptor must remain
unregistered.

## Single-source export boundary

The current call sites are separate. `cli/commands/export.ts` calls
`def.buildMefXml(def.buildPending(pending), filer)` for MeF but calls
`def.buildPdfBytes(pending, filer)` for PDF. `forms/f1040/2025/index.ts` exposes
those two entrypoints through `FormDefinition`; neither can pass a finalized
Form 3800 object to the other. `pdf/builder.ts` normalizes pending again and
passes only raw form fields, filer, and all pending to descriptors.

In `mef/builder.ts`, the first fragment pass reserves each document root and its
positional ID. The second pass supplies the exact IDs grouped by pending key,
XML tag, and binary-attachment filename, builds linked documents, and checks
references. Form 3800 emits only a placeholder root in the first pass; its
reconciled `Form3800DocumentParts` is prepared only with the second pass's
reserved IDs. `buildMefBundle` validates actual PDF attachment bytes before
calling that builder, and submission archives use `buildMefBundle`. By contrast,
`buildMefXml` supplies no attachments, so it cannot reserve IDs for a transfer
statement. A standalone PDF export likewise has no attachment bytes today.

The minimum direct replacement is one asynchronous, form-owned prepared-return
operation, called by both CLI export paths after execution. It must generate or
receive and validate the actual binary attachments, reserve IDs once, build the
linked documents once, and retain the same immutable validated
`Form3800DocumentParts` used for `IRS3800` serialization. The MeF export reads
XML from that artifact; the PDF renderer reads its filer, normalized pending,
and typed Form 3800 parts. The existing raw-pending MeF/PDF entrypoints should
be replaced at their call sites, not kept as alternate paths or overloaded.
Submission archive construction must consume the same prepared artifact so its
attachment bytes and IDs cannot diverge. External attachment acquisition for
standalone export must be decided explicitly; it cannot be replaced with
synthetic filenames or IDs.

The unrun end-to-end cases for that replacement should assert: the same Form
8835 and binary statement IDs in prepared parts and serialized XML; a missing or
changed attachment fails before either export; a transfer election and Form 3800
PDF header show the same statement count; Parts III-VI source rows and line 38
match the prepared return and Schedule 3; and a capacity overflow blocks PDF
only while the otherwise valid native XML remains available.

Build the print projection from the same validated source parts as native MeF:

1. Expose the already validated `Form3800DocumentParts` and final filer from the
   native source and final-return reconciliation to PDF assembly, including
   reserved source IDs as validations, not printed substitutes. Do not create a
   second allocation path.
2. Map each nonblank line and required checkbox to the checked official
   AcroForm, and include all nine pages. Reject rows that cannot fit or need
   unmodeled continuation pages rather than truncating them.
3. Require the printed line 38 and every applied Part III/IV source to match the
   finalized Schedule 3 line 6a and native allocation, including zero-allowed
   current-year credits with carryforward consequences.
4. In the agreed full batch, validate the native document against TY2025 XSD,
   render actually filled PDFs, inspect all nine pages and any continuation,
   then seek IRS ATS business-rule acceptance.

Direct and pass-through source forms may gain their own PDF descriptors before
this parent exists, but that does not make a credit-bearing return's printable
packet complete. The Form 3800 parent remains a release gate.
