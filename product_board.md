# TY2025 Form 1040 product TODO

## Current checkpoint (2026-09-29)

This is an open release gate, not a list of completed forms. The current source
registries contain 123 native MeF descriptors and 86 PDF descriptors; the
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

The 2026-09-29 moving-worktree diagnostic `deno task test` run finished with
8,609 passed and 205 failed in 11m18s. It is not the agreed fixed-commit
release gate. A subsequent focused Form 8615 end-to-end rerun passed 4/4 after
the synthetic Schedule B foreign-account and trust answers were supplied and
its $650 single taxable-income expectation was aligned with the official 2025
IRS Tax Table ($66).

An earlier 2026-09-29 diagnostic `deno task test` run on the moving worktree
reported 8,535 passed and 277 failed, improved from 8,453/348 in the earlier
diagnostic. Neither is a release-gate pass; the full run must be repeated on a
fixed commit after the route work is complete. All eleven
prepared synthetic returns now generate filled PDFs through the real graph and
builder: 57 pages total, with PDFs, source/pending JSON, page counts, and hashes
retained with source/pending JSON and native XML under
`.state/research/ty2025-filled-pdf-review/2026-09-29-v3/`. All eleven native
returns generated from those fixtures validate against TY2025 v5.4
`Return1040.xsd`; the 57 regenerated PDF pages are pixel-identical at 65 dpi
to the previously reviewed batch.
Contact-sheet review found and led to fixes for Schedule 1 and Schedule 2
identity fields; the current Schedule 1 rerender shows both fields. The rental
case now prints its suspended loss from the same Form 8582 allocation used by
native MeF. The detailed source-to-XML comparison for every page and descriptor,
additional route fixtures, and the full release batch remain open. The
profitable Schedule C case reaches Form 8995 XML and PDF with a sourced
half-SE-tax QBI reduction, but its broader support gate remains open. The
current full-return XSD file passes 16 of 18 cases. Its remaining ATS Scenario
2 and 12 cases stop on missing Form 8283 classification and Form 8995 QBI
source facts, respectively; neither is a schema pass or an approved exclusion.
The aggregate-only Form 2441 input now fails during MeF export instead of
leaving a Schedule 3 credit without its required Form 2441 document; its 15
focused MeF/XSD tests pass. A standalone Form 3800 current-year row fixture
now uses XSD-valid document IDs and passes all eight tests in its file.

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
- [ ] **Form 3800:** finish the nine-page parent PDF route using the native prepared document/instance IDs and credit attachments; reconcile eligible business-credit sources and Form 1040 tax. Register the descriptor only after complete source-to-output and PDF coverage. See the [Form 3800 PDF gap](docs/mef/ty2025-form3800-pdf-gap.md).
- [ ] **Forms 8995/8995-A:** finish positive QBI export and all conditional Schedule A/B/C/D paths beyond the bounded two-business Schedule B route, including election, aggregation relationship, RPE statements, owner data, and return-wide QBI totals. See [8995](docs/mef/ty2025-form8995-positive-export-gap.md) and [8995-A](docs/mef/ty2025-form8995a-gap.md).
- [ ] **Form 8990:** obtain authenticated debt tracing and filed-year interest/ATI inputs, reconcile its return-wide ordering, and design a durable accepted-filing carryforward ledger before allowing a positive nonexcepted-interest export. See the [Form 8990 gap](docs/mef/ty2025-form8990-gap.md).
- [ ] **Form 8839:** obtain adoption decree, expense/reimbursement, exclusion, Form 2555, and credit-ordering evidence before allowing a positive adoption-credit filing. See the [Form 8839 gap](docs/mef/ty2025-form8839-gap.md).
- [ ] **Form 7203 / Form 9465 / Schedule J:** complete shareholder debt and other basis paths beyond the bounded stock-only loss; decide and implement the installment-agreement filing boundary; complete Schedule J beyond its bounded Schedule F-only election where applicable. See [7203](docs/mef/ty2025-form7203-stock-loss-gap.md), [9465](docs/mef/ty2025-form9465-filing-boundary.md), and [Schedule J](docs/mef/ty2025-schedule-j-integration-gap.md).
- [ ] **Forms 2210/2210-F, 8801, 172, 461, 4562, 4797, 6252, 7206, 7217, 8829, 8606, 8815, 8915-F:** review their applicable public inputs, computations, source proof, Form 1040 joins, native/PDF documents, and conditional attachments; finish all positive routes or obtain a named fail-closed decision. Use the matching form gap notes under [docs/mef](docs/mef/) and the [form audit](docs/mef/ty2025-form1040-form-audit.md).
- [ ] **Forms 2106, 8853, 8863, 8880, 8886, 8941, 8958, 8959, 8978, 8997, 982, 3115, 4255, 6478, 8621, 8835, 8864, 8874, 8911, 965-A, 8582-CR, 8611, 8826:** resolve the per-form unsupported branches, source/owner evidence, PDF parity, and required schedules or statements listed in the [form audit](docs/mef/ty2025-form1040-form-audit.md) and corresponding [gap notes](docs/mef/). Do not infer whole-form support from a bounded slice.
- [ ] **Foreign/entity and special attachments:** resolve applicable Forms 5471, 8858/Schedule M, 1118, trust K-1 backup withholding, section 965, and every other individual-filer root flagged in the [unregistered-root crosswalk](docs/mef/ty2025-unregistered-root-applicability.md), including source copy versus transmitted attachment ownership.
- [ ] **Source/statement exceptions:** finish W-2G withholding attachments, Form 1098 box 6 points, Schedule LEP/R, Form 8814 child-income notation, Form 8862 credit-reinstatement links, Schedule H FUTA continuation, and any required signed/byte-bound statements and source copies identified by the [form audit](docs/mef/ty2025-form1040-form-audit.md).

## Native MeF and PDF parity

- [ ] Resolve every native document without a corresponding required PDF or supported paper alternative in the [registry parity audit](docs/mef/ty2025-native-pdf-registry-parity.md), especially Form 3800, Form 8911/Schedule A, Form 965-A, Form 8582-CR, and Form 8621.
- [ ] Audit every registered PDF descriptor against its canonical TY2025 IRS AcroForm fields, page count, row overflow, owner identity, checkbox semantics, descriptions, statements, document references, and current calculation. Fix stale or missing mappings rather than silently dropping fields.
- [ ] Ensure native XML, PDF, and manifest use the same finalized return graph and prepared form instances; verify repeated owner/form copies and attachment references, including signed Form 8283 and source-issued acknowledgments.

## Automated and artifact validation

- [ ] Finish implementation and coverage decisions above before the agreed single full-batch gate. Existing focused cases and historical passes are not evidence for the current worktree.
- [x] Confirm Deno, `xmllint`, `pdftoppm`, and `pdfinfo` are available. Provision and verify the TY2025 v5.4 `Return1040.xsd` / `ReturnData1040.xsd` bundle under `.state/research/docs/`; it is Git-ignored, not checked in. On 2026-09-29, Deno 2.7.7, libxml 2.9.13, and Poppler 26.03.0 were present with both schema files. A filtered MeF Schedule 2 XSD test and a filtered full-return Single W-2 XSD test each ran and passed (1 pass, 0 ignored per command), proving both test files used the local `Return1040.xsd` bundle. This checks the preflight only; the full schema matrix remains open.
- [ ] Run `deno task test` once as the initial full batch; record commit, command, tool versions, timestamp, pass/fail/ignored totals, failures, and ignored-test reasons. Fix failures, then rerun the same full command until the final batch passes.
- [x] Run the live canonical-PDF field-name checks in the normal test suite. On 2026-09-29, after correcting the Schedule 3 line 13a AcroForm path, `deno test --allow-read --allow-net=www.irs.gov --filter 'all mapped pdfField names exist in real IRS PDF' forms/f1040/2025/pdf/forms/all-descriptors.test.ts` passed all 86 checks. The full descriptor file was rerun with the repository test permissions and passed 605/605 checks, including the pinned-revision checks that had failed in the earlier diagnostic batch. This proves mapped field names exist in the referenced IRS PDFs; filled-output visual review remains a separate gate below.
- [ ] For every retained positive filing route, generate a full return from a source-backed fixture and validate emitted XML against the checked-in TY2025 IRS schema. Check source-to-calculation-to-Form-1040 totals, required references/attachments, negative and conflicting cases, and IRS business rules separately from structural XSD success.
- [ ] Generate the eleven prepared synthetic filled-PDF cases through the real graph and PDF builder as described in the [validation batch](docs/mef/ty2025-form1040-validation-batch.md); render and inspect every page, mark checkboxes/amounts/owner identity/page order/continuations, and add cases for each uncovered descriptor or branch.
- [ ] Compare each filled PDF to its source, calculated pending data, native XML, and Form 1040 totals. Retain review artifacts and record each discrepancy and fix; blank templates and ATS source PDFs do not count as filled-output review.

## IRS ATS and delivery

- [ ] Complete the Publication 1436 Form 1040 ATS scenario matrix, source-backed expected outputs, required supporting forms and attachments, and scenario-specific assertions in [ATS preparation](docs/ats/ty2025.md). Resolve the known Scenario 1 Form 5695 door-cost conflict and rerun the Scenario 8 code-G rollover/line 5c path.
- [ ] Obtain and verify the issued ATS certificate, enrolled ASID/Test ETIN, current IRS ATS endpoint/WSDL/trust package, and authorized transmission credentials. Do not put private keys or certificate secrets in the repository.
- [ ] Submit each required Form 1040-family ATS scenario only after its source, XML, PDF, and package checks pass; retain transmitted package, IRS acknowledgment, acceptance/rejection details, and repair/retest evidence. No local test or XSD pass substitutes for an accepted IRS acknowledgment.
- [ ] Review the completed diff, user-approved scope decisions, security/privacy implications, and test/ATS evidence; then create a PR with a precise description and linked test evidence. Do not merge merely because code is written.
- [ ] After review and required acceptance gates, merge the PR, release a new version, verify the published artifact/version and release notes, and close or update the linked issues with a short human explanation and thanks.
