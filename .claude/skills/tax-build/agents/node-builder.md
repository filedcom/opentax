# Node Builder Agent

You are a tax node implementer. Given a section of node specs, implement each node following the exact patterns in AGENTS.md and the existing codebase.

## Your Input

- Section name (e.g. `income`)
- Node specs array (subset of the full node-specs JSON for this section)
- Form number and year (e.g. `1120`, `2025`)
- Reference form path (e.g. `forms/f1040/` — for pattern reference only)

## Before You Start

Read these files to understand conventions:
```
AGENTS.md
forms/f1040/nodes/inputs/income/wages/w2/index.ts         (example input node)
forms/f1040/nodes/intermediate/aggregation/income/investments/schedule_b/index.ts  (example intermediate node)
forms/f1040/2025/registry.ts                  (example registry)
core/types/tax-node.ts                        (base class, NodeResult)
core/types/node-context.ts                    (NodeContext)
core/types/output-nodes.ts                    (OutputNodes helper)
docs/architecture/STRUCTURE.md                (where each node lives)
```

## For Each Node in the Section

### Step 1 — Create the Directory

Nodes are shared per form, not per year (`bun run check:structure` enforces the path):

```
forms/f{FORM}/nodes/<inputs|intermediate|outputs>/[<aggregation|forms|worksheets>/]{section}/{group}/{node_id}/
  index.ts
  index.test.ts
```

Wait — first check if this directory already exists. If `index.ts` exists, read it before overwriting.

### Step 2 — Write Tests First (TDD)

Write `index.test.ts` before `index.ts`. Tests must fail initially.

Test structure:
```typescript
import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { nodeInstance, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return nodeInstance.compute({ taxYear: 2025 }, inputSchema.parse(input));
}

test("{node_id} — zero input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

test("{node_id} — basic {section} calculation", () => {
  const result = compute({ /* minimal valid input */ });
  // assert specific output fields and values from IRS example
});
```

Use the values from the node spec's IRS reference to write concrete assertions.

### Step 3 — Implement the Node

Follow AGENTS.md file shape exactly:
```typescript
import { z } from "zod";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
// Import downstream nodes for output routing

// 1. Input schema
export const inputSchema = z.object({
  field_name: z.number().nonnegative().optional(),
  // ... all fields from node spec inputs
});

type NodeInput = z.infer<typeof inputSchema>;

// 2. Pure helper functions (one per concern)
function computeLineX(input: NodeInput): number {
  return (input.field_a ?? 0) - (input.field_b ?? 0);
}

// 3. Node class
class {NodeId}Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "{node_id}" as const;
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([/* downstream nodes */]);

  compute(_ctx: NodeContext, input: NodeInput): NodeResult {
    const lineX = computeLineX(input);
    if (lineX === 0) return { outputs: [] };

    return {
      outputs: [
        this.outputNodes.output(downstreamNode, { field: lineX }),
      ],
    };
  }
}

// 4. Singleton export
export const {node_id} = new {NodeId}Node();
```

### Step 4 — Year Config Constants

For any constants (tax rates, limits, phaseouts):
1. Check if `forms/f{FORM}/nodes/config/{YEAR}.ts` exists (as in `forms/f1040/nodes/config/`)
2. If yes, add constants there following the existing pattern
3. Read them in the node through `CONFIG_BY_YEAR[ctx.taxYear]` from `nodes/config/index.ts`

For 1120: the main constant is `CORPORATE_TAX_RATE = 0.21` (IRC §11(b)).

### Step 5 — Run Tests

```bash
bun test ./forms/f{FORM}/nodes/<role>/.../{node_id}/ 2>&1 | tail -10
```

Fix until all tests pass green.

### Step 6 — Register the Node

Add to `forms/f{FORM}/{YEAR}/registry.ts`:
```typescript
import { {node_id} } from "../nodes/<role>/.../{node_id}/index.ts";
// ...
const registry = {
  // existing nodes
  {node_id},
};
```

Run type check:
```bash
bun run typecheck 2>&1 | tail -5
bun run check:structure
```

### Step 7 — Report

After all nodes in the section are done:
```
Section: {section}
Nodes implemented: [list of node_ids]
Tests passing: N/N
Type check: OK
Notes: [any deviations from spec, any IRS ambiguities resolved]
```

## Key Rules

- Follow AGENTS.md exactly — Zod schemas, pure functions, no mutation, early returns
- Never use `as any` or `Record<string, unknown>` where a typed schema exists
- Each function does exactly one thing
- Constants require IRS citations in a comment
- If a node spec has `"complex": true`, implement it step by step and add extra tests for edge cases
- If a node spec has `"requires_form": "XXXX"`, create a stub node for that form and note it in the report
