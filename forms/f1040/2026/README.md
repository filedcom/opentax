# TY2026 Form 1040 entry point — implementation plan

Status: research snapshot, 2026-09-27. This directory is the planned home of
`f1040_2026`; it is not registered in `catalog.ts` yet. **Goal: the same full
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
`nodes/standard_deduction.ts` is the dedicated 2026 deduction-choice node. It
uses 2026 standard-deduction amounts, sends the same total income and adjustments
to the 1040 node, and routes taxable income plus draft 2026 Form 6251 lines 1b
and 2a to the shared income-tax calculator. A focused graph test now executes
deduction choice → tax → 1040. Upstream income, Schedule A, Schedule 1-A, and
QBI edges still need to be wired into the 2026 graph.
The shared AGI aggregator now emits a TY2026 income/adjustment pair to this
node while retaining its TY2025 output contract. A graph test runs income
facts → AGI → deduction choice → tax → 1040 and checks Social Security and
Schedule 1 income pass-through. The rest of the 2026 input graph is pending.
The shared W-2 input now reaches that focused graph: two W-2 records produce
1040 wages, AGI, taxable income, income tax, withholding, and refund. This is
an executable calculation slice, not the registered 2026 product; Form 1040
income-line completeness, general/identity input, validation, MeF, and PDF
remain to be connected.
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

Build a 2026 `inputs.ts` and `registry.ts` explicitly. For each shared node,
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
