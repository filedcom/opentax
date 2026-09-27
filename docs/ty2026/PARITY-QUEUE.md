# TY2026 Form 1040 parity queue

Snapshot: 2026-09-27. This is the coding order for the full TY2025 Form 1040
product surface in TY2026. It sits beside the [detailed implementation
plan](IMPLEMENTATION.md), [191-node ledger](node-coverage.csv), [56-PDF
ledger](pdf-coverage.csv), [84-MeF-module ledger](mef-coverage.csv), and
[85-descriptor runtime ledger](mef-descriptor-coverage.csv). Do not
interpret a TY2025 module or a TY2026 registry entry as a completed 2026
filing route.

The current `forms/f1040/2026/registry.ts` has **35** registered node keys.
The current `forms/f1040/2026/pdf/builder.ts` passes **18** attachment slots
to its renderer. There is **no** `forms/f1040/2026/mef` directory. The
[route-gap inventory](GRAPH-ROUTES.md) records **33** declared edges from
registered nodes to absent targets. The 2025 inventories are broader than
these counts: one tax form can need multiple graph nodes, and some 2026 forms
have no 2025 counterpart. Recompute these observations after implementation
changes; they are a snapshot, not a completion score.
The [boundary audit](NODE-BOUNDARY-AUDIT.md) maps the other 85 TY2025
registry nodes to route owners; it does not certify those routes for 2026.
Every row in the generated [node ledger](node-coverage.csv) now has a
concrete next action or linked specialist plan. All rows remain
`audit-required` until their source, graph, PDF, MeF and return tests pass.
The [Forms 5884/6765/8994 plan](FORM5884-6765-8994-GRAPH.md) gives the
first source-level business-credit decisions behind Form 3800.
The [Form 3468 plan](FORM3468-GRAPH.md) covers the multi-facility investment
credit and its 2026 authority/MeF release gates.
The [Form 4255 plan](FORM4255-GRAPH.md) closes the corresponding recapture
side, including its separate 2026 Schedule 2 routes.
The [Form 965-A plan](FORM965A-GRAPH.md) identifies the continuing liability
ledger and the printed 2026 Schedule 2 line 12/15 conflict.
The [Schedule R plan](SCHEDULER-GRAPH.md) supplies its source-level credit
calculation, tax-liability limit and 2026 filed attachment.
The [Schedule J plan](SCHEDULEJ-GRAPH.md) supplies the 2023–2025 base-year
tax history and year-specific rate worksheets for the 1040 line 16 choice.
The [Form 1099-K plan](FORM1099K-GRAPH.md) supplies a source-reconciliation
route across business, personal sales, Schedule 1-A tips and withholding.
The [Forms 1099-MISC/NEC plan](FORM1099MISC-NEC-GRAPH.md) maps their new
included tip/occupation/overtime fields into that same source ledger.
The [Form 1099-G plan](FORM1099G-GRAPH.md) closes the source-research gap
for 2026 family leave, business tax recoveries and farm/CCC payments.
The [Forms 1098/1098-E plan](FORM1098-1098E-GRAPH.md) adds the 2026
Schedule A reported-points/MIP routes and qualified student-loan worksheet.
The [new Form 1098-VLI plan](FORM1098VLI-GRAPH.md) maps each lender's
vehicle loan to Schedule 1-A Part IV and the business-interest owners.
The [Form 3903/educator plan](FORM3903-EDUCATOR-GRAPH.md) pins the
2026 military/intelligence move and Schedule 1/A deduction split.
The [Form 8938 plan](FORM8938-GRAPH.md) adds the foreign asset disclosure
threshold, Part III income links and repeatable filed attachment.
The [Form 4852 plan](FORM4852-GRAPH.md) reconciles a substitute W-2 or
1099-R with its original/correction, income, withholding and printed form.
The [railroad statement plan](RRB-1099-GRAPH.md) separates RRB-1099 SSEB
from RRB-1099-R pensions before their combined 1040/withholding handoffs.

## Coding sequence

| Wave | Build together | Required result and existing source map |
| --- | --- | --- |
| 0. Freeze sources | Current 2026 form revisions; current MeF ZIP/XSD/rules; 2026 instruction availability; ATS packet hashes. | Pin source version/hash before mapping XML or a changed PDF. The [Drive ZIP](SOURCES.md) is May **v1**; the public IRS version table lists September **v4**. [MeF drift](MEF-V1-DRIFT.md) identifies changed 1040 elements that v1 cannot express. Keep raw e-Services packages out of this public repo. |
| 1. Finish the return spine | `general`/W-2/AGI → Schedule 1 → deduction choice and QBI → taxable income/tax/AMT → Schedule 2 and credit resolver → Schedules 3/3-A and 8812 → 1040 settlement. | Every filed line and checkbox in the [1040 PDF map](PDF-F1040-MAP.md) has one producer. Close the [33 current target gaps](GRAPH-ROUTES.md), including values deposited into absent nodes. Validate work authorization, dependent answers, 12f, 13a/13b, 24a–c, 27b/27c, 30 and 32a–c. [Schedule 1](SCHEDULE1-GRAPH.md), [Schedule 2/8812](SCHEDULE2-8812.md), [Schedule 3](PDF-SCHEDULE3-MAP.md), [deductions](DEDUCTION-GRAPH.md), and [constant sources](CONSTANTS.md) give line order. |
| 2. Complete all seven linked 1040 ATS graphs | [ATS index](ATS.md) scenarios 1–6 and 12, each from source documents through filed attachments. | Bring Schedule H/5695/1062, statutory W-2/8283/8888, farm/rent/SE/QBI, dependent care/education/EIC/8862, W-2G/K-1/overtime, and 7207/3800/7205/7220/4562-B into the 2026 graph. Each [scenario plan](ATS.md) separates printed, calculated, and application amounts and records its missing facts or source contradictions. |
| 3. Restore the remaining 2025 return surface | The groups below, including source forms and statements absent from ATS. | For each supported 2025 branch, select a 2026 form/instruction, update input → calculation → cross-form pending keys, build PDF and MeF, then add a source-backed TY2026 case and TY2025 regression. A missing 2026 draft can mean a continuous-use form; determine its current authority before dropping the branch. |
| 4. Build the filed output product | `forms/f1040/2026/{index,mef,pdf,validation}`, `catalog.ts`, CLI summary and submission ZIP. | One return definition selects the 2026 registry, validation rules, current MeF version/namespace, PDF bundle and attachment list. Follow the [product assembly handoff](PRODUCT-ASSEMBLY.md) through CLI and archive output. Check complete returns, not just isolated nodes. Reconcile every retained row of [PDF coverage](pdf-coverage.csv) and [MeF coverage](mef-coverage.csv), plus the new 2026 forms listed below. |
| 5. Release evidence | Final forms/instructions, current XSD and active rules, all ATS cases, target-specific boundary cases, full TY2025 regressions. | Record actual XML validation, reject-rule results, rendered PDF inspection and scenario arithmetic. Local XSD validation alone does not establish IRS ATS acceptance. See the [end-to-end gates](IMPLEMENTATION.md). |

## Remaining form groups outside the seven ATS packets

The [Form 4562 asset-ledger contract](FORM4562-GRAPH.md) now covers the
depreciation side of the business/property group, including the old Schedule
1 route that must be replaced before the TY2026 calculation graph can use it.
The [Form 461 return-wide loss contract](FORM461-GRAPH.md) follows the
activity limits and replaces the per-source excess-loss shortcut with the
printed 2026 worksheet and Schedule 1 line 8p/NOL handoff.
The [Form 8582 passive-loss contract](FORM8582-GRAPH.md) supplies the
preceding per-activity allowance and allocation, so allowed business losses
can enter Form 461 without losing their source or prior-year character.
The [Form 6198 at-risk contract](FORM6198-GRAPH.md) supplies the first
activity-level loss limit, with a current continuous-use form and instructions
and explicit per-item handoffs to Form 8582.
The [Form 4684 casualty contract](FORM4684-GRAPH.md) supplies per-event and
property loss/gain records ahead of those limits, with the draft's new
state-declaration language and the correct Schedule A/Form 4797 destinations.
The [Form 4797 disposition contract](FORM4797-GRAPH.md) maps the common
asset ledger, §1231 and ordinary branches, depreciation recapture, the
Form 4684 cycle and 188 draft PDF widgets. The 2026 line renumbering
invalidates several TY2025 MeF and shared-node assumptions.
The [Form 6252 installment contract](FORM6252-GRAPH.md) supplies the
cross-year sale/obligation ledger, related-party and deemed-payment branches,
recapture and Form 4797/Schedule D destinations. Its draft embedded
instructions cite stale Form 4797 lines that need final-source resolution.
The [Form 8824 exchange contract](FORM8824-GRAPH.md) supplies multi-property
§1031 and §1043 facts, deferred replacement basis and two-year related-party
history. Its 2026 draft also has Form 4797 cross-reference conflicts.
The [Form 8990 business-interest contract](FORM8990-GRAPH.md) supplies
source-keyed interest, the 2026 $32 million exemption threshold, ATI,
capitalized interest, partnership/S-corp schedules and carryforward
allocation before activity profit and return-level loss limits.
The [Form 4952 investment-interest contract](FORM4952-GRAPH.md) separates
mixed-use debt from business interest, maps the line-4g tax-rate election
and routes allowed interest among Schedule A, Form 6198 and source schedules.

These are **work assignments**, not blanket approvals to reuse TY2025 code.
The pinned draft/authority files and `instruction-coverage.csv` are the
source-status starting points. A row's form list includes the related PDF
and MeF components where present; use the inventories for exact filenames.

| Group | TY2025 forms and source nodes to audit | Calculation and filed-output handoff |
| --- | --- | --- |
| Foreign income and foreign tax | Forms 1116/2555/8938, foreign-employer wages, Schedule B foreign account/trust answers, Form 1099-DIV/INT foreign tax, K-1 foreign items, direct-expense statement. | Determine income exclusion and housing deduction before AGI/tax; allocate foreign-source income and deductions by category, apply its limit/carryovers, then Schedule 3 line 1. Reconcile direct-election versus attached 1116. [Form 1116](FORM1116-GRAPH.md) pins its Schedule B/C and 2026 line 18/20; [Form 2555](FORM2555-GRAPH.md) pins §911 income, housing and carryover. [Form 8938](FORM8938-GRAPH.md) separately reports foreign assets and reconciles its Part III to those tax routes. Each has PDF inventory and current-MeF gates. |
| Retirement and owner basis | Forms 1099-R, 5329, 8606, 4972, 8815, 8915-D/F, 8853, 8889, 7206; IRA/SEP and long-term-care sources. | Keep owner and account IDs through taxable distribution, basis, rollover, HSA/MSA and penalty computations. [1099-R](FORM1099R-GRAPH.md), [5329](FORM5329-GRAPH.md), [8606](FORM8606-GRAPH.md), [4972](FORM4972-GRAPH.md), [8815](FORM8815-GRAPH.md), [8915-F](FORM8915F-GRAPH.md), [8853](FORM8853-GRAPH.md), [8889](FORM8889-GRAPH.md), and [7206](FORM7206-GRAPH.md) have detailed contracts. [8915-D](FORM8915D-STATUS.md) is an older-year amendment source, with no 2026 filing route under its latest 2024 authority. Add remaining form parts, separate spouse attachments and MeF. |
| Investment, sales and elections | Forms 4797, 6252, 6781, 8824, 8615, 8814, 8997, 8621, Schedule D/8949, 1099-B/DA/DIV/INT/OID and K-1 capital items. | Resolve character, basis, holding period, installment/deferred gain, exchange and parent/child elections before Schedule D/1040 tax worksheets. [Capital](CAPITAL-GAIN-GRAPH.md), [transactions](TRANSACTION-GRAPH.md), [INT/OID](INTEREST-GRAPH.md), [Form 6781](FORM6781-GRAPH.md), [Form 8615](FORM8615-GRAPH.md), [Form 8814](FORM8814-GRAPH.md), [Form 8997](FORM8997-GRAPH.md), [Form 8621](FORM8621-GRAPH.md), [Schedule D PDF](PDF-SCHEDULED-MAP.md), and [8949 PDF](PDF-FORM8949-MAP.md) cover the relevant paths; specialist branches and MeF remain to reconcile. |
| Business limits and property | Forms 4562 **and** new 4562-B, 461, 4684, 4797, 4835, 6198, 7217, 8582, 8829, 8990; Schedules C/E/F/SE; K-1 partnership/S-corp/trust; rental and farm statements. | Build activity/asset-level basis, depreciation/amortization, at-risk, passive, business-interest and excess-business-loss ledgers before allowable profit reaches AGI, SE and QBI. Preserve carryforward origin year and activity. [C](SCHEDULEC-GRAPH.md), [E](SCHEDULEE-GRAPH.md), [F](SCHEDULEF-GRAPH.md), [SE](SCHEDULESE-GRAPH.md), [4835](FORM4835-GRAPH.md), [7217](FORM7217-GRAPH.md), [8829](FORM8829-GRAPH.md), [4797](FORM4797-GRAPH.md), [8990](FORM8990-GRAPH.md), and [4562-B](FORM4562B-GRAPH.md) specify known 2026 changes; audit remaining limitation forms and their statements against current instructions. |
| Income and adjustment miscellany | Forms 1099-G/K/MISC/NEC, 1099-C, W-2G, 1098/1098-E, Schedule R, Forms 2106, 3903, 982, 172 and 4852; NOL carryforward. | Classify each source by ownership, taxability and activity before Schedule 1/AGI; do not send gross information-return amounts to 1040 blindly. [Schedule 1](SCHEDULE1-GRAPH.md), [1099-G](FORM1099G-GRAPH.md), [1099-K](FORM1099K-GRAPH.md), [1099-MISC/NEC](FORM1099MISC-NEC-GRAPH.md), [moving/educator](FORM3903-EDUCATOR-GRAPH.md), [Form 4852](FORM4852-GRAPH.md), [interest](INTEREST-GRAPH.md), [SSA benefits](SSA-BENEFITS-GRAPH.md), [Form 982](FORM982-GRAPH.md), [Form 172/NOL](FORM172-NOL-GRAPH.md), and [ATS 2/6](ATS.md) pin several branches. Verify 2026 cancellation exclusions and NOL limits before coding. |
| Additional taxes and withholding | Forms 4137, 8919, 8959, 8960, 5329, 6251, 4972, 8814; W-2 and 1099 withholding, excess Social Security and other-tax statement. | Compute each 2026 Schedule 2 line independently, then total into 1040 line 23 without importing TY2025 line numbers. [Schedule 2/6251](PDF-SCHEDULE2-6251-MAP.md) covers the changed attachment; [Forms 4137/8919](FORM4137-8919-GRAPH.md) share the wage-base ledger, [Form 8959](FORM8959-GRAPH.md) pins its split tax and withholding routes, and [Form 8960](FORM8960-GRAPH.md) reconciles NIIT to the same investment sources used by income tax. |
| Nonbusiness and business credits | Forms 2441, 5695, 8396, 8826, 8834, 8835, 8839, 8859, 8862/8863, 8880, 8911, 8912, 8936 with Schedule A, 8962, 3800 and its source forms/statement; Form 8283 supports deduction rather than credit. | Decide eligibility/phaseout and refundable versus nonrefundable treatment, apply worksheet credit order, then Schedule 3/8812/1040. [Credit graph](FORM8862-8863-EIC-GRAPH.md), [5695](FORM5695-CREDIT-GRAPH.md), [8962](FORM8962-GRAPH.md), [8834](FORM8834-GRAPH.md), [8839](FORM8839-GRAPH.md), [8396/8859/8880](FORM8396-8859-8880-GRAPH.md), [8826/8835](FORM8826-8835-STATEMENTS.md), [8911 and MeF remainder](MEF-REMAINDER.md), [8912](FORM8912-GRAPH.md), [clean vehicles](FORM8936-GRAPH.md), [business credit](GENERAL-BUSINESS-CREDIT-GRAPH.md), and [QBI](QBI-COOPERATIVE-GRAPH.md) cover active paths. Audit older vehicle/energy credit sunsets by acquisition, construction and service dates, and preserve any valid carryforward. |
| Payment and filing statements | Form 4136 with per-business Schedule A; Form 8888 refund split; Forms 9465, 8379, 8958, 8978 with Schedule A; Schedule 3-A, Form 1062, W-2 and 1099 attachments; farm CCC/insurance, joint occupancy and other tax statements. | Run payment allocation only after 1040 tax/refund is final. Determine attachment eligibility and exact binary versus XML statement representation in current MeF. [Statement parity](FORM8826-8835-STATEMENTS.md), [MeF remainder](MEF-REMAINDER.md), [Form 4136](FORM4136-GRAPH.md), [ATS 5](ATS-SCENARIO-05.md), [1040 map](PDF-F1040-MAP.md), and [MeF drift](MEF-V1-DRIFT.md) anchor the changed filing path. |

## New 2026 inventory items and explicit gaps

The 2025 serializer and PDF inventories cannot reveal these by themselves:

- Form 1040 Schedule 1-A, Schedule 3-A and Form 1062, including the 1040
  12f/13a/13b, 24a–c, 30 and 32a–c dependencies. The current graph and PDF
  cover slices; the current MeF package is needed for filed XML.
- New [Form 1098-VLI](FORM1098VLI-GRAPH.md) lender evidence for Schedule
  1-A Part IV. The current per-VIN calculator/PDF needs loan qualification,
  refund and business-interest allocation before a complete filed route.
- Form 4562-B in [ATS 12](ATS-SCENARIO-12.md); new amortization attachment
  rather than the former Form 4562 Part VI.
- Form 7207, Form 7205, Form 7220, and Schedule A (Form 3800), with signed
  transfer PDF and certification/allocation evidence in [ATS 12](GENERAL-BUSINESS-CREDIT-GRAPH.md).
- Form 8888 in [ATS 5](ATS-SCENARIO-05.md); TY2025 has a metadata input but
  no filed PDF/MeF serializer in the inventories.
- Current Form 8995-A Schedules A–D and any 2026 QBI minimum/ordering changes
  in the [QBI contract](QBI-COOPERATIVE-GRAPH.md).
- The remaining older-year draft URL in [PDF coverage](pdf-coverage.csv) is
  `f4136sa`. The 2026 main Form 4136 is pinned; the current Schedule A URL
  still serves 2025. Its 2025 form and combined instructions are pinned as
  comparators in the [Form 4136 contract](FORM4136-GRAPH.md). Recheck the
  2026 Schedule A publication and current MeF attachment rules before filing.

## Close each row with the same evidence

For every node/form/statement being added: record the authority and revision,
source input and ownership, allowed amount or required answer, downstream
pending keys and cross-form reconciliation, PDF field/continuation map, MeF
XSD element and rule IDs, and at least one independent boundary or ATS
fixture. Update the three coverage ledgers and route-gap CSV; retain an
explicit `audit-required` disposition until the complete route is checked.
Run the TY2025 regression for a reused source or calculator. A form is not
complete because its 1040 total matches while a required attachment, answer,
carryforward, or binary is absent.
