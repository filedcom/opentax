# TY2026 calculation graph route inventory

The October 16 loaded `sourceRegistry2026` has **58 nodes and 302 unique declared
edges**. **15 edges target unregistered nodes**, replacing the historical
prototype's 33-edge snapshot. Generate current evidence with:

```sh
python3 docs/ty2026/tooling/build_inventory.py
python3 docs/ty2026/tooling/build_inventory.py --check
```

The [complete edge ledger](../inventories/graph-routes.csv),
[unregistered-target ledger](../inventories/graph-route-gaps.csv) and
[runtime snapshot](../inventories/runtime-surface.json) use actual loaded node
metadata. The historical `forms/f1040/2026/build_route_gaps.ts` command is absent
from this checkout. See the [inventory contract](../tooling/README.md).

## Remaining declared targets

| Producers | Targets requiring route review |
| --- | --- |
| AGI | `agi_final`, `form8582`, `form8995`, `form_1116`, `schedule_j_calculation` |
| General identity | `form8995` |
| Income tax | `form8978_reporting_year`, `form_1116` |
| W-2 | `form8839`, `form8853`, `form8995`, `ira_deduction_worksheet`, `schedule_se` |
| Forms 4137 and 8919 | `schedule_se` |

All these target names exist in the current TY2025 registry. That does not prove
their year-specific behavior, source support or filing routes are reusable.

The planner ignores absent target nodes while the executor can deposit fields
into their pending slots. Conversely, a combined 2026 adapter can own calculations
that use separate 2025 nodes. The current business, deduction and retirement
routes already combine some work this way. Inspect the emitted fields, supported
source branches and final return reconciliation before deciding to register a
node, redirect an edge or explicitly reject a source. A missing target is neither
automatic data loss nor permission to ignore a material amount.

## Completion evidence

For each supported source scenario, trace material amounts and required answers
through their final producer and consumer, PDF, carryforward and native filing
output. A scenario must either consume a supported source correctly or return an
explicit unsupported-source diagnostic. Registration alone does not meet that
requirement, and this edge inventory does not enumerate all unimplemented tax
branches or dynamic outputs.

Use the [223-node TY2025 ledger](../inventories/node-coverage.csv) alongside these
edges; 32 newer TY2025 nodes still need review-note assignments. The broader
[parity queue](../readiness/PARITY-QUEUE.md) also includes forms new for 2026,
source authority, current schema/rules, ATS, public product assembly and 2025
regressions. All remain part of the completion requirement.
