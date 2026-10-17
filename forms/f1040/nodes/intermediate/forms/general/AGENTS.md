# nodes/intermediate/forms/general/

Computed General-section forms. Neither node computes a tax amount.

- `filing/joint_occupancy_statement/` — node type `joint_occupancy_statement`.
  Only Credits `form5695`
  (`../credits/individual/form5695/index.ts`) emits it, from its
  `fuel_cell_joint_occupancy` / `part_ii_joint_occupancy` routes. This module also holds the joint-occupancy
  math that `form5695` imports (`calculatedHomeImprovementCredit`,
  `calculatedFuelCellAllocation`, `fuelCellSchema`, `HomeImprovementKind`,
  and the per-kind `CREDIT_LIMIT` table), so a change here changes the Form
  5695 credit. MeF serializer:
  `../../../../2025/mef/forms/general/return-assembly/joint_occupancy_statement.ts`
  (pending key `joint_occupancy_statement`).
- `investments/form8997/` — node type `form8997`, a legacy duplicate of input
  `f8997`. It rejects every input, is not in `2025/registry.ts` and is
  listed in `scripts/testing/structure-baseline.json`. Put new Form 8997 work
  in `../../../inputs/general/investments/f8997/`.

Both nodes return `outputs: []`. The serializers read their pending entries
directly (see the section map).

## Verify

- `bun test ./forms/f1040/nodes/intermediate/forms/general --timeout=1800000`
- `bun test ./forms/f1040/nodes/intermediate/forms/credits/individual/form5695 --timeout=1800000`
  after changing the joint-occupancy schema or limits.
- `bun run check:structure`

Section map: [../../../inputs/general/AGENTS.md](../../../inputs/general/AGENTS.md)
