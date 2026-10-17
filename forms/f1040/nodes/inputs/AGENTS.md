# forms/f1040/nodes/inputs/

Source-document nodes: each validates one document or user-supplied fact set
(W-2, 1099s, K-1s, Schedule C/E entries, review records) and routes its fields
to the computed nodes. Arithmetic beyond splitting a document into routed
fields belongs in `../intermediate/`.

## Layout

- `<section>/<group>/<name>/` — the seven sections; groups such as
  `income/wages`, `income/rental-passthrough`, `credits/foreign`,
  `payments/estimated`. Each section has an `AGENTS.md` map.
- 159 node classes; most in `index.ts`, a few extra per folder
  (`credits/business/f3800/current_allocation_node.ts`).
- Shared review/source schemas sit beside the node (`f8615/schema.ts`,
  `f8615/dependent_source_review.ts`).

## Rules

- Node type naming: `f<number>` for numbered forms (`f1099int`, `f8615`,
  `f1116_review`); otherwise a descriptive snake_case name (`w2`, `ssa1099`,
  `k1_partnership`, `schedule_c`). It is the public CLI input name.
- A node is user-reachable only through an `inputNodes` entry in
  `../../2025/inputs.ts`; the start node
  (`../../2025/return-processing/start.ts`) builds its strict schema from
  those entries, keyed by `inputKey ?? nodeType`.
- `isArray: false` → `{ node, inputSchema, isArray: false }`; the payload is
  passed through as the node's fields.
- `isArray: true` → `{ node, itemSchema, isArray: true }`; the items arrive
  under the **first key** of the node's `inputSchema` (`w2` →
  `{ w2s: [...] }`), so keep that array key first.
- Parse at the boundary: `compute()` starts with `inputSchema.parse(rawInput)`
  (see `f8615/index.ts`). Reject incomplete sources with a Zod message naming
  what is missing rather than defaulting a value.
- A schema change can invalidate benchmark cases: `bun run check:cases`
  reports each case `form add` would now reject. Fix the case only from its
  cited source; invalid cases are listed in `benchmark/cases/baseline.json`.

## Adding an input node

Copy `taxes/investments/f8615/` (schema in `schema.ts`, one output to
`income_tax_calculation`). Register it in `../../2025/registry.ts`, add the
`inputNodes` entry in `../../2025/inputs.ts`, and route it via `outputNodes`
to every node it feeds.

## Verify

- `bun run check:structure` (unreachable: not in `inputNodes` and not routed)
- `bun run check:cases`
- `bun test --timeout=1800000 ./forms/f1040/nodes/inputs/<section>/<group>/<name>`
- `bun run tax node inspect --node_type <type>` shows the accepted schema.

## Read next

- [../AGENTS.md](../AGENTS.md) — placement and the add-a-node checklist
- [../intermediate/AGENTS.md](../intermediate/AGENTS.md)
- [../../2025/return-processing/README.md](../../2025/return-processing/AGENTS.md)
- [../../../../benchmark/AGENTS.md](../../../../benchmark/AGENTS.md)
