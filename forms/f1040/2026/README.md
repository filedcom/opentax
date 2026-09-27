# TY2026 Form 1040 entry point — implementation plan

Status: research snapshot, 2026-09-27. This directory now has a calculation
registry for a verified subset; `f1040_2026` is not registered in `catalog.ts`
yet. **Goal: the same full
calculation → validation → MeF XML → PDF → ATS/XSD workflow as TY2025, across
the supported 1040 form surface.** Do not call registration alone TY2026
support.

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
limits and credit rates; their 2026 output mappings remain to build.
The `forms/f1040/nodes/config/2026-indexed.ts` module contains all 111 TY2026
config members, including the distinct MFS QBI threshold and standard/enhanced
SIMPLE plan limits. `forms/f1040/nodes/config/2026.ts` registers the complete
config for shared nodes; the TY2026 return graph still needs its own audit and
registration.
`nodes/f1040.ts` is a dedicated 2026 core output node: it computes the revised
deduction, tax, payment, and balance lines and emits Schedule 3-A data. It is
not in a registered graph yet. Expand its upstream input surface and preserve
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
deduction choice → tax → 1040. Upstream income, Schedule A, Schedule 1-A, and
QBI edges still need to be wired into the 2026 graph.
The shared Schedule 1-A calculation now emits 2026 form lines 15, 27, 36,
43, and 44; it passes lines 43 and 44 to the 2026 deduction node. The AGI
node adds back Form 2555 exclusions for its 2026 MAGI. Puerto Rico/Form 4563
addbacks remain to implement. W-2 box 12 TP/TT now supplies employee tip and
overtime facts, with an end-to-end calculation-graph test. Form 4137 line 1(c)
now joins W-2 TP by filer and employer; Schedule 1-A takes the larger amount
per employer. Mixed occupations require an explicit qualified amount. The
focused graph also carries unreported tip income and Schedule 2 tip tax to
1040. The 2026 final node explicitly rejects nonzero Schedule 2 credit-limit
tax until its credit finalization path is built. The full return remains to
register.
The shared AGI aggregator now emits a TY2026 income/adjustment pair to this
node while retaining its TY2025 output contract. A graph test runs income
facts → AGI → deduction choice → tax → 1040 and checks Social Security and
Schedule 1 income pass-through. The rest of the 2026 input graph is pending.
The shared W-2 input now reaches that focused graph: two W-2 records produce
1040 wages, AGI, taxable income, income tax, withholding, and refund. This is
an executable calculation slice, not the registered 2026 product; Form 1040
income-line completeness, validation, MeF, and PDF remain to be connected.
The shared general input reaches the 2026 graph with dependent details.
`identity.ts` defines the 2026 Form 1040 filer fields from that input. The
dedicated 2026 Schedule 8812 node now finalizes CTC/ACTC in the calculation
graph using the 2026 worksheet and verified earned income where needed. The
PDF builder prints the changed dependent table, a continuation for more than
four dependents, and the two-page Schedule 8812 when its credit lines apply.
One W-2/CTC return runs through the graph and PDF bundle. MeF, Schedule 3
credit-source reconciliation, and the broader dependent credit cases remain
open.
`schedule2.ts` now calculates the draft 2026 Schedule 2 subtotals with filed
line numbers, and `nodes/schedule2.ts` routes its totals into the focused 1040
graph. The [Schedule 2 and 8812 map](../../../docs/ty2026/SCHEDULE2-8812.md)
lists the remaining source splits and Part II-B dependency. Form 4137 tip tax
and W-2 box 12 A/B/M/N and K are routed; code Z requires its separate 409A
tax and interest calculation. Schedule 8812's `part_iib_2026` input now uses
Schedule 2 lines 16c and 17c and checks them against amounts calculated in
the graph. The 2026 Credit Limit Worksheet A uses its draft-instruction
Schedule 3 line list and rejects the TY2025 worksheet shape. Worksheet B now
sums its four Schedule 3 credit lines. Their graph reconciliation,
earned-income sources, and credit output still need a complete 2026 return
path.
`inputs.ts`, `start.ts`, and `registry.ts` now define the first dedicated
TY2026 calculation entry point. It executes wages-only and W-2/Form 4137 tip
returns through the normal graph planner and executor. It is limited to nodes
whose TY2026 routes have been checked and is not a registered CLI product or
an export path yet. The generic start-node factory lives in
`forms/f1040/start.ts`, shared by both tax years.
`pdf/forms/f1040.ts` maps the current 1040 output fields to the pinned draft
AcroForm, including revised tax/payment lines and the new work-authorization
answers. `pdf/f1040.ts` fills the two printed pages from a calculated pending
1040; its wages-only sample was rendered and visually checked. It is not yet
the full return PDF builder: dependent rows and attached forms remain.
`pdf/schedule3a.ts` now renders the new one-page schedule with a static
overlay because the draft's 16 widgets are absent from its AcroForm tree. Its
line reconciliation, election checks, and rendered placement are verified.
`pdf/core.ts` now appends it when a relevant refundable credit is filed and
reconciles its main amounts to the 1040. The combined three-page PDF passed
visual QA; the remaining supported forms still need PDF output.
The final 1040 node and draft PDF descriptor also retain and print the
principal income amounts through 7a, including aggregate 1z wages,
accumulated dividends, and printed 7a capital gain. A populated income page passed visual QA. Its
source nodes and supporting schedules remain to join the 2026 registry.
The generated [graph route inventory](../../../docs/ty2026/GRAPH-ROUTES.md)
lists 37 declared edges from active nodes to targets outside this registry;
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
