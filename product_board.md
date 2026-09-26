# TY2025 MeF product board

Last reviewed: 2026-09-26. This board tracks the current worktree, not a
released product. A registered XML builder or a passing XSD test is not proof
that every tax situation for that form is correct.

## Agreed scope

The user selected the **TY2025 Form 1040 family only** for this board. The
completion gate covers the Form 1040 return and its in-scope schedules, forms,
source documents, and supporting statements. Separate 1040-NR, 1040-SS, and Form
4868 return exporters and their ATS scenarios are out of scope here. Their
source-fact inventory remains in `docs/ats/ty2025.md` as reference material, not
as an unfinished gate on this board. This decision does not waive any required
Form 1040 attachment or business rule.

## Current status

**Phase: implementation and correctness audit. Release status: blocked.** The
TY2025 Form 1040 calculation and MeF export changes are saved on the pushed
`codex/ty2025-form1040-board-wip-20260926` branch. Implementation continues
there. No PR, merge, deployment, IRS ATS transmission, or ATS acknowledgment is
recorded for this work.

The latest completed full test run is **6,596 passed, 0 failed, 48 ignored**
(`deno task test`, 2026-09-26, before the later multi-policy line 10 and
dependent-MAGI changes). The user asked for the remaining implementation to be
built before the next full-batch test, so that run is only a historical
baseline. The 48 ignored tests are disabled live-IRS-PDF field-name checks (one
per registered PDF descriptor). This remains a partial coverage result, not a
release gate or ATS acceptance.

The current build pass also adds Form 8962 Part IV Situation 1 agreed and
no-agreement allocations, Situation 3 no-APTC allocations, and Situation 4
agreed and no-agreement allocations. Source-to-XML cases are written but not
yet run. Multiple nonoverlapping shared allocation periods on one policy are
also coded, with source-to-XSD cases written but unrun. Mixed shared and
family-only periods on one policy now use explicit coverage-family SLCSP inputs
and emit only the shared-period Part IV rows. The build pass also lifts the
electronic Part IV row limit to the IRS schema's 99 groups and marks line 34 No
after four rows. This is an XML-schema inference for the extra rows, not IRS ATS
acceptance; paper/PDF overflow presentation remains open.
This does not change the historical full-test status above.

## Status definitions

| Status                    | Meaning                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Verified slice            | A named flow has calculation tests and local TY2025v5.4 IRS XSD validation. This does not imply whole-form or ATS approval. |
| Implemented, audit needed | Code exists, but complete IRS instructions, schema fields, source routing, and edge cases have not been checked as a unit.  |
| Known gap                 | A missing or explicitly rejected supported path is identified.                                                              |
| Scope decision            | The requested product boundary is not yet explicit.                                                                         |
| Release gate              | Required verification or integration step has not passed on the current worktree.                                           |

## Workstreams

| ID       | Workstream                               | Current state                                                                                                                                                                                                                                                                                                                                                            | Next evidence required                                                                                                                                                                                                                            |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-01   | Authoritative MeF coverage inventory     | **In progress.** `docs/mef/coverage-inventory.md` now lists every registered Form 1040 serializer and the confirmed missing Scenario 4 documents, while marking most coverage evidence unaudited.                                                                                                                                                                        | Compare all in-scope IRS instructions and ReturnData1040 documents with product requirements; fill each row with actual input, calculation, serializer, attachment, local XSD, end-to-end, ATS/business-rule evidence and unsupported conditions. |
| SCOPE-01 | Product boundary                         | **Decided.** TY2025 Form 1040 family only. Standalone 1040-NR, 1040-SS, and 4868 returns are excluded from this board.                                                                                                                                                                                                                                                   | Keep all Form 1040 schedules, attachments, source reconciliation, XML, business rules, and applicable ATS scenarios in the inventory and acceptance gate.                                                                                         |
| CORE-01  | Return assembly and submission package   | **Implemented, audit needed.** Builder orders documents, links references, validates PDFs, and creates return/manifest archives and an A2A request package.                                                                                                                                                                                                              | Review against current IRS packaging and business rules; validate the complete SOAP/certificate path and receive an ATS acknowledgment. Package construction alone is not transmission readiness.                                                 |
| TAX-01   | Form 1040 calculation-to-XML consistency | **Implemented, audit needed.** Broad changes cover identity, wages, dependents, credits, income, deductions, and schedules.                                                                                                                                                                                                                                              | Reconcile each line with its source calculation and IRS instructions, including multi-source and taxpayer/spouse cases.                                                                                                                           |
| FARM-01  | Schedule F and Form 4835                 | **Verified slices.** Cash/accrual Schedule F, inventory, source-form reconciliation, CCC and crop-insurance statements, at-risk and passive farm flows have calculation and XSD cases.                                                                                                                                                                                   | Compare remaining farm instructions and all Part III elections/attachments to the coverage matrix; build complete ATS return fixtures where applicable.                                                                                           |
| RENT-01  | Schedule E and Form 8582                 | **Verified slices.** Rental, royalty, passive-loss allocation, prior losses, at-risk interaction, and XSD cases exist.                                                                                                                                                                                                                                                   | Audit every activity class, carryforward, and prior-year participation condition; resolve explicitly unsupported paths.                                                                                                                           |
| TIPS-01  | Form 4137                                | **Verified slice; audit needed.** Employer rows, taxpayer/spouse separation, W-2 allocation reconciliation, FICA calculation, XML, local XSD, and end-to-end routing pass, as does the current full suite.                                                                                                                                                               | Review rounding and W-2 reconciliation against IRS instructions, validate spouse/combined-return XSD cases, and audit all required attachments/business rules.                                                                                    |
| ATS-01   | TY2025 Form 1040 ATS scenarios           | **Partial facts only.** Eight Form 1040 scenario PDFs are inventoried, but there is no complete return fixture or ATS acknowledgment. Scenario 12 now has a passing calculation reconciliation: the cents path rounds to $3,437, while the IRS sample rounds its component lines to $3,438. Seven other return-type scenarios are reference-only under the agreed scope. | Build each complete in-scope scenario with an explicit, consistent rounding convention, compare printed/expected results, pass local XSD and business rules, then transmit and record ATS acknowledgments when credentials are available.         |
| QA-01    | Current-worktree regression gate         | **Historical partial pass.** The last `deno task test` passed 6,596/0/48 before subsequent implementation. The user requested build-first, then one full-batch test and fix cycle.                                                                                                                                                                                       | Finish the implementation pass, then run the full batch, review the 48 ignored live-PDF checks, fix failures, and rerun the full batch.                                                                                                           |
| SHIP-01  | Review and delivery                      | **Open.** WIP branch pushed; no PR for this body of work.                                                                                                                                                                                                                                                                                                                | Review the diff in coherent slices, check unrelated/user changes, commit, create PR(s), obtain review, and only then plan merge/release.                                                                                                          |

## Explicit gaps and decisions to track

| ID             | Area                                         | Evidence / question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Exit condition                                                                                                                                                                                          |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GAP-1116       | Form 1116                                    | Passive and general basket MeF builders exist. The current build pass adds source explanations and linked native `ForeignIncmRelatedExpensesStmt` documents for Part I line 2 direct expenses from Form 1116 inputs and K-1 feeders; its local XSD case is written but unrun. Section 951A, foreign branch, section 901(j), treaty-resourced, and lump-sum categories need category-specific source facts and rules, not just indicator tags. Carryovers, other-deduction statements, and special tax adjustments remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Build category-specific rules and remaining statements, then verify full-batch calculation, XSD, and IRS business rules.                                                                                |
| GAP-6251       | Form 6251                                    | The build pass now calculates TY2025 Part III lines 12–40 and MeF fields from both the Qualified Dividends and Capital Gain Tax Worksheet and the Schedule D Tax Worksheet source amounts, and replaces the simplified Form 1040 line 16 special-gain tax path with the 2025 Schedule D Tax Worksheet line order; these paths are unrun. The line 10 comparison now receives Form 1040 line 16, including preferential-rate tax. The build pass also routes signed 2025 line 1b, moves Form 1040 line 12 to the selected deduction branch and suppresses Schedule A XML when standard deduction wins, and applies the matching standard-versus-itemized line 2a addback, keeps evaluating AMT when regular taxable income is zero, and serializes calculated Part I/II amounts when AMT is due or a personal Form 8911 credit requires filing; cases are written but unrun. The build pass also carries separately refigured AMT Form 4952 line 4g into Part III and the signed regular-versus-AMT investment-interest difference into line 2c. Broader AMT-basis capital-gain refiguring, Form 2555, other line 10 adjustments, and other credit-driven filing triggers remain open. | Part III is calculated from source facts and reconciled with AMT and MeF XML for capital-gain cases.                                                                                                    |
| GAP-S2         | 2025 Schedule 2 line structure               | The code previously labeled AMT as line 1 and Form 8962 excess APTC repayment as line 2, and omitted the latter from MeF. The current worktree uses line 2 for AMT and line 1a for excess APTC. The negative Form 8978 build pass also computes a chapter-1-tax offset, emits signed line 17z with a linked `AnyOtherTaxesStatement`, and adjusts line 21 and Form 1040 line 23. Those new cases are written but unrun. The remaining Schedule 2 line map, chapter 1 classification, and source-specific statements are not audited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Pass source-to-return-to-MeF cases for Form 8962, AMT, and Form 8978; audit every other 2025 Schedule 2 line and chapter 1 classification against IRS instructions and schema, then run the full suite. |
| GAP-8962       | Form 8962 2025 MeF and calculation           | **Verified slices, whole form open.** Earlier source-backed Table 2/Table 5 and source-to-XSD cases cover named annual, monthly, MAGI, and same-state SLCSP flows. The current build pass adds separate taxpayer/dependent modified AGI, required-filing facts for dependents, a line 3 household total, multi-policy line 10 eligibility, both below-100%-FPL applicable-taxpayer exceptions, a reviewed non-applicable-taxpayer APTC repayment path, family-only MFS exception/no-exception branches, and a single-allocation MFS shared-policy Situation 2 path with a separately sourced coverage-family SLCSP. The exceptions require explicit eligibility evidence, with paid APTC for the Marketplace-estimate route; the non-applicable path requires verified no-sharing, lawful-presence, no self-employed deduction, and no alternative-marriage facts, then reports only APTC and the Table 5 capped repayment. These additions await the user-requested full-batch test. QSEHRA and mixed monthly/annual-only policy inputs still fail explicitly. Up to 99 native MeF Part IV groups and the after-four line 34 No value are implemented but untested; printed/PDF overflow and ATS acceptance remain open. Multiple shared periods and mixed shared/family-only periods on one policy are implemented but untested. Situation 1, 3, and 4 allocations are implemented but untested. Form 8814 dependent income, Part IV paper/PDF overflow presentation, alternative marriage calculation, coverage-family changes/SLCSP accuracy, and self-employed insurance interactions remain open. PDF field mapping and broader IRS business rules also remain open.                                                                                                                                        | Continue building the remaining Form 8962 branches and source facts, then verify calculation, XML, PDF, business rules, and the full suite as one batch.                                                |
| GAP-8283       | Form 8283                                    | Build pass replaced the automatic capital-gain-property basis cap with an explicit Section B claimed deduction, added separate MeF documents for ordinary Section B gifts, and added VIN plus a linked native MeF vehicle statement for Section A claims above $500 on the donee-certified unrelated-party sale-proceeds route. These calculation, multi-document, and local XSD cases are written but unrun. Whether the actual donee-issued Form 1098-C/copy must also be attached remains unverified. Other vehicle routes, Section B appraisal/image attachments, pass-through documents, AGI limits, and PDF rendering remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Build the remaining attachment and limit paths, then run the full batch and verify IRS rules.                                                                                                           |
| GAP-8582       | Form 8582                                    | Prior-year active-participation facts already existed. The current build pass now splits an active rental's ineligible prior operating loss into Part V, excludes it from the Part II special allowance and Part VI ratios, and shares the revised per-activity allocation with Schedule E and Form 4835. Cases are written but unrun. Prior Form 4797 losses, durable per-activity carryforward identities, and full business-rule verification remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Verify split Part IV/V XML, Schedule E and Form 4835 routing, current-worktree tests and IRS rules; finish remaining prior-loss forms.                                                                  |
| GAP-8814       | Form 8814 and dependent income               | Build pass has replaced old thresholds with the 2025 $1,350/$2,700 rules, routed lines 9/10/12/15, added an `IRS8814` MeF serializer and PDF descriptor, linked elected dependent income to Form 8962 Worksheet 1-2 by SSN, routed line 12 less the Alaska PFD share to Form 8960 line 7, added combined-source Schedule B reporting, and routed child investment-income facts to Form 4952. These changes are untested under the requested build-first workflow. PDF layout verification, over-15-payer statements, parent-election business rules, and IRS acceptance remain open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Finish source-to-return and form-output coverage, then run the full batch including IRS XSD and business-rule cases.                                                                                    |
| GAP-4952       | Form 4952 source and child investment income | Build pass now exposes Form 4952 as a normal return input, calculates lines 1 through 8 from separate `other_` investment-property facts, affirmed 1099-INT/1099-DIV/1099-OID and partnership/S-corp/trust K-1 portfolio sources, and Form 8814 contributions. It routes line 8 to Schedule A and line 7 to carryforward, and maps the 2025 XML and PDF form lines. These changes are untested. The build pass also takes explicit AMT refigure facts, derives a separate AMT Form 4952 line 8 and carryforward, routes the signed difference to Form 6251 line 2c, and caps AMT line 4g separately. A positive line 4g election and its capital-gain attribution feed the regular and AMT Schedule D Tax Worksheets. These cases are written but unrun. Broker, non-portfolio, and broader AMT-basis source derivation, foreign-tax interactions, PDF layout, and business rules remain open.                                                                                                                                                                                                                                                                                        | Finish source derivation and election tax treatment, then run the full batch including XSD and PDF checks.                                                                                              |
| GAP-4972       | Form 4972 lump-sum election                  | **Build pass, untested.** The previous code mistook Form 1099-R code 5 for a lump-sum election and sent its tax to Schedule 2 under a Form 4970 tag. The current pass removes that route, takes the explicit election's taxable box 2a and box 3 amounts, computes the 2025 Form 4972 tax schedule and Part III allowance/annuity/estate-tax lines, adds the tax to Form 1040 line 16, subtracts it on Form 6251 line 10, and emits native `IRS4972` fields plus the linked Form 1040 indicator. Eligibility facts and recipient identity are required for an elected form. Source-to-XSD and calculation cases are written but unrun. Part-II-only ordinary-income reporting, multiple participant/recipient forms, NUA, alternate payees, the capital-gain share of federal estate tax, exact rounding, and PDF/business-rule verification remain open.                                                                                                                                                                                                                                                                                                                             | Finish all supported election/recipient paths and required form lines, then run the full test batch, local XSD, and IRS business rules.                                                                 |
| GAP-MAP        | Simple field-mapping documents               | Several registered forms have sparse field-map builders. Their registration is not evidence of complete calculations or required IRS detail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Audit each against form instructions and XSD, then add source-to-XML and negative tests.                                                                                                                |
| OUT-NR-SS-4868 | Other ATS return families                    | Standalone 1040-NR, 1040-SS, and 4868 exporters are outside the user-agreed Form 1040 scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | No gate on this board; retain the source inventory separately and do not imply those returns are supported.                                                                                             |
| GAP-ATS        | IRS acceptance                               | No ATS transmission or acknowledgment has been recorded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Authorized ATS credentials, complete package, accepted test transmissions, and archived acknowledgments.                                                                                                |

### GAP-8978: Partner's additional reporting year tax

**Build pass, untested.** The old default-37% estimate and Schedule 2 positive
route are removed. The node now calculates each affected-year Form 8978 column
from original and corrected income-tax liability, sums signed line 13 amounts
into line 14, and routes a positive result to Form 1040 line 16. It emits one
native `IRS8978` and linked `IRS8978ScheduleA` per filing, and the bundle
builder creates a tax-computation statement PDF per filing. Input requires the
actual affected-year tax recomputation and explanation; this engine does not
infer it from a marginal rate. The negative route now feeds Form 6251 line 10,
caps the Schedule 3 line 6l credit at Form 1040 line 18, and applies any
remaining amount only to classified chapter 1 Schedule 2 Part II tax through
signed line 17z, a linked `AnyOtherTaxesStatement`, and finalized line 21 / Form
1040 line 23. PDF Schedules 2 and 3 project the same worksheet amounts. Positive
and negative source-to-XSD and calculation cases are written but have not run.
The chapter 1 source classification and tax-form PDF layout still need an
instructions audit and visual verification; interest, penalties, all required
attachments, and IRS business rules remain unverified. See the
[2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi).

### GAP-8621: PFIC and QEF reporting

**Build pass, untested; whole-form gap remains.** The flat 37% estimate and
Schedule 2 line 17z tax route have been removed. Section 1291 distribution
blocks now take prior-year distributions for the same shares, apply the 125%
per-share threshold, and apportion annual excess across actual 2025 distribution
dates. Each event's holding-period allocation is derived from actual days,
including leap years and cent balancing. Prior PFIC-year tax uses each year's
[IRS-published highest rate](https://www.irs.gov/instructions/i8621), apply
per-year foreign-tax-credit limits, and send Form 8621 line 16e to Form 1040
line 16 with `1291TAX`. Supplied section 6621 interest goes to Schedule 2 line
17p; current/pre-PFIC income goes to Schedule 1. QEF net capital gain now routes
to Schedule D, and mark-to-market loss is limited by unreversed prior
inclusions. QEF section 951/1293(g) reductions are separate source facts. The
section 301 taxable part of nonexcess distributions routes to Schedule B and
Form 8960 as a separate sourced fact. Native `IRS8621` and a holding-period
statement builder are registered; calculation and source-to-XSD cases are
written but unrun. The engine still needs foreign-currency distribution
conversion, mixed lots and disposition basis reconciliation, historical interest
computation, complete QEF/MTM elections and supporting facts, PDF verification,
XSD/business-rule evidence, and ATS acceptance.

### GAP-8615: Child's unearned-income tax

**Build pass, untested; whole-form gap remains.** The old node computed only an
incremental parental-rate amount and posted it to Schedule 2 line 17d. That
route has been removed. The current build pass takes explicit parent identity,
income-tax, filing-status, sibling line 5, and eligibility facts; applies the
dependent standard deduction to the child's return; checks the child's stated
unearned income against the return sources in a dependent case; computes
ordinary-rate Form 8615 lines 1-18; and uses line 18 as the child's Form 1040
line 16 tax. A nonpositive line 3 stops before line 4, and a zero line 5 stops
before the family-tax worksheets. Both retain the child's already-computed
regular tax, even when that tax used preferential rates or Form 2555. The MeF
serializer emits the 2025 native amount fields, and the PDF descriptor maps the
numbered amount lines and parent identity/status. Calculation, source-to-return,
local XSD, and PDF-field cases are written but unrun. The
[2025 Form 8615 instructions](https://www.irs.gov/instructions/i8615) also
require preferential-rate and Schedule J worksheets, and a Form 2555 route, when
those facts affect a positive line 5; these still stop explicitly. Parent and
child eligibility proof, dependent earned-income source derivation beyond the
stated amount, exact Tax Table behavior, visual PDF verification, and IRS
business rules remain open. Do not treat the ordinary slice as whole-form
support.

## Registered Form 1040 MeF documents to audit

Build-pass addendum for GAP-6251 (unrun): line 10 now receives the Form 4972
subtraction, Form 8962's Schedule 2 line 1a amount as part of line 1z, Schedule
3 line 1 foreign tax credit, and the negative Form 8978 adjustment. Schedule J
refigure and other Schedule 2 line 1z sources remain open.

The following are registered in `forms/f1040/2025/mef/forms/index.ts`.
**Registered means the builder can be invoked, not that the form is complete or
approved.** Mark each row in the INV-01 matrix after checking calculations, XML,
dependencies, required statements, and tests.

- Return and schedules: Form 1040; Schedules 1, 2, 3, 8812, A, B, C, D, E, EIC,
  F, H, and SE.
- Income/source documents: W-2, 1099-R, foreign-employer compensation records,
  and wages-not-shown schedule.
- Forms 461, 982, 1116, 2441, 2555, 4137, 4562, 4684, 4797, 4835, 4952, 4972,
  5329, 5695, 6198, 6251, 6252, 6781, 7206, 7217, 8283, 8396, 8582, 8606, 8615,
  8621, 8814, 8815, 8824, 8829, 8839, 8853, 8862, 8863, 8880, 8889, 8911, 8919,
  8949, 8959, 8960, 8962, 8978, 8990, 8995, and 8995-A.
- Supporting documents: Form 4835 at-risk and passive-loss documents, Schedule A
  for Form 8911, cash/accrual CCC-loan statements, crop-insurance deferral
  statement, Form 1116 foreign-income-related-expense statement, joint-occupancy
  statement, Form 8978 Schedule A and tax-computation statement PDF, Schedule 2
  line 17z `AnyOtherTaxesStatement`, and the Form 8283 vehicle sale
  acknowledgment statement, and Form 8621 Part V holding-period statement.

## Release checklist

- [x] Agree on SCOPE-01: TY2025 Form 1040 family only.
- [ ] Complete INV-01. No completion percentage before this.
- [ ] Resolve every in-scope known gap, or record a deliberate exclusion with
      user approval.
- [ ] Pass the full suite on the final worktree, with ignored tests reviewed
      rather than counted as passes.
- [ ] Validate representative and boundary XML against the local TY2025v5.4 IRS
      XSD; check IRS business rules separately.
- [ ] Complete in-scope ATS fixtures and record IRS ATS acknowledgments. Local
      XSD validity is not ATS acceptance.
- [ ] Review changes for correctness, secrets, unrelated edits, and release
      notes; commit and open PR(s).
- [ ] Merge/release only after review and the agreed acceptance gates pass.

## Evidence pointers

- Registered documents: `forms/f1040/2025/mef/forms/index.ts`
- Per-document audit index: `docs/mef/coverage-inventory.md`
- Return assembly: `forms/f1040/2025/mef/builder.ts`
- Submission package: `forms/f1040/2025/mef/submission-archive.ts`
- Local XSD scenarios: `forms/f1040/2025/mef/xsd-validation.test.ts`
- ATS inventory and limitations: `docs/ats/ty2025.md`
- Machine-readable ATS facts: `forms/f1040/e2e/ats/ty2025_cases.ts`
- Form 4137 calculation and XML:
  `forms/f1040/nodes/intermediate/forms/form4137/index.ts`,
  `forms/f1040/2025/mef/forms/f4137.ts`
- Schedule SE rounding: 2025 IRS
  [Schedule SE](https://www.irs.gov/pub/irs-pdf/f1040sse.pdf), lines 10–13, and
  [Form 1040 instructions](https://www.irs.gov/instructions/i1040gi), “Rounding
  Off to Whole Dollars”; local reconciliation in
  `forms/f1040/e2e/ats/ty2025_cases.test.ts`
- 2025 [Schedule 2](https://www.irs.gov/pub/irs-pdf/f1040s2.pdf),
  [Form 8962](https://www.irs.gov/pub/irs-pdf/f8962.pdf), and
  [Form 8962 instructions](https://www.irs.gov/instructions/i8962); local
  TY2025v5.4 XSD in `.state/research/docs/IMF_Series_2025v5.4/`

Update this board from evidence after each completed workstream. Do not promote
“implemented” to “verified” solely because tests are green; the tests must cover
the claimed scope.
