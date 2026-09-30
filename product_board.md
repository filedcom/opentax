# TY2025 Form 1040 product board

## Current state (2026-10-01)

This board shows **completed checkpoints and open work**. A checked checkpoint
records only the work named in that row; it does not close a broader form or
release gate. Older test logs, source references, PDF reviews, and decisions
remain in the [2026-09-30 checkpoint archive](docs/mef/ty2025-product-board-checkpoint-2026-09-30.md).
The detailed route boundaries remain in the linked gap notes and audits.

- **Implemented slices:** reviewed source routes now cover selected W-2, 1099,
  K-1, rental, farm, sale, rollover, disaster, Marketplace, and health-plan
  cases. They are bounded routes, not blanket support for those form families.
- **Filing output:** selected full returns pass the local TY2025 v5.4 XSD and
  have inspected filled PDFs. The recent one-business Form 7206 route also
  reconciles Schedule SE, Schedule 1, QBI, and Form 1040.
- **Latest completed bulk baseline:** `deno task test` passed 8,951/8,951 on
  commit `44282e25`; see the [retained log](.state/research/ty2025-full-test-schedule1a-vehicle.log).
  Later implementation has focused checks, but the final fixed-source bulk run
  has not happened. Run it after implementation is finished, as requested.
- **Prior focused checkpoint:** after the top-level input guard and Form 4797
  PDF changes on `9effd20b`, the 88 prepared source-to-native-MeF fixtures
  passed local TY2025 v5.4 XSD (`deno test --allow-read --allow-write
  --allow-run=xmllint,deno,pdftotext --allow-net=www.irs.gov
  forms/f1040/2025/pdf/review-fixtures.xsd.test.ts`, 88/88). This does not
  replace the final bulk, filled-PDF, business-rule, or ATS gates. A later
  [Form 4797 K-1 line 2 review](docs/mef/ty2025-form4797-k1-line2-filled-review.md)
  records two local-XSD-valid full returns, inspected parent and continuation
  pages, a mixed K-1/installment return, and a separate negative-loss route
  check. Its broader source and
  release gates remain open. The bounded [investment section 1245
  review](docs/mef/ty2025-form4797-investment-1245.md) also has one- and
  four-property XSD-valid, inspected nine-page packets; source-byte proof and
  other property classes remain open.
- **Latest implementation checkpoint:** PR #56 now includes final-filer K-1
  ownership checks for bounded Form 4952 paths, a public Form 8863 credit-limit
  worksheet route, and the reviewed Form 8862 CTC case. Form 8862 CTC/ODC and
  AOTC claims now require a prior-disallowance year and IRS notice reference,
  like the EITC route. Extra CTC/ODC people and AOTC students now get a numbered
  PDF continuation. Form 8862 Part II child names and count now reconcile to
  finalized Schedule EIC and its Form 1040 credit. Parts III/IV require every
  filed CTC/ODC dependent and AOTC student once; these changes have not entered
  the final test batch. The current implementation also requires a separate
  reviewed prior-notice record for each CTC/ODC and AOTC claim and binds its
  year, reference, and taxpayer to Form 8862; retained notice-copy bytes are
  not yet authenticated. Full-return ODC and AOTC cases are written for the
  deferred batch.
- **Form 1098 points checkpoint:** ordinary refinancing points are not reported
  in box 6 under the 2025 payer instructions. The construction-debt exception
  calculates current-year amortization into Schedule A line 8a. A separate
  linked Form 1098 and closing-disclosure route now calculates ordinary
  unreported refinance points into line 8c. Both routes have focused cases and
  full-return XSD/PDF fixtures written but unrun. Payer-byte proof, mixed-debt
  allocation, and a later-year ledger remain open. See the
  [points route](docs/mef/ty2025-form1098-box6-points.md).
  The preexisting focused
  XSD/PDF evidence for these slices is recorded in their gap notes. All wider
  form variants, source proof, the final bulk run, business rules, and ATS
  remain open.
- **Form 8814 notation checkpoint:** the parent Form 1040 PDF now marks a
  child's capital-gain distribution on line 7b only when the child's amount
  actually uses direct line 7a reporting. A Schedule D return instead carries
  the child's amount to Schedule D line 13, and a missing or understated route
  rejects. Both routes have focused cases and a mixed parent-sale/child-gain
  filled-PDF fixture written but unrun. The wider source and release gates
  remain open.
- **Open release gates:** settle the named coverage and evidence decisions;
  complete or explicitly reject each retained positive filing route; reconcile
  the 126 MeF descriptors, 89 PDF descriptors, and 211 IRS schema roots; then
  run full source, XSD, PDF, business-rule, and ATS validation. Keep this draft
  [PR #56](https://github.com/filedcom/opentax/pull/56) updated as work lands.
- **Implementation-first checkpoint:** the user reaffirmed that the remaining
  routes should be implemented before testing resumes. Earlier focused checks
  are recorded in their gap notes; no new per-form checks or bulk run should
  be treated as the current acceptance gate.

A checked item records its bounded evidence only. An unchecked item
below remains open even when one of its examples already passes. A source
literal, registered descriptor, local XSD pass, or focused test alone does not
establish full filing support.

## Completed checkpoints

### Verified on earlier commits

- [x] The fixed-source `deno task test` baseline passed 8,951/8,951 with zero
  failures on `44282e25`; [log](.state/research/ty2025-full-test-schedule1a-vehicle.log).
  This predates the current implementation and is not the final bulk gate.
- [x] The prepared source-to-native-MeF review fixture set passed 88/88 local
  TY2025 v5.4 XSD checks on `9effd20b`. The current fixture set has grown and
  awaits the final batch.
- [x] The earlier PDF descriptor check found all mapped field names in the
  referenced IRS PDFs (then 87 descriptors); see the
  [checkpoint archive](docs/mef/ty2025-product-board-checkpoint-2026-09-30.md).
  This was a field-name check, not filled-output review.

### Implemented in draft PR #56; current batch pending

- [x] Form 4952's bounded partnership K-1 paths check final-filer ownership
  and reconcile their mixed K-1/1099 Form 1040 joins (`59bc67de`, `0ed3df33`).
- [x] Form 8863 accepts a public credit-limit worksheet input for the
  reviewed AOC route (`ad1def92`).
- [x] Form 8862 CTC/ODC and AOTC paths require prior-disallowance year and
  IRS-notice references; multi-person PDF continuations and finalized
  EITC/CTC/ODC/AOTC claimant joins are written (`6704de8f` through
  `906b7d01`).
- [x] Form 8862 CTC/ODC and AOTC claims match separate reviewed prior-notice
  records by year, reference, and taxpayer; ODC and AOTC full-return routes
  are authored for the deferred XSD/PDF batch.
- [x] Form 1098 construction-debt refinance points calculate a TY2025
  Schedule A line 8a amount from the loan term and payment records
  (`796df406`).
- [x] Ordinary unreported refinance points have a linked Form 1098,
  closing-disclosure, payment-record, and Schedule A line 8c source route
  (`6b86815f`).
- [x] Form 8814 child-gain PDF notation follows direct Form 1040 line 7a or
  Schedule D line 13, with a mixed-return fixture written (`7f8dd8b6`).
- [x] Schedule R's age-only single, HOH, QSS, MFJ, and all-year-apart MFS
  calculations and native/PDF branches are written; focused cases await the
  current batch. See the [age-only route](docs/mef/ty2025-schedule-r-age-only.md).

The items in this second group have authored cases but have **not** entered
the requested final bulk test. Their source authentication, broader variants,
filled-PDF review, IRS business rules, and ATS gates remain open below.

## Work order

1. Resolve the named workflow and evidence decisions in the
   [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md).
2. Finish every retained source-to-calculation-to-Form-1040-to-MeF-to-PDF and
   attachment route, or record an approved fail-closed boundary.
3. Run the full fixed-source batch once implementation is finished, then
   complete filled-PDF, IRS business-rule, and ATS acceptance gates.
4. Review the draft PR and release only after those gates pass.

## Scope and completion rules

- [ ] Keep this release limited to the TY2025 Form 1040 family: Form 1040, its applicable schedules, supporting forms, source documents, statements, PDF packet, MeF return, and A2A submission package.
- [ ] Keep standalone 1040-NR, 1040-SS, Form 4868, and dual-status Form 1040 e-file outside this release gate. Reject an attempted dual-status e-file instead of treating it as an ordinary Form 1040.
- [ ] Treat every other entered Form 1040-family filing claim as in scope until its route is completed or the user explicitly approves a named, fail-closed exclusion. A registered builder, schema literal, written test, or computed preview alone does not establish support.
- [ ] Complete the source-to-calculation-to-Form-1040-to-native-MeF-to-PDF-to-attachment chain for every retained positive filing route. Preserve taxpayer/spouse ownership, source provenance, calculated totals, and rejection of unsupported or inconsistent inputs.
- [ ] Do not add a compatibility layer, fallback, dual API shape, migration shim, or temporary workaround without first telling the user what will be added and why, as required by AGENTS.md.

## Coverage inventory and decisions

- [ ] Resolve the unsupported-path disposition in **each of the 126 registered MeF descriptor rows** of the [form-by-form audit](docs/mef/ty2025-form1040-form-audit.md). For each row, record its applicable trigger, public/source facts, calculation, Form 1040 join, native document, PDF or statement, focused cases, XSD evidence, and final support or explicitly approved rejection boundary.
- [ ] Review the **211 TY2025 IRS schema document roots** in the [root census](docs/mef/ty2025-xsd-document-root-census.md) against actual Form 1040 applicability. Resolve every still-unregistered or source-literal-only root in the [applicability crosswalk](docs/mef/ty2025-unregistered-root-applicability.md); neither a source literal nor absence from a registry is a support/exclusion decision.
- [ ] Reconcile the registered-document audit, root crosswalk, [conditional-schedule audit](docs/mef/ty2025-conditional-schedule-applicability.md), [coverage decision queue](docs/mef/ty2025-form1040-coverage-decisions.md), and actual registries after implementation so their counts, triggers, and unsupported branches agree.
- [ ] Decide, with the user, which current-return paths are separate workflows: amended Form 1040-X; payment/account roots (1062, 965, estimated tax, Form T, payment); recipient copies of RRB-1042-S and SSA-1042-S; and optional Forms 4547 and 9000. Preserve any income, withholding, tax, election, or amendment consequences on Form 1040.
- [ ] Decide conditional filer ownership individually for entity-associated roots, including Forms 8858/Schedule M and 1118, entity-issued 1065 Schedule D and 8825, and trust K-1 box 13 code B backup withholding. Build any individual Form 1040 attachment that remains required; do not blanket-exclude an entity-root family.
- [ ] Audit [source-only and sparsely mapped forms](docs/mef/ty2025-source-only-and-sparse-map-gap.md): identify every positive filing trigger, confirm each emitted field and required statement/attachment, and replace any optimistic mapping with a verified route or explicit rejection.
- [ ] Audit return-wide ordering and reconciliation across Form 1040, Schedules 1/1-A/2/3, income, deductions, tax, credits, withholding, payments, carryovers, and multiple copies of the same form. Check positive, zero, negative, amended-source, joint-owner, and conflicting-source cases.
- [ ] Decide whether structured reviewed facts alone are acceptable filing evidence for complex forms or whether executor-bound uploaded document bytes must be verified. Apply one consistent evidence standard to external records, signed forms, carryovers, appraisals, source K-1s, and ATS fixtures.

## Core return and source paths

- [ ] Audit Form 1040 identity, filing status, dependents, digital assets, wages, pensions/rollovers/QCD, taxable Social Security, interest/dividends, capital gains, business/farm/rental income, adjustments, deduction choice, credits, taxes, withholding, payments, refund, and amount owed against source records and 2025 instructions.
  - [ ] Complete IRA rollover reporting on Form 1040 line 4c(1). Reviewed IRA-to-IRA, IRA-to-qualified-plan, 2026-completion, [automatic late-waiver](docs/mef/ty2025-ira-rollover-automatic-waiver.md), [self-certification](docs/mef/ty2025-ira-rollover-self-certification.md), and [issued IRS ruling](docs/mef/ty2025-ira-rollover-irs-ruling.md) routes now mark line 4c(1) and link the required native/PDF statement when applicable under the [2025 Form 1040 instructions](https://www.irs.gov/pub/irs-prior/i1040gi--2025.pdf). Still support other valid late-rollover exceptions and wider IRA rollover eligibility evidence, including authenticated source and prior-return records, inherited/RMD status, and plan acceptance. Do not treat the pension line 5c mark as IRA evidence.
- [ ] Audit source classifications and ownership for Forms W-2, W-2G, 1099-INT/DIV/OID/B/R/G/NEC/K/MISC/PATR/SA, 1098, 1095-A, 3921, K-1s, foreign employer records, and reviewed prior returns. Require joins to the correct recipient and destination, and reject duplicates or ambiguous matches.
- [ ] Complete Schedule 1 line 8z source/description handling, Schedule 1-A deduction variants and filled PDF, Schedule 2's 2025 line structure, Schedule 3 joins, and Schedule EIC child identity/residency projection. See the [Schedule 1-A gap](docs/mef/ty2025-schedule1a-gap.md) and [line 8z source gap](docs/mef/ty2025-schedule1-line8z-source-gap.md).
  - [ ] Correct Form 5471 section 951(a) income to Schedule 1 line 8n and compute an individual's section 951A inclusion on Form 8992 for line 8o, with the required Form 5471/8992 documents. The wrong generic line 8z deposit has been removed; populated Form 5471 now rejects at calculation and both exports. [2025 Form 5471 instructions](https://www.irs.gov/instructions/i5471), [Form 8992 instructions](https://www.irs.gov/instructions/i8992), and the checked-in v5.4 Schedule 1 XSD agree on the distinct lines. Legacy Forms 8873 and 8915-D also reject at calculation instead of producing line 8z preview amounts; their named TY2025 scope decisions remain open in the [coverage queue](docs/mef/ty2025-form1040-coverage-decisions.md).
  - [ ] Finish Worksheet 1 passive-activity lines 11–13, reconcile the complete investment-income limit to finalized Schedule E, Form 8582, K-1, other Form 4797 ordinary gains and losses, and other passive sources, and verify the full $11,950 threshold across combined categories and allowed losses.
- [ ] Finish Schedule C and Schedule F/Form 4835 source, at-risk, passive, self-employment, QBI, and PDF cross-checks, including Schedule C [PDF mapping](docs/mef/ty2025-schedule-c-pdf-gap.md), Schedule J's [source](docs/mef/ty2025-schedule-j-source-gap.md) and [integration](docs/mef/ty2025-schedule-j-integration-gap.md), and the applicable Schedule E rental/royalty joins.
- [ ] Verify Form 1040 assembly order, document references, multiple-instance IDs, required PDF descriptions, manifest/return archives, A2A request package, and explicit failures for missing or invalid AcroForm fields.

## Named tax-form gaps

- [ ] **Form 8283:** finish the required FMV-reduction statement for every applicable reason, not only the bounded land-election case; reconcile deduction, FMV, appraisal, signed donee form, vehicle acknowledgment, Section B grouping, and prior-year carryover attachment to the source bytes and Schedule A. See [reduction](docs/mef/ty2025-form8283-fmv-reduction-gap.md), [carryover](docs/mef/ty2025-form8283-carryover-source-gap.md), and [PDF](docs/mef/ty2025-form8283-pdf-gap.md).
  - [x] Stage a distinct purchased Section A inventory ordinary-gain reduction: require invoice and cost-record references, basis claim below original FMV, native linked reason statement, PDF explanation, and complete Schedule A/Form 1040 reconciliation. Source/native/PDF fixtures are authored for the deferred bulk verification; source bytes and other reduction reasons remain open.
  - [x] Stage a distinct donor-created Section A artwork ordinary-gain reduction: require substantial-completion and undeducted capitalized-cost records, basis claim below FMV, a linked native statement, PDF reason, and Schedule A/Form 1040 reconciliation. Fixtures are authored for deferred bulk verification; source bytes and other creator or Section B reasons remain open.
- [ ] **Form 1116:** complete source-reconciled passive/general baskets, mixed income and countries, deductions, foreign-employer alternative compensation, K-3 combinations, Schedule B carryover vintages, and Schedule C redetermination with affected-year filed returns and amendments. Finish parent/Schedule B PDFs and register a valid Schedule C route or retain an approved rejection. See [Schedule C](docs/mef/ty2025-form1116-schedule-c-gap.md), [main PDF](docs/mef/ty2025-form1116-main-pdf-gap.md), [Schedule B PDF](docs/mef/ty2025-form1116-schedule-b-pdf.md), and [alternative compensation](docs/mef/ty2025-form1116-alternative-compensation-gap.md).
  - [x] Stage a balanced 2025 Schedule C redetermination with unchanged U.S. liability: native and PDF candidates report both payor directions and Part III, while Part IV remains blank. The [bounded route](docs/mef/ty2025-form1116-schedule-c-gap.md) stays unregistered and the current return rejects filing until source, affected-year, current-year, and validation gates are resolved.
  - [x] Bind the staged Schedule C reviewed filed returns and workpapers to the current filer's SSN, require a reviewed taxpayer link for each foreign record, and reject a PDF candidate rendered for a different owner. Actual source identity, affected-year amendment receipt, later-year attributes, and current-year liability joins remain open; export stays blocked.
- [ ] **Form 6251:** finish all still-applicable AMT adjustments, preferences, exemption and phaseout, AMT Form 4952, ISO source, Form 8949 basis, circulation costs, preferential-rate Part III, and signed mixed short-term gains/losses; reconcile Schedule 2 and Form 1040 tax. See [remaining scope](docs/mef/ty2025-form6251-remaining-scope.md), [ISO](docs/mef/ty2025-form6251-iso-source-gap.md), [basis](docs/mef/ty2025-form6251-8949-basis-gap.md), [circulation](docs/mef/ty2025-form6251-circulation-cost-gap.md), and [mixed basis](docs/mef/ty2025-form6251-mixed-basis-net-loss.md).
  - [x] Bind the retained-share Form 3921 ISO spread to distinct identified corporation copies and the taxpayer or joint spouse at native/PDF Form 6251 line 2i export; direct unsourced positive claims reject, while copy bytes and wider ISO cases remain open.
  - [x] Prepare a cent-precision 2025 regular/AMT basis ledger for each retained Form 3921 ISO exercise lot and require native/PDF line 2i export to reconcile it to the issued-copy source. Later-year disposition and accepted-year carryforward remain open.
- [ ] **Form 8962:** complete household/dependent MAGI, policy-month and corrected SLCSP evidence, shared-policy allocation, multiple/overlapping/alternating policies, interstate moves, below-400%-FPL no-APTC paths, self-employed PTC ordering, and all repayment caps. Reconcile each 1095-A month to Schedules 2/3 and Form 1040; reject unsupported policy combinations. See the [dependent MAGI](docs/mef/ty2025-form8962-dependent-magi-gap.md), [policy-month](docs/mef/ty2025-form8962-policy-month-gap.md), [three-policy](docs/mef/ty2025-form8962-three-policy-overlap.md), [alternating](docs/mef/ty2025-form8962-alternating-policy-gap.md), and [interstate](docs/mef/ty2025-form8962-interstate-move-gap.md) notes.
- [ ] **Form 8889 / 5329:** finish owner-specific monthly HSA eligibility, Medicare/mixed months, prior funding, employer-returned code 2 excess, all Form 1099-SA source and exception routes (age 65 and disability), paired-owner excess and carryovers. Reconcile both owners' Form 8889/5329 copies, Schedule 1, Schedule 2, Form 1040, MeF, and PDF. See [paired HSA](docs/mef/ty2025-form8889-paired-hsa-gap.md), [funding](docs/mef/ty2025-form8889-prior-funding-eligibility.md), [code 2](docs/mef/ty2025-form8889-code2-excess-gap.md), [1099-SA](docs/mef/ty2025-form8889-1099sa-source-gap.md), [age 65](docs/mef/ty2025-form8889-age65-exception-gap.md), and [disability](docs/mef/ty2025-form8889-disability-exception-gap.md).
- [ ] **Form 8582:** finish activity-ID provenance, referenced 2024 carryover imports, retained gain character, entire dispositions, active-rental/MFS boundaries, aggregate reconciliation, a durable 2025 ledger and next-year import contract. Verify worksheet Parts I-IX and overflow in filled PDF, plus Schedule E/Form 4835/4797 and Form 1040 joins. See [activity ledger](docs/mef/ty2025-form8582-activity-id-gap.md), [entire gain](docs/mef/ty2025-form8582-entire-overall-gain-gap.md), and [MFS](docs/mef/ty2025-form8582-mfs-boundary.md).
- [ ] **Form 4952:** finish debt/expense tracing, K-1 box 20 code B's permitted deduction destination, royalty and Schedule E ownership beyond the bounded [1099-MISC portfolio case](docs/mef/ty2025-form4952-gap.md), investment-income elections, carryover ledger, and Form 6251 interaction. The bounded box 5/code H partnership K-1 route now checks final filer ownership; it and its mixed 1099-INT and 1099-DIV variants pass full-return local XSD and filled-PDF reviews. Extend full-return source validation to every other retained K-1 combination. Ensure calculation, native document, PDF projectors, and final filer identity use one consistent validated source path. See [main gap](docs/mef/ty2025-form4952-gap.md), [K-1 code B](docs/mef/ty2025-form4952-k1-code-b-gap.md), and [Treasury dividend](docs/mef/ty2025-form4952-treasury-dividend-slice.md).
  - [x] Check final-filer ownership for the bounded partnership K-1 box 5/code H route and its mixed 1099-INT/DIV full returns; prior focused XSD/PDF evidence is recorded in the linked gap notes.
- [ ] **Form 4972:** complete beneficiary/partial-share, NUA, estate/death allocations and combinations, separate spouse elections, multiple 1099-R distributions, eligibility evidence, and the Form 6251/1040 tax join. Keep unsupported combinations blocked until their source records are verified. See the [Form 4972 gap](docs/mef/ty2025-form4972-gap.md).
- [ ] **Form 3800:** extend the registered nine-page parent PDF to every retained business-credit source and reconcile Form 1040 tax. See the [Form 3800 PDF gap](docs/mef/ty2025-form3800-pdf-gap.md).
  - [ ] Join those vintages to authenticated prior returns and source records, Form 8582-CR, Form 3800 Parts I/II/IV/VI, the native `CarryforwardGeneralBusinessCr` computation, the revised-carryforward history statement, native XML, and the printable packet; prove source-to-Form 1040 totals and local XSD/business-rule results.
  - [ ] Cover transfer and passive credits, carryover vintages, mixed and other source credits, row overflow, required external attachments, cross-route archive evidence, business rules, and ATS acceptance.
- [ ] **Form 8835:** extend the bounded filer-owned wind/geothermal route to every retained credit, owner, facility, election, and source combination in the [form audit](docs/mef/ty2025-form1040-form-audit.md). Keep duplicate physical-facility records rejected and verify every native/PDF copy against its source and Form 3800 row.
- [ ] **Forms 8995/8995-A:** finish positive QBI export and all conditional Schedule A/B/C/D paths beyond the bounded two-business Schedule B route, including election, aggregation relationship, RPE statements, owner data, and return-wide QBI totals. See [8995](docs/mef/ty2025-form8995-positive-export-gap.md) and [8995-A](docs/mef/ty2025-form8995a-gap.md).
- [ ] **Form 8990:** obtain authenticated debt tracing and filed-year interest/ATI inputs, reconcile its return-wide ordering, and design a durable accepted-filing carryforward ledger before allowing a positive nonexcepted-interest export. See the [Form 8990 gap](docs/mef/ty2025-form8990-gap.md).
- [ ] **Form 8839:** obtain adoption decree, expense/reimbursement, exclusion, Form 2555, and credit-ordering evidence before allowing a positive adoption-credit filing. See the [Form 8839 gap](docs/mef/ty2025-form8839-gap.md).
- [ ] **Form 7203 / Form 9465 / Schedule J:** complete shareholder debt and other basis paths beyond the bounded stock-only loss; resolve Form 9465 attached electronic authorization and linked filing review before opening its fail-closed route; complete Schedule J fishing attribution and mixed farm/fishing cases beyond its bounded Schedule F-only election. See [7203](docs/mef/ty2025-form7203-stock-loss-gap.md), [9465](docs/mef/ty2025-form9465-filing-boundary.md), and [Schedule J](docs/mef/ty2025-schedule-j-integration-gap.md).
  - [x] Decide Form 9465's TY2025 attached-request export boundary: both MeF and PDF fail closed with an explicit electronic-authorization and linked-review reason. The staged native/PDF projections remain unregistered until that evidence and the deferred filing review are complete.
  - [x] Name the Schedule J Schedule F-only boundary at its actual non-F AGI source and author a fishing Schedule C rejection case; fishing attribution and mixed farm/fishing elections remain open for the deferred batch.
- [ ] **Forms 2210/2210-F, 8801, 172, 461, 4562, 4797, 6252, 7206, 7217, 8829, 8606, 8815, 8915-F:** review their applicable public inputs, computations, source proof, Form 1040 joins, native/PDF documents, and conditional attachments; finish all positive routes or obtain a named fail-closed decision. Use the matching form gap notes under [docs/mef](docs/mef/) and the [form audit](docs/mef/ty2025-form1040-form-audit.md).
- [ ] **Forms 2106, 8853, 8863, 8880, 8886, 8941, 8958, 8959, 8978, 8997, 982, 3115, 4255, 6478, 8621, 8864, 8874, 8911, 965-A, 8582-CR, 8611, 8826:** resolve the per-form unsupported branches, source/owner evidence, PDF parity, and required schedules or statements listed in the [form audit](docs/mef/ty2025-form1040-form-audit.md) and corresponding [gap notes](docs/mef/). Form 8863 now accepts the required public credit-limit worksheet and one sourced AOC case passed local XSD and filled-PDF review; other education-credit paths remain open. Form 8886 needs a per-transaction current-return attachment and a separate initial-year OTSA copy with identical disclosure content under the [IRS instructions](https://www.irs.gov/instructions/i8886); resolve that delivery workflow with its source and native/PDF route. Do not infer whole-form support from a bounded slice.
  - [x] Add a Form 8886 review stop for any single Form 8949/1099-B source disposition showing at least $2 million gross loss before adjustments, in both MeF and PDF preflight; threshold cases are authored for the deferred batch. Other transaction categories, exceptions, attachment, and OTSA delivery remain open.
  - [x] Add Form 8863's public credit-limit worksheet and review one sourced AOC local-XSD/filled-PDF case; other credit branches remain open.
- [ ] **Foreign/entity and special attachments:** resolve applicable Forms 5471, 8858/Schedule M, 1118, trust K-1 backup withholding, section 965, and every other individual-filer root flagged in the [unregistered-root crosswalk](docs/mef/ty2025-unregistered-root-applicability.md), including source copy versus transmitted attachment ownership.
- [ ] **Source/statement exceptions:** authenticate W-2G payer-copy contents; finish Form 1098 source-byte proof, wider cross-loan mortgage limits, cash-out, and points cases beyond the checked [bounded routes](docs/mef/ty2025-form1098-box6-points.md); bind Schedule LEP prior elections and Schedule R physician, income, and benefit evidence to reviewed source bytes and complete full-return review; authenticate Form 8814 issuer records and finish mixed filled-PDF review; authenticate Form 8862 prior IRS notices and complete ODC/AOTC full-return and filled-PDF review; finish Schedule H FICA-only returns, family/under-18 wages, source bytes, and wider state/rate cases; and resolve required signed/byte-bound statements and source copies identified by the [form audit](docs/mef/ty2025-form1040-form-audit.md).
  - [x] Require each withheld W-2G's payer-issued PDF copy in the MeF bundle and compare its SHA-256 with the exact submitted bytes; native source facts and Form 1040 line 25c remain reconciled. Current batch, copy-content authentication, and IRS business-rule review remain open.
  - [x] Write the Form 1098 construction-refinance line 8a and ordinary unreported refinance-points line 8c source routes and their fixtures; current batch and source-byte proof remain open.
  - [x] Add a bounded 2025 early-full-payoff route for ordinary unreported refinance points on Schedule A line 8c, with a referenced payoff statement, consecutive payments through payoff, and same-lender refinances excluded; current batch and payoff-byte proof remain open.
  - [x] Add a bounded mixed qualified-old-debt/main-home-improvement refinance route that allocates unreported interest-like points between immediate and ratable Schedule A line 8c deductions; personal cash-out, cross-loan limits, and current batch remain open.
  - [x] Add a bounded 2024-origin ordinary refinance ledger for 2025 Schedule A line 8c amortization, with referenced filed return/workpaper, prior and current payment records, and remaining-balance checks; historical bytes, wider vintages, and current batch remain open.
  - [x] Add a bounded two-loan Pub. 936 Table 1 interest allocation for a single filer with two full-year post-2017 acquisition loans and twelve sourced balances each; wider debt categories, points, source bytes, and current batch remain open.
  - [x] Correct the bounded Form 8814 direct Form 1040 versus Schedule D child-gain PDF mark and add a mixed-return fixture; current batch and filled-PDF review remain open.
  - [x] Require the child-dividend amount behind Form 1040 line 3c's two Form 8814 PDF marks to appear on both finalized lines 3a and 3b; add an understated-line rejection case. Issuer/source authentication and filled-PDF review remain open.
  - [x] Require each Form 8814 native/PDF filing copy to match a 2025 reviewed child-income packet by child SSN, electing parent SSN, eligibility review, and all used income/adjustment amounts; update source fixtures. This [structured review](docs/mef/ty2025-form8814-source-review.md) is not issuer-byte authentication, and the current batch and mixed filled-PDF review remain open.
  - [x] Write the Form 8862 prior-notice checks, complete-claimant joins, and multi-person PDF continuation; current batch and notice authentication remain open.
  - [x] Bind Form 8862 CTC/ODC and AOTC claims to separate reviewed prior-notice records for the same year, notice, and taxpayer; author full-return ODC and AOTC XSD/PDF routes for the final batch. Notice-copy byte authentication and filled-PDF review remain open.
  - [x] Require a confirmed Schedule LEP request record for each filer and a prior election code and record when cancelling with code 000; native/PDF cases are authored for the deferred batch. Existing two-person filled-output evidence predates this source requirement; IRS rules and ATS remain open.
  - [x] Write Schedule R age-only boxes 1/3/7/8 for single, HOH, QSS, MFJ, and MFS filers with matching source/final-return age facts; full-return review remains open.
  - [x] Correct Schedule R box 6's calculation so the older spouse's $5,000 amount is added before the younger spouse's disability-income cap.
  - [x] Add sourced Schedule R disability boxes 2/4/5/6/9 to native XML and PDF, including line 11, prior-year statement indicator, reviewed retirement/physician facts, and taxable-income reconciliation; bulk validation and full-return review remain open.
  - [x] Require explicit duration and signed physician/VA statement review for each qualifying under-65 Schedule R owner; underlying statement-byte proof remains open.
  - [x] Schedule H FUTA Section B line 17 continuation is already implemented and reviewed: extra state/rate rows print on a supplemental page, reconcile to native MeF and Schedule 2 line 9, and a three-state full return passed local XSD and filled-PDF review. Per-employee payroll sourcing and broader state/rate combinations remain open.
  - [x] Add a [bounded Schedule H FUTA employee ledger](docs/mef/ty2025-schedule-h-futa-payroll.md): every included unrelated employee has a payroll source reference and annual cash wages, and the native/PDF route rejects Section A/B wage totals that differ after each $7,000 cap. Current bulk and filled-PDF review remain open.
  - [x] Reconcile that FUTA ledger's four quarters, current/prior-year $1,000 quarter test, Form W-2 box 2/3/5 values, per-employee $2,800 FICA threshold and $176,100 Social Security base, line A, and aggregate Schedule H FICA/withholding. FICA-only returns, family/under-18 cases, source copies and bytes, and current bulk/PDF review remain open.

## Native MeF and PDF parity

- [ ] Resolve every native document without a corresponding required PDF or supported paper alternative in the [registry parity audit](docs/mef/ty2025-native-pdf-registry-parity.md), especially Form 965-A, Form 8582-CR, and Form 8621. For Form 8582-CR, the official two-page, 51-field blank has been inspected, but the filed line 6 tax-without-passive-income worksheet and activity/year carryforward ledger remain open; see its [PDF gap](docs/mef/ty2025-form8582cr-pdf-gap.md). Extend bounded Form 3800 and Form 8911/Schedule A descriptors to every retained filing branch.
- [ ] Audit every registered PDF descriptor against its canonical TY2025 IRS AcroForm fields, page count, row overflow, owner identity, checkbox semantics, descriptions, statements, document references, and current calculation. Fix stale or missing mappings rather than silently dropping fields.
- [ ] Ensure native XML, PDF, and manifest use the same finalized return graph and prepared form instances; verify repeated owner/form copies and attachment references, including signed Form 8283 and source-issued acknowledgments.
  - [x] Escape source-derived native XML attribute values in the shared serializer and add a punctuation regression case; the combined validation gate remains open.

## Automated and artifact validation

- [ ] Finish implementation and coverage decisions above before the agreed single full-batch gate. Existing focused cases and historical passes are not evidence for the current worktree.
- [ ] Run `deno task test` as the final full batch after the retained routes and scope decisions are complete; record commit, command, tool versions, timestamp, pass/fail/ignored totals, failures, and ignored-test reasons. Fix failures, then rerun the same full command until the release batch passes. The latest complete regression passed 8,951/8,951 on `44282e25` with zero failures; the later `d8281e7c` attempt was intentionally interrupted after the build-first instruction. Implementation and external gates remain open.
- [ ] For every retained positive filing route, generate a full return from a source-backed fixture and validate emitted XML against the checked-in TY2025 IRS schema. Check source-to-calculation-to-Form-1040 totals, required references/attachments, negative and conflicting cases, and IRS business rules separately from structural XSD success.
- [ ] Generate the sixty prepared synthetic filled-PDF cases through the real graph and PDF builder as described in the [validation batch](docs/mef/ty2025-form1040-validation-batch.md); render and inspect every page, mark checkboxes/amounts/owner identity/page order/continuations, and add cases for each uncovered descriptor or branch.
- [ ] Compare each filled PDF to its source, calculated pending data, native XML, and Form 1040 totals. Retain review artifacts and record each discrepancy and fix; blank templates and ATS source PDFs do not count as filled-output review.

## IRS ATS and delivery

- [ ] Complete the Publication 1436 Form 1040 ATS scenario matrix, source-backed expected outputs, required supporting forms and attachments, and scenario-specific assertions in [ATS preparation](docs/ats/ty2025.md). Resolve the known Scenario 1 Form 5695 door-cost conflict and Scenario 8 printed QCD mark before submission.
- [ ] Obtain and verify the issued ATS certificate, enrolled ASID/Test ETIN, current IRS ATS endpoint/WSDL/trust package, and authorized transmission credentials. Do not put private keys or certificate secrets in the repository.
- [ ] Submit each required Form 1040-family ATS scenario only after its source, XML, PDF, and package checks pass; retain transmitted package, IRS acknowledgment, acceptance/rejection details, and repair/retest evidence. No local test or XSD pass substitutes for an accepted IRS acknowledgment.
- [ ] Review the completed diff, user-approved scope decisions, security/privacy implications, and test/ATS evidence; then update draft PR #56 with a precise description and linked test evidence. Do not merge merely because code is written.
- [ ] After review and required acceptance gates, merge the PR, release a new version, verify the published artifact/version and release notes, and close or update the linked issues with a short human explanation and thanks.
