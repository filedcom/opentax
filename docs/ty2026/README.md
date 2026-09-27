# TY2026 Form 1040 research corpus

Snapshot date: 2026-09-27. This is the source map for full TY2026 1040 end-to-end
work. Start at the [implementation entry point](ENTRY-POINT.md).
The code observations were captured from research commit `2ed64bdd` while
TY2025/TY2026 work continued on a separate branch; compare them with the
current checkout before implementing a route.
The [research handoff audit](READINESS-AUDIT.md) records coverage and the
remaining IRS publication, MeF and ATS gates.

## What is in this snapshot

- [`PDF-F1040-MAP.md`](PDF-F1040-MAP.md) and `pdf-fields-f1040.csv`: the
  draft 2026 Form 1040 AcroForm inventory and changed-line mapping for the
  future year-specific PDF builder.
- [`PDF-SCHEDULE3A-MAP.md`](PDF-SCHEDULE3A-MAP.md) and
  `pdf-fields-f1040s3a.csv`: the new schedule's line/widget map and its
  orphaned-field issue.
- [`PDF-SCHEDULEB-MAP.md`](PDF-SCHEDULEB-MAP.md) and
  `pdf-fields-f1040sb.csv`: the 2026 Schedule B field map, including Part III
  disclosures and supplemental statement requirements.
- [`PDF-SCHEDULE2-6251-MAP.md`](PDF-SCHEDULE2-6251-MAP.md),
  `pdf-fields-f1040s2.csv`, and `pdf-fields-f6251.csv`: the 2026 additional-tax
  and AMT attachment field maps and remaining print-detail gaps.
- [`PDF-DEPENDENTS-8812-MAP.md`](PDF-DEPENDENTS-8812-MAP.md): the revised
  dependent table, continuation, Schedule 8812 AcroForm fields, and checks.
- [`PDF-SCHEDULE3-MAP.md`](PDF-SCHEDULE3-MAP.md): the revised Schedule 3 lines,
  Form 1040 and Schedule 8812 routes, and draft PDF fields.
- [`SCHEDULE1-GRAPH.md`](SCHEDULE1-GRAPH.md) and
  `pdf-fields-f1040s1.csv`: the 2026 Schedule 1 source/AGI contract, changed
  line meanings, and 73 draft PDF widgets.
- [`SCHEDULEC-GRAPH.md`](SCHEDULEC-GRAPH.md) and
  `pdf-fields-f1040sc.csv`: the statutory W-2/activity route, new interest
  and vehicle-mileage labels, all 109 draft Schedule C widgets, and PDF/MeF
  acceptance order.
- [`MEF-V1-DRIFT.md`](MEF-V1-DRIFT.md): why the downloaded May v1 1040 XSD
  cannot describe the September draft form, and the exact refresh/diff gate.
- [`MEF-PUBLIC-CROSSWALK.md`](MEF-PUBLIC-CROSSWALK.md),
  `mef-descriptor-coverage.csv`, and
  [`MEF-BINARY-ATTACHMENTS.md`](MEF-BINARY-ATTACHMENTS.md): the public TY2026
  inventory against 85 existing runtime descriptors, and the four generated
  PDF binary routes plus caller-supplied statements.
- [`FORM4136-GRAPH.md`](FORM4136-GRAPH.md): fuel-tax claim and per-business
  Schedule A route, with the missing 2026 Schedule A release gate and
  485/482-widget main-form/prior-year comparator inventories.
- [`FORM8960-GRAPH.md`](FORM8960-GRAPH.md) and `pdf-fields-f8960.csv`:
  NIIT source ownership, 2026 Schedule 2 line 6, the missing MAGI/election
  and PDF/MeF lines, and all 38 draft widgets.
- [`FORM4137-8919-GRAPH.md`](FORM4137-8919-GRAPH.md),
  `pdf-fields-f4137.csv`, and `pdf-fields-f8919.csv`: embedded 2026
  instructions, owner-keyed FICA/wage-base sequence, printed reason codes,
  Schedule 2 source conflict, and 34/40 draft widgets.
- [`FORM8839-GRAPH.md`](FORM8839-GRAPH.md) and `pdf-fields-f8839.csv`:
  per-child refundable/nonrefundable adoption credit, employer-benefit
  exclusion, 2027 carryforward and all 101 draft widgets.
- [`FORM8396-8859-8880-GRAPH.md`](FORM8396-8859-8880-GRAPH.md) and the
  three matching PDF field inventories: mortgage-interest credit and
  deduction, DC carryforward, 2026 saver-credit limits, and 26/9/23 widgets.
- [`FORM7217-GRAPH.md`](FORM7217-GRAPH.md) and `pdf-fields-f7217.csv`:
  continuous-use partnership-property basis report, April 2026 K-1 box 19
  correction, per-date filing and all 306 current form widgets.
- [`FORM8826-8835-STATEMENTS.md`](FORM8826-8835-STATEMENTS.md) and the two
  matching PDF field inventories: current disabled-access credit authority,
  prior-year electricity-credit comparator, and statement-only MeF ownership.
- [`MEF-REMAINDER.md`](MEF-REMAINDER.md) and four matching PDF field
  inventories: Forms 8911/8978, their Schedules A, and the remaining
  source-linked TY2025 MeF serializers.
- [`NODE-BOUNDARY-AUDIT.md`](NODE-BOUNDARY-AUDIT.md): route owners and
  implementation decisions for the 85 TY2025 registry nodes not named
  individually in the specialist plans; every generated node-ledger row
  now has a concrete next action, while remaining audit-required.
- [`FORM5884-6765-8994-GRAPH.md`](FORM5884-6765-8994-GRAPH.md) and three
  PDF field inventories: work opportunity hire cutoff, required research
  Section G, and expanded paid-leave credit/Notice 2026-28.
- [`FORM3468-GRAPH.md`](FORM3468-GRAPH.md) and `pdf-fields-f3468.csv`:
  seven-part investment-credit facility ledger, Form 3800/4255 links,
  Notice 2026-15 and 321 comparator widgets.
- [`FORM4255-GRAPH.md`](FORM4255-GRAPH.md) and `pdf-fields-f4255.csv`:
  property-credit recapture, EPE/transfer/PWA/emissions branches, revised
  Schedule 2 destinations and 646 current form widgets.
- [`FORM965A-GRAPH.md`](FORM965A-GRAPH.md) and `pdf-fields-f965a.csv`:
  continuing section 965 liability/payment ledger, 2026 Schedule 2 line
  12/15 draft conflict and 413 current form widgets.
- [`SCHEDULER-GRAPH.md`](SCHEDULER-GRAPH.md) and
  `pdf-fields-f1040sr.csv`: 2026 elderly/disabled eligibility, box-specific
  amount and tax-limit worksheet, Schedule 3 line 6d and 27 PDF widgets.
- [`SCHEDULEJ-GRAPH.md`](SCHEDULEJ-GRAPH.md) and
  `pdf-fields-f1040sj.csv`: elected farm/fishing income across the
  2023–2025 base years, prior Schedule J state, 1040 line 16 and 27 widgets.
- [`FORM1099K-GRAPH.md`](FORM1099K-GRAPH.md): final 2026 recipient source,
  transaction-level income reconciliation, Schedule 1 header, cash-tip
  fields and withholding route.
- [`FORM1099MISC-NEC-GRAPH.md`](FORM1099MISC-NEC-GRAPH.md): final 2026
  forms and combined instructions, included cash-tip/overtime boxes,
  activity reconciliation and Schedule 1-A/2 destinations.
- [`FORM1099G-GRAPH.md`](FORM1099G-GRAPH.md): final 2026 government-payment
  form and instructions, family-leave authority, refund tax-benefit and
  farm/CCC route.
- [`FORM1098-1098E-GRAPH.md`](FORM1098-1098E-GRAPH.md): mortgage and
  student-loan statements, Schedule A points/MIP and Schedule 1 line 21.
- [`FORM1098VLI-GRAPH.md`](FORM1098VLI-GRAPH.md): new 2026 vehicle-loan
  statement, final regulations, Schedule 1-A Part IV and business allocation.
- [`FORM3903-EDUCATOR-GRAPH.md`](FORM3903-EDUCATOR-GRAPH.md): pinned 2026
  moving form/instructions, military and intelligence moves, reimbursement
  and storage routes, and the new educator Schedule A line 17k handoff.
- [`FORM8938-GRAPH.md`](FORM8938-GRAPH.md) and `pdf-fields-f8938.csv`:
  December 2026 foreign-asset disclosure draft, continuous-use instructions,
  threshold/exception ledger, Part III income reconciliation and 131 widgets.
- [`FORM4852-GRAPH.md`](FORM4852-GRAPH.md) and `pdf-fields-f4852.csv`:
  current substitute W-2/1099-R authority, correct 7e/8f withholding lines,
  original-versus-substitute reconciliation and 34 PDF widgets.
- [`PARITY-QUEUE.md`](PARITY-QUEUE.md): dependency-ordered full 1040 coding
  queue across the 2025 graph/PDF/MeF inventories and 2026-only attachments.
- [`PRODUCT-ASSEMBLY.md`](PRODUCT-ASSEMBLY.md): repository handoff from the
  form routes into catalog registration, CLI summary/validation/export,
  submission ZIP and end-to-end ATS evidence.
- [`INSTRUCTION-COVERAGE.md`](INSTRUCTION-COVERAGE.md) and
  `instruction-coverage.csv`: available 2026 instructions, URLs still serving
  2025, and source refresh gates for the full form inventory.
- [`GRAPH-ROUTES.md`](GRAPH-ROUTES.md) and `graph-route-gaps.csv`: generated
  inventory of declared 2026 edges whose downstream target is not registered.
- [`INTEREST-GRAPH.md`](INTEREST-GRAPH.md): source-backed 1099-INT, Schedule B,
  AGI, NIIT, PDF, and MeF wiring and attachment contract.
- [`DIVIDEND-GRAPH.md`](DIVIDEND-GRAPH.md): continuous-use 1099-DIV source,
  current TY2026 income/withholding route, and dependent-form worklist.
- [`SSA-BENEFITS-GRAPH.md`](SSA-BENEFITS-GRAPH.md): SSA-1099 and RRB-1099 box
  distinctions, taxable-benefit route, and remaining repayment/election work.
- [`RRB-1099-GRAPH.md`](RRB-1099-GRAPH.md): pinned RRB issuer explanations
  and IRS pension/benefit publications, separate SSEB and pension statements,
  signed repayments, corrected sources and their 1040/MeF handoffs.
- [`FORM1099R-GRAPH.md`](FORM1099R-GRAPH.md): final 2026 Form 1099-R box changes,
  IRA/pension downstream routes, and filing gates.
- [`FORM5329-GRAPH.md`](FORM5329-GRAPH.md): early SIMPLE IRA Part I tax and
  attachment route, with the remaining additional-tax work.
- [`FORM8606-GRAPH.md`](FORM8606-GRAPH.md): 2026 IRA basis, conversion,
  Roth-distribution, spouse-form, and carryforward implementation contract.
- [`FORM8889-GRAPH.md`](FORM8889-GRAPH.md) and `pdf-fields-f8889.csv`:
  owner-keyed HSA eligibility and contributions, distributions, testing-period
  tax, 2026 Schedule 1/2 routes, and the full PDF field map.
- [`FORM8959-GRAPH.md`](FORM8959-GRAPH.md) and `pdf-fields-f8959.csv`:
  2026 wage/RRTA/SE Additional Medicare Tax split, withholding reconciliation,
  changed PDF line positions, and MeF/graph build order.
- [`FORM7206-GRAPH.md`](FORM7206-GRAPH.md) and `pdf-fields-f7206.csv`:
  per-business health-insurance earnings limits, LTC age caps, Form 2555 and
  Marketplace PTC dependencies, and full 2026 PDF field inventory.
- [`FORM8853-GRAPH.md`](FORM8853-GRAPH.md) and `pdf-fields-f8853.csv`:
  Archer/Medicare Advantage MSA and LTC source routes, 2026 Schedule 1/2
  handoffs, repeated sections/statements, and all 38 PDF fields.
- [`FORM8829-GRAPH.md`](FORM8829-GRAPH.md) and `pdf-fields-f8829.csv`:
  per-home Schedule C deduction, 2026 SALT/casualty/depreciation ordering,
  2027 carryforwards, QPP election gate, and 58 PDF fields.
- [`FORM4562-GRAPH.md`](FORM4562-GRAPH.md) and `pdf-fields-f4562.csv`:
  asset/activity §179, bonus, MACRS/ADS, listed-property and vehicle ledger;
  correct 2026 destination, Form 4562-B split, and all 271 PDF widgets.
- [`FORM461-GRAPH.md`](FORM461-GRAPH.md) and `pdf-fields-f461.csv`:
  return-wide business-loss limit, source classification, Schedule 1 line 8p,
  NOL carryover, and all 18 draft PDF widgets.
- [`FORM172-NOL-GRAPH.md`](FORM172-NOL-GRAPH.md) and `pdf-fields-f172.csv`:
  current Form 172 and instructions, per-origin NOL ledger, Schedule 1 line
  8a/statement, MeF attachment, and 109 current-form PDF widgets.
- [`FORM8582-GRAPH.md`](FORM8582-GRAPH.md) and `pdf-fields-f8582.csv`:
  active-rental and other passive activities, modified AGI, Parts IV–IX
  allocation, activity carryforwards, and all 205 draft PDF widgets.
- [`FORM6198-GRAPH.md`](FORM6198-GRAPH.md) and `pdf-fields-f6198.csv`:
  continuous-use at-risk form, basis and debt evidence, activity/source
  allocations, recapture, and all 34 PDF widgets.
- [`FORM4684-GRAPH.md`](FORM4684-GRAPH.md) and `pdf-fields-f4684.csv`:
  per-event casualty/theft, disaster classification, Schedule A/4797,
  Ponzi/election routes, and all 162 draft PDF widgets.
- [`FORM4797-GRAPH.md`](FORM4797-GRAPH.md) and `pdf-fields-f4797.csv`:
  per-asset dispositions, §1231 gain/loss and recapture, Form 4684 cycle,
  new QPP use-change question, and all 188 draft PDF widgets.
- [`FORM6252-GRAPH.md`](FORM6252-GRAPH.md) and `pdf-fields-f6252.csv`:
  persistent installment-sale obligation, related-party disposition and
  recapture routes, draft cross-reference conflict, and all 49 PDF widgets.
- [`FORM8824-GRAPH.md`](FORM8824-GRAPH.md) and `pdf-fields-f8824.csv`:
  multi-property §1031 exchange, two-year related-party state, deferred
  basis and §1043 sale, plus all 68 draft PDF widgets.
- [`FORM8990-GRAPH.md`](FORM8990-GRAPH.md) and `pdf-fields-f8990.csv`:
  §163(j) business-interest limit, 2026 $32 million gross-receipts test,
  source/activity carryforwards and all 138 draft PDF widgets.
- [`FORM4952-GRAPH.md`](FORM4952-GRAPH.md) and `pdf-fields-f4952.csv`:
  investment-interest limit, qualified-dividend/capital-gain election,
  Schedule A/6198/E and AMT routes, plus all 17 draft PDF widgets.
- [`FORM6781-GRAPH.md`](FORM6781-GRAPH.md) and `pdf-fields-f6781.csv`:
  section 1256 contracts, straddle loss deferral, elections/carryback,
  Schedule D/8949 routes, and all 71 draft PDF widgets.
- [`FORM8615-GRAPH.md`](FORM8615-GRAPH.md) and `pdf-fields-f8615.csv`:
  child eligibility and unearned income, parent/sibling tax worksheets,
  child Form 1040 line 16, and all 32 draft PDF widgets.
- [`FORM8814-GRAPH.md`](FORM8814-GRAPH.md) and `pdf-fields-f8814.csv`:
  parent election per child, allocated dividend/capital income and tax,
  cross-form effects, and all 26 draft PDF widgets.
- [`FORM8997-GRAPH.md`](FORM8997-GRAPH.md) and `pdf-fields-f8997.csv`:
  legacy QOF deferral recognition in 2026, revised Parts III–V, Form 8949
  and future basis, with all 461 draft PDF widgets.
- [`FORM8621-GRAPH.md`](FORM8621-GRAPH.md) and `pdf-fields-f8621.csv`:
  current-revision PFIC/QEF form, elections and historical tax/interest,
  2026 Schedule 2 lines 19a/b, and all 151 current PDF widgets.
- [`FORM4972-GRAPH.md`](FORM4972-GRAPH.md) and `pdf-fields-f4972.csv`:
  lump-sum election eligibility, 1099-R income split, line 16 box 2,
  embedded 2026 instructions, and all 58 draft PDF widgets.
- [`FORM8815-GRAPH.md`](FORM8815-GRAPH.md) and `pdf-fields-f8815.csv`:
  savings-bond education exclusion, QSS phaseout, Schedule B line 3,
  and all 23 draft PDF widgets.
- [`FORM8915F-GRAPH.md`](FORM8915F-GRAPH.md) and `pdf-fields-f8915f.csv`:
  2026 disaster distribution/repayment ledger, account-specific 1040 routes,
  2025 instruction comparator, and all 102 draft PDF widgets.
- [`FORM8915D-STATUS.md`](FORM8915D-STATUS.md): latest 2024 source and
  expired 2019-disaster repayment period; preserve older-year amendments
  without emitting a 2026 attachment.
- [`FORM8912-GRAPH.md`](FORM8912-GRAPH.md) and `pdf-fields-f8912.csv`:
  continuous-use bond-credit form, 2026 Schedule 3 line 6k, carryforward
  and credit-order work, and all 218 current PDF widgets.
- [`FORM982-GRAPH.md`](FORM982-GRAPH.md) and `pdf-fields-f982.csv`:
  current cancellation-of-debt exclusion form, 2026 QPRI written-agreement
  gate, tax-attribute ledger, and all 27 current PDF widgets.
- [`FORM8834-GRAPH.md`](FORM8834-GRAPH.md) and `pdf-fields-f8834.csv`:
  current 2024+ legacy passive vehicle-credit form, Form 8582-CR source,
  2026 Schedule 3 line 6i, and all 11 current PDF widgets.
- [`FORM8962-GRAPH.md`](FORM8962-GRAPH.md) and `pdf-fields-f8962.csv`:
  2026 premium tax credit line 27, 400% FPL boundary, Form 1095-A/allocations,
  143 PDF widgets, and MeF/graph acceptance order.
- [`FORM1116-GRAPH.md`](FORM1116-GRAPH.md), `pdf-fields-f1116.csv`,
  `pdf-fields-f1116sb.csv`, and `pdf-fields-f1116sc.csv`: category credit,
  2026 line 18/20 tax bases, carryovers and redeterminations, full PDF
  inventories, and MeF/graph acceptance order.
- [`FORM2555-GRAPH.md`](FORM2555-GRAPH.md) and `pdf-fields-f2555.csv`:
  2026 foreign earned income and housing exclusions/deduction, Notice
  2026-25 limits, 160 PDF widgets, and Schedule 1/SE/1116/MeF handoffs.
- [`FORM8936-GRAPH.md`](FORM8936-GRAPH.md), `pdf-fields-f8936.csv`, and
  `pdf-fields-f8936sa.csv`: clean vehicle acquisition and 2026 service
  eligibility, dealer transfers, personal/business routes, and PDF fields.
- [`FORM2441-GRAPH.md`](FORM2441-GRAPH.md): dependent-care benefits before
  AGI, 2026 credit phaseout and limit, provider detail, PDF, and MeF order.
- [`FORM8862-8863-EIC-GRAPH.md`](FORM8862-8863-EIC-GRAPH.md),
  `pdf-fields-f8862.csv`, `pdf-fields-f8863.csv`, and
  `pdf-fields-f1040sei.csv`: credit
  recertification, education-credit, and EIC source/graph/attachment order.
- [`PDF-FORM2441-MAP.md`](PDF-FORM2441-MAP.md) and
  `pdf-fields-f2441.csv`: all 72 draft Form 2441 terminal widgets, the two
  printed-page map, the missing benefits-question widget, and continuation
  requirements.
- [`CAPITAL-GAIN-GRAPH.md`](CAPITAL-GAIN-GRAPH.md): direct 1099-DIV box 2a
  decision, Schedule D/8949 dependencies, and PDF/MeF work order.
- [`PDF-SCHEDULED-MAP.md`](PDF-SCHEDULED-MAP.md) and
  `pdf-fields-f1040sd.csv`: all 55 draft Schedule D widgets, the six Form 8949
  summary rows, and the reconciliation work required for a filed attachment.
- [`TRANSACTION-GRAPH.md`](TRANSACTION-GRAPH.md): the 2026 1099-B/1099-DA box
  meanings, Form 8949 classification, Schedule D totals, and MeF/ATS gates.
- [`PDF-FORM8949-MAP.md`](PDF-FORM8949-MAP.md) and `pdf-fields-f8949.csv`:
  all 202 draft Form 8949 widgets and the eleven-row pagination contract.
- [`FORM5695-CREDIT-GRAPH.md`](FORM5695-CREDIT-GRAPH.md): the carryforward-only
  2026 form, its pinned draft instructions, and the Schedule 8812 credit order.
- [`SCHEDULEH-GRAPH.md`](SCHEDULEH-GRAPH.md): 2026 household payroll thresholds,
  FUTA paths, and the Schedule 2 line 17a attachment contract.
- [`SCHEDULEE-GRAPH.md`](SCHEDULEE-GRAPH.md): the new rental vehicle-interest
  line, Part I–V activity graph, passive/at-risk/interest limits, PDF/MeF
  work, and ATS scenarios 3 and 6.
- [`SCHEDULEF-GRAPH.md`](SCHEDULEF-GRAPH.md): farm cash/accrual income, the
  new vehicle-interest line 21b, farm-loss and carryforward dependencies,
  PDF/MeF build order, and the ATS scenario 3 farm fixture.
- [`SCHEDULESE-GRAPH.md`](SCHEDULESE-GRAPH.md): owner-keyed self-employment
  earnings, farm/nonfarm optional-method eligibility and lines, the complete
  2026 draft AcroForm field map, MeF refresh gate, and ATS scenario 3.
- [`QBI-COOPERATIVE-GRAPH.md`](QBI-COOPERATIVE-GRAPH.md): 1099-PATR box
  correction, patron Form 8995-A/Schedule D calculations, 2026 minimum,
  continuous-use schedules, PDF widget inventories, and ATS scenario 3 gaps.
- [`FORM4562B-GRAPH.md`](FORM4562B-GRAPH.md): newly pinned 2026 amortization
  attachment, per-asset input and carryforward contract, and current
  instructions/MeF acceptance gates.
- [`GENERAL-BUSINESS-CREDIT-GRAPH.md`](GENERAL-BUSINESS-CREDIT-GRAPH.md):
  Form 7207/3800/3800 Schedule A transfer, Form 7205/7220 §179D evidence,
  PDF/MeF surfaces, and ATS scenario 12 build order.
- [`FORM4835-GRAPH.md`](FORM4835-GRAPH.md): production-based farm rent,
  the new vehicle-interest line 19b, Schedule E/SE boundary, loss limits,
  PDF/MeF build order, and ATS scenario 3.
- [`ATS-SCENARIO-03.md`](ATS-SCENARIO-03.md): page-level retirement, capital
  gain, farm, farm-rent, and optional self-employment method facts with
  independently derived intermediate amounts and filing gates.
- [`ATS-SCENARIO-04.md`](ATS-SCENARIO-04.md): the 18-page dependent-care,
  EIC, AOTC, CTC, Form 8862 and Schedule 3-A fixture contract.
- [`ATS-SCENARIO-02.md`](ATS-SCENARIO-02.md): statutory employee Schedule C,
  two W-2s, pre-July vehicle mileage, Schedule A/Form 8283, cooperative
  patron, dependent-credit, and EIC election facts and source conflicts.
- [`ATS-SCENARIO-06.md`](ATS-SCENARIO-06.md): page-level W-2, W-2G, partnership,
  dependent, and overtime facts with the Schedule 1/1040 income bridge and
  unresolved source gates.
- [`ATS-SCENARIO-05.md`](ATS-SCENARIO-05.md) and `pdf-fields-f8888.csv`:
  refund allocation after settlement, account validation,
  1040/Form 8888 indicator, and the draft-versus-ATS revision difference.
- [`ATS-SCENARIO-12.md`](ATS-SCENARIO-12.md): the 37-page business return,
  independent arithmetic, credit-transfer contradictions, and missing binary
  evidence.

- [`corpus/manifest.json`](corpus/manifest.json): URL, SHA-256, byte length,
  and retrieval date for **63 TY2026 IRS draft forms**, **27 verified 2026
  draft instruction PDFs**, **six draft form URLs that
  still serve an older year**, **13 IRS ATS PDFs**, **two MeF
  inventory spreadsheets**, final IRS authorities (Rev. Procs.
  2025-19, 2025-25, 2025-32; Notice 2025-67; Notice 2026-10; and IRB
  2026-29 and 2026 W-2/W-3 instructions), continuous-use Form 1099-DIV and
  its instructions, continuous-use Form 1099-PATR and Form 8995-A Schedules
  B/C/D, final 2026 Forms 1099-B/1099-DA/1099-R with instructions, the
  2025 Form 1040 and Form 8949 instructions as marked comparators, final
  January 2026 Form W-2G and its instructions, December 2025 continuous-use
  Forms 8283 and 8862 with instructions, 2026 Publication 15-A,
  Publication 505 (2026), and the final 2025 HHS poverty guidelines. All PDFs
  are source artifacts, not filing-ready forms. Run `python3
  docs/ty2026/corpus/download.py` to refresh the snapshot; review all hash
  changes before using new values or layouts.
- [`pdf-coverage.csv`](pdf-coverage.csv): each current TY2025 PDF descriptor,
  its IRS source URL, and whether a matching TY2026 draft is in the snapshot.
  Current result: 51 of 56 descriptors have a 2026 draft; five IRS draft
  URLs still serve older years and are recorded as `wrong-year` in the manifest.
- [`mef-coverage.csv`](mef-coverage.csv): each TY2025 MeF serializer module.
- [`mef-descriptor-coverage.csv`](mef-descriptor-coverage.csv): all 85
  runtime MeF descriptors in XSD emission order, including the two foreign
  employer wage documents exported by one module.
- [`node-coverage.csv`](node-coverage.csv): all 191 registered TY2025 graph
  nodes, their source modules, 2025 year mentions, tax-year dispatch, matching
  MeF/PDF surface, available 2026 draft, and review priority. Every row remains
  `audit-required` until its TY2026 behavior and output route are proved;
  progress notes do not mean a node is ready for the 2026 registry.
- [`year-literals.csv`](year-literals.csv): all `2025` occurrences in non-test
  calculation node source, including comments. These are review leads, not
  proof of a bug. Regenerate the four CSVs with `python3
  docs/ty2026/build_inventory.py` after a source or code change.
- [`FORM-DELTA.md`](FORM-DELTA.md): concrete changes visible in IRS draft forms.
- [`DEDUCTION-GRAPH.md`](DEDUCTION-GRAPH.md): source-backed Schedule A,
  Schedule 1-A, and QBI dependency contract and implementation sequence.
- [`SCHEDULE2-8812.md`](SCHEDULE2-8812.md): filed 2026 Schedule 2 line
  crosswalk and the Schedule 8812 Part II-B source dependency.
- [`ATS.md`](ATS.md): scenario inventory and fixture extraction rules.
- [`CONSTANTS.md`](CONSTANTS.md): authority-to-config mapping.
- [`IMPLEMENTATION.md`](IMPLEMENTATION.md): ordered code and verification plan.
- [`SOURCES.md`](SOURCES.md): versions, Drive package, availability limits,
  and refresh procedure.

## Version rule

Do not mix TY2026 sources without recording their version. On this snapshot
date, the IRS public page lists 2026v4.0 for MeF, while the user's Drive folder
has only the May 2026 IMF package containing 2026v1.0. The v1 XSD/rules help
locate changes and bootstrap work; they do **not** prove conformance to v4 or
future production releases. Draft forms and ATS PDFs can change independently
of the MeF package. Reconcile all three before claiming end-to-end readiness.

## Scope

`f1040:2026` means the federal Form 1040 product family already represented
by the 2025 registry. The IRS ATS index also lists 1040-NR, 1040-SS, and 4868;
they are inventoried here, but the current codebase has no full 2025 product
definition for those form types. Their addition is separate product work and
must be stated explicitly if included in a release claim.
