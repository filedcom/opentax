# core/runtime/

Turns a `NodeRegistry` plus start inputs into a `pending` dict: plan the
graph, run each node once, merge outputs. Form-specific orchestration (two
passes, finalizers, pending normalization) belongs in the form's year
(`forms/f1040/2025/index.ts` `executeReturn`), not here.

## Layout
- `planner.ts` — `buildExecutionPlan(registry)`: Kahn topological sort over
  `outputNodeTypes`; one step per node type (step `id` = `nodeType`).
- `executor.ts` — `execute(plan, registry, inputs, ctx)` and
  `executeWithSourceDocuments(...)`; owns `mergePending`.
- `graph.ts` — `computeTaxGraph(root, registry, maxDepth)`: static tree for
  `opentax node graph`; no execution.
- `source-documents.ts` — `VerifiedSourceDocuments.verify(claims, documents)`:
  SHA-256-checked, privately copied source bytes.
- `mod.ts` — re-exports planner and executor.

## Rules
- The registry must contain `start`; edges to unregistered types are ignored;
  a cycle throws `Cycle detected in execution graph`.
- `execute` is stateless and never throws for a node: a Zod parse failure on a
  non-empty pending slot or a `compute()` throw becomes an
  `EXECUTOR_NODE_FAILURE` diagnostic and the run continues. An empty slot that
  fails to parse is skipped silently (optional node). Nodes with
  `implemented === false` are skipped.
- Merge semantics (`mergePending`, documented above it) are load-bearing for
  every form: repeated scalar deposits to one key accumulate into an array; a
  computed field replaces a value the start node deposited directly; a node's
  output to itself, and `finalizations`, replace instead of accumulate.
  A finalization for a node with no pending values throws.
- `carryforwards` from all nodes are merged into one map; `replayInput` is
  `structuredClone`d per step and returned only when present.
- Source documents: claims need distinct references and 64-hex digests, the
  byte set must match the claims exactly, and `getBytes` returns a copy.

## Verify
- `bun test --timeout=1800000 core/runtime/` (`executor.test.ts`,
  `executor-input-precedence.test.ts`, `planner.test.ts`, `graph.test.ts`).
- `bun run test:unit`.
- Merge or skip changes alter every return: run
  `bun run bench --form f1040 --year 2025` and `bun run check:oracle`.

## Read next
- [../AGENTS.md](../AGENTS.md) — `TaxNode` and `OutputNodes` contracts
- [../../forms/f1040/2025/index.ts](../../forms/f1040/2025/index.ts) — the
  year's `executeReturn` built on `execute`
- [../../cli/store/AGENTS.md](../../cli/store/AGENTS.md) — how stored inputs
  become `inputs`
