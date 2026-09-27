# TY2026 Form 1040 entry point — implementation plan

Status: research snapshot, 2026-09-27. This directory now has a calculation
registry for a verified subset; `f1040_2026` is not registered in `catalog.ts`
yet. **Goal: the same full
calculation → validation → MeF XML → PDF → ATS/XSD workflow as TY2025, across
the supported 1040 form surface.** Do not call registration alone TY2026
support.
The [instruction availability ledger](../../../docs/ty2026/INSTRUCTION-COVERAGE.md)
now distinguishes 2026 drafts from draft URLs still serving 2025, so each
remaining route has an explicit source check before coding.

The dedicated 2026 Schedule H node now calculates Part I and FUTA Section A,
routes household employment tax to Schedule 2 line 17a, and has a two-page
draft PDF attachment. Its ATS line 9 No case reconciles $627 through Form
1040 line 23. Section B, payroll-to-form wage derivation, and MeF remain open;
see [the Schedule H contract](../../../docs/ty2026/SCHEDULEH-GRAPH.md).
The [Schedule E contract](../../../docs/ty2026/SCHEDULEE-GRAPH.md) maps the
pinned 2026 form and instructions to the existing property and K-1 nodes.
It identifies new line 13a vehicle-loan interest, the three-page Part I–V
attachment, downstream passive/at-risk/interest limits, and ATS scenarios 3
and 6. Schedule E is not registered in the TY2026 graph yet.
The [ATS scenario 6 plan](../../../docs/ty2026/ATS-SCENARIO-06.md) adds the
partnership Part II acceptance case. It also exposes a stale shared W-2G box
contract and missing 2026 Schedule 1 gambling line 8b route, while W-2 code
TT and the dependent standard deduction need source-backed reconciliation.
The [ATS scenario 2 plan](../../../docs/ty2026/ATS-SCENARIO-02.md) adds a
statutory employee W-2 → Schedule C route without double counting W-2 box 1
on Form 1040, and a deduction-choice/attachment conflict for Schedule A and
Form 8283. It also exercises 2026 pre-July mileage and the EIC opt-out.
The [Schedule C implementation contract](../../../docs/ty2026/SCHEDULEC-GRAPH.md)
pins the 109-widget draft PDF map and describes the new 16b/16c interest
split, 44a–44c vehicle labels, and per-activity statutory income ownership.
The [ATS scenario 5 plan](../../../docs/ty2026/ATS-SCENARIO-05.md) adds a
Form 8888 split-refund route after 2026 settlement. The shared input is
metadata-only and still includes obsolete savings-bond fields; no 2026
Form 8888 PDF or MeF serializer is registered yet.
The [ATS scenario 4 plan](../../../docs/ty2026/ATS-SCENARIO-04.md) maps its
W-2, Form 2441, Form 8862, Form 8863, Schedule EIC/8812, and Schedule 3-A
pages. The [credit graph contract](../../../docs/ty2026/FORM8862-8863-EIC-GRAPH.md)
specifies the recertification facts and 2026 credit order. These EIC/8862/8863
nodes and attachments are not in the TY2026 registry; the packet also lacks
the institution EIN and completed Form 8862 selections needed to file.
The [Schedule F contract](../../../docs/ty2026/SCHEDULEF-GRAPH.md) maps the
cash/accrual farm route and its attached forms. Its shared TY2025 input names
other interest as line 21b; the 2026 form uses that line for vehicle-loan
interest and moves other interest to 21c. The TY2026 route awaits a distinct
input/output shape, complete PDF, current MeF map, and ATS scenario 3 check.
The new [Form 4562-B contract](../../../docs/ty2026/FORM4562B-GRAPH.md)
uses the pinned 2026 draft to map amortization cost rows, prior-year assets,
activity destinations, and PDF/MeF work. Its 2026 instructions remain a
source gate before the amortization calculation can be implemented.
The [Form 4835 contract](../../../docs/ty2026/FORM4835-GRAPH.md) and
[ATS scenario 3 plan](../../../docs/ty2026/ATS-SCENARIO-03.md) connect
production-based farm rent to Schedule E while keeping Schedule F farm profit
separate for the elected Schedule SE farm optional method. That packet also
requires 1099-R, Schedule D, and QBI/cooperative reconciliation.
The [QBI/cooperative contract](../../../docs/ty2026/QBI-COOPERATIVE-GRAPH.md)
pins the continuous-use 1099-PATR source, 2026 Form 8995-A and its schedules.
It identifies incorrect shared box labels and the missing patron reduction,
section 199A(g), $400 minimum, PDF, and MeF routes. ATS scenario 3 has a
patron answer but lacks the cooperative statement needed to calculate them.
The [Schedule SE contract](../../../docs/ty2026/SCHEDULESE-GRAPH.md) maps the
owner-level source and optional-method rules, every 2026 PDF field, and the
MeF refresh gate. In particular, the current Schedule F output suppresses
low-profit/loss optional-method cases and the TY2025 PDF filler maps its first
money field to what is the 2026 name field.
`credit-resolution.ts` computes Schedule 8812 Worksheet B through line 14
and 2026 Form 5695 lines 1–4 in the required order. The registered graph
receives tax, dependent, AGI, Schedule 2, and Schedule 3 amounts.
The registered `credit_resolution` node now receives the pre-5695 Schedule 3
amounts and sends their totals to Form 1040 and Schedule 8812. Schedule 3
line 5a can no longer be injected into that upstream node. The `f5695` input
now routes the 2025 line 16 carryforward to this stage. One `f8812_facts`
input supplies earned-income worksheet evidence and other credit facts to
both provisional and final Schedule 8812. Graph and PDF tests cover a
dependent with Worksheet B and Form 5695. MeF attachment and broader
credit-source routing remain open.

The first executable 2026 calculation is `settlement.ts`: it assembles 1040
lines 24a–c and 32a–c, Schedule 3-A Part I/II, payments, refund, and amount
owed from upstream figures. Its source-backed tests cover the Form 1062 amount,
Schedule 2 offset, and Schedule 3-A election/eligibility decisions. It still
needs to be connected to the TY2026 node graph and serializers.
`deductions.ts` now computes 1040 lines 12e–15, including the nonitemizer
charitable cap. The shared Form 8962 node has explicit 2026 percentage,
repayment, affordability, and FPL paths, with boundary tests. These pieces
still require final output wiring and instruction reconciliation.
The shared Form 2441 calculations now select explicit TY2026 employer benefit
limits and credit rates. The TY2026 registry now separates taxable benefits
before AGI from the credit after calculated AGI and income tax; W-2 box 10,
Form 1040 line 1e, Schedule 3 line 2, and the Form 1040 credit total pass
focused graph checks. The draft PDF builder fills one printed page for a
credit-only return and two for an employee-benefit return, reconciling lines
11/26 to Schedule 3/Form 1040. A fourth or later provider/person goes on a
continuation page; the three highest amounts remain on the IRS form. The
Form 2441 filing input is not on the public start surface. Provider
eligibility, prior-year expenses, self-employed benefits, MeF, and ATS remain
to build.
The [Form 2441 contract](../../../docs/ty2026/FORM2441-GRAPH.md) uses the
pinned draft instructions to specify provider/benefit facts, the pre-AGI
benefit stage, post-AGI credit stage, and the full attachment work.
The `forms/f1040/nodes/config/2026-indexed.ts` module contains all 111 TY2026
config members, including the distinct MFS QBI threshold and standard/enhanced
SIMPLE plan limits. `forms/f1040/nodes/config/2026.ts` registers the complete
config for shared nodes; the TY2026 registry is an audited subset and still
needs the remaining source and form routes.
`nodes/f1040.ts` is a dedicated 2026 core output node: it computes the revised
deduction, tax, payment, and balance lines and emits Schedule 3-A data. It is
registered in the TY2026 calculation graph. Expand its upstream input surface and preserve
the 2025 credit-finalization behavior where 2026 law and forms still require it.
Its output now distinguishes AGI 11a/11b, withholding sources 25a–25d,
EIC checkboxes 27b/27c, refund 35a, applied estimates 36, and penalty 38.
`itemized-deductions.ts` computes the 2026 charitable floor and overall
itemized limitation from already allowable contribution and deduction amounts.
The Schedule A node and carryforward accounting remain to implement.
`schedule-a.ts` now assembles the revised Schedule A totals from those already
allowed source amounts, including SALT phaseout and both new limits. It is not
graph-wired. [`DEDUCTION-GRAPH.md`](../../../docs/ty2026/DEDUCTION-GRAPH.md)
specifies the joint Schedule A/QBI resolution required before full itemizer
support; the two calculations can depend on each other.
`nodes/standard_deduction.ts` is the dedicated 2026 deduction-choice node. It
uses 2026 standard-deduction amounts, sends the same total income and adjustments
to the 1040 node, and routes taxable income plus draft 2026 Form 6251 lines 1b
and 2a to the shared income-tax calculator. A focused graph test now executes
deduction choice → tax → 1040. Several income, Schedule A, and QBI routes
still need to be wired into the 2026 graph.
The shared Schedule 1-A calculation now emits 2026 form lines 15, 27, 36,
43, and 44; it passes lines 43 and 44 to the 2026 deduction node. The AGI
node adds back Form 2555 exclusions for its 2026 MAGI. Puerto Rico/Form 4563
addbacks remain to implement. W-2 box 12 TP/TT now supplies employee tip and
overtime facts, with an end-to-end calculation-graph test. Form 4137 line 1(c)
now joins W-2 TP by filer and employer; Schedule 1-A takes the larger amount
per employer. Mixed occupations require an explicit qualified amount. The
focused graph also carries unreported tip income and Schedule 2 tip tax to
1040. The 2026 final node explicitly rejects nonzero Schedule 2 credit-limit
tax until its credit finalization path is built. The full product remains to
register in `catalog.ts`.
The shared AGI aggregator now emits a TY2026 income/adjustment pair to this
node while retaining its TY2025 output contract. A graph test runs income
facts → AGI → deduction choice → tax → 1040 and checks Social Security and
Schedule 1 income pass-through. The rest of the 2026 input graph is pending.
The shared W-2 input now reaches that focused graph: two W-2 records produce
1040 wages, AGI, taxable income, income tax, withholding, and refund. This is
an executable calculation slice, not the registered 2026 product; other
income lines and the filing outputs remain to be completed.
The shared general input reaches the 2026 graph with dependent details.
`identity.ts` defines the 2026 Form 1040 filer fields from that input. The
dedicated 2026 Schedule 8812 node now finalizes CTC/ACTC in the calculation
graph using the 2026 worksheet and verified earned income where needed. The
PDF builder prints the changed dependent table, a continuation for more than
four dependents, and the two-page Schedule 8812 when its credit lines apply.
One W-2/CTC return runs through the graph and PDF bundle. The dedicated
2026 Schedule 3 node now routes W-2 excess Social Security withholding to
Form 1040 line 31 and sends its credit-line amounts to Schedule 8812 for
worksheet reconciliation. Its draft PDF prints the new line 13e and keeps
reserved line 5b blank. Other credit sources, MeF, and the broader dependent
credit cases remain open.
`schedule2.ts` now calculates the draft 2026 Schedule 2 subtotals with filed
line numbers, and `nodes/schedule2.ts` routes its totals into the focused 1040
graph. The [Schedule 2 and 8812 map](../../../docs/ty2026/SCHEDULE2-8812.md)
lists the remaining source splits and Part II-B dependency. Form 4137 tip tax
and W-2 box 12 A/B/M/N and K are routed; code Z requires its separate 409A
tax and interest calculation. Schedule 8812's `part_iib_2026` input now uses
Schedule 2 lines 16c and 17c and checks them against amounts calculated in
the graph. The 2026 Credit Limit Worksheet A uses its draft-instruction
Schedule 3 line list and rejects the TY2025 worksheet shape. Worksheet B
sums its four Schedule 3 credit lines. The graph reconciles worksheet wages
with W-2 wages and passes calculated Schedule 3 credit lines to final
Schedule 8812; other earned-income sources still need routing.
`inputs.ts`, `start.ts`, and `registry.ts` now define the first dedicated
TY2026 calculation entry point. It executes wages-only and W-2/Form 4137 tip
returns through the normal graph planner and executor. It is limited to nodes
whose TY2026 routes have been checked and is not a registered CLI product or
an export path yet. The generic start-node factory lives in
`forms/f1040/start.ts`, shared by both tax years.
`pdf/forms/f1040.ts` maps the current 1040 output fields to the pinned draft
AcroForm, including revised tax/payment lines and the new work-authorization
answers. `pdf/f1040.ts` fills the two printed pages from a calculated pending
1040; its wages-only sample was rendered and visually checked. The later
`pdf/core.ts` bundle now adds the supported dependent rows and attachments;
the remaining TY2025 form surface still needs TY2026 PDF output.
`pdf/schedule3a.ts` now renders the new one-page schedule with a static
overlay because the draft's 16 widgets are absent from its AcroForm tree. Its
line reconciliation, election checks, and rendered placement are verified.
`pdf/core.ts` now appends it when a relevant refundable credit is filed and
reconciles its main amounts to the 1040. The combined three-page PDF passed
visual QA; the remaining supported forms still need PDF output.
The final 1040 node and draft PDF descriptor also retain and print the
principal income amounts through 7a, including aggregate 1z wages,
accumulated dividends, and printed 7a capital gain. A populated income page
passed visual QA. Additional source nodes and supporting schedules remain.
The generated [graph route inventory](../../../docs/ty2026/GRAPH-ROUTES.md)
lists 33 declared edges from active nodes to targets outside this registry;
the wages-only run deposits values in 12 absent target slots. It gives the
dependency order for expanding beyond the current calculation slice.
Form 8960 is registered and sends TY2026 NIIT to the draft Schedule 2 line 6;
the shared node retains its TY2025 line 12 route.
Form 6251 is registered and sends TY2026 AMT to Schedule 2 line 2 and then
1040 line 17. A focused ISO-adjustment graph test verifies its draft 2026
exemption/rate arithmetic. `pdf/schedule2.ts` and `pdf/f6251.ts` now fill
the pinned draft attachments, and `pdf/core.ts` requires/reconciles them
when the 1040 reports their tax. The [field map](../../../docs/ty2026/PDF-SCHEDULE2-6251-MAP.md)
records missing print detail. Public ISO input, other source routes,
credit-limit feedback, and MeF remain open.
The [interest graph contract](../../../docs/ty2026/INTEREST-GRAPH.md) uses
the pinned 2026 Schedule B instructions to map every 1099-INT branch and the
filing decision before that source is exposed as a TY2026 input. Box 2 now
reaches AGI as well as Schedule 1 in the shared source node.
`nodes/schedule1.ts` maps that penalty and AGI-adjusted student-loan
interest to the 2026 printed lines. It rejects identified legacy source
keys whose old names would print the wrong line. `pdf/schedule1.ts` fills
the two printed draft pages and reconciles lines 10/26 to Form 1040 lines
8/10; the core PDF builder takes a named attachment object. The
[Schedule 1 contract](../../../docs/ty2026/SCHEDULE1-GRAPH.md) records the
remaining source and print-detail work.
Form 1098-E is a registered TY2026 input. The AGI calculation applies its
2026 phaseout before Schedule 1 line 21 and Form 1040 line 10 are printed.
The dedicated `ssa1099` input distinguishes SSA-1099 box 6 from RRB-1099
box 10 withholding. Net benefits reach Form 1040 line 6a, the AGI taxability
worksheet computes line 6b, and the PDF prints both. Negative aggregate net
benefits require a repayment-deduction route before filing; see the
[SSA benefits contract](../../../docs/ty2026/SSA-BENEFITS-GRAPH.md).
Final 2026 Form 1099-R and instructions are pinned. A dedicated `f1099r`
input uses boxes 7a–7d and 8a/8b and routes normal, fully taxable IRA and
pension distributions to AGI and the printed 1040. Other codes and special
accounts fail explicitly until their linked forms are built. Code 1 can
route the full 10% early-distribution tax to Schedule 2 line 5 when the
taxpayer supplies the full-tax and SIMPLE-period facts; see the
[1099-R contract](../../../docs/ty2026/FORM1099R-GRAPH.md). Form 1040 line
25b sums withholding from multiple 1099 sources in the active graph.
Single-code G pension-plan direct rollovers now retain separate gross and
taxable totals, reach AGI and Form 1040 lines 5a/5b, and mark draft line
5c(1) in the PDF. IRA and other rollover variants remain in the 1099-R
contract.
Normal code 7 pensions with a payer-determined taxable box 2a below the
gross box 1 now use the same separate totals without the rollover box.
The [Form 8606 contract](../../../docs/ty2026/FORM8606-GRAPH.md) uses the
newly pinned 2026 instructions to specify the owner-wide IRA basis inputs,
calculation order, PDF, and MeF work that remains before IRA basis or Roth
conversion cases can enter this registry.
An early SIMPLE IRA distribution in its first two years uses a dedicated
Form 5329 Part I node at 25%, with its three printed draft pages attached
to the return PDF. The [Form 5329 contract](../../../docs/ty2026/FORM5329-GRAPH.md)
records the implemented branch and the remaining parts, spouse handling,
and MeF work.
The dedicated TY2026 Form 1099-DIV input now routes ordinary, qualified,
and exempt-interest dividends, federal withholding, private-activity-bond
AMT interest, plain box 2a capital gain distributions, and NIIT income. Its
Schedule B filing path
reconciles with Form 1040 line 3b and the draft PDF. The continuous-use
[source and branch map](../../../docs/ty2026/DIVIDEND-GRAPH.md) records the
special-rate capital-gain, QBI, foreign-tax, state, and basis routes still
to implement; nonzero inputs on those routes fail before calculation.
The shared Schedule D node now decides when box 2a can print directly on
1040 line 7a with line 7b checked. The public `schedule_d` input requires
carryover amounts and QOF/other-capital-activity answers for this decision.
It also asks whether Form 4952 will be filed. The 2026 PDF bundle appends two
Schedule D pages for the carryover-plus-distribution case and reconciles their
totals with 1040 line 7a. Other source forms and Form 8949 transactions remain
explicit PDF blockers until their details are built.
The dedicated `nodes/schedule_b.ts` is registered and now consumes gross
interest with labeled adjustments, reconciles its lines, determines the
modeled filing and Part III triggers, and sends taxable interest through AGI
and Form 8960. A temporary graph test reaches 1040 from a 1099-INT source.
The [PDF field map](../../../docs/ty2026/PDF-SCHEDULEB-MAP.md) records all
72 draft widgets. `pdf/schedule_b.ts` fills the printed page and appends
continuations; `pdf/core.ts` attaches it to the 1040 and checks the line
totals. The public input and MeF attachment remain open.
The shared Form 8839 node now applies TY2026 adoption limits, emits the
refundable per-child credit to 1040 line 30, and tracks nonrefundable
carryforwards by origin year. Its full credit-limit worksheet and TY2026
serializers remain open.
CLI node inspection and graph commands accept `--year` and will select the
TY2026 registry once this product is registered.
The shared `auto_expense` and Form 2106 paths now apply the two 2026 business
mileage rates using reconciled half-year miles. Form 8621 excess distributions
use the return year for event dates and prior-year allocations.

## Graph and output contract

The engine builds a graph from each node's declared output edges. Its executor
merges upstream fields into a pending record keyed by node type, then calls
the final `f1040` node once. The TY2025 `f1040` node accepts a broad upstream
field set and also finalizes several credit worksheets. The new TY2026 node
currently accepts final amounts only; placing it in the 2025 registry would
discard the upstream detail needed to reproduce the existing credit paths.

Expand the 2026 `inputs.ts` and `registry.ts` explicitly. For each shared node,
confirm its TY2026 computation and output fields before adding it. Expand the
TY2026 `f1040` input schema to accept those fields, retain the still-applicable
credit finalizations, and map them to the revised 2026 line layout. Keep the
Schedule 3-A inputs upstream of `f1040`; the final node can emit the completed
Schedule 3-A record without creating a graph cycle. Check the execution plan
for cycles and run one wages-only 2026 return before catalog registration.

The source corpus and provenance are in [`docs/ty2026`](../../../docs/ty2026/README.md).
Its raw IRS draft forms, ATS scenarios, and authorities are committed; the
e-Services IMF package remains under ignored `.state/research/docs` because the
repository is public. The Drive folder contains `IMF_05-28-2026_Release-2.zip`
(SHA-256 `8408dbd9f7ae0040bc588b8daa3b7bb24280c8ca5b2396d9fcfb8c4db64963f4`),
with `1040x_Schema_2026v1.0.zip` and `1040_Business_Rules_2026v1.0.csv`.
IRS lists **2026v4.0** as the newer package on 2026-09-24. v1 is for research
and cannot be the final validation target.
The [v1 drift review](../../../docs/ty2026/MEF-V1-DRIFT.md) confirms that its
1040 XSD predates the draft form's 12f, 24a–c, 32a–c, Schedule 3-A, and
work-authorization topology. Do not serialize TY2026 from those v1 fields.

## Build contract

1. Audit the registered `forms/f1040/nodes/config/2026.ts` against every
   shared node that consumes it. The [source map](../../../docs/ty2026/CONSTANTS.md)
   records the values and conditional rules; config registration alone does not
   make a shared node TY2026 correct.
2. Audit every shared node listed in
   [`node-coverage.csv`](../../../docs/ty2026/node-coverage.csv), using
   [`year-literals.csv`](../../../docs/ty2026/year-literals.csv) to find
   literal-driven paths. A year literal
   that changes behavior must use `ctx.taxYear` or a year-specific node;
   comments alone still need source review. The highest-risk files are
   `general`, `f8835`, `f8936`, `form5695`, `form8962`, `form_8829`,
   `schedule_h`, `f8997`, and the final `f1040` output node.
3. Implement the changed TY2026 1040 domain lines and routes before export:
   12f nonitemizer charitable deduction; line 13a Schedule 1-A and 13b QBI;
   24a/24b/24c including Form 1062; 32a/32b/32c and Schedule 3-A; and
   refund/amount-due comparisons against 24c. The
   [form delta](../../../docs/ty2026/FORM-DELTA.md) records the draft evidence.
4. Define `forms/f1040/2026/{config,inputs,start,registry,index}.ts` and add
   `"f1040:2026"` to `catalog.ts` only when an end-to-end return can execute
   without TY2025 assumptions. Reuse a shared node only after its TY2026
   behavior has been verified. Keep TY2025 registry and outputs pinned.
5. Create `forms/f1040/2026/mef` from the selected TY2026 XSD, including
   document order, field maps, attachments, and return version. Create
   `forms/f1040/2026/pdf` from the final 2026 AcroForms. Add year-specific
   business rules and field registry to `FormDefinition` so `tax validate` and
   export select the same year's artifacts as calculation.
6. Build complete TY2026 fixtures from each relevant IRS ATS PDF. Keep source
   facts distinct from computed amounts and record contradictions. Validate
   synthetic and source-backed XML against the current TY2026 XSD; test
   field-by-field PDF output; run old TY2025 cases as regression evidence.

## Release gates

| Gate | Evidence required |
| --- | --- |
| Calculation | Every 2026 config field sourced; no 2025 behavior leaking into active paths; independent 2026 cases cover changed deductions, credits, and tax lines. |
| Output | Every supported 2025 MeF/PDF component is classified as updated, unchanged with verified 2026 source, replaced, or deliberately unsupported with a diagnostic. The CSV inventories enumerate the current surface. |
| Validation | Selected 2026 schema and business-rule version is recorded; emitted XML passes that XSD and relevant reject rules, including new Schedule 3-A and Form 1062 flows. |
| End to end | CLI create/add/get/validate/export works on TY2026 returns; complete IRS ATS scenario fixtures have expected outputs and valid attachments. |
| Regression | TY2025 stays bound to its own rules, schema, PDF mappings, and constants; its tests and benchmark remain green. |

The executable work order and file targets are in
[`IMPLEMENTATION.md`](../../../docs/ty2026/IMPLEMENTATION.md). No compatibility
shim or 2025 fallback is planned. If implementation later needs one, announce
its behavior and rationale before adding it, per `AGENTS.md`.
