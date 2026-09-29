# TY2025 Form 3800 printable packet gap

Status: the native `IRS3800` builder and a nine-page PDF descriptor are
registered. The PDF consumes typed parts captured during the same linked MeF
pass, including reserved source and attachment IDs. One- and two-facility
geothermal credit returns have local XSD and filled-PDF evidence. Other credit
sources, transfers, carryovers, row combinations, and ATS acceptance remain open.

The [official 2025 Form 3800](https://www.irs.gov/pub/irs-pdf/f3800.pdf) says to
include all nine pages with the return. Pages 1-2 carry Parts I and II and the
allowed credit on line 38. Pages 3-4 carry current-year credit rows in Part III.
Pages 5-7 carry Part IV carryovers, followed by detailed source rows in Parts V
and VI. A printable route must preserve all required pages and row
continuations, not just line 38 or the first source credit.

The native code assembles Part I/II numbers from
`calculateForm3800Nonpassive`, source-linked current and passive credit rows,
carryovers, and Part V/VI details, then checks that the source-row tax use sums
to lines 17, 26, 37, and 38. It also checks Form 1040, Schedule 3, Form 6251,
and required source-document IDs. The linked pass now captures those exact
typed parts for the PDF, and the PDF builder rejects changed pending source or
typed parts against their prepared SHA-256 values.

The passive Part V and VI rows and nonpassive Part V rows now remain typed and
source-linked through `Form3800DocumentParts`; native detail XML is serialized
at the document boundary. The nonpassive rows retain the source credit, applied
amount, pass-through EIN or source document, and any transferred amount and
registration number. This removes the need for a printable route to parse those
values back out of XML. The existing field projectors now feed the registered
PDF descriptor through the prepared MeF bundle. The official form has 15 Part V
and 35 Part VI breakdown slots. A PDF-only capacity check rejects extra
breakdown rows instead of truncating them, without limiting valid native XML.

The official TY2025 fillable form's AcroForm has 1,921 fields. The inspected
field counts by physical page are 27, 22, 370, 170, 333, 252, 162, 270, and 315.
`f3800_fields.ts` records the exact header and Parts I-II paths, all Part III
and IV row-path sequences, all 15 two-table Part V paths, and all 35 Part VI
paths. A source-backed Parts I-II projector now checks line 38 against final
Schedule 3 line 6a and source tax use against lines 17, 26, and 37 before
filling the corresponding 39 PDF fields. A Part III projector now maps the
currently modeled source row columns and 2/5/6 subtotals from typed amounts and
metadata; the native path does not model elective payment columns (h) or (j).
The field-map and projection cases pass locally. The registered descriptor's
field names also pass a live check against the official IRS AcroForm.

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

The native Form 3800 builder calls `prepareForm3800DocumentParts` during the
linked pass. A capture callback stores that exact object in the MeF bundle;
the PDF descriptor projects its header and Parts I-VI from it. No XML parsing
or second credit allocation is needed. The native route still does not model
purchased transfer credits or elective payment elections, so those Part V
columns remain blank. Part III aggregate/detail joins and all other credit
source combinations still need full-return review.

## Prepared export and current evidence

`cli/commands/export.ts` now calls one asynchronous form-owned preparation for
either MeF or PDF export. `buildMefBundle` validates generated attachments,
reserves document IDs in its first pass, and captures the typed Form 3800 parts
from the linked pass. The PDF builder accepts that bundle and checks its stored
source and typed-parts SHA-256 values before projection. An active Form 3800
without prepared parts fails rather than printing a partial parent. Existing
raw builder calls remain during migration; this dual call shape was disclosed
before introduction.
Submission archive construction now consumes that same bundle. It checks the
filer/source, XML, and every attachment against hashes recorded at preparation
before writing the ZIP. A focused geothermal case confirms that the PDF and
submission ZIP use one prepared native return. External attachment acquisition
and cross-route archive review remain open.

The synthetic source-backed geothermal return computes a $600 Form 8835 credit,
then prints it on Form 3800 Part III line 4e and line 38, Schedule 3 line 6a,
and Form 1040 line 20. Its native XML passes local TY2025 v5.4 XSD. The
17-page packet includes all nine official Form 3800 pages; each was rendered
and visually inspected. Unused carryover and detail pages are present and
blank. The retained packet is
`.state/research/ty2025-filled-pdf-review/2026-09-29-v17/single-geothermal-general-business-credit.pdf`
(SHA-256 `cde93fec081ab249caec0ec8ded36dead335ab2fd26db5964864edfe05f28539`).
The subsequent two-facility source return emits distinct `IRS8835` document
IDs and three-page PDF copies, two $600 Form 3800 Part V rows, and $1,200 on
line 38, Schedule 3 line 6a, and Form 1040 line 20. Its native XML passes
local TY2025 v5.4 XSD. The 20-page packet was rendered and inspected; its PDF
SHA-256 is `6136172eee20ac9e9ac76b139102547eb4ee4f4a55c0d25927fdb5e4aa1dd78f`.
The full 19-return PDF review set contains 135 pages and 19 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v18/`. Focused
prepared-return, source-drift, field-map, projection, and local XSD cases pass.
The `98466597` repository-wide run passed 8,851/8,851 after the archive
change, zero failed, in 13m37s; its summary reported no ignored tests. The
focused PDF/archive tests passed 13/13 before that run. The log is retained at
`.state/research/ty2025-full-test-98466597.log`. The subsequent two-facility
diagnostic found three older tests reusing one physical facility identity;
their fixtures were corrected. The fixed-source `15d5430d` repository-wide
run then passed 8,855/8,855, zero failed, with no ignored tests reported in
14m11s. Its log is `.state/research/ty2025-full-test-15d5430d.log`.

The remaining gate includes transfer elections with exact attachment bytes and
statement IDs; passive and carryover vintages; mixed and wider same-line
sources and Parts V/VI overflow; unsourced revised-carryforward checkboxes;
all applicable credit combinations; external credit attachments and
cross-route archive checks; source-backed IRS business-rule checks; and ATS
acceptance. Passing one- and two-facility packets does not establish those
branches.
