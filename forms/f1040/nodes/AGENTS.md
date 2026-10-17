# forms/f1040/nodes/

Every Form 1040 `TaxNode`, shared by all tax years: validated source inputs,
intermediate forms/worksheets/aggregations, and final line assembly. Year
wiring (registry, inputs, start node) stays in `../2025/`; projections to MeF
XML or PDF stay in `../2025/mef/` and `../2025/pdf/`.

## Layout

- `inputs/<section>/<group>/<name>/` — source-document nodes (159).
- `intermediate/<forms|worksheets|aggregation>/<section>/<group>/<name>/` —
  computed nodes (53 / 7 / 7).
- `outputs/general/return-assembly/{f1040,schedule1}/` — final assembly (2).
- `config/` — `CONFIG_BY_YEAR`, year constants; no nodes.
- `types.ts` — `FilingStatus`, `TSJ`, `TS` enums and their `z.nativeEnum`
  schemas; reuse them, don't redefine.
- `utils.ts` (`normalizeArray`), `irs_country_code.ts`,
  `owned_business_filing.ts` — helpers shared across nodes.
- A node folder holds `index.ts` (class + singleton), optional split modules
  (`schema.ts`, `calculation.ts`, `*_review.ts`), `index.test.ts`, and
  `research/context.md` (IRS fields, sources, calculation steps).

## Rules

- Placement is `<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]<section>/<group>/<name>/<file>.ts`,
  `<section>` one of the seven in `SECTIONS`; `bun run check:structure`
  (`scripts/testing/structure.ts`) fails anything else.
- `nodeType` equals the folder name; extra nodes in one folder take a suffix
  (`f3800_current_orphan_allocation`, `form8995a_schedule_b`).
- Edges exist only through `outputNodes = new OutputNodes([...])` and
  `this.outputNodes.output(target, fields)`; the planner, `node graph` and the
  reachability check read nothing else.
- Fields routed to one target merge (`core/runtime/executor.ts`
  `mergePending`): the same key from two sources becomes an array, so a
  multi-source key's schema must accept an array (see `normalizeArray`).
- Tests sit beside the node as `index.test.ts` (`bun:test`, `@std/assert`,
  `fieldsOf` from `core/test-utils/output.ts`). Tests encode IRS-correct
  behavior: fix the node, not the test.

## Adding a node

1. Copy the nearest simple node — input: `inputs/taxes/investments/f8615/`;
   computed: `intermediate/forms/credits/individual/form8880/`.
2. Schema (Zod, enums via `z.nativeEnum`), pure helpers, class with
   `nodeType`, `inputSchema`, `outputNodes`, `compute()`; export the singleton.
3. Register it in `../2025/registry.ts` as `<nodeType>: <singleton>`.
4. Input node: add an `inputNodes` entry in `../2025/inputs.ts`. Computed
   node: add it to the `outputNodes` of each node that feeds it.
5. Add `index.test.ts` and `research/context.md` citing the IRS source.

## Verify

- `bun run check:structure`
- `bun test --timeout=1800000 ./forms/f1040/nodes/<role>/…/<name>`
- `bun run test:unit` (tsc), `bun run bench --form f1040 --year 2025`

## Read next

- [inputs/AGENTS.md](inputs/AGENTS.md), [intermediate/AGENTS.md](intermediate/AGENTS.md), [outputs/AGENTS.md](outputs/AGENTS.md), [config/AGENTS.md](config/AGENTS.md)
- [../../../core/AGENTS.md](../../../core/AGENTS.md) — `TaxNode`, `OutputNodes`
- [../../../docs/architecture/STRUCTURE.md](../../../docs/architecture/STRUCTURE.md)
