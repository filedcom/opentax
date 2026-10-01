# TY2025 Form 3800 printable packet gap

Status: the native `IRS3800` builder and a nine-page PDF descriptor are
registered. The PDF consumes typed parts captured during the same linked MeF
pass, including reserved source and attachment IDs. One- and two-facility
geothermal and mixed wind/geothermal credit returns have local XSD and
filled-PDF evidence. Other credit sources, transfers, carryovers, row
combinations, and ATS acceptance remain open.

The direct PDF descriptor now requires the pending Form 3800 allowed-credit
amount to match both its return-wide pending source and the prepared native
line 38 at cent precision. A changed raw descriptor argument or changed pending
credit fails before any page fields are projected. Positive and tamper fixtures
are authored for the deferred bulk run; this closes the direct-projection
amount drift, while individual credit-source authenticity remains open.

One self-earned, nonpassive qualified commercial clean vehicle now has an
additional direct Form 3800 PDF source check. The Form 8936 Part V and Schedule
A source facts calculate a $3,000 credit for a $10,000 electric van acquired
September 30, 2025. The nine-page parent PDF replays that calculation, the
filed IRS8936 document ID, one Part III line 1aa and Part V detail, Part II
line 17/38, Schedule 3 line 6a/8, and final Form 1040 line 20. Positive
full-return/native/PDF and changed basis, acquisition date, prepared row,
raw credit, and final-return fixtures are authored but unrun. The
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800)
place Form 8936 Part V on line 1aa, and the
[2025 Form 8936 instructions](https://www.irs.gov/instructions/i8936)
close acquisitions after September 30. Multiple vehicles, passive business
credits, source-document authentication, carryforwards, and the deferred
test/XSD/filled-PDF/business-rule/ATS batch remain open.

The parent PDF also accepts that one vehicle alongside one self-earned,
nonpassive Form 5884 work opportunity credit when the finalized return can use
both credits. It separately recalculates the vehicle and certified-payroll
sources, checks their Part III lines 1aa/4b and distinct Part V document links,
and matches the standard and specified Part II lines 17/37 to the combined
line 38, Schedule 3, and Form 1040 line 20. A $3,000 vehicle plus $2,400 work
opportunity full-return case and source, prepared-row, and final-credit tamper
fixtures are authored for deferred validation. Multiple vehicles, employees,
passive credits, carryforwards, source-byte authentication, and the shared
validation and ATS gates remain open.

For one nonpassive, self-earned Form 5884 employer claim, the Form 3800 PDF
now recalculates the work opportunity credit from the employee certification,
hours, and payroll source, and matches it to the pending and raw Form 3800
credit. It rechecks the prepared native Part III line 4b and its one linked
Part V source detail, then uses the existing line 38 → Schedule 3 line 6a/8
→ Form 1040 line 20 join. Positive and changed hours, prepared detail, raw
credit, and final-return fixtures are authored but unrun. The
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800) place
current-year work opportunity credit in Part III and require the appropriate
credit source form; the [Form 5884 instructions](https://www.irs.gov/instructions/i5884)
require state certification and a wage-deduction reduction. This PDF check
does not expand support for multiple employees, pass-through combinations,
passive credits, or independent certification/payroll authentication.

The direct partnership K-1 orphan-drug route now carries one nonpassive 2025 code Z
credit to Form 3800 Part III line 1h, Part II line 38, Schedule 3 line 6a/8,
and Form 1040 line 20. The native preparer already matches the claimed credit
to the exact partnership K-1 EIN, document reference, code Z amount, and passive
status. The nine-page PDF projection now repeats that match against the
pending K-1 and checks its prepared line 1h amount, single-source count, and
entity EIN before printing. Positive, K-1 tamper, prepared-row tamper, and
Form 1040 drift fixtures are authored but unrun. The 2025
[Schedule K-1 partner instructions](https://www.irs.gov/instructions/i1065sk1)
and [Form 3800 instructions](https://www.irs.gov/instructions/i3800) govern
the direct credit line; the underlying issuer copy remains a reviewed source
record rather than authenticated bytes. Other line 1h source combinations,
passive allocations, and credit carryovers remain open. The separately modeled
estate/trust K-1 box 13 code M orphan-drug route remains closed: the current
source model lacks qualified clinical-testing and passive-activity evidence.
The official [2025 beneficiary instructions](https://www.irs.gov/instructions/i1041sk1)
identify box 13 code M as orphan-drug credit, while box 14 code M supplies
clean electricity investment information for Form 3468 Part V. Form 3800
line 1v is being wired to the reviewed box-14 property statement, Form 3468,
and final tax; it must not consume a box-13 code M amount. Rejection and
positive fixtures are authored for the deferred batch, with the full chain
still under integration.

The Form 8835 source calculation now rejects electricity sold on or after the
tenth anniversary of the facility's placed-in-service date, including a 2025
period that crosses that boundary. The same calculation feeds Form 3800 and
the native/PDF Form 8835 projectors. Boundary cases are authored but unrun for
the deferred batch; underlying production and sale records remain unauthenticated.
The shared calculation also rejects a construction-start date after placement
in service; its contradiction case is authored but unrun. The construction
record itself remains unauthenticated.

A source-vintage reconciliation module now checks cent-precise origin credit,
origin-year and subsequent allowed uses, prior adjustments, the 2025 opening
balance, and any 2025 recapture reduction. It retains the year-by-year facts
needed for the [required Form 3800 statement](https://www.irs.gov/instructions/i3800),
and its four focused cases pass. Reconciled nonpassive vintages now feed the
Part I line 4 and Part II line 34 calculations, with separate ordinary and
specified tax limits. The native builder explicitly rejects their export
until prior-return evidence and the complete prepared packet are verified.
Research-credit vintages are rejected before calculation
until their Form 6765 business-income limitation can be applied. Later-year
carrybacks remain unsupported.

The standalone carryover statement renderer now prints each source vintage's
origin-year credit, allowed amount, historical use by year, original versus
revised balance, and adjustment detail. It rejects revised research credits
without the additional Form 6765 statement facts. A nine-vintage synthetic
statement occupies two letter-size pages, with all nine headings preserved and
no visual clipping. Its retained diagnostic is
`.state/research/form3800-carryover-statement-diagnostic.pdf` (SHA-256
`073b959868dc8f016b5657633646b1a9b6a23913010b6bf4f61a5f254df941d8`).
The renderer was subsequently wired into the Form 3800 PDF descriptor, as
recorded below; external source verification remains open.

The local TY2025 v5.4 schema also defines a structured
`CarryforwardGeneralBusinessCr` document with credit identity, origin year,
origin amount and allowed amount, plus repeated carryback and carryforward
year/use groups. Form 3800 Part I line 4 can reference its reserved document
ID. A printable history page alone does not satisfy this native link; the
structured descriptor now emits one computation per reconciled vintage using
explicit origin and prior-use tax-year-end dates. Its standalone TY2025 v5.4
XSD case passes. A typed source-to-computation link can now reconcile a
synthetic parent Part I line 4 reference and Part IV nonpassive totals with
the same source facts used for the PDF revised-carryforward checkboxes. That
two-vintage parent passes local TY2025 v5.4 `IRS3800` XSD. The production
parent now also accepts typed nonpassive Part VI source-vintage rows in place of
the unused raw XML detail field. A two-year aggregate reconciles its source
keys, originating years, amounts and tax use to Part IV and the native
computation links; both native XML and PDF columns use those typed rows, and
the synthetic parent passes local TY2025 v5.4 XSD. Production assembly was
subsequently connected, as recorded below. Authenticated prior-return
evidence, positive filed-packet proof, and any additional revised-credit facts
remain open; native export still rejects carryforwards.

The native parent and PDF projectors now call one Part IV/VI reconciliation
that checks aggregate source keys, latest year, passive and nonpassive amounts,
tax use, adjustments, and remaining credit. It also checks the tax-use balance
for a single nonpassive carryforward source. A 137-case focused Form 3800
native/PDF run passed. This closes a cross-output consistency gap while the
production carryforward route remains blocked.

The Part IV join now combines passive and nonpassive carryovers that use the
same IRS credit line. It retains the passive source vintages through preparation
so a single-source passive row still gets its Part VI detail when combined with
a nonpassive vintage. The synthetic mixed-line parent emits one Part IV row and
two Part VI source rows, passes local TY2025 v5.4 `IRS3800` XSD, and the
138-case focused Form 3800 native/PDF run passes. The production parent still
rejects positive carryforward export until prior-return evidence, source links,
and the history attachment are complete.

Carryforward intake now requires a typed source origin for each vintage,
including an entity reference and EIN or `APPLD FOR` for pass-through sources.
The standalone history renderer prints that origin. A pure assembler maps each
reconciled ledger vintage to a namespaced FIFO tax-use source, its reserved
`CarryforwardGeneralBusinessCr` ID, one Part IV credit-line aggregate, and
required Part VI breakdowns. A two-year self/partnership case reconciles $700
of credit to $500 of tax use and $200 remaining, projects the EIN and amounts
to PDF fields, and passes the local TY2025 v5.4 `IRS3800` XSD. The 243-case
focused Form 3800 calculation/native/PDF run passes; its log is
`.state/research/ty2025-form3800-focused-carryforward-assembly.log`.
Prior-return acceptance and final prepared-return export remain open, so
positive production export is still rejected.

The production preparation path now includes carryforward vintage rows in the
shared FIFO allocation and joins their typed Part IV/VI rows with any passive
and current-year credits. It validates the complete native Form 3800 document
before the explicit prior-return evidence and history-attachment guard. A
carryforward-only prepared case reaches that guard with reserved computation
and Form 6251 IDs and reconciled Form 1040/Schedule 3 tax facts. The 243-case
focused rerun is recorded in
`.state/research/ty2025-form3800-focused-preparation-integration.log`.
The Form 3800 PDF descriptor now appends the carryover history after its filled
form pages using the builder's prepared MeF parts and normalized source input.
Before appending it checks each vintage's source key, credit line, originating
year, available amount, and revised status against those prepared parts. A
component case places the history after nine form pages and rejects changed
source facts. The PDF builder and Form 3800 focused run passed 257/257; its
log is `.state/research/ty2025-form3800-focused-history-attachment.log`.
The prepared production packet still cannot pass the authenticated prior-return
evidence gate.
The updated one-page history layout was rendered and visually checked with a
long partnership entity reference; its EIN label and value stay together after
word wrapping. The review PDF and PNG are retained under `.state/research/`
as `ty2025-form3800-carryover-origin-review.*`.

The fixed-source `99243afd` repository-wide rerun completed at 2026-09-29
18:13 UTC: 8,894/8,894 passed, zero failed, in 15m46s, with no ignored tests
reported. Its log is `.state/research/ty2025-full-test-99243afd-rerun.log`.
The first attempt on that unchanged commit failed one Form 2555 canonical-PDF
check when the IRS download body closed; the exact check passed on rerun before
the full green rerun. These runs cover the registered statement descriptor,
but no positive Form 3800 carryforward filing path exists yet.

The subsequent 2026-09-29 18:39 UTC full run on code commit `11d5047d`
passed 8,897/8,897 with zero failures in 16m49s. It includes the synthetic
two-vintage parent XSD check and the source-link negative tests. The log is
`.state/research/ty2025-full-test-carryforward-link.log`. This still does
not exercise a production positive carryforward filing path.

The 2026-09-29 19:10 UTC full run on source commit `efac9046` passed
8,898/8,898 with zero failures in 15m20s. It covers the typed nonpassive
Part VI native/PDF component and the aggregate two-year XSD case. Its log is
`.state/research/ty2025-full-test-efac9046.log`. The production positive
carryforward path remains blocked.

The fixed-source `500bd115` repository-wide run completed at 2026-09-29
16:48 UTC: 8,886/8,886 passed, zero failed, with no ignored tests reported,
in 15m51s. Its log is
`.state/research/ty2025-full-test-500bd115.log`. A subsequent type-only
import correction on `1087f488` passed focused lint and both statement tests.

The fixed-source `c6e844d8` repository-wide run completed at 2026-09-29
16:27 UTC: 8,884/8,884 passed, zero failed, with no ignored tests reported,
in 16m5s. Its log is
`.state/research/ty2025-full-test-c6e844d8.log`.

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
revised-carryforward checkboxes now use typed source-vintage answers that
reconcile to Part IV and the native computation IDs. The production
carryforward route remains blocked until those source facts are assembled.

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
The next mixed wind/geothermal source return prints wind on Form 8835 line 1a,
geothermal on line 1c, two $600 Part V rows, and $1,200 through line 38,
Schedule 3, and Form 1040. Its local TY2025 v5.4 XML check passes; the two
Form 8835 copies and Part V page were visually reviewed. The 20-return PDF
review set contains 155 pages and 20 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v20/`. Focused
prepared-return, source-drift, field-map, projection, and local XSD cases pass.
The next source-backed nonpassive New Markets case prints a $500 Form 8874
credit on Part III line 1i and line 38 and carries it through Schedule 3 and
Form 1040. Its 15-page packet and local TY2025 v5.4 XML pass the bounded
source-to-return check; Form 8874 and Part III were visually inspected. The
expanded review set has 21 PDFs (170 pages) and 21 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v23/`.
The next two Form 8874 returns print two and six qualified equity investments
on one source form each, with $1,100 and $3,000 on Part III line 1i and
line 38. Their Form 8874 pages and one Part III page were visually checked;
both native returns pass local TY2025 v5.4 XSD. The expanded review set now
has 23 PDFs (200 pages) and 23 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v25/`.

One further source-backed return combines a $600 geothermal Form 8835 and a
$500 New Markets Form 8874. The prepared parent keeps their separate native
document IDs and prints $600 on Part III line 4e, $500 on line 1i, and $1,100
on line 38, Schedule 3 line 6a, and Form 1040 line 20. The Form 8835 PDF
guard now checks its own fully used prepared line 4e source instead of
requiring the facility amount to equal the return-wide credit. The 18-page
packet's source forms and Part III pages were visually inspected, and local
TY2025 v5.4 XSD passes. The review set has 24 PDFs (218 pages) and 24 XML
files under `.state/research/ty2025-filled-pdf-review/2026-09-29-v26/`.

A separate authored full-return case combines self-earned, nonpassive Form
8820 orphan-drug credit ($1,975 after the section 280C reduced-credit election)
with one Form 8874 New Markets investment ($500). Form 3800 Part III lines 1h
and 1i retain distinct IRS8820/IRS8874 document references and source amounts;
Part II line 38, Schedule 3 line 6a, and Form 1040 line 20 carry the $2,475
allowed credit once. The printable Form 3800 now replays both filed source
calculations and rejects changed pending or prepared current rows in this
bounded direct-source combination. Positive, source-tamper, and raw-descriptor
tamper cases are authored for the deferred bulk pass; no test, XSD, or PDF
generation was run for this addition. The [Form 3800 instructions](https://www.irs.gov/instructions/i3800),
[Form 8820 instructions](https://www.irs.gov/instructions/i8820), and
[Form 8874 instructions](https://www.irs.gov/instructions/i8874) identify the
current-year credit lines and source-form relationship. Clinical-testing and
investment evidence in this synthetic case is source metadata; issuer-copy
byte authentication and prior-year carryforward export remain open.

Another authored mixed return combines that $1,975 self-earned Form 8820
ordinary credit with a $600 geothermal Form 8835 specified credit. The
prepared Form 3800 keeps the source documents on Part III lines 1h and 4e;
Part I lines 1/6/17 allow $1,975, Part II lines 30/37 allow $600, and line 38,
Schedule 3 line 6a, and Form 1040 line 20 retain $2,575. The printable parent
now verifies each filed source, prepared row/detail and distinct document ID,
as well as the ordinary and specified tax-use totals in this bounded
combination. Positive, changed raw Form 8835 amount, changed facility sales,
and altered Part I tax-use fixtures are authored; execution is deferred to
the shared bulk pass. The
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800) place
orphan-drug and renewable-electricity-production credits in their respective
current-year groups. Source-record authentication and carryforward filing
remain open.

A bounded current-year passive/ordinary New Markets route now takes one Form
8874 with a $500 passive 2025 investment and a distinct $300 nonpassive
2025 allowance investment. The passive source matches one Form 8582-CR
ordinary line-6 rental worksheet and Worksheet 9 activity; the second
investment stays outside that passive worksheet. Form 3800 joins both under
Part III line 1i with one IRS8874 reference and two Part V details. Part I
lines 1/2/3/6/17 and Part II line 38 reconcile the $300 ordinary and $500
allowed passive amounts to $800 on Schedule 3 line 6a and Form 1040 line 20.
Native and printable source replay checks the passive activity/reference,
second investment amount, current row details, document identity, and final
tax join. Full-return, source-amount, filed-credit, and prepared-row tamper
fixtures are authored but unrun for the bulk pass. The [Form 8874
instructions](https://www.irs.gov/instructions/i8874), [Form 8582-CR
instructions](https://www.irs.gov/instructions/i8582cr), and [2025 Form 3800
instructions](https://www.irs.gov/instructions/i3800) govern the bounded
current-year claim. Additional passive activities, source kinds, unallowed
prior-year imports, and issuer-byte authentication remain open.

The same two-investment Form 8874 route now also covers one partially allowed
passive current-year credit. A $5,000 passive QEI credit is limited to $4,412
by the source-replayed Form 8582-CR ordinary line-6 worksheet, while a
separate $300 nonpassive investment is fully used. The 2025 Worksheet 9
ledger retains the $588 passive remainder by activity and origin year. Form
3800 Part III line 1i
retains the full passive amount before the limit, only its allowed amount
after the limit, and the separate nonpassive amount; Parts I/II, Schedule 3,
Form 1040, native XML, and the nine-page PDF use the $4,712 allowed sum. Positive,
changed passive QEI amount, and prepared-row tamper fixtures are authored
for the deferred bulk run. Accepted prior-year import and future use of this
unallowed balance remain closed.

Two separately identified self-earned passive Form 8874 investments can now
share the one sourced Schedule E rental ordinary line-6 tax worksheet. In the
bounded full return, each investment generates $5,000 of current-year credit;
Form 8582-CR line 6 permits $4,412 in total and its 2025 Worksheet 9 retains
$2,206 allowed and $2,794 unallowed for each activity. Form 3800 Part III
line 1i reports $10,000 before and $4,412 after the passive limit, with two
Part V details tied to one filed IRS8874 document ID. Parts I/II, Schedule 3,
Form 1040, native XML, and PDF use $4,412. Source amount and prepared activity
tamper fixtures are authored for the deferred bulk run. Prior-year credit
import remains closed without authenticated accepted-year evidence.

The self-earned passive Form 8874 route now takes up to fifteen distinctly
identified current-year investments, the physical capacity of the nine-page
Form 3800 PDF Part V. Each source's activity, notice reference, and credit
amount is matched one-to-one with its Form 8582-CR source and retained 2025
Worksheet 9 balance. Form 3800 Part III line 1i and every Part V detail
reconcile to native XML and PDF; the total allowed amount joins Schedule 3
and Form 1040. Authored three-source unequal-allocation, seven-source Form
8874 attachment, fifteen-source capacity, sixteenth-source rejection, and
tamper fixtures await the shared validation run. The separate one-passive
plus one-nonpassive route stays bounded to that pair. Accepted prior-year
credit import remains closed without authenticated evidence.

One credit-only partnership K-1 box 15 code AD and one credit-only S
corporation K-1 box 13 code AD can now contribute distinct current-year
passive New Markets credits to the same sourced Form 8582-CR ordinary line 6.
The $5,000 and $2,500 credits retain separate 2025 Worksheet 9 balances;
$4,412 is allowed in total. Form 3800 Part III line 1i and two Part V rows
retain both pass-through EINs and exact source amounts without an unsourced
individual Form 8874. Schedule 3, Form 1040, native XML, and PDF use the
allowed amount. Issuer/recipient/extra-box and prepared-detail tamper fixtures
are authored but unrun. Other K-1 mixes and prior-year accepted-carryover
claims remain closed.

The direct passive New Markets K-1 route now handles one to fifteen distinct
credit-only partnership box 15 code AD and S corporation box 13 code AD
sources in any mix. Each source's issuer, recipient, activity, K-1 reference,
amount, and passive classification is matched one-to-one to Form 8582-CR and
its current-year Worksheet 9 row. The Form 3800 Part III line 1i aggregate
and every Part V EIN/amount row reconcile to native XML, PDF, Schedule 3, and
Form 1040. A three-partnership/one-S-corporation return and the fifteen-row
printable boundary have positive and tamper fixtures authored for the deferred
run. Other source types and accepted prior-year credit imports remain closed.

Self-earned Form 8874 investments and passive partnership/S corporation
code AD K-1 credits can now share Form 3800 Part III line 1i within the
fifteen-row Part V printable capacity. The direct Form 8874 line 1 investment
credit and its line 2 K-1 credit reconcile to line 3; each activity retains
its own Form 8582-CR 2025 Worksheet 9 balance. The current Part III row
references the filed IRS8874; Part V binds that document only to self-earned
details and prints issuer EINs for K-1 details. A $9,000 gross/$4,412 allowed
three-source return and a five-source combination have native/PDF and
source/prepared-detail tamper fixtures authored for deferred validation.
Nonpassive investment plus K-1 credit mixes and accepted prior-year credit
imports remain closed.

The seven-investment New Markets return prints $3,500 on Form 3800 Part III
line 1i and line 38, Schedule 3 line 6a, and Form 1040 line 20. Form 8874
uses the required last-row "See attached" convention and an additional
six-column investment page. The 16-page packet's source and statement pages
were visually reviewed; its native XML passes local TY2025 v5.4 XSD. The
review set now has 25 PDFs (234 pages) and 25 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v27/`.

The fixed-source `bc556b01` repository-wide run passed 8,873/8,873,
zero failed, with no ignored tests reported in 16m39s. Its log is
`.state/research/ty2025-full-test-bc556b01.log`.

A 24-investment Form 8874 return exercises two attached detail pages and a
$9,500 last-row attachment subtotal. Its $12,000 direct source credit
prints on Form 3800 Part III line 1i and line 38, Schedule 3 line 6a, and
Form 1040 line 20. The full native XML passes local TY2025 v5.4 XSD, and
the Form 8874 plus both statement pages in the 21-page packet were visually
reviewed. The review set has 26 PDFs (255 pages) and 26 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v28/`.

During fixture construction, the same $12,000 source credit with $150,000
of wages produced $8,973 on Form 3800 line 38 and $3,027 unused. That
diagnostic is not a carryover filing route: the
[2025 Form 3800 instructions](https://www.irs.gov/instructions/i3800)
require unused credit to be handled under carryback and carryforward rules.
The accepted high-wage fixture isolates continuation-page and full-credit
reconciliation; carryback/carryforward evidence and the durable ledger remain
open.

The fixed-source `9175f7c1` repository-wide run passed 8,875/8,875,
zero failed, with no ignored tests reported in 15m57s. Its log is
`.state/research/ty2025-full-test-9175f7c1.log`.

One more source-backed nonpassive New Markets return has a CDE identity too
long for the physical Form 8874 row. The last row carries the "See attached"
$500 subtotal and a wrapped statement retains the full CDE identity. Form
3800 Part III line 1i/38, Schedule 3 line 6a, and Form 1040 line 20 each
reconcile to $500; native XML passes local TY2025 v5.4 XSD. The Form 8874
and statement pages in the 16-page packet were visually reviewed. The review
set now has 27 PDFs (271 pages) and 27 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v29/`. Carryover and
other broader credit routes remain open.

The fixed-source `7318ed47` repository-wide run completed at 2026-09-29
15:04 UTC: 8,880/8,880 passed, zero failed, with no ignored tests reported,
in 16m42s. Its log is
`.state/research/ty2025-full-test-7318ed47.log`.

The fixed-source `81a2c713` repository-wide run passed 8,869/8,869,
zero failed, with no ignored tests reported in 20m35s. Its log is
`.state/research/ty2025-full-test-81a2c713.log`.

The fixed-source `f0839295` repository-wide run passed 8,866/8,866,
zero failed, with no ignored tests reported in 20m30s. Its log is
`.state/research/ty2025-full-test-f0839295.log`.

The fixed-source `5eeb5e6b` repository-wide run passed 8,862/8,862,
zero failed, with no ignored tests reported in 20m21s. Its log is
`.state/research/ty2025-full-test-5eeb5e6b.log`.

The `98466597` repository-wide run passed 8,851/8,851 after the archive
change, zero failed, in 13m37s; its summary reported no ignored tests. The
focused PDF/archive tests passed 13/13 before that run. The log is retained at
`.state/research/ty2025-full-test-98466597.log`. The subsequent two-facility
diagnostic found three older tests reusing one physical facility identity;
their fixtures were corrected. The fixed-source `15d5430d` repository-wide
run then passed 8,855/8,855, zero failed, with no ignored tests reported in
14m11s. Its log is `.state/research/ty2025-full-test-15d5430d.log`.

The corrected fixed-source `08786417` repository-wide run passed
8,860/8,860, zero failed, with no ignored tests reported in 15m48s. Its log is
`.state/research/ty2025-full-test-08786417.log`. The remaining gate includes
transfer elections with exact attachment bytes and
statement IDs; passive and carryover vintages; mixed and wider same-line
sources and Parts V/VI overflow; unsourced revised-carryforward checkboxes;
all applicable credit combinations; external credit attachments and
cross-route archive checks; source-backed IRS business-rule checks; and ATS
acceptance. Passing these one- and two-facility packets does not establish those
branches.

The native Form 3800 builder and the nine-page PDF descriptor now share one
final-credit join: calculated line 38 must equal Schedule 3 line 6a, Schedule 3
line 8 must include at least that amount, and finalized Form 1040 line 20 must
equal Schedule 3 line 8. This permits other Schedule 3 credits without counting
the business credit twice. It follows the [2025 Form 1040 line 20](https://www.irs.gov/pub/irs-prior/f1040--2025.pdf)
and [2025 Schedule 3 line 8](https://www.irs.gov/pub/irs-prior/f1040s3--2025.pdf)
printed destinations. Focused positive and changed-line fixtures are authored
for the deferred batch; the join does not authenticate each underlying credit.
