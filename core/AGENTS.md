# core/

The form-agnostic engine: the `TaxNode` contract, graph planning and
execution, source-document verification, and the MeF business-rule engine.
Nothing tax-year- or form-specific belongs here — nodes, rules, field maps
and projections live under `forms/<form>/`; persistence and IO under `cli/`.

## Layout
- `types/tax-node.ts` — `TaxNode` (`nodeType`, `inputSchema`, `outputNodes`,
  `compute`), `NodeResult`, `output()`, `UnimplementedTaxNode`.
- `types/output-nodes.ts` — `OutputNodes`: declares a node's downstream
  targets and type-checks `output(node, fields)` against them.
- `types/form-definition.ts` — `FormDefinition`, what `catalog.ts` maps
  `"<form>:<year>"` to (`registry`, `inputNodes`, `executeReturn`, MeF/PDF
  builders).
- `types/node-registry.ts`, `types/node-context.ts` — `nodeType` → node map;
  `{ taxYear, formType }` passed to `compute`.
- `runtime/` — planner, executor, static graph, verified source documents.
- `validation/` — rule DSL, `ReturnContext`, evaluation and report formatting.
- `test-utils/output.ts` — `fieldsOf(outputs, node)` for node tests.

## Rules
- `core/runtime/` and `core/validation/` import nothing outside `core/`
  (plus `zod`). The one exception is `types/form-definition.ts`, which
  type-imports MeF types from `forms/f1040/`; don't add more.
- `outputNodeTypes` comes from `outputNodes`; it is the only edge source the
  planner, `node graph` and `bun run check:structure` (reachability) read.
- Public re-exports for library users are in the root `mod.ts`; keep them in
  step when renaming an export here.
- File names are kebab-case; tests sit beside their module as
  `<name>.test.ts` using `bun:test` and `@std/assert`.

## Verify
- `bun run test:unit` — runs every `core/` test, plus `tsc` over the tree.
- `bun test --timeout=1800000 core/` for a fast local loop.
- `bun run check:structure` after changing `TaxNode` or `OutputNodes`.
- A change to merge or execution semantics moves computed lines: also
  `bun run bench --form f1040 --year 2025`.

## Read next
- [runtime/AGENTS.md](runtime/AGENTS.md)
- [validation/AGENTS.md](validation/AGENTS.md)
- [../cli/AGENTS.md](../cli/AGENTS.md)
- [../docs/architecture/STRUCTURE.md](../docs/architecture/STRUCTURE.md)
