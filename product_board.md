# TY2025 Form 1040 product TODO

## Current checkpoint (2026-09-29)

This is an open release gate, not a list of completed forms. The current source
registries contain 123 native MeF descriptors and 87 PDF descriptors; the
[coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md) records
the limits of those counts. A registered route or focused test does not
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

The 2026-09-29 08:38 UTC fixed-source `deno task test` run on commit
`15d5430d` passed **8,855/8,855**, zero failed, in 14m11s; its Deno summary
reported no ignored tests. Tool versions were Deno 2.7.7, libxml 2.9.13, and
Poppler 26.03.0. The log is retained at
`.state/research/ty2025-full-test-15d5430d.log`. This includes the
prepared Form 3800 nine-page PDF, ZIP/source drift checks, and two distinct
Form 8835 geothermal facilities with separate native and printed copies.
The filled review now has 19 packets (135 pages) and 19 XML files under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v18/`; the geothermal
Form 3800 pages and the new two-facility Form 8835 copies were visually checked.
Broader source/ATS coverage and final release validation remain open. The
preceding fixed-source run on `98466597` passed 8,851/8,851, zero failed; its
log is retained at `.state/research/ty2025-full-test-98466597.log`.

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
the 20-page packet was rendered and inspected. The review set has 19 packets
(135 pages). Transfer, passive, carryover, other credit combinations, external
credit-attachment, and ATS gates remain open. The submission ZIP consumes the
same prepared bundle as the PDF and rejects source, filer, XML, or attachment
drift; one geothermal ZIP/PDF case passes locally.

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
- [ ] Treat every other entered Form 1040-family filing claim as in scope until its route is completed or the user explicitly approves a named, fail-closed exclusion. A registered builder, schema literal, written test, or computed preview alone does not establish support.
- [ ] Complete the source-to-calculation-to-Form-1040-to-native-MeF-to-PDF-to-attachment chain for every retained positive filing route. Preserve taxpayer/spouse ownership, source provenance, calculated totals, and rejection of unsupported or inconsistent inputs.
- [ ] Do not add a compatibility layer, fallback, dual API shape, migration shim, or temporary workaround without first telling the user what will be added and why, as required by AGENTS.md.

## Coverage inventory and decisions

- [ ] Resolve the unsupported-path disposition in **each of the 123 registered MeF descriptor rows** of the [form-by-form audit](docs/mef/ty2025-form1040-form-audit.md). For each row, record its applicable trigger, public/source facts, calculation, Form 1040 join, native document, PDF or statement, focused cases, XSD evidence, and final support or explicitly approved rejection boundary.
- [ ] Review the **211 TY2025 IRS schema document roots** in the [root census](docs/mef/ty2025-xsd-document-root-census.md) against actual Form 1040 applicability. Resolve every still-unregistered or source-literal-only root in the [applicability crosswalk](docs/mef/ty2025-unregistered-root-applicability.md); neither a source literal nor absence from a registry is a support/exclusion decision.
- [ ] Reconcile the registered-document audit, root crosswalk, [conditional-schedule audit](docs/mef/ty2025-conditional-schedule-applicability.md), [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md), and actual registries after implementation so their counts, triggers, and unsupported branches agree.
- [ ] Decide, with the user, which current-return paths are separate workflows: amended Form 1040-X; payment/account roots (1062, 965, estimated tax, Form T, payment); recipient copies of RRB-1042-S and SSA-1042-S; and optional Forms 4547 and 9000. Preserve any income, withholding, tax, election, or amendment consequences on Form 1040.
- [ ] Decide conditional filer ownership individually for entity-associated roots, including Forms 8858/Schedule M and 1118, entity-issued 1065 Schedule D and 8825, and trust K-1 box 13 code B backup withholding. Build any individual Form 1040 attachment that remains required; do not blanket-exclude an entity-root family.
- [ ] Audit [source-only and sparsely mapped forms](docs/mef/ty2025-source-only-and-sparse-map-gap.md): identify every positive filing trigger, confirm each emitted field and required statement/attachment, and replace any optimistic mapping with a verified route or explicit rejection.
- [ ] Audit return-wide ordering and reconciliation across Form 1040, Schedules 1/1-A/2/3, income, deductions, tax, credits, withholding, payments, carryovers, and multiple copies of the same form. Check positive, zero, negative, amended-source, joint-owner, and conflicting-source cases.
- [ ] Decide whether structured reviewed facts alone are acceptable filing evidence for complex forms or whether executor-bound uploaded document bytes must be verified. Apply one consistent evidence standard to external records, signed forms, carryovers, appraisals, source K-1s, and ATS fixtures.

## Core return and source paths

- [ ] Audit Form 1040 identity, filing status, dependents, digital assets, wages, pensions/rollovers/QCD, taxable Social Security, interest/dividends, capital gains, business/farm/rental income, adjustments, deduction choice, credits, taxes, withholding, payments, refund, and amount owed against source records and 2025 instructions.
- [ ] Audit source classifications and ownership for Forms W-2, W-2G, 1099-INT/DIV/OID/B/R/G/NEC/K/MISC/PATR/SA, 1098, 1095-A, 3921, K-1s, foreign employer records, and reviewed prior returns. Require joins to the correct recipient and destination, and reject duplicates or ambiguous matches.
- [ ] Complete Schedule 1 line 8z source/description handling, Schedule 1-A deduction variants and filled PDF, Schedule 2's 2025 line structure, Schedule 3 joins, and Schedule EIC child identity/residency projection. See the [Schedule 1-A gap](docs/mef/ty2025-schedule1a-gap.md) and [line 8z source gap](docs/mef/ty2025-schedule1-line8z-source-gap.md).
- [ ] Finish Schedule C and Schedule F/Form 4835 source, at-risk, passive, self-employment, QBI, and PDF cross-checks, including Schedule C [PDF mapping](docs/mef/ty2025-schedule-c-pdf-gap.md), Schedule J's [source](docs/mef/ty2025-schedule-j-source-gap.md) and [integration](docs/mef/ty2025-schedule-j-integration-gap.md), and the applicable Schedule E rental/royalty joins.
- [ ] Verify Form 1040 assembly order, document references, multiple-instance IDs, required PDF descriptions, manifest/return archives, A2A request package, and explicit failures for missing or invalid AcroForm fields.

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
  - [ ] Cover transfer and passive credits, carryover vintages, mixed and other source credits, row overflow, required external attachments, cross-route archive evidence, business rules, and ATS acceptance.
- [ ] **Form 8835:** extend the bounded filer-owned geothermal route to every retained credit, owner, facility, election, and source combination in the [form audit](docs/mef/ty2025-form1040-form-audit.md). Keep duplicate physical-facility records rejected and verify every native/PDF copy against its source and Form 3800 row.
- [ ] **Forms 8995/8995-A:** finish positive QBI export and all conditional Schedule A/B/C/D paths beyond the bounded two-business Schedule B route, including election, aggregation relationship, RPE statements, owner data, and return-wide QBI totals. See [8995](docs/mef/ty2025-form8995-positive-export-gap.md) and [8995-A](docs/mef/ty2025-form8995a-gap.md).
- [ ] **Form 8990:** obtain authenticated debt tracing and filed-year interest/ATI inputs, reconcile its return-wide ordering, and design a durable accepted-filing carryforward ledger before allowing a positive nonexcepted-interest export. See the [Form 8990 gap](docs/mef/ty2025-form8990-gap.md).
- [ ] **Form 8839:** obtain adoption decree, expense/reimbursement, exclusion, Form 2555, and credit-ordering evidence before allowing a positive adoption-credit filing. See the [Form 8839 gap](docs/mef/ty2025-form8839-gap.md).
- [ ] **Form 7203 / Form 9465 / Schedule J:** complete shareholder debt and other basis paths beyond the bounded stock-only loss; decide and implement the installment-agreement filing boundary; complete Schedule J beyond its bounded Schedule F-only election where applicable. See [7203](docs/mef/ty2025-form7203-stock-loss-gap.md), [9465](docs/mef/ty2025-form9465-filing-boundary.md), and [Schedule J](docs/mef/ty2025-schedule-j-integration-gap.md).
- [ ] **Forms 2210/2210-F, 8801, 172, 461, 4562, 4797, 6252, 7206, 7217, 8829, 8606, 8815, 8915-F:** review their applicable public inputs, computations, source proof, Form 1040 joins, native/PDF documents, and conditional attachments; finish all positive routes or obtain a named fail-closed decision. Use the matching form gap notes under [docs/mef](docs/mef/) and the [form audit](docs/mef/ty2025-form1040-form-audit.md).
- [ ] **Forms 2106, 8853, 8863, 8880, 8886, 8941, 8958, 8959, 8978, 8997, 982, 3115, 4255, 6478, 8621, 8864, 8874, 8911, 965-A, 8582-CR, 8611, 8826:** resolve the per-form unsupported branches, source/owner evidence, PDF parity, and required schedules or statements listed in the [form audit](docs/mef/ty2025-form1040-form-audit.md) and corresponding [gap notes](docs/mef/). Do not infer whole-form support from a bounded slice.
- [ ] **Foreign/entity and special attachments:** resolve applicable Forms 5471, 8858/Schedule M, 1118, trust K-1 backup withholding, section 965, and every other individual-filer root flagged in the [unregistered-root crosswalk](docs/mef/ty2025-unregistered-root-applicability.md), including source copy versus transmitted attachment ownership.
- [ ] **Source/statement exceptions:** finish W-2G withholding attachments, Form 1098 box 6 points, Schedule LEP/R, Form 8814 child-income notation, Form 8862 credit-reinstatement links, Schedule H FUTA continuation, and any required signed/byte-bound statements and source copies identified by the [form audit](docs/mef/ty2025-form1040-form-audit.md).

## Native MeF and PDF parity

- [ ] Resolve every native document without a corresponding required PDF or supported paper alternative in the [registry parity audit](docs/mef/ty2025-native-pdf-registry-parity.md), especially Form 965-A, Form 8582-CR, and Form 8621. Extend bounded Form 3800 and Form 8911/Schedule A descriptors to every retained filing branch.
- [ ] Audit every registered PDF descriptor against its canonical TY2025 IRS AcroForm fields, page count, row overflow, owner identity, checkbox semantics, descriptions, statements, document references, and current calculation. Fix stale or missing mappings rather than silently dropping fields.
- [ ] Ensure native XML, PDF, and manifest use the same finalized return graph and prepared form instances; verify repeated owner/form copies and attachment references, including signed Form 8283 and source-issued acknowledgments.

## Automated and artifact validation

- [ ] Finish implementation and coverage decisions above before the agreed single full-batch gate. Existing focused cases and historical passes are not evidence for the current worktree.
- [x] Confirm Deno, `xmllint`, `pdftoppm`, and `pdfinfo` are available. Provision and verify the TY2025 v5.4 `Return1040.xsd` / `ReturnData1040.xsd` bundle under `.state/research/docs/`; it is Git-ignored, not checked in. On 2026-09-29, Deno 2.7.7, libxml 2.9.13, and Poppler 26.03.0 were present with both schema files. A filtered MeF Schedule 2 XSD test and a filtered full-return Single W-2 XSD test each ran and passed (1 pass, 0 ignored per command), proving both test files used the local `Return1040.xsd` bundle. This checks the preflight only; the full schema matrix remains open.
- [ ] Run `deno task test` as the final full batch after the retained routes and scope decisions are complete; record commit, command, tool versions, timestamp, pass/fail/ignored totals, failures, and ignored-test reasons. Fix failures, then rerun the same full command until the release batch passes. The current source commit passed 8,855/8,855 locally as recorded above; implementation and external gates remain open.
  - [x] Rerun the full command after correcting the three repeated-facility fixtures; `15d5430d` passed 8,855/8,855 with no ignored tests reported. Retain `.state/research/ty2025-full-test-15d5430d.log` as local regression evidence.
- [x] Run the live canonical-PDF field-name checks in the normal test suite. On 2026-09-29, after correcting the Schedule 3 line 13a AcroForm path, `deno test --allow-read --allow-net=www.irs.gov --filter 'all mapped pdfField names exist in real IRS PDF' forms/f1040/2025/pdf/forms/all-descriptors.test.ts` passed all 86 checks. The full descriptor file was rerun with the repository test permissions and passed 605/605 checks, including the pinned-revision checks that had failed in the earlier diagnostic batch. This proves mapped field names exist in the referenced IRS PDFs; filled-output visual review remains a separate gate below.
- [ ] For every retained positive filing route, generate a full return from a source-backed fixture and validate emitted XML against the checked-in TY2025 IRS schema. Check source-to-calculation-to-Form-1040 totals, required references/attachments, negative and conflicting cases, and IRS business rules separately from structural XSD success.
- [ ] Generate the nineteen prepared synthetic filled-PDF cases through the real graph and PDF builder as described in the [validation batch](docs/mef/ty2025-form1040-validation-batch.md); render and inspect every page, mark checkboxes/amounts/owner identity/page order/continuations, and add cases for each uncovered descriptor or branch.
- [ ] Compare each filled PDF to its source, calculated pending data, native XML, and Form 1040 totals. Retain review artifacts and record each discrepancy and fix; blank templates and ATS source PDFs do not count as filled-output review.

## IRS ATS and delivery

- [ ] Complete the Publication 1436 Form 1040 ATS scenario matrix, source-backed expected outputs, required supporting forms and attachments, and scenario-specific assertions in [ATS preparation](docs/ats/ty2025.md). Resolve the known Scenario 1 Form 5695 door-cost conflict and rerun the Scenario 8 code-G rollover/line 5c path.
- [ ] Obtain and verify the issued ATS certificate, enrolled ASID/Test ETIN, current IRS ATS endpoint/WSDL/trust package, and authorized transmission credentials. Do not put private keys or certificate secrets in the repository.
- [ ] Submit each required Form 1040-family ATS scenario only after its source, XML, PDF, and package checks pass; retain transmitted package, IRS acknowledgment, acceptance/rejection details, and repair/retest evidence. No local test or XSD pass substitutes for an accepted IRS acknowledgment.
- [ ] Review the completed diff, user-approved scope decisions, security/privacy implications, and test/ATS evidence; then create a PR with a precise description and linked test evidence. Do not merge merely because code is written.
- [ ] After review and required acceptance gates, merge the PR, release a new version, verify the published artifact/version and release notes, and close or update the linked issues with a short human explanation and thanks.
