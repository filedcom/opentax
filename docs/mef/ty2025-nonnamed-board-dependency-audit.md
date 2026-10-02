# TY2025 nonnamed product-board dependency audit

Status: 2026-10-02. This maps all **32 open checklist rows outside the
"Named tax-form gaps" section** of [`product_board.md`](../../product_board.md):
29 top-level rows and three nested rows. The board has 52 open rows in all;
the other 20 are deferred named-form parents. Its completed ledger records 991
bounded items, without closing these parents. This is a work queue, not a
filing-readiness claim. A read-only recount of `ALL_MEF_FORMS`,
`ALL_PDF_FORMS`, and `pdfReviewFixtures` on 2026-10-02 (the same inputs used by
`scripts/plan-ty2025-pdf-review.ts`) found 148 native descriptors, 115 PDF
descriptors, and 178 source fixtures covering 84 of 112 unique PDF keys; the
other 28 keys map to deferred named
families. Those are inventory and preparation counts, not end-to-end passes.
The latest recorded full command reached 10,736 passes and 147 failures at
`f1820bca`; this is a diagnostic failure, not a full-suite pass.

**Key.** `I` = work that can advance without a new product decision or IRS ATS
credentials; `D` = the user's workflow/evidence/scope decision is needed before
closing the row; `A` = current IRS ATS service package, credentials,
clarification, or accepted acknowledgment is needed; `N` = part of the row
depends on the separately deferred named-form section; `V` = the agreed bulk,
XML, filled-PDF, or release verification gate. Mixed rows carry every relevant
key. An `I` entry identifies a next slice, not proof that the whole row can
close during the nonnamed phase.

| Board row | Class | Current evidence and concrete next action or dependency |
| --- | --- | --- |
| S1 · Form 1040-family release completeness | I, D, A, N, V | The [registered-form audit](ty2025-form1040-form-audit.md), [root census](ty2025-xsd-document-root-census.md), [PDF parity audit](ty2025-native-pdf-registry-parity.md), and offline A2A package inventory establish partial coverage. Finish independently reachable Form 1040/packet joins; the requested *whole-family release* still needs the pending workflow boundaries, named attachments, full validation, and accepted ATS evidence. |
| S2 · Every entered filing claim | I, D, N, V | The [coverage queue](ty2025-form1040-coverage-decisions.md) and [root crosswalk](ty2025-unregistered-root-applicability.md) distinguish guarded, staged, and absent routes. Continue eliminating unguarded typed-input leaks and record an explicit disposition for every root; a permanent exclusion needs the user's approval, and applicable named-form routes remain deferred. |
| S3 · Every retained positive source-to-packet chain | I, D, N, V | Focused source/owner and assembly guards exist, but the [validation batch](ty2025-form1040-validation-batch.md) has not exercised every positive route. Build source-to-final-return fixtures and negative/replay checks for independently implemented paths now; full coverage also follows named-form completion and evidence policy. |
| C1 · Each registered MeF descriptor disposition | I, D, N, V | The [form audit](ty2025-form1040-form-audit.md) statically accounts for 148/148 descriptors while retaining unsupported branches. Reconcile triggers and evidence row by row; rows whose forms are in the deferred section cannot close in this phase, and any exclusion needs an approved boundary. |
| C2 · All 211 schema roots | I, D, N, V | The [root census](ty2025-xsd-document-root-census.md) and [crosswalk](ty2025-unregistered-root-applicability.md) are inventories, not final applicability decisions. Continue filing-trigger/source-owner classification for unregistered and literal-only roots; current-return versus separate-workflow decisions and named individual attachments remain open. |
| C3 · Audit/crosswalk/registry reconciliation | I, D, N, V | The [conditional-schedule audit](ty2025-conditional-schedule-applicability.md) has four bounded 8995-A companions and one blocked 1116 Schedule C; the [parity audit](ty2025-native-pdf-registry-parity.md) has 148 native and 115 PDF descriptors. Re-run exact registry/count/trigger reconciliation at implementation freeze, then update dispositions after decisions and named routes. |
| C4 · Separate current-return workflows | D, N | The [coverage queue](ty2025-form1040-coverage-decisions.md) leaves 1040-X, payment/account roots, RRB/SSA-1042-S recipient copies, and optional 4547/9000 channels undecided. Preserve any current-1040 tax effects while obtaining a per-root product boundary; coding a blanket exclusion would decide the product question implicitly. |
| C5 · Entity-associated filer ownership | I, D, N | The [crosswalk](ty2025-unregistered-root-applicability.md) retains a strict category-1 8858 source that blocks export, a staged 5471 path, and trust K-1 withholding review. Classify individual versus entity attachment for each trigger, obtain the intended product boundary, then build individual documents in the named-form phase where required. |
| C6 · Source-only and sparse maps | I, D, N, V | The [source-only audit](ty2025-source-only-and-sparse-map-gap.md) has nine bounded registrations, one guarded Form 9465, and ten rows with open source/scope decisions. Its concrete mismatches include final-return capacity for 8880 and per-activity 6198 inputs. Keep those forms in the named phase; an independent audit can still catch any unguarded source route and reconcile registered counts. |
| C7 · Return-wide ordering/reconciliation | I, N, V | Form 1040/Schedules 1, 1-A, 2, and 3 have focused replay guards, but no exhaustive multi-copy/negative/amended-source matrix is recorded. Add cross-schedule mixed-owner and conflict fixtures for the retained nonnamed routes; named credit, limitation, and carryover interactions remain separately open. |
| C8 · Complex-evidence standard | D, I, N | The [coverage queue](ty2025-form1040-coverage-decisions.md) and individual gap notes distinguish structured review references from issuer/signed/prior-return bytes. The user must choose the acceptable filing standard; then apply it consistently to retained external evidence and ATS fixtures. Byte-review plumbing can advance independently, but cannot settle the standard. |
| R1 · Form 1040 core-source audit | I, D, N, V | Current board summary records source-owner guards, deposit/payment reconciliation, Schedule joins, and digital-asset checks. Recent bounded source replay covers line 1b household wages, line 1c Form 4137 tips, line 1g Form 8919 wages, line 2b Schedule B interest, and multiple withholding sources. Probe remaining income/refund/amount-owed combinations against actual 2025 instructions, with matched source, native, and PDF output; retirement, credits, foreign/entity and other named attachments remain dependencies. |
| R1a · Line 4c(1) wider IRA rollovers | I, D, V | The [IRA eligibility gap](ty2025-ira-rollover-eligibility-gap.md) says death-coded spouse-beneficiary claims remain guarded and ordinary code-7 payments may contain an RMD. A real positive route needs issued payer/custodian records, beneficiary rights, 2025 RMD calculation, receiving-account deposit, and prior-year facts. Implement that complete source model and its line 4c/native/PDF join only under the selected evidence standard; a code-only mark would be unsafe. |
| R2 · Source classification and ownership | I, D, N, V | The current board summary records recipient/replay guards across W-2, 1099 series, 1098, and broker rows; statutory W-2 wages now require a linked Schedule C business. The [form audit](ty2025-form1040-form-audit.md) still lists source-specific exceptions. Probe duplicate/correction-lineage, source-byte, and ambiguous-owner cases for retained nonnamed joins; K-1, 1095-A, 3921, and specialized prior-return consequences overlap deferred forms. |
| R3 · Schedules 1/1-A/2/3 and EIC | I, D, N, V | The [Schedule 1-A](ty2025-schedule1a-gap.md) and [line 8z](ty2025-schedule1-line8z-source-gap.md) notes document bounded routes with remaining source variants, authentication, and full-packet review. Continue directly sourced line/owner/statement/PDF cases; some Schedule 2/3 amounts require deferred named forms. A two-copy 1099-G state-tax-refund review remains closed in the ordinary non-AMT path: its source-only Form 6251 line 2b currently attempts unsupported final serialization even when no AMT is due. Reconcile that named Form 6251 emission contract before opening the refund route. |
| R3a · 5471/8992 inclusions and legacy 8873/8915-D | D, N, V | The [crosswalk](ty2025-unregistered-root-applicability.md) says Category 5a income joins are staged, but required 5471 companions keep final export closed. Form 5471/8992 completion belongs to deferred foreign/entity attachments; classify legacy forms in the coverage queue before changing their filing boundary. |
| R3b · Passive Worksheet 1 lines 11–13 | I, N, V | The item needs a final investment-income limit using Schedule E, Form 8582, K-1, and Form 4797 character and loss data. The [conditional-schedule audit](ty2025-conditional-schedule-applicability.md) confirms positive 8995-A loss variants remain narrow. Build source-character joins and combined-threshold tests; final closure depends on deferred Form 8582/K-1/4797 paths. |
| R4 · Schedule C/F/4835/J/E joins | I, D, N, V | Bounded Schedule C/F and PDF routes exist, but at-risk/passive/QBI and mixed activity ownership remain open. The [source-only audit](ty2025-source-only-and-sparse-map-gap.md) flags per-activity Form 6198 source limits; the named section owns Form 4835/Schedule J/8582/QBI completion. Continue independent Schedule C/F provenance and PDF cross-checks. |
| R5 · Assembly, references, archives, and AcroForm errors | I, V | Prepared-bundle digests, document IDs/references, BinaryAttachment order, PDF envelopes, and archived Send replay now have focused guards. Inner and outer A2A ZIP checks reject local/central metadata drift and CRCs that disagree with decoded payload bytes; valid data-descriptor ZIPs remain accepted in focused tests. Probe any further concrete archive/field-map mismatch and final graph reconciliation, then run complete source-to-package validation; IRS transport is tracked under A2/A3 below. |
| P1 · Native document/PDF parity | I, N, V | The [parity audit](ty2025-native-pdf-registry-parity.md) finds one missing parent PDF (`form8621`) and distinguishes native-only statements and payer copies. The missing parent and wider 965-A/4255/8611/8826/8854/8582-CR/3800/8911 branches are deferred named forms; independently reconcile all other registered source-triggered packets. |
| P2 · Every registered PDF descriptor | I, N, V | The [validation batch](ty2025-form1040-validation-batch.md) plans 178 fixtures, covers 84/112 PDF keys, and classifies the other 28 as deferred named families. The current two-case review is insufficient: render and inspect each nondeferred key/copy/overflow branch and compare canonical fields, owners, and page origins. Named-key coverage follows its implementation phase. |
| P3 · One finalized graph/instance set | I, N, V | Shared native/PDF preflight and prepared manifest replay exist. Add repeated-owner/form/source-attachment cases and compare exact instance and reference sets through XML, PDF and package; signed Form 8283 and other named source-issued attachments remain deferred. |
| V1 · Implementation and decisions before bulk gate | I, D, N | Continue nonnamed implementation and obtain workflow/evidence dispositions; do not infer a phase pass from historical tests. The 20 named parents are deferred, so record their explicit boundary in the phase result instead of silently treating them as supported. |
| V2 · Full `deno task test` gate | V, I, N | The `f1820bca` full command reached 10,736/147. Fix remaining nonnamed regressions, then rerun the same command; deferred named-form failures and incomplete product decisions still prevent a phase pass. Record commit, versions, time, totals, failures, and ignored reasons for each run. |
| V3 · Source-backed full returns and XSD | I, N, V | The [validation batch](ty2025-form1040-validation-batch.md) provides a fixture/manifest path and locally cached TY2025 schema but no exhaustive positive-route result. Generate a complete return and conflicting negatives for every retained nonnamed route; separately verify source totals, references and business rules. Repeat for named routes when implemented. |
| V4 · 178 filled-PDF cases | I, N, V | The planner has 178 sources and 84/112 keys; full generation, per-page render, and human checklist are still open. Run the batch after implementation freeze, inspect every generated page, and expand fixtures as nondeferred branches demand; 28 named-family keys are a later phase dependency. |
| V5 · PDF/source/XML comparison | I, N, V | The manifest checker can replay source JSON, graph, native XML, artifact hashes, page origins and exact review focus, but cannot make a human visual judgment. Complete the per-page source/pending/XML/Form-1040 comparison and retain discrepancy/fix records; named forms extend the required packet set. |
| A1 · ATS scenario matrix | I, A, N, V | [ATS preparation](../ats/ty2025.md) enumerates 15 scenario PDFs and partial facts, with eight Form 1040 cases; none is a verified complete scenario. The Scenario 3 inventory now correctly identifies its 1099-R/partial Schedule F input, blank Form 1040 status and totals, absent Schedule D transactions, and absent Form 4835 activity identity. Add bounded assertions only where source facts suffice; Scenario 1 door cost and Scenario 8 QCD mark need IRS clarification. Required named attachments and full validation remain dependencies. |
| A2 · ATS credentials/service package | A | [ATS preparation](../ats/ty2025.md) records no confirmed issued certificate, enrolled ASID/Test ETIN, current endpoint/WSDL/trust package, or operator authorization in inspected metadata. Obtain and verify these outside the repository; offline ZIP construction does not establish the A2A service contract. |
| A3 · ATS transmission and acknowledgments | A, I, N, V | The repo builds offline packages and an opaque local evidence journal, not a validated signed SOAP/MTOM client. After the IRS service package and credentials are available, implement/authenticate transport and response correlation, then submit validated scenarios and retain accepted acknowledgments. This also depends on required form routes and packet checks. |
| A4 · Filing-ready review | D, A, N, V | Review the complete diff, explicit scope/evidence decisions, privacy/security handling, manual PDF packet, passing bulk/visual checks, and IRS acceptance. PR mergeability alone does not close this gate. |
| A5 · Filing-ready release and linked issues | A, D, N, V | The [release artifact smoke plan](../release-artifact-smoke.md) prepares a proposed v2.0.6 and binary/checksum checks; publication is still gated by A4 and required IRS acceptance. Then tag/publish, download-smoke every artifact, verify notes, and update linked issues. |

## Immediate independent queue

1. Before implementation freeze, finish a bounded audit of **retained
   nonnamed** source joins under R1/R2/R3/R4: positive, zero, conflict,
   duplicate/corrected-copy, joint-owner, and repeated-copy combinations.
   Implement a gap only after a source-backed fixture proves it; line 1b,
   line 1c, statutory W-2 linkage, and the recently checked ZIP CRC paths are
   completed slices, not outstanding implementation tasks. The board does not
   currently identify another source-complete standalone tax route ready to
   code without a product/evidence decision.
2. Inspect the registered nondeferred PDF field/page maps and assembled
   source-to-XML/PDF/package instances under R5/P2/P3. Fix a demonstrable
   dropped field, wrong owner, reference, attachment, or archive byte path if
   found. The 178 fixtures and 84 covered keys are a review plan; full
   generation, visual inspection, and complete positive-route validation are
   **V** gates after implementation freeze, not existing passes.
3. At freeze, reconcile all 148 native descriptors, 115 PDF descriptors, 211
   IRS schema roots, 32 native supporting rows, and the 178/84/112/28 PDF
   fixture/key counts against the form audit, root crosswalk, conditional
   schedules, decision queue, and live registries. Record every unresolved
   trigger and unsupported path; do not turn a static count into a support
   claim.
4. Obtain user decisions for C4 separate workflows and C8 external evidence,
   plus any permanent fail-closed exclusion under S2/C1/C2. Keep the 20
   named-form parents and their conditional attachments in the following
   implementation phase. Obtain the IRS ATS service package, enrollment,
   scenario clarification, and eventual accepted acknowledgments for A1–A3
   separately. The full command, XSD, filled-PDF review, and release remain
   V/A gates after their prerequisites.

No independent source-complete positive tax route remains specified by these
32 open rows alone. The immediately executable work is targeted cross-route
auditing, fixing only proven discrepancies, and making the inventories ready
for the agreed bulk gate; this does not declare the nonnamed phase complete.
