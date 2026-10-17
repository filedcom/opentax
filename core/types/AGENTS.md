# core/types

The node contract every form builds on. Type-only except `TaxNode`,
`UnimplementedTaxNode`, `output()` and `OutputNodes`. Parent:
[../AGENTS.md](../AGENTS.md).

## Files

- `tax-node.ts` — `TaxNode<TSchema>` (`nodeType`, `inputSchema`,
  `outputNodes`, `compute(ctx, input)`); `NodeResult` with `outputs` plus
  optional `replayInput`, `finalizations` (replace earlier pending fields
  instead of accumulating) and `carryforwards`; `AtLeastOne<T>`; `output()`.
- `output-nodes.ts` — `OutputNodes([...])`: `nodeTypes` is the node's graph
  edges; `outputNodes.output(node, fields)` restricts `node` to the declared
  list at compile time only (no runtime check).
- `node-context.ts` (`{ taxYear, formType }`), `node-registry.ts`
  (`NodeRegistry`).
- `form-definition.ts` — `FormDefinition` / `InputNodeEntry` /
  `PreparedFormReturn`: what `catalog.ts` and the CLI call (`executeReturn`,
  `prepareReturn`, `buildMefXml`, `buildPdfBytes`, `buildPending`). Array
  inputs carry `itemSchema`, singletons `inputSchema`.
- `assets.d.ts` — lets `import x from "./f.pdf" with { type: "file" }`
  type-check (used by `forms/f1040/2025/domains/general/filing/form8886/public_return.ts`).

## Traps

- `UnimplementedTaxNode` has `implemented = false`; the executor skips it
  (`core/runtime/executor.ts`) and its `compute` throws.
- `form-definition.ts` is the only `core/` file importing from `forms/`
  (type-only); the `mefSchemaVersion` comment's `2025v3.0` is an old example —
  the year config holds `2025v5.4`.
- `TaxNode`, `NodeRegistry` and related types are re-exported from `mod.ts`.

## Verify

- `bun test --timeout=1800000 ./core/types/`
- `bun run test:unit` and `bun run check:structure` after changing a contract.
