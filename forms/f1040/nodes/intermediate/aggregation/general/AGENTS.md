# nodes/intermediate/aggregation/general/

Whole-return aggregators (`return-assembly/`) that turn lines from every
section into Form 1040 inputs.

- `agi_aggregator` — about 50 modules route here, mostly Income and
  Adjustments plus `schedule_se`, `form2441`, `f1098`. It computes Form 1040
  lines 6b, 8, 9, 10 and 11, and sends AGI/MAGI to Credits, Deductions and
  Taxes nodes.
- `agi_final` — reached only from `form8582` in the passive-loss two pass. It
  re-runs `agi_aggregator.compute` with the allowed losses and drops the
  `form8582` output.
- `schedule3` — credits and Part II payments in, one output to `f1040`.

Conventions verified in code:

- `agi_aggregator` and `agi_final` use `get outputNodes()` because of the
  import cycle `agi_aggregator` → `form8582` → `agi_final` → `agi_aggregator`.
  Keep it a getter.
- `agi_aggregator` checks `Object.hasOwn` for the removed
  `line8d_foreign_housing_deduction` key before Zod can strip it. Removed
  keys are rejected, not ignored.
- `schedule3` writes print totals (`line1_total` … `line15_total`) to its own
  node type, under keys distinct from its inputs; otherwise `mergePending`
  would turn them into arrays. `f1040` later replaces that entry through
  `finalizations`.

## Verify

- `bun test ./forms/f1040/nodes/intermediate/aggregation/general --timeout=1800000`
- `bun run bench --form f1040 --year 2025` and `bun run check:oracle`

Section map: [../../../inputs/general/AGENTS.md](../../../inputs/general/AGENTS.md)
