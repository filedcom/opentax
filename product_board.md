# TY2025 Form 1040 product TODO

## Current checkpoint (2026-09-30)

This is an open release gate, not a list of completed forms. The current source
registries contain 124 native MeF descriptors and 87 PDF descriptors; the
[coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md) and
[form audit](docs/mef/ty2025-form1040-form-audit.md) account for all 124
descriptors and their limits. The `CarryforwardGeneralBusinessCr` descriptor
remains filing-blocked. A registered route or focused test does not
establish source-to-filing coverage; check off only the specific gate proven by
its recorded evidence.

The work proceeds in this order:

1. Resolve the named workflow and filing-scope decisions in the
   [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md),
   including the evidence standard for uploaded records. Record each approval
   or rejection boundary there, with the exact entered claim it covers.
2. Complete source, calculation, native MeF, PDF, and attachment routes for
   every retained positive claim. Keep unsupported claims fail-closed and
   reconcile the registries with the form and root audits.
3. Run the full batch, schema, filled-PDF, business-rule, and ATS gates below.
   Record the result and artifacts before checking the corresponding item.
4. Review, create the PR, merge, and release only after the preceding gates
   pass. IRS credentials and acknowledgments must come from the authorized
   filing environment; repository tests cannot supply them.

Do not interpret an unchecked item as approval to omit its filing route. Do
not check an item on the basis of a planned fix, a staged serializer, a local
XSD pass, or an ignored test.

### Latest validation attempt

The 2026-09-30 `deno task test` attempt on `d8281e7c` was intentionally
interrupted after the goal changed to finish implementation before one bulk
test. It is not a passing full-suite result. Retain
`.state/research/ty2025-full-test-schedule-lep.log` for diagnostic context.

The 2026-09-30 fixed-source `deno task test` run on `44282e25` passed
**8,951/8,951**, zero failed, in 16m34s. It includes the reviewed Schedule
1-A vehicle-interest route, the 34th prepared full-return XSD fixture, and
the canonical PDF field-name checks. Retain
`.state/research/ty2025-full-test-schedule1a-vehicle.log`. The local
regression passed; the final release batch and external gates remain open.

The 2026-09-29 22:01–22:17 UTC fixed-source `deno task test` run on
`1307679f` passed **8,922/8,922**, zero failed, in 16m37s; Deno reported no
ignored tests. It includes the direct-rollover gross reporting and explicit
zero-taxable PDF regression. Retain
`.state/research/ty2025-full-test-1307679f.log`. The local regression passed;
the final release batch and external gates remain open.

The 2026-09-29 21:31–21:47 UTC fixed-source `deno task test` run on
`27021382` passed **8,921/8,921**, zero failed, in 16m6s; Deno reported no
ignored tests. It includes the corrected Form 8880 priority fixture and the
DOB-derived Form 8995 limit regression. Deno 2.7.7, libxml 2.9.13, and Poppler
26.03.0 were present. Retain `.state/research/ty2025-full-test-27021382.log`.
This is a local regression result; the final release batch and external gates
remain open.

The 2026-09-29 fixed-source `deno task test` attempt on `a7c26864` passed
**8,919** tests and failed one Form 8880 priority fixture in 15m56s. That
fixture asserted a Schedule R age-65 credit without the matching Form 1040 age
indicator now required by the return guard. Retain
`.state/research/ty2025-full-test-a7c26864.log`. The fixture now supplies the
age indicator. A separate DOB-derived age routing correction sends the same
age to Form 8995 and Form 1040. The 97 focused general, Form 8880, and
return-scenario tests pass, including a $26,000 dividend return with a $1,650
QBI deduction and $600 taxable income. The full rerun passed as recorded above.

After the earlier fixed-source full run below, the Form 1040 PDF descriptor gained the
2025 page-2 spouse-itemization and age/blindness checkboxes, and a synthetic
age-65 dependent Schedule R case gained a full-return XSD test. The focused
Form 1040 PDF descriptor, PDF builder, and source-only export files pass
**32/32**; the live Form 1040 IRS field-name check also passes. A six-page
packet was rendered and visually inspected.
Subsequent general-input and Schedule R age reconciliation changes pass
**140/140** focused general, Form 1040, Schedule R native/PDF, and source-only
export cases. Their full batch attempt is recorded above.

The 2026-09-29 20:39–20:55 UTC `deno task test` run on source commit
`56b4e37e` passed **8,916/8,916**, zero failed, in 15m54s; Deno reported no
ignored tests. It covers the Schedule R Form 1040 tax-limit guard and real-graph
zero-tax rejection. Deno 2.7.7, libxml 2.9.13, and Poppler 26.03.0 were
present. Retain `.state/research/ty2025-full-test-56b4e37e.log`.

The 2026-09-29 20:16–20:32 UTC `deno task test` run on fixed source commit
`664679b2` passed **8,914/8,914**, zero failed, in 15m56s; Deno reported no
ignored tests. It includes the Form 8888, Schedule R, Form 7203, Form 1040
PDF preflight, and filled-PDF attachment-mark tests. Deno 2.7.7, libxml
2.9.13, and Poppler 26.03.0 were present. Retain
`.state/research/ty2025-full-test-664679b2.log`. The synthetic filled
packets, authenticated-source decisions, IRS business rules, ATS, and final
release batch remain separate open gates.

The 2026-09-29 19:10 UTC `deno task test` run on source commit `efac9046`
passed **8,898/8,898**, zero failed, in 15m20s. It covers typed Form 3800
nonpassive Part VI native/PDF projection and the prior source-key guard. Deno
2.7.7, libxml 2.9.13, and Poppler 26.03.0 were present. The log is retained
at `.state/research/ty2025-full-test-efac9046.log`. The production
carryforward filing route and external release gates remain open.

The 2026-09-29 18:39 UTC `deno task test` run on the code snapshot committed
as `11d5047d` passed **8,897/8,897**, zero failed, in 16m49s. The source
files did not change during the run; only this board and its gap note were
subsequently updated. Deno 2.7.7, libxml 2.9.13, and Poppler 26.03.0 were
present. The log is retained at
`.state/research/ty2025-full-test-carryforward-link.log`. The source-to-
filing and external release gates remain open.

The subsequent source-key uniqueness guard rejects a carryforward source
listed on two Part IV rows. The typed nonpassive Part VI detail change below
passes 24/24 focused native/PDF tests, including local XSD validation. The
8,898-test full run above covers both edits.

The 2026-09-29 18:13 UTC fixed-source `deno task test` rerun on commit
`99243afd` passed **8,894/8,894**, zero failed, in 15m46s; its Deno
summary reported no ignored tests. The checked tools were Deno 2.7.7,
libxml 2.9.13, and Poppler 26.03.0. The log is retained at
`.state/research/ty2025-full-test-99243afd-rerun.log`. The first attempt on
the same unchanged commit passed 8,893 tests and failed once while downloading
the IRS Form 2555 PDF for a field-name check. That exact test passed on a
focused rerun, then the full rerun passed. The native Form 3800 carryforward
computation now has an XSD-valid descriptor, but the positive filing route and
external release gates below remain open.

The source-link edit adds a required typed link from each carryforward
vintage to its reserved computation ID and Part IV source row. The parent
Part I line 4 native reference, revised-carryforward indicators, and PDF
header now derive from those linked facts. A two-vintage synthetic parent
passes the local TY2025 v5.4 `IRS3800` XSD, and 26 neighboring native/PDF
focused tests passed. At that stage, the production parent still rejected
positive carryforwards pending authenticated prior-return evidence,
production Part VI assembly, and the filed history attachment. The later
8,897-test run above covers this component edit.

The 2026-09-29 17:20 UTC fixed-source `deno task test` run on commit
`453259a2` passed **8,890/8,890**, zero failed, in 16m10s; its Deno summary
reported no ignored tests. The log is retained at
`.state/research/ty2025-full-test-453259a2.log`. A subsequent source guard
rejects research-credit carryforward lines 1c and 4i until their separate
Form 6765 business-income limitation is modeled; its focused source test
passes 58/58 and lint passes. That guard has not had a full-suite rerun.
The native carryforward filing route, authenticated prior-return evidence,
structured `CarryforwardGeneralBusinessCr` linkage, printable history
attachment, business rules, and ATS gates remain open.
The structured computation descriptor has since been registered with explicit
origin and prior-use tax-year-end dates. Its three focused cases pass, including
standalone TY2025 v5.4 XSD validation; 68 source/statement tests, 30 parent
Form 3800 native tests, and nine existing Form 3800 XSD cases also pass. The
parent still rejects positive carryforwards. The fixed-source `99243afd`
rerun above covers these edits.

The 2026-09-29 16:48 UTC fixed-source `deno task test` run on commit
`500bd115` passed **8,886/8,886**, zero failed, in 15m51s; its Deno summary
reported no ignored tests. Tool versions were Deno 2.7.7, libxml 2.9.13, and
Poppler 26.03.0. The log is retained at
`.state/research/ty2025-full-test-500bd115.log`. A later type-only PDF import
correction on `1087f488` passed focused lint and the two statement tests; it
did not change runtime behavior. The full run includes the prepared
Form 3800 nine-page PDF, ZIP/source drift checks, separate geothermal and
wind/geothermal Form 8835 copies, rejection of contradictory no-increase
source facts, and one-, two-, and six-investment Form 8874 return/packet cases.
The filled review now has 27 packets (271 pages) and 27 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v29/`; the geothermal
Form 3800 pages, two geothermal copies, mixed wind/geothermal copies, and the
one-, two-, and six-investment Form 8874/parent pages were visually checked.
The new geothermal plus New Markets packet has separate Form 3800 lines 4e
and 1i and reviewed source/parent pages. The seven-investment Form 8874
packet has a reviewed last-row attachment total and supplemental detail page.
The 24-investment return has two reviewed continuation pages and a $12,000
source-to-return credit join. A schema-valid long CDE name and address now print
on a wrapped statement page without clipping and reconcile $500 through the
parent return. A source-vintage Form 3800 carryover arithmetic module now
checks origin credit, prior uses, incoming balance, and 2025 adjustment, but
does not yet feed a filing route. A separate two-page carryover history
statement was rendered and reviewed; it is not attached to a return. Broader
source/ATS coverage and final release
validation remain open. The preceding fixed-source run on `c6e844d8` passed
8,884/8,884, zero failed; its log is retained at
`.state/research/ty2025-full-test-c6e844d8.log`.

After rebasing this branch onto `origin/main` at `46910f50`, a source-vintage
input now reconciles nonpassive carryforwards into Form 3800 Part I line 4 and
Part II line 34, with separate ordinary and specified-credit tax limits.
Passive, current-year-adjusted, empowerment-zone, and research vintages are
rejected by this bounded calculation path. Native filing rejects positive carryforwards
until prior-return evidence, Part IV/VI source rows, and the history statement
are linked. Focused calculation/native tests passed 120/120, the neighboring
Form 3800 native/PDF tests passed 66/68 with two missing test permissions; the
XML case passed after allowing temporary writes, and the PDF file passed 11/11
after allowing its IRS fetch.
This work has not had a fixed-source full-suite run and does not clear the
carryover filing gate.

The 2026-09-29 06:03 UTC local `deno task test` run on source commit
`cabcfdca703c6fb581dfee8b817afdb7c8f73f4f` passed **8,835/8,835**
with zero failures in 13m30s; the Deno summary reported no ignored tests.
Deno was 2.7.7, `xmllint` used libxml 2.9.13, and Poppler was 26.03.0.
The complete output is retained locally at
`.state/research/ty2025-full-test-cabcfdca.log`. Only this board and its
validation note were edited during the run; the tested source commit was
unchanged. This clears the current local test batch, while the final release
batch remains due after source-coverage decisions and route completion.

The preceding 2026-09-29 moving-worktree diagnostic `deno task test` run finished
with 8,793 passed and 37 failed in 12m12s. It included concurrent edits and
is not a fixed-commit release gate. Several listed failures, including the
Form 8826 cap ledger, Form 3115 end-to-end path, and Form 8582-CR guard, passed
focused reruns after the moving snapshot began. The preceding diagnostic had
8,752 passed and 79 failed in 12m14s; the earlier diagnostic finished with 8,725
passed and 106 failed in 12m9s. Focused reruns after that snapshot passed the repaired Form 8283
multi-attachment (5/5 route, 3/3 evidence) and vehicle-statement (15/15),
Form 6251 native map (31/31),
Form 4952 royalty (2/2), Form 8582 native map (30/30), Form 8863 native/XSD
(7/7), and Form 8874 XSD (1/1) files. Form 8962 source-evidence cases,
PDF-builder test fixtures, ATS source gaps, and other full-batch failures remain.
Focused Form 8962 shared-MFS no-exception and exception XSD cases now pass
2/2 with source identity, allocation, and return-drift rejection checks; the
remaining shared-policy combinations and full release gate stay open.
The synthetic PDF-review set now has two source-backed shared-MFS returns;
all 16 then-current review sources passed TY2025 v5.4 XSD. Both generated Form 8962 pages were
rendered and visually checked for allocation percentages, monthly amounts,
and Schedule 2/3 joins, with PDF hashes in the [policy-month
note](docs/mef/ty2025-form8962-policy-month-gap.md).
The latest moving-worktree TY2025 full-return XSD diagnostic finished 159/165;
five shared-policy cases failed before their subsequent source-route commits,
and the sixth exposed a missing Schedule C/F trigger on derived Form 6198
documents. Focused reruns of the shared-policy cases and the two-activity Form
6198 return now pass. A fixed-commit release-gate rerun remains due after
the remaining route work.
The follow-up local TY2025 native XSD file passed 165/165 in 6m55s, and the
end-to-end full-return XSD file passed 18/18. The 165-case run started at
`177ee860`; while it ran, `cabcfdca` changed only an assertion in a different
Form 8962 test file. Logs are retained under `.state/research/` as
`ty2025-full-xsd-177ee860.log` and `ty2025-e2e-xsd-177ee860.log`.
These structural passes do not establish source coverage, IRS business-rule
acceptance, or the final full-batch gate.
The two-activity Form 6198 return also generates a filled 16-page PDF packet.
Both distinct Form 6198 pages were rendered and checked against their $500 and
$900 allowed losses and the $1,600 Schedule 1 total; the packet hash is in the
[Form 6198 PDF note](docs/mef/ty2025-form6198-pdf-gap.md).
Additional focused reruns passed Form 4972 MeF/PDF (51/51), Form 982 native/PDF
(9/9), Schedule F (8/8), Form 4835 (7/7), and Schedule B Part III with a
Form 8814 child election (9/9). The Schedule F fix activates its own CCC loan
and crop-insurance statement descriptors; the Form 8814 route uses the
production pending adapter so a calculation-only Form 4952 slice is not filed.
The standalone Form 4972 builder assertion now uses calculated form lines,
one matching elected 1099-R, and the corresponding Form 1040 tax; its focused
case passes. The former 22-form aggregate builder smoke fixture combined
inconsistent Form 2441 AGI, Form 4972 election, Form 8880 credit capacity, and
Form 8919 W-2 facts. Each descriptor has an independent builder case; the
invalid aggregate fixture was replaced with an executor-produced Schedule C
return that emits six reconciled native documents. The full builder file now
passes 131/131, and this six-document source fixture also passes TY2025 v5.4
XSD validation. These checks do not prove a 22-form same-return combination.
The Schedule J Form 4835 passive-loss case now passes 7/7 after its at-risk
fixture was corrected. The two Schedule C positive-profit XSD fixtures now
carry explicit QBI source confirmations and business identities: the $80,000
self-employment and inventory cases each passed type-checked XSD reruns (1/1
each).
These focused passes do not establish the full-batch or source-evidence gates.
The linked Schedule F/Form 4835 CCC and crop-statement return also passed its
focused TY2025 XSD validation (1/1). Form 8283 PDF's eight focused cases now
pass with explicit similar-property groups in the synthetic multi-gift facts;
the divergence case still reaches the Schedule A source-reconciliation guard.
The Form 8283 input/calculation file also passes 43/43 after updating its
expected reduced-claim error text to the current guard.
Schedule 1's PDF description for Form 8814 now uses the wording in the
[2025 IRS Form 8814 instructions](https://www.irs.gov/instructions/i8814);
the Form 8814, Schedule 1, and Form 8889 PDF files pass 19/19 focused checks.
The Form 8874 PDF file passes 5/5 with a valid mismatched K-1 credit case that
reaches its Form 3800 guard. Form 8582 PDF passes 10/10; its Part VIII row
assertion now names the same field key as the native-to-PDF mapping.
The Form 1116 foreign-tax-credit end-to-end file passes 5/5 after its
$85,250 single-filer line 16 expectation was aligned with the
[2025 IRS Tax Table](https://www.irs.gov/publications/p1040): $13,675 tax,
$135 allowed foreign tax credit, and $13,540 total tax in that fixture.
The qualified-tips W-2 to Schedule 1-A return passes 6/6 after its $9,250
single-filer taxable income was checked against the same 2025 Tax Table:
$928 tax and a $1,572 refund in the synthetic case.
The bounded single-employer W-2-box-7 path now has source-backed Schedule 1-A
native/PDF projections and an inspected four-page return. The graph accepts
only a published IRS tipped-occupation code; the filing route also requires
box 5 below the 2025 wage base, zero Part I exclusions, a timely valid SSN,
and Form 1040 line 13b reconciliation. Other tip sources and combined claims
remain open in the [Schedule 1-A gap](docs/mef/ty2025-schedule1a-gap.md).
The reviewed W-2-box-14 FLSA overtime path now replaces taxpayer-entered
overtime totals and reconciles two employers' $3,000/$1,000 premiums to
Schedule 1-A Part III and Form 1040 line 13b in a four-page synthetic return.
Other employer statement/payroll methods, deferred W-2 amounts, 1099 payors,
and mixed Schedule 1-A claims remain open in the same gap.
The Form 3115-to-Schedule C end-to-end fixture now uses the public executor's
array input shape and explicit Schedule C Form 1099 answer. Its focused case
passes source-to-profit, native Schedule C XML, and PDF projection (1/1).
The Form 8582-CR source/allocation file passes 29/29 after its Form 8834
negative case removed an invalid Form 3800 line from the synthetic source,
allowing the intended separate-filing-route guard to run.
The Form 8826 cap ledger passes 4/4 after the passive pass-through fixture's
K-1 source reference was reconciled across Form 8826 and Form 8582-CR.
The accrual Schedule F end-to-end test now passes 6/6 because its $12,100
profit produces no positive QBI deduction. A new bounded one-farm Form 8995
route carries farm identity and a reviewed no-other-adjustments answer through
the graph, reconciles Schedule F and Schedule SE to Form 1040, and emits MeF and
PDF. Its synthetic $80,000 cash-farm full return passed TY2025 XSD validation;
the generated nine-page PDF packet's Form 8995 page was visually checked
against the $74,348 QBI row and $11,720 Form 1040 deduction. The
single-filer no-EIN farm variant now uses the sourced taxpayer SSN in MeF and
the PDF TIN column; its full return passed XSD and its filled Form 8995 page
was visually checked. Joint-filer farm ownership remains unresolved. The
[Form 8995 gap](docs/mef/ty2025-form8995-positive-export-gap.md) retains the
multi-farm, cooperative, other-adjustment, and ATS gates.
Form 8995 now receives the DOB-derived taxpayer and spouse age flags used by
Form 1040 and the standard-deduction worksheet. A positive full-graph
section 199A dividend case verifies the $1,650 taxable-income limit, Form
1040 line 13 deduction, and $600 taxable income after the separate senior
deduction; this is a synthetic calculation case, not authenticated source or
ATS evidence.
Read-only text extraction across the locally retained TY2025 Form 1040 ATS
scenario PDFs found no Form 1095-A or Marketplace Statement text. It did not
establish source-verified policy/month evidence for the seventeen red Form 8962
full-return XSD fixtures; their source-evidence gate stays open.
Visual review of page 11 in the retained TY2025 ATS Scenario 2 PDF confirms
Form 8283 Section A item A says “Clothes & toys,” donated to Goodwill, with
$3,470 donor cost and $700 fair market value. The packet does not state the
application's charitable-limit category or a reviewed similar-property
classification, so the Scenario 2 Form 8283 source gate remains open rather
than assigning those facts from an assumption.
One separate, fully synthetic ordinary Section A gift now reaches the shared
return graph, local TY2025 v5.4 native XML, and a filled four-page PDF packet.
The $1,200 gift appears once on Schedule A line 12 and Form 8283; Form 1040
line 12e is $37,200. Visual review caught and repaired a clipped donee address
in the official Form 8283 row and a Schedule A PDF field-numbering error; the
corrected page prints $1,200 on line 12 and $37,200 on line 17. The local
source-reconciliation guard requires
a complete current-gift inventory and matching itemized return. This bounded
case does not establish the missing ATS Scenario 2 source classification or
the other Form 8283 filing paths.
The Form 3800 parent PDF now receives the typed parts captured during native
MeF document linking. A synthetic geothermal source returns a $600 credit on
Form 8835, Form 3800 Part III line 4e and line 38, Schedule 3 line 6a, and Form
1040 line 20. Its native XML passes local TY2025 v5.4 XSD; the 17-page packet
includes all nine official Form 3800 pages, which were rendered and inspected.
The new two-facility packet adds two distinct three-page Form 8835 copies, two
$600 Part V rows with separate native document IDs, and $1,200 on Form 3800
line 38, Schedule 3 line 6a, and Form 1040 line 20. It passes local v5.4 XSD;
the 20-page packet was rendered and inspected. The next mixed wind/geothermal
packet prints wind on Form 8835 line 1a, geothermal on line 1c, two $600 Part V
rows, and $1,200 through Schedule 3 and Form 1040; local XSD and filled-page
review pass. One source-backed nonpassive Form 8874 now prints its $500 credit
on the Form 8874 row and Form 3800 Part III line 1i, then reconciles through
Schedule 3 and Form 1040. Its local XSD and selected filled-page review pass.
The review set has 27 packets (271 pages). Transfer, passive,
carryover, other credit combinations, external
credit-attachment, and ATS gates remain open. The submission ZIP consumes the
same prepared bundle as the PDF and rejects source, filer, XML, or attachment
drift; one geothermal ZIP/PDF case passes locally.
The no-increase source path now rejects a pre-January-29-2023 construction
claim needing continuity review, missing or sub-1-MW maximum net output,
contradictory AC nameplate capacity, and an answered PWA qualification. The
filled geothermal and wind fixtures use 1.5 MW reviewed maximum output and
post-cutoff construction dates. The v20 review set supersedes the earlier
Form 8835 samples with contradictory no-increase facts.

The 2026-09-29 moving-worktree diagnostic `deno task test` run finished with
8,609 passed and 205 failed in 11m18s. It is not the agreed fixed-commit
release gate. A subsequent focused Form 8615 end-to-end rerun passed 4/4 after
the synthetic Schedule B foreign-account and trust answers were supplied and
its $650 single taxable-income expectation was aligned with the official 2025
IRS Tax Table ($66).
The supporting-tax PDF mapping file now passes 20/20 focused checks: the
Form 6251 line 2c assertion matches its verified AcroForm field, the Form 8962
marriage test supplies the sourced marriage month, and a verified two-person
MFJ return no longer enters the single-filer dependent-MAGI path. The related
Form 8962 PDF dependent-MAGI and MeF tests pass 5/5 and 24/24.

An earlier 2026-09-29 diagnostic `deno task test` run on the moving worktree
reported 8,535 passed and 277 failed, improved from 8,453/348 in the earlier
diagnostic. Neither is a release-gate pass; the full run must be repeated on a
fixed commit after the route work is complete. All thirteen prepared synthetic
returns now generate filled PDFs through the real graph and builder: 67 pages
total, with PDFs, source/pending JSON, page counts, hashes, and native XML under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v6/`. All thirteen native
returns generated from those fixtures validate against TY2025 v5.4
`Return1040.xsd`; the twelve prior PDFs (61 pages) are pixel-identical at 65 dpi
to the previously reviewed batch. The child return's printed $412 Form 8615 tax
agrees with Form 1040 and native XML. The new six-page wage-only return prints
Forms 8959 and 8960: $220,000 MAGI requires Form 8960 despite zero NIIT, while
$180 Additional Medicare Tax joins Schedule 2 and Form 1040.
Contact-sheet review found and led to fixes for Schedule 1 and Schedule 2
identity fields; the current Schedule 1 rerender shows both fields. The rental
case now prints its suspended loss from the same Form 8582 allocation used by
native MeF. The child case exposed an extra native `IRS8960` document at
$5,000 AGI; the MeF pending adapter now omits that source-only intermediate
slice and the regenerated XML has no Form 8960. The high-MAGI/zero-NII case now
includes Form 8960 in PDF and native XML. The detailed source-to-XML comparison for every page and
descriptor, additional route fixtures, and the full release batch remain open. The
profitable Schedule C case reaches Form 8995 XML and PDF with a sourced
half-SE-tax QBI reduction, but its broader support gate remains open. The
current end-to-end full-return XSD file passes 18/18 on commit `177ee860`,
including bounded ATS Scenario 2 and 12 slices with explicit Form 8283
classification and Form 8995 QBI source facts. These local synthetic slices
are not IRS ATS acceptance or whole-scenario source verification.
The aggregate-only Form 2441 input now fails during MeF export instead of
leaving a Schedule 3 credit without its required Form 2441 document; its 15
focused MeF/XSD tests pass. A standalone Form 3800 current-year row fixture
now uses XSD-valid document IDs and passes all eight tests in its file.
The Form 8283 carried-gift route now gives each prior-year PDF a distinct
filename-bound description; its five route cases and three evidence cases pass,
including a two-gift return with two linked native forms and attachments.

## Scope and completion rules

- [ ] Keep this release limited to the TY2025 Form 1040 family: Form 1040, its applicable schedules, supporting forms, source documents, statements, PDF packet, MeF return, and A2A submission package.
- [ ] Keep standalone 1040-NR, 1040-SS, Form 4868, and dual-status Form 1040 e-file outside this release gate. Reject an attempted dual-status e-file instead of treating it as an ordinary Form 1040.
  - [x] Reject a caller-supplied non-1040 return type or non-2025 year in the TY2025 Form 1040 MeF builder and bundle. Focused negative export tests pass for 1040-NR, 1040-SS, Form 4868, and 2024. This does not establish taxpayer residency or catch a dual-status filing claim represented only in source facts; that source-to-export guard remains open. [Publication 519](https://www.irs.gov/publications/p519) states that dual-status taxpayers cannot e-file a TY2025 income tax return.
  - [x] Reject an explicitly marked TY2025 dual-status return at general intake, raw MeF export, final prepared-return validation, and PDF export. Focused negative tests cover each boundary. The source still needs a reviewed residency classification that makes this answer unavoidable; an omitted flag does not establish that a filing is eligible.
- [ ] Treat every other entered Form 1040-family filing claim as in scope until its route is completed or the user explicitly approves a named, fail-closed exclusion. A registered builder, schema literal, written test, or computed preview alone does not establish support.
- [ ] Complete the source-to-calculation-to-Form-1040-to-native-MeF-to-PDF-to-attachment chain for every retained positive filing route. Preserve taxpayer/spouse ownership, source provenance, calculated totals, and rejection of unsupported or inconsistent inputs.
  - [x] Compare any calculated Form 1040 taxpayer or spouse TIN with the identified filer's TIN before native and PDF export. Matching dashed/plain SSNs continue to work; changed or orphaned source TINs stop both exports in focused tests. Missing source TINs and document-byte authentication remain separate open gates.
- [ ] Do not add a compatibility layer, fallback, dual API shape, migration shim, or temporary workaround without first telling the user what will be added and why, as required by AGENTS.md.

## Coverage inventory and decisions

- [ ] Resolve the unsupported-path disposition in **each of the 124 registered MeF descriptor rows** of the [form-by-form audit](docs/mef/ty2025-form1040-form-audit.md). For each row, record its applicable trigger, public/source facts, calculation, Form 1040 join, native document, PDF or statement, focused cases, XSD evidence, and final support or explicitly approved rejection boundary.
- [ ] Review the **211 TY2025 IRS schema document roots** in the [root census](docs/mef/ty2025-xsd-document-root-census.md) against actual Form 1040 applicability. Resolve every still-unregistered or source-literal-only root in the [applicability crosswalk](docs/mef/ty2025-unregistered-root-applicability.md); neither a source literal nor absence from a registry is a support/exclusion decision.
- [ ] Reconcile the registered-document audit, root crosswalk, [conditional-schedule audit](docs/mef/ty2025-conditional-schedule-applicability.md), [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md), and actual registries after implementation so their counts, triggers, and unsupported branches agree.
- [ ] Decide, with the user, which current-return paths are separate workflows: amended Form 1040-X; payment/account roots (1062, 965, estimated tax, Form T, payment); recipient copies of RRB-1042-S and SSA-1042-S; and optional Forms 4547 and 9000. Preserve any income, withholding, tax, election, or amendment consequences on Form 1040.
- [ ] Decide conditional filer ownership individually for entity-associated roots, including Forms 8858/Schedule M and 1118, entity-issued 1065 Schedule D and 8825, and trust K-1 box 13 code B backup withholding. Build any individual Form 1040 attachment that remains required; do not blanket-exclude an entity-root family.
- [ ] Audit [source-only and sparsely mapped forms](docs/mef/ty2025-source-only-and-sparse-map-gap.md): identify every positive filing trigger, confirm each emitted field and required statement/attachment, and replace any optimistic mapping with a verified route or explicit rejection.
  - [x] Form 8888 focused and synthetic full-return check: two- and three-account XML passes local TY2025 v5.4 `IRS8888` XSD; ten focused cases pass. A W-2 source produced full-return XML that passes `Return1040.xsd` and a three-page PDF packet. Form 1040 line 35a and Form 8888 line 5 both print $1,525; account lines print $300 checking and $1,225 savings. Visual review caught and repaired the omitted Form 1040 line 35a attachment checkbox. Retain `.state/research/ty2025-form8888-full-return.xml` and `.state/research/ty2025-form8888-full-return.pdf`. Current-source full-batch, bank/source evidence, other business rules, and ATS gates remain open.
  - [x] Schedule R bounded descriptor check: native XML passes local TY2025 v5.4 `IRS1040ScheduleR` XSD; seven focused cases pass. Both filled PDF pages were rendered and inspected for identity, box 1, lines 10/12/13c/14-22, and the $750 Schedule 3 credit. Retain `.state/research/ty2025-schedule-r-filled-review.pdf`. This first fixture supplies the final tax amount directly; the later synthetic source-to-return packet below supplies graph evidence.
  - [x] Reconcile Schedule R line 22 against the 2025 credit-limit worksheet during Form 1040 finalization. A sourced $10,000-wage single age-65 case has $0 line 18 tax and now fails before a completed return or MeF export. Source commit `56b4e37e` passed the full 8,916-test suite.
  - [x] Exercise a synthetic positive age-65 dependent path: $9,500 of Form 1099-INT interest and a $3,350 dependent standard deduction yield Form 1040 line 18 tax of $618, Schedule R/Schedule 3 line 6d credit of $600, and line 22 tax of $18. Full-return XML passes local TY2025 v5.4 `Return1040.xsd`; the six-page PDF packet was inspected for identity, dependent/age boxes, Schedule B interest, Schedule R box 1/lines 14–22, and the Form 1040/Schedule 3 joins. Retain `.state/research/ty2025-schedule-r-dependent-positive.xml` and `.state/research/ty2025-schedule-r-dependent-positive.pdf`. Actual dependency/support facts, authenticated source records, disability/spouse/other-benefit paths, current-source full-batch, other business rules, and ATS remain open.
  - [x] Reject a DOB that is malformed or later than the tax year, an explicit taxpayer/spouse age-65 answer that conflicts with DOB, and a Schedule R age-65 claim that differs from Form 1040's finalized age indicator. The 2025 January 1/January 2 boundary is covered; source-to-export conflict cases and 140 focused tests pass. Actual age-source authentication and wider Schedule R paths remain open.
  - [x] Form 7203 bounded stock-only ordinary-loss check: native XML passes local TY2025 v5.4 `IRS7203` XSD; ten focused cases pass. The filled two-page PDF was inspected for shareholder/corporation identity, original-shareholder box, $3,000 basis, $4,000 current loss, $3,000 allowed stock loss, and $1,000 carryover. A synthetic reviewed K-1 and general taxpayer source also produced a seven-page PDF packet and full-return XML that passes `Return1040.xsd`; Schedule E line 41, Schedule 1 lines 5/10, and Form 1040 line 8 each show the $3,000 allowed loss. Retain `.state/research/ty2025-form7203-full-return.xml` and `.state/research/ty2025-form7203-full-return.pdf`. Other basis paths, authenticated K-1 bytes, current-source full-batch, business-rule, and ATS gates remain open.
- [ ] Audit return-wide ordering and reconciliation across Form 1040, Schedules 1/1-A/2/3, income, deductions, tax, credits, withholding, payments, carryovers, and multiple copies of the same form. Check positive, zero, negative, amended-source, joint-owner, and conflicting-source cases.
- [ ] Decide whether structured reviewed facts alone are acceptable filing evidence for complex forms or whether executor-bound uploaded document bytes must be verified. Apply one consistent evidence standard to external records, signed forms, carryovers, appraisals, source K-1s, and ATS fixtures.

## Core return and source paths

- [ ] Audit Form 1040 identity, filing status, dependents, digital assets, wages, pensions/rollovers/QCD, taxable Social Security, interest/dividends, capital gains, business/farm/rental income, adjustments, deduction choice, credits, taxes, withholding, payments, refund, and amount owed against source records and 2025 instructions.
  - [ ] Complete IRA rollover reporting on Form 1040 line 4c(1). Reviewed IRA-to-IRA, IRA-to-qualified-plan, and 2026-completion routes now mark line 4c(1) and link the required native/PDF statement when applicable under the [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf). Still support valid late-rollover exceptions and wider IRA rollover eligibility evidence, including authenticated source and prior-return records, inherited/RMD status, and plan acceptance. Do not treat the pension line 5c mark as IRA evidence.
    - [x] Add a dated IRA-to-IRA source route for 2025, reject unreviewed IRA code-G rollovers, and reconcile $5,000 line 4a, explicit zero line 4b, and line 4c(1) across graph, native XML, and both rendered Form 1040 pages. The synthetic full return passes local TY2025 v5.4 XSD; retain the `v35` batch and the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). The initial statement-required rejection was replaced by the linked statement route below.
    - [x] Build and link the native `IRADistributionStatement` for a named qualified-plan destination or a rollover completed in 2026; append the same explanation to the full PDF. Two synthetic $7,000/$8,000 returns validate against TY2025 v5.4 XSD, and all three pages of each were inspected against source JSON, pending graph, and native XML. Retain the `v36` batch and [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). These cases do not prove broader rollover eligibility or IRS business-rule acceptance.
    - [x] Require an explicit traditional or traditional SEP source, a matching traditional/SEP IRA or named plan destination, and a reviewed prior IRA-to-IRA rollover date or explicit none. Reject Roth/SIMPLE source claims, a Roth/SIMPLE IRA destination, code-G IRA-to-IRA claims, and same-owner IRA-to-IRA distributions within one year, while allowing separate owners and IRA-to-plan rollovers. A payer code-G direct IRA-to-plan payment is not subject to the taxpayer-receipt 60-day deadline and has distinct statement text. This checks stated facts under [2025 Publication 590-A](https://www.irs.gov/publications/p590a), the [2025 Form 1099-R instructions](https://www.irs.gov/pub/irs-pdf/i1099r.pdf), and [IRS plan rollover verification guidance](https://www.irs.gov/retirement-plans/verifying-rollover-contributions-to-plans); it does not authenticate history or establish every rollover exception.
- [ ] Audit source classifications and ownership for Forms W-2, W-2G, 1099-INT/DIV/OID/B/R/G/NEC/K/MISC/PATR/SA, 1098, 1095-A, 3921, K-1s, foreign employer records, and reviewed prior returns. Require joins to the correct recipient and destination, and reject duplicates or ambiguous matches.
  - [x] Replace Form 1099-MISC box 10's automatic Schedule 1 income treatment with a reviewed gross-proceeds split into retained attorney fees and client funds. Positive fees now require a named cash-basis Schedule C business whose gross receipts include them; native and PDF export reject a recipient TIN that differs from its proprietor. A source-to-Form-1040/native/PDF build case and 341 affected focused tests pass. This bounded path does not authenticate the payer form or trust ledger, reconcile duplicate fee reports, visually review the filled PDF, or complete the wider 1099-MISC and Schedule C audit. [2025 Form 1099-MISC instructions](https://www.irs.gov/pub/irs-prior/i1099mec--2025.pdf) distinguish box 10 gross proceeds from attorney-service fees.
  - [x] Replace the ignored top-level Schedule C gross-receipts deposit from 1099-MISC boxes 1, 2, 5, 6, and 11 with box-specific rows linked to a named business and recipient. Schedule C checks their combined amount against its filed line 1; native and PDF export repeat the amount and proprietor-TIN checks and reject the old scalar. A two-payer box 6 case reaches one $5,000 Schedule C and Form 1040; its native return passes local TY2025 v5.4 XSD, and its filled PDF builds. The 356 affected focused tests pass. Accrual-basis timing, payer bytes, duplicate source reports, wider source ownership, filled-page review, and IRS acceptance remain open.
  - [x] Route positive Form 1099-NEC box 1 through an explicit income classification. Schedule C income now requires a recipient TIN and business reference and emits payer-specific receipt rows into one reviewed cash-basis business, instead of creating a business with the payer's name and placeholder code. Schedule C, native XML, and PDF check the linked amounts and proprietor identity, including totals combined with 1099-MISC rows. A two-payer $5,000 case reaches Schedule C and Form 1040, validates against the local TY2025 v5.4 XSD, and builds a filled PDF. Payer-form authentication, duplicate reports, accrual timing, filled-page review, and IRS acceptance remain open. [2025 Form 1099-NEC](https://www.irs.gov/pub/irs-prior/f1099nec--2025.pdf) and [2025 Schedule C instructions](https://www.irs.gov/pub/irs-prior/i1040sc--2025.pdf) distinguish self-employment income and require applicable box 1 receipts on line 1.
- [ ] Complete Schedule 1 line 8z source/description handling, Schedule 1-A deduction variants and filled PDF, Schedule 2's 2025 line structure, Schedule 3 joins, and Schedule EIC child identity/residency projection. See the [Schedule 1-A gap](docs/mef/ty2025-schedule1a-gap.md) and [line 8z source gap](docs/mef/ty2025-schedule1-line8z-source-gap.md).
- [ ] Finish Schedule C and Schedule F/Form 4835 source, at-risk, passive, self-employment, QBI, and PDF cross-checks, including Schedule C [PDF mapping](docs/mef/ty2025-schedule-c-pdf-gap.md), Schedule J's [source](docs/mef/ty2025-schedule-j-source-gap.md) and [integration](docs/mef/ty2025-schedule-j-integration-gap.md), and the applicable Schedule E rental/royalty joins.
- [ ] Verify Form 1040 assembly order, document references, multiple-instance IDs, required PDF descriptions, manifest/return archives, A2A request package, and explicit failures for missing or invalid AcroForm fields.
  - [x] Check each prepared submission ZIP again when building the A2A transmission container. The manifest, XML, and attachment entries must exactly match the prepared archive; its Submission ID, EFIN, and taxpayer TIN must match the native return. Changed XML, missing PDF, altered manifest/TIN, and changed ID all reject in focused tests. The existing two-submission order case still passes. This does not establish IRS endpoint, credential, business-rule, or ATS acceptance.

## Named tax-form gaps

- [ ] **Form 8283:** finish the required FMV-reduction statement for every applicable reason, not only the bounded land-election case; reconcile deduction, FMV, appraisal, signed donee form, vehicle acknowledgment, Section B grouping, and prior-year carryover attachment to the source bytes and Schedule A. See [reduction](docs/mef/ty2025-form8283-fmv-reduction-gap.md), [carryover](docs/mef/ty2025-form8283-carryover-source-gap.md), and [PDF](docs/mef/ty2025-form8283-pdf-gap.md).
- [ ] **Form 1116:** complete source-reconciled passive/general baskets, mixed income and countries, deductions, foreign-employer alternative compensation, K-3 combinations, Schedule B carryover vintages, and Schedule C redetermination with affected-year filed returns and amendments. Finish parent/Schedule B PDFs and register a valid Schedule C route or retain an approved rejection. See [Schedule C](docs/mef/ty2025-form1116-schedule-c-gap.md), [main PDF](docs/mef/ty2025-form1116-main-pdf-gap.md), [Schedule B PDF](docs/mef/ty2025-form1116-schedule-b-pdf.md), and [alternative compensation](docs/mef/ty2025-form1116-alternative-compensation-gap.md).
- [ ] **Form 6251:** finish all still-applicable AMT adjustments, preferences, exemption and phaseout, AMT Form 4952, ISO source, Form 8949 basis, circulation costs, preferential-rate Part III, and signed mixed short-term gains/losses; reconcile Schedule 2 and Form 1040 tax. See [remaining scope](docs/mef/ty2025-form6251-remaining-scope.md), [ISO](docs/mef/ty2025-form6251-iso-source-gap.md), [basis](docs/mef/ty2025-form6251-8949-basis-gap.md), [circulation](docs/mef/ty2025-form6251-circulation-cost-gap.md), and [mixed basis](docs/mef/ty2025-form6251-mixed-basis-net-loss.md).
- [ ] **Form 8962:** complete household/dependent MAGI, policy-month and corrected SLCSP evidence, shared-policy allocation, multiple/overlapping/alternating policies, interstate moves, below-400%-FPL no-APTC paths, self-employed PTC ordering, and all repayment caps. Reconcile each 1095-A month to Schedules 2/3 and Form 1040; reject unsupported policy combinations. See the [dependent MAGI](docs/mef/ty2025-form8962-dependent-magi-gap.md), [policy-month](docs/mef/ty2025-form8962-policy-month-gap.md), [three-policy](docs/mef/ty2025-form8962-three-policy-overlap.md), [alternating](docs/mef/ty2025-form8962-alternating-policy-gap.md), and [interstate](docs/mef/ty2025-form8962-interstate-move-gap.md) notes.
- [ ] **Form 8889 / 5329:** finish owner-specific monthly HSA eligibility, Medicare/mixed months, prior funding, employer-returned code 2 excess, all Form 1099-SA source and exception routes (age 65 and disability), paired-owner excess and carryovers. Reconcile both owners' Form 8889/5329 copies, Schedule 1, Schedule 2, Form 1040, MeF, and PDF. See [paired HSA](docs/mef/ty2025-form8889-paired-hsa-gap.md), [funding](docs/mef/ty2025-form8889-prior-funding-eligibility.md), [code 2](docs/mef/ty2025-form8889-code2-excess-gap.md), [1099-SA](docs/mef/ty2025-form8889-1099sa-source-gap.md), [age 65](docs/mef/ty2025-form8889-age65-exception-gap.md), and [disability](docs/mef/ty2025-form8889-disability-exception-gap.md).
- [ ] **Form 8582:** finish activity-ID provenance, referenced 2024 carryover imports, retained gain character, entire dispositions, active-rental/MFS boundaries, aggregate reconciliation, a durable 2025 ledger and next-year import contract. Verify worksheet Parts I-IX and overflow in filled PDF, plus Schedule E/Form 4835/4797 and Form 1040 joins. See [activity ledger](docs/mef/ty2025-form8582-activity-id-gap.md), [entire gain](docs/mef/ty2025-form8582-entire-overall-gain-gap.md), and [MFS](docs/mef/ty2025-form8582-mfs-boundary.md).
- [ ] **Form 4952:** finish debt/expense tracing, K-1 box 20 code B's permitted deduction destination, royalty and Schedule E ownership, investment-income elections, carryover ledger, and Form 6251 interaction. Ensure calculation, native document, PDF projectors, and final filer identity use one consistent validated source path. See [main gap](docs/mef/ty2025-form4952-gap.md), [K-1 code B](docs/mef/ty2025-form4952-k1-code-b-gap.md), and [Treasury dividend](docs/mef/ty2025-form4952-treasury-dividend-slice.md).
- [ ] **Form 4972:** complete beneficiary/partial-share, NUA, estate/death allocations and combinations, separate spouse elections, multiple 1099-R distributions, eligibility evidence, and the Form 6251/1040 tax join. Keep unsupported combinations blocked until their source records are verified. See the [Form 4972 gap](docs/mef/ty2025-form4972-gap.md).
- [ ] **Form 3800:** extend the registered nine-page parent PDF to every retained business-credit source and reconcile Form 1040 tax. See the [Form 3800 PDF gap](docs/mef/ty2025-form3800-pdf-gap.md).
  - [x] Print the prepared nine-page parent with its native instance IDs; reconcile one sourced geothermal Form 8835 credit through Schedule 3 and Form 1040, local XSD, and a visually reviewed filled packet.
  - [x] Print two distinct geothermal Form 8835 copies and two Part V source rows; reconcile their $1,200 total through Form 3800, Schedule 3, Form 1040, native XML, and the reviewed 20-page packet.
  - [x] Print mixed wind and geothermal Form 8835 copies with separate Part II production lines and two Part V source rows; reconcile the $1,200 total through local XSD, the reviewed packet, Schedule 3, and Form 1040.
  - [x] Print one source-backed nonpassive Form 8874 investment and its Form 3800 Part III line 1i credit; reconcile $500 through Schedule 3, Form 1040, local XSD, and the reviewed 15-page packet.
  - [x] Print two Form 8874 investments at 5% and 6%, then fill all six physical rows in a separate case; reconcile their $1,100 and $3,000 credits through Form 3800, Schedule 3, Form 1040, local XSD, and reviewed packets.
  - [x] Print seven Form 8874 investments with five direct rows, the IRS-required last-row attachment total, and a six-column supplemental page; reconcile the $3,500 credit through Form 3800, Schedule 3, Form 1040, local XSD, and the reviewed 16-page packet.
  - [x] Print 24 Form 8874 investments across two supplemental pages; reconcile the $9,500 attached subtotal and $12,000 full credit through Form 3800, Schedule 3, Form 1040, local XSD, and reviewed source/statement pages in the 21-page high-wage packet.
  - [x] Print a schema-valid long CDE name and address on a wrapped Form 8874 statement page using the prescribed last-row "See attached" subtotal; reconcile $500 through Form 3800, Schedule 3, Form 1040, local XSD, and reviewed pages in the 16-page packet.
  - [x] Print a mixed geothermal Form 8835 and New Markets Form 8874 return with separate Form 3800 lines 4e and 1i; reconcile $600 plus $500 through line 38, Schedule 3, Form 1040, local XSD, distinct source IDs, and the reviewed 18-page packet.
  - [x] Add cent-precise source-vintage carryover arithmetic that reconciles origin credit, earlier allowed uses and adjustments, 2025 opening balance, and current recapture reduction; reject duplicate sources and unsupported year direction. Four focused cases pass. This is a calculation prerequisite only.
  - [x] Render a separate source-vintage Form 3800 carryover history statement with origin-year credit and allowed amount, each carryback/forward use, original versus revised balance, and adjustment details. A two-page nine-vintage diagnostic preserves every credit heading and was visually checked; it is not attached to a prepared filing yet.
  - [x] Route reconciled nonpassive ordinary and specified vintages into the separate Form 3800 Part I line 4 and Part II line 34 tax calculations, and explicitly reject native export until source rows and prior-return history evidence are linked. Reject research carryforwards pending the Form 6765 business-income limitation. Focused source/calculation/native tests pass; this is not a filing route.
  - [x] Preserve explicit origin and historical-use tax-year-end dates in each carryforward vintage, and register a `CarryforwardGeneralBusinessCr` native computation per vintage. Its origin/allowed amount and carryback/forward use groups pass standalone TY2025 v5.4 XSD.
  - [x] Add a required typed source-to-computation link for Form 3800 Part I line 4 and Part IV nonpassive totals, and derive native/PDF revised-carryforward marks from the same facts. A synthetic two-vintage `IRS3800` document passes local TY2025 v5.4 XSD. The production parent remains export-blocked.
  - [x] Replace the unused raw Part VI carryover detail field with typed nonpassive source vintages, reconcile their year/credit/tax-use totals to Part IV and the computation sources, and project them to native XML and printable columns. A two-year aggregate passes local TY2025 v5.4 `IRS3800` XSD and 24 focused native/PDF tests pass. Production source assembly and prior-return evidence remain open.
  - [x] Apply the same Part IV/VI source-key, year, amount, tax-use, adjustment, and remaining-credit reconciliation before native XML and PDF projection. Reject an aggregate detail mismatch or an impossible single-source tax-use row; 137 focused Form 3800 native/PDF tests pass. This does not enable positive carryforward filing.
  - [x] Join a passive and nonpassive carryover on the same Form 3800 credit line into one Part IV row, retain each source in Part VI, and choose the largest source-backed pass-through EIN. A synthetic mixed-line parent passes local TY2025 v5.4 `IRS3800` XSD, and 138 focused Form 3800 native/PDF tests pass. Production carryforward intake remains blocked pending prior-return evidence and filing integration.
  - [x] Require a typed self or pass-through source origin on every Form 3800 carryforward vintage; retain its entity identity in the printable history. Assemble reconciled nonpassive ledger vintages through the shared FIFO tax-use pass into computation IDs and typed Part IV/VI rows, ordered by year without changing reserved document links. A synthetic two-year self/partnership parent passes local TY2025 v5.4 `IRS3800` XSD; 243 focused Form 3800 calculation/native/PDF tests pass. The assembler is not yet connected to positive production export or authenticated prior-return records.
  - [x] Connect the carryforward assembler to the production Form 3800 preparation path, including carryforward-only returns, reserved computation IDs, shared FIFO allocation with other credits, the passive/nonpassive Part IV join, and native document reconciliation. The 243-case focused Form 3800 run passes. Export still stops after native preparation because authenticated prior-return evidence and the filed history attachment are not linked.
  - [x] Wire the source-vintage history renderer into the Form 3800 PDF supplemental-page hook and bind its source keys, line, year, available amount, and revised status to the prepared MeF parts. A component case appends the history after nine form pages and rejects changed source facts; the PDF builder plus Form 3800 focused run passes 257/257. The positive prepared packet remains blocked by the prior-return evidence gate.
  - [ ] Join those vintages to authenticated prior returns and source records, Form 8582-CR, Form 3800 Parts I/II/IV/VI, the native `CarryforwardGeneralBusinessCr` computation, the revised-carryforward history statement, native XML, and the printable packet; prove source-to-Form 1040 totals and local XSD/business-rule results.
  - [ ] Cover transfer and passive credits, carryover vintages, mixed and other source credits, row overflow, required external attachments, cross-route archive evidence, business rules, and ATS acceptance.
- [ ] **Form 8835:** extend the bounded filer-owned wind/geothermal route to every retained credit, owner, facility, election, and source combination in the [form audit](docs/mef/ty2025-form1040-form-audit.md). Keep duplicate physical-facility records rejected and verify every native/PDF copy against its source and Form 3800 row.
- [ ] **Forms 8995/8995-A:** finish positive QBI export and all conditional Schedule A/B/C/D paths beyond the bounded two-business Schedule B route, including election, aggregation relationship, RPE statements, owner data, and return-wide QBI totals. See [8995](docs/mef/ty2025-form8995-positive-export-gap.md) and [8995-A](docs/mef/ty2025-form8995a-gap.md).
- [ ] **Form 8990:** obtain authenticated debt tracing and filed-year interest/ATI inputs, reconcile its return-wide ordering, and design a durable accepted-filing carryforward ledger before allowing a positive nonexcepted-interest export. See the [Form 8990 gap](docs/mef/ty2025-form8990-gap.md).
- [ ] **Form 8839:** obtain adoption decree, expense/reimbursement, exclusion, Form 2555, and credit-ordering evidence before allowing a positive adoption-credit filing. See the [Form 8839 gap](docs/mef/ty2025-form8839-gap.md).
- [ ] **Form 7203 / Form 9465 / Schedule J:** complete shareholder debt and other basis paths beyond the bounded stock-only loss; decide and implement the installment-agreement filing boundary; complete Schedule J beyond its bounded Schedule F-only election where applicable. See [7203](docs/mef/ty2025-form7203-stock-loss-gap.md), [9465](docs/mef/ty2025-form9465-filing-boundary.md), and [Schedule J](docs/mef/ty2025-schedule-j-integration-gap.md).
- [ ] **Forms 2210/2210-F, 8801, 172, 461, 4562, 4797, 6252, 7206, 7217, 8829, 8606, 8815, 8915-F:** review their applicable public inputs, computations, source proof, Form 1040 joins, native/PDF documents, and conditional attachments; finish all positive routes or obtain a named fail-closed decision. Use the matching form gap notes under [docs/mef](docs/mef/) and the [form audit](docs/mef/ty2025-form1040-form-audit.md).
- [ ] **Forms 2106, 8853, 8863, 8880, 8886, 8941, 8958, 8959, 8978, 8997, 982, 3115, 4255, 6478, 8621, 8864, 8874, 8911, 965-A, 8582-CR, 8611, 8826:** resolve the per-form unsupported branches, source/owner evidence, PDF parity, and required schedules or statements listed in the [form audit](docs/mef/ty2025-form1040-form-audit.md) and corresponding [gap notes](docs/mef/). Do not infer whole-form support from a bounded slice.
- [ ] **Foreign/entity and special attachments:** resolve applicable Forms 5471, 8858/Schedule M, 1118, trust K-1 backup withholding, section 965, and every other individual-filer root flagged in the [unregistered-root crosswalk](docs/mef/ty2025-unregistered-root-applicability.md), including source copy versus transmitted attachment ownership.
  - [x] Route one reviewed trust K-1 box 5 amount through Schedule E Part III instead of generic Schedule 1 line 8z. The trust/EIN/source reference and $750 reconcile through the graph, native TY2025 v5.4 full-return XSD, Schedule E page 2, Schedule 1 line 5, and Form 1040 in the five-page `v45` packet. Source-byte authentication, IRS business rules, and ATS remain open.
  - [x] Route positive trust K-1 boxes 6–8 through the per-activity statement and Schedule E Part III passive-income column. Three source rows ($300/$200/$100) reconcile to $600 across graph, native full-return XSD, the visually inspected five-page `v46` PDF, Schedule 1 line 5, and Form 1040. Trust activity losses and box 9 directly apportioned deductions remain filing-blocked pending limitation and character work; mixed Part I/III, source-byte authentication, IRS business rules, and ATS remain open.
  - [x] Treat the issued trust K-1 boxes as the fiduciary's already allocated beneficiary shares. Remove the beneficiary-side DNI rescaling, reject that extra cap input, and reject negative amounts in boxes 1–8 per the [2025 fiduciary instructions](https://www.irs.gov/instructions/i1041). Final-year box 11 codes C and D now have bounded routes; code D with positive net gain still needs the rate worksheets.
  - [x] Route final trust K-1 box 11 code A section 67(e) excess deductions to Schedule 1 lines 24k, 25, and 26 and Form 1040 line 10. Require the code-specific statement, final K-1, successor beneficiary, SSN, trust EIN, and source reference; reconcile distinct sources and totals before native export. The $500 synthetic source passes 164 focused tests including 38 local full-return XSD fixtures; all four pages of the `v48` PDF were inspected and show $29,500 AGI. Uncoded box 11, codes B and D–F, source-byte authentication, IRS business rules, and ATS remain open.
  - [x] Route final trust K-1 box 11 code C short-term capital loss carryover to Schedule D line 5 and Form 1040 line 7a. Require final-year, successor-beneficiary, statement, identity, and distinct source facts; reconcile line 5 against trust, partnership, and S-corporation K-1s. A standalone $700 loss and a mixed $900/$700/$100 K-1 return pass local TY2025 v5.4 XSD and were visually inspected in eight `v49` PDF pages. Other final-year deductions/carryovers, issuer bytes, IRS rules, and ATS remain open.
  - [x] Route final trust K-1 box 11 code D long-term capital loss carryover to Schedule D line 12 when the combined return has no net capital gain. Require the issued statement, final-year and successor facts, owner SSN, distinct trust source, and exact line 12 reconciliation. The $900 loss passes local TY2025 v5.4 full-return XSD and all four `v50` PDF pages were inspected; Form 1040 AGI is $29,100. Positive net-gain combinations reject until the [Schedule D rate worksheets](https://www.irs.gov/instructions/i1040sd) incorporate code D in their 28% and unrecaptured section 1250 lines. Issuer bytes, IRS rules, and ATS remain open.
  - [x] Reject trust K-1 special-rate box 4b/4c amounts, uncoded box 10/11 deductions, residual box 13 credits, and box 14 foreign-tax claims missing income/category instead of accepting them without a filing destination. Their coded positive routes remain in the form-audit queue.
- [ ] **Source/statement exceptions:** finish W-2G withholding attachments, Form 1098 box 6 points, Schedule LEP/R, Form 8814 child-income notation, Form 8862 credit-reinstatement links, Schedule H FUTA continuation, and any required signed/byte-bound statements and source copies identified by the [form audit](docs/mef/ty2025-form1040-form-audit.md).
  - [x] Verify the bounded Schedule LEP taxpayer/spouse route with a joint $70,000-W-2 return. Two separate native `IRS1040ScheduleLEP` documents pass local TY2025 v5.4 full-return XSD; the four-page `v44` PDF prints each person's name/SSN and checks only Spanish for the taxpayer and French for the spouse. Source, graph, XML, page review, and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). IRS business-rule and ATS acceptance remain open.

## Native MeF and PDF parity

- [ ] Resolve every native document without a corresponding required PDF or supported paper alternative in the [registry parity audit](docs/mef/ty2025-native-pdf-registry-parity.md), especially Form 965-A, Form 8582-CR, and Form 8621. For Form 8582-CR, the official two-page, 51-field blank has been inspected, but the filed line 6 tax-without-passive-income worksheet and activity/year carryforward ledger remain open; see its [PDF gap](docs/mef/ty2025-form8582cr-pdf-gap.md). Extend bounded Form 3800 and Form 8911/Schedule A descriptors to every retained filing branch.
- [ ] Audit every registered PDF descriptor against its canonical TY2025 IRS AcroForm fields, page count, row overflow, owner identity, checkbox semantics, descriptions, statements, document references, and current calculation. Fix stale or missing mappings rather than silently dropping fields.
  - [x] Form 1040 PDF packet preflight now rejects missing printable taxpayer name/SSN, a filing status absent from or inconsistent with the identified filer, and a missing digital-assets answer. The synthetic Form 7203 packet caught the previously blank name and status boxes; its corrected source prints all three on Form 1040 page 1. The wider descriptor audit remains open.
- [ ] Ensure native XML, PDF, and manifest use the same finalized return graph and prepared form instances; verify repeated owner/form copies and attachment references, including signed Form 8283 and source-issued acknowledgments.
  - [x] Require the final prepared Form 1040 export and submission archive to have a printable taxpayer identity, a filing status matching the filer, and an explicit digital-assets answer. The filled-PDF builder uses the same preflight. Missing and conflicting inputs fail focused tests; a positive Form 3800 prepared return, PDF, and submission ZIP plus the manifest XSD still pass. The lower-level XML serializer remains available for isolated partial-document tests, so direct-call completeness and the wider graph/manifest audit remain open.

## Automated and artifact validation

- [ ] Finish implementation and coverage decisions above before the agreed single full-batch gate. Existing focused cases and historical passes are not evidence for the current worktree.
- [x] Confirm Deno, `xmllint`, `pdftoppm`, and `pdfinfo` are available. Provision and verify the TY2025 v5.4 `Return1040.xsd` / `ReturnData1040.xsd` bundle under `.state/research/docs/`; it is Git-ignored, not checked in. On 2026-09-29, Deno 2.7.7, libxml 2.9.13, and Poppler 26.03.0 were present with both schema files. A filtered MeF Schedule 2 XSD test and a filtered full-return Single W-2 XSD test each ran and passed (1 pass, 0 ignored per command), proving both test files used the local `Return1040.xsd` bundle. This checks the preflight only; the full schema matrix remains open.
- [ ] Run `deno task test` as the final full batch after the retained routes and scope decisions are complete; record commit, command, tool versions, timestamp, pass/fail/ignored totals, failures, and ignored-test reasons. Fix failures, then rerun the same full command until the release batch passes. The latest complete regression passed 8,951/8,951 on `44282e25` with zero failures; the later `d8281e7c` attempt was intentionally interrupted after the build-first instruction. Implementation and external gates remain open.
  - [x] Rerun the full command after correcting the three repeated-facility fixtures; `15d5430d` passed 8,855/8,855 with no ignored tests reported. Retain `.state/research/ty2025-full-test-15d5430d.log` as local regression evidence.
  - [x] Rerun the full command after adding mixed wind/geothermal copies and the no-increase source guard; `08786417` passed 8,860/8,860 with no ignored tests reported. Retain `.state/research/ty2025-full-test-08786417.log` as local regression evidence.
  - [x] Rerun the full command after adding the Form 8874 source-backed packet and fixing its CDE address layout; `5eeb5e6b` passed 8,862/8,862 with no ignored tests reported. Retain `.state/research/ty2025-full-test-5eeb5e6b.log` as local regression evidence.
  - [x] Rerun the full command after adding two- and six-investment Form 8874 packets; `f0839295` passed 8,866/8,866 with no ignored tests reported. Retain `.state/research/ty2025-full-test-f0839295.log` as local regression evidence.
  - [x] Rerun the full command after the mixed geothermal/New Markets Form 3800 packet and prepared Form 8835 source reconciliation; `81a2c713` passed 8,869/8,869 with no ignored tests reported. Retain `.state/research/ty2025-full-test-81a2c713.log` as local regression evidence.
  - [x] Rerun the full command after the seven-investment Form 8874 statement packet; `bc556b01` passed 8,873/8,873 with no ignored tests reported. Retain `.state/research/ty2025-full-test-bc556b01.log` as local regression evidence.
  - [x] Rerun the full command after the 24-investment two-page Form 8874 statement packet; `9175f7c1` passed 8,875/8,875 with no ignored tests reported. Retain `.state/research/ty2025-full-test-9175f7c1.log` as local regression evidence.
  - [x] Rerun the full command after preserving a long Form 8874 CDE identity on a wrapped statement page; `7318ed47` passed 8,880/8,880 with no ignored tests reported. Retain `.state/research/ty2025-full-test-7318ed47.log` as local regression evidence.
  - [x] Rerun the full command after adding source-specific Form 3800 carryover arithmetic; `c6e844d8` passed 8,884/8,884 with no ignored tests reported. Retain `.state/research/ty2025-full-test-c6e844d8.log` as local regression evidence.
  - [x] Rerun the full command after adding the Form 3800 carryover history renderer; `500bd115` passed 8,886/8,886 with no ignored tests reported. Retain `.state/research/ty2025-full-test-500bd115.log` as local regression evidence. The later type-only `1087f488` edit passed focused lint and two statement tests.
  - [x] Rerun the full command after adding nonpassive Form 3800 carryforward tax-limit intake; `453259a2` passed 8,890/8,890 with no ignored tests reported. Retain `.state/research/ty2025-full-test-453259a2.log` as local regression evidence.
  - [x] Rerun the full command after registering the source-vintage `CarryforwardGeneralBusinessCr` computation; `99243afd` passed 8,894/8,894 with no ignored tests reported. Retain `.state/research/ty2025-full-test-99243afd-rerun.log`. The first unchanged-source attempt had one interrupted IRS Form 2555 PDF download; its exact test passed separately before the complete rerun.
  - [x] Rerun the full command after linking typed Form 3800 carryforward computations to native/PDF parent lines; source commit `11d5047d` passed 8,897/8,897 with zero failures. Retain `.state/research/ty2025-full-test-carryforward-link.log`.
  - [x] Rerun the full command after adding typed nonpassive Form 3800 Part VI details and duplicate-source rejection; source commit `efac9046` passed 8,898/8,898 with zero failures. Retain `.state/research/ty2025-full-test-efac9046.log`.
  - [x] Rerun the full command after the Form 8888, Schedule R, Form 7203, and Form 1040 PDF changes; fixed source commit `664679b2` passed 8,914/8,914 with zero failures and no ignored tests reported. Retain `.state/research/ty2025-full-test-664679b2.log`.
  - [x] Rerun the full command after the Schedule R Form 1040 tax-limit guard; source commit `56b4e37e` passed 8,916/8,916 with zero failures and no ignored tests reported. Retain `.state/research/ty2025-full-test-56b4e37e.log`.
  - [x] Rerun the full command after Schedule R age reconciliation and the DOB-derived Form 8995 limit fix; source commit `27021382` passed 8,921/8,921 with zero failures and no ignored tests reported. Retain `.state/research/ty2025-full-test-27021382.log`. The preceding `a7c26864` attempt passed 8,919 and failed the Form 8880 fixture corrected in this source.
  - [x] Rerun the full command after direct-rollover Form 1040 line 5a/5b and PDF corrections; source commit `1307679f` passed 8,922/8,922 with zero failures and no ignored tests reported. Retain `.state/research/ty2025-full-test-1307679f.log`.
  - [x] Rerun the full command after adding dated IRA line 4c(1) source, native XML, and PDF reporting; source commit `ad048d97` passed 8,927/8,927 with zero failures. Retain `.state/research/ty2025-full-test-ira-rollover-final.log`. A preceding run was intentionally interrupted after a source-evidence guard changed and is not completion evidence.
  - [x] Rerun the full command after adding linked IRA distribution statements and two statement-required return fixtures; source commit `2e047629` passed 8,929/8,929 with zero failures. Retain `.state/research/ty2025-full-test-ira-statement.log`.
  - [x] Rerun `deno task test` after requiring IRA type and prior-rollover facts and distinguishing code-G direct IRA-to-plan payments; source commit `eb1614b9` passed 8,931/8,931 with zero failures in 17m53s on 2026-09-29 23:54 UTC with Deno 2.7.7. Retain `.state/research/ty2025-full-test-ira-eligibility-final.log`. The preceding run was intentionally interrupted after the direct-payment rule changed and is not completion evidence.
  - [x] Rerun `deno task test` after the joint senior Schedule 1-A packet and Form 6251 PDF reconciliation fix; source commit `89b972c6` passed 8,932/8,932 with zero failures in 17m57s on 2026-09-30 00:24 UTC with Deno 2.7.7. Retain `.state/research/ty2025-full-test-schedule1a-pdf.log`.
  - [x] Rerun `deno task test` after the source-backed single W-2 tips Schedule 1-A native/PDF route; source commit `46d7d080` passed 8,938/8,938 with zero failures in 16m29s on 2026-09-30 00:54 UTC with Deno 2.7.7. Retain `.state/research/ty2025-full-test-schedule1a-tips.log`.
  - [x] Rerun `deno task test` after replacing unsourced overtime totals with reviewed W-2 box 14 premiums and adding the Schedule 1-A Part III native/PDF route; source commit `b2182cc1` passed 8,947/8,947 with zero failures in 16m21s on 2026-09-30 01:23 UTC with Deno 2.7.7. Retain `.state/research/ty2025-full-test-schedule1a-overtime.log`.
  - [x] Rerun `deno task test` after replacing bare car-loan interest with reviewed vehicle and lender facts and adding the Schedule 1-A Part IV native/PDF route; source commit `44282e25` passed 8,951/8,951 with zero failures in 16m34s on 2026-09-30 01:49 UTC with Deno 2.7.7. Retain `.state/research/ty2025-full-test-schedule1a-vehicle.log`.
- [x] Run the live canonical-PDF field-name checks in the normal test suite. On 2026-09-29, after correcting the Schedule 3 line 13a AcroForm path, `deno test --allow-read --allow-net=www.irs.gov --filter 'all mapped pdfField names exist in real IRS PDF' forms/f1040/2025/pdf/forms/all-descriptors.test.ts` passed all then-86 checks. The `08786417` full run passed all 87 current descriptor field-name checks, including Form 8835's wind fields. The earlier full descriptor file passed 605/605 checks, including the pinned-revision checks that had failed in the earlier diagnostic batch. This proves mapped field names exist in the referenced IRS PDFs; filled-output visual review remains a separate gate below.
- [ ] For every retained positive filing route, generate a full return from a source-backed fixture and validate emitted XML against the checked-in TY2025 IRS schema. Check source-to-calculation-to-Form-1040 totals, required references/attachments, negative and conflicting cases, and IRS business rules separately from structural XSD success.
- [ ] Generate the forty-five prepared synthetic filled-PDF cases through the real graph and PDF builder as described in the [validation batch](docs/mef/ty2025-form1040-validation-batch.md); render and inspect every page, mark checkboxes/amounts/owner identity/page order/continuations, and add cases for each uncovered descriptor or branch.
  - [x] Reconcile prepared Form 8949 rows against Schedule D's calculated transaction rows before native XML and filled-PDF export. Missing, changed, or duplicate filed rows now stop either export; Form 8949 cannot file without Schedule D, including in the direct Form 8854 bundle cases. A sale carrying an adjustment amount cannot take the unadjusted direct-reporting path, even without an adjustment code. The affected native, PDF, and Form 8854 focused cases pass, as do four capital-sale and two ordinary full-return local XSD fixtures. This does not resolve other sale categories, source-byte authentication, IRS business rules, or ATS acceptance. [2025 Form 8949 instructions](https://www.irs.gov/instructions/i8949) require filing it with Schedule D.
  - [x] Inspect the five-page mixed direct-and-adjusted broker sale packet in regenerated `v56`. The unadjusted $1,000 gain prints only on Schedule D line 1a; Form 8949 box A and Schedule D line 1b carry the adjusted $200 loss with $300 of code-W adjustment. Native XML now includes the matching prepared Form 8949 category totals in TY2025 v5.4 schema order, and the $800 net reaches Form 1040 once. Local XSD and the five-page review pass; details and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other sale categories, issuer bytes, IRS business rules, and ATS remain open.
  - [x] Inspect the four-page direct broker-basis sale packet in regenerated `v55`. Unadjusted short- and long-term sales print once on Schedule D lines 1a/8a, with $1,000/$2,000 gains, and no Form 8949 page or native document. The native Schedule D group names now match TY2025 v5.4 XSD; the $3,000 combined gain and $33,000 Form 1040 AGI reconcile. The source, page review, and PDF hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Issuer bytes, adjusted and digital-asset direct categories, IRS business rules, and ATS remain open.
  - [x] Inspect the six-page mixed short- and long-term Form 8949 packet in regenerated `v54`. Box B's $2,000 proceeds/$1,000 basis/$1,000 gain print on Schedule D line 2, while box F's $4,000/$2,000/$2,000 print on line 10. Lines 7, 15, and 16 reconcile to $1,000/$2,000/$3,000 and Form 1040 AGI to $33,000. The prepared sale rows now populate the matching Schedule D reporting rows; the source return passes local TY2025 v5.4 XSD, the live Schedule D field-name check passes, and the six-page hash and review are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Unreviewed sale categories, direct-reporting consistency, IRS business rules, and ATS remain open.
  - [x] Inspect the five-page sourced collectible-artwork sale packet in regenerated `v53`. Form 8949 Part II box E prints $5,000 proceeds, $2,000 basis, code C, zero adjustment, and $3,000 gain; Schedule D line 9 carries the proceeds, basis, and gain, line 18 prints the $3,000 28% rate amount, and Form 1040 line 7a and AGI reconcile. The canonical sale rows now remain in the prepared-return hash and reach the PDF projector. Local TY2025 v5.4 XSD passes; page review and the PDF hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other collectibles, mixed-rate gains, IRS business rules, and ATS acceptance remain open.
  - [x] Inspect the bounded direct pension-rollover packet against its Form 1099-R source, graph, native XML, and both rendered Form 1040 pages. The $20,000 code-G distribution initially disappeared from line 5a even though the rollover mark printed. The corrected packet prints $20,000 on line 5a, `0` on line 5b, and checks line 5c(1), with no QCD mark; the same values appear in native XML. The 27-case regenerated batch is retained at `.state/research/ty2025-filled-pdf-review/2026-09-29-v31/`; this checks one case and does not close the full visual-review gate.
  - [x] Inspect all five pages of the synthetic Form 8889 code-2 excess-withdrawal packet in the same `v31` batch. Its $1,000 Form 8889 lines 14a/14b, $100 Schedule 1 line 8z income, $4,300 Schedule 1 line 13 deduction, and $3,969 Form 1040 refund agree with the source JSON, pending graph, and native XML. The PDF hash and page review are recorded in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). This does not verify payer-issued 1099-SA bytes or other HSA paths.
  - [x] Correct the synthetic spouse's birth date to support the age-55 HSA catch-up, then inspect all six pages of the two-owner HSA packet in regenerated `v32`. Separate primary and spouse Forms 8889 show the right names, SSNs, $4,000/$5,000 contributions and deductions, and $4,300/$5,300 limits. The $9,000 total appears once on Schedule 1 and Form 1040; source JSON, pending graph, native XML, and the rendered PDF agree. The hash and page review are recorded in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other HSA branches remain open.
  - [x] Inspect both pages of the 2025 IRA-to-IRA rollover packet in regenerated `v35`. Form 1040 line 4a prints $5,000, line 4b prints `0`, line 4c(1) is checked, and pension line 5c remains blank. The source JSON, pending graph, native XML, and rendered PDF agree; the PDF hash is in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Broader rollover eligibility remains open.
  - [x] Inspect all three pages of each statement-required IRA rollover packet in regenerated `v36`. The $7,000 qualified-plan and $8,000 rollover completed in 2026 both print line 4a, explicit zero on 4b, the line 4c(1) mark, and a legible statement page with the destination/date. Native XML links each indicator to one `IRADistributionStatement` with matching text; hashes and review details are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md).
  - [x] Inspect the four-page joint senior Schedule 1-A packet in regenerated `v39`. Both owners and their SSNs/ages reconcile from source facts; Schedule 1-A Part I prints $160,000 MAGI and zero exclusions, Part V prints $5,400 per spouse, and line 38 matches Form 1040 line 13b at $10,800. A first PDF build exposed a Form 6251 projector reading a nonexistent calculated Schedule 1-A source field; it now reconciles to finalized Form 1040 and validated Schedule 1-A. The source, pending graph, native XML, page review, and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other Schedule 1-A branches remain open.
  - [x] Inspect the four-page single W-2 tips Schedule 1-A packet in regenerated `v41`. The W-2's $5,000 box 7 tips and TTOC 102 flow to Schedule 1-A Part II lines 4a/4c/6/7/13 and line 38, then Form 1040 line 13b; line 4b prints explicit zero. The $30,000 AGI, $9,250 taxable income, $928 tax, and $1,572 refund reconcile across graph, native TY2025 v5.4 XML, and the rendered PDF. The source, page review, and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Multi-employer and other tip sources, mixed claims, and IRS business-rule acceptance remain open.
  - [x] Inspect the four-page two-employer FLSA overtime Schedule 1-A packet in regenerated `v42`. Reviewed W-2 box 14 premiums of $3,000 and $1,000 flow to Part III lines 14a/14c/15/21 and line 38, then Form 1040 line 13b. The $80,000 AGI, $60,250 taxable income, $8,175 tax, and $175 owed reconcile across source graph, native TY2025 v5.4 XML, and the rendered PDF. The source, page review, and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other overtime sources and mixed claims remain open.
  - [x] Inspect the four-page reviewed car-loan Schedule 1-A packet in regenerated `v43`. One 2025 purchase loan carries the borrower, VIN, lender/purchase/final-assembly references, and a zero-other-deduction review; Part IV prints the VIN and $4,000 on lines 22(iii)/23/24/30/38, matching Form 1040 line 13b. The $80,000 AGI, $60,250 taxable income, $8,175 tax, and $175 owed reconcile across source graph, native TY2025 v5.4 XML, and the rendered PDF. The source, page review, and hash are in the [filled-PDF notes](docs/mef/ty2025-filled-pdf-review-2026-09-29.md). Other Part IV sources and IRS business-rule acceptance remain open.
- [ ] Compare each filled PDF to its source, calculated pending data, native XML, and Form 1040 totals. Retain review artifacts and record each discrepancy and fix; blank templates and ATS source PDFs do not count as filled-output review.

## IRS ATS and delivery

- [ ] Complete the Publication 1436 Form 1040 ATS scenario matrix, source-backed expected outputs, required supporting forms and attachments, and scenario-specific assertions in [ATS preparation](docs/ats/ty2025.md). Resolve the known Scenario 1 Form 5695 door-cost conflict and Scenario 8 printed QCD mark before submission.
  - [x] Rerun the Scenario 8 code-G rollover/line 5c path through source, native Form 1040 and PDF checks: 111/111 focused tests passed on 2026-09-29, and the local Scenario 8 return XSD case passed 1/1. This is not ATS acceptance.
- [ ] Obtain and verify the issued ATS certificate, enrolled ASID/Test ETIN, current IRS ATS endpoint/WSDL/trust package, and authorized transmission credentials. Do not put private keys or certificate secrets in the repository.
- [ ] Submit each required Form 1040-family ATS scenario only after its source, XML, PDF, and package checks pass; retain transmitted package, IRS acknowledgment, acceptance/rejection details, and repair/retest evidence. No local test or XSD pass substitutes for an accepted IRS acknowledgment.
- [ ] Review the completed diff, user-approved scope decisions, security/privacy implications, and test/ATS evidence; then create a PR with a precise description and linked test evidence. Do not merge merely because code is written.
- [ ] After review and required acceptance gates, merge the PR, release a new version, verify the published artifact/version and release notes, and close or update the linked issues with a short human explanation and thanks.
