# forms/f1040/nodes/intermediate/

Computed nodes between the source inputs and final assembly: IRS forms the
engine fills, IRS worksheets, and aggregators that collect routed fields.
User-supplied documents belong in `../inputs/`; final 1040/Schedule 1 lines in
`../outputs/`.

## Layout

- `forms/<section>/<group>/<name>/` — 53 computed forms: `form<number>`
  (`form8959`, `form6251`), `schedule_<letter>` (`schedule_se`,
  `schedule_h`), `schedule1a`, `eitc`.
- `worksheets/<section>/<group>/<name>/` — 7 worksheets: `qdcgtw`,
  `standard_deduction`, `income_tax_calculation` (+ `tax_brackets.ts`,
  `tax_table_2025.ts`), `ira_deduction_worksheet`, …
- `aggregation/<section>/<group>/<name>/` — 7 aggregators: `agi_aggregator`,
  `agi_final`, `schedule3` (`general/return-assembly/`), `schedule_b`,
  `schedule_d`, `schedule_d_final` (`income/investments/`), `schedule2`.
- Each section folder has an `AGENTS.md`. Larger nodes split logic into
  `calculation.ts` and `*_review.ts` beside `index.ts`.

## Rules

- Pick the kind by what the IRS publishes: a numbered form or schedule →
  `forms/`; a worksheet in instructions → `worksheets/`; a node that only
  sums routed fields for another → `aggregation/`.
- Data arrives only as fields routed by upstream `outputNodes`; never call
  another node's `compute()` (importing its exported pure helpers is fine).
- Fields merge per key (`core/runtime/executor.ts` `mergePending`): two
  deposits of one key become an array, so schemas for multi-source keys
  accept arrays (`normalizeArray` in `../utils.ts`).
- Year numbers come from `CONFIG_BY_YEAR[ctx.taxYear]`
  (`../config/index.ts`), as in `worksheets/taxes/calculation/income_tax_calculation/`.
- Return `{ outputs: [] }` when the form is not required (see `form8880`).
- Keep math in exported pure functions (`calculateForm8880`) so
  `index.test.ts` can test them without the graph.

## Adding a computed node

Copy `forms/credits/individual/form8880/` (`calculation.ts` holds schema and
math; `index.ts` routes to `schedule3`). Register it in
`../../2025/registry.ts` and add it to the `outputNodes` of every node that
feeds it; otherwise `check:structure` reports it unreachable.

## Verify

- `bun test --timeout=1800000 ./forms/f1040/nodes/intermediate/<kind>/<section>/<group>/<name>`
- `bun run check:structure`
- `bun run bench --form f1040 --year 2025` — any change here can move lines.

## Read next

- [../AGENTS.md](../AGENTS.md)
- [../config/AGENTS.md](../config/AGENTS.md)
- [../outputs/AGENTS.md](../outputs/AGENTS.md)
- [../../../../core/AGENTS.md](../../../../core/AGENTS.md) — executor merge rules
