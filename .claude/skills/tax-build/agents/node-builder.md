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
docs/architecture/STRUCTURE.md                       (layout, naming, structure contract)
forms/f1040/nodes/AGENTS.md                          (node folder contents, adding a node)
forms/f1040/nodes/inputs/payments/estimated/ext/index.ts                     (small input node)
forms/f1040/nodes/intermediate/forms/credits/individual/form8880/index.ts    (computed node)
forms/f1040/nodes/intermediate/forms/credits/individual/form8880/index.test.ts (node test)
forms/f1040/nodes/config/index.ts, forms/f1040/nodes/config/2025.ts          (year constants)
forms/f1040/2025/registry.ts, forms/f1040/2025/inputs.ts                     (wiring)
core/types/tax-node.ts        (TaxNode, output, NodeResult, NodeOutput)
core/types/output-nodes.ts    (OutputNodes)
core/types/node-context.ts    (NodeContext: taxYear, formType)
scripts/testing/structure.ts  (what check:structure enforces)
```

## For Each Node in the Section

### Step 1 — Place the Node

Nodes are shared by every year of a form; a year folder holds only config and
wiring. `bun run check:structure` fails a `TaxNode` anywhere else than:

```
forms/f{FORM}/nodes/inputs/{section}/{group}/{node_type}/index.ts
forms/f{FORM}/nodes/intermediate/{aggregation|forms|worksheets}/{section}/{group}/{node_type}/index.ts
forms/f{FORM}/nodes/outputs/{section}/{group}/{node_type}/index.ts
```

- `inputs/` holds validated source documents the user supplies; `intermediate/`
  holds computed forms, worksheets and aggregations; `outputs/` the final line
  assembly.
- `{section}` is one of `general`, `income`, `adjustments`, `deductions`,
  `credits`, `taxes`, `payments`. `{group}` is a kebab-case subgroup
  (`business`, `return-assembly`, `estimated`, …).
- The folder name is the node type: `f<number>` for a source-document input,
  `form<number>` for a computed form, `schedule_<letter>` for a lettered
  schedule. File names under `forms/` are snake_case.
- The folder holds `index.ts`, `index.test.ts` and `research/context.md`
  (IRS fields, sources, calculation steps); split modules such as `schema.ts`
  or `calculation.ts` sit beside `index.ts`.

First check whether the directory already exists. If `index.ts` exists, read it before overwriting.

### Step 2 — Write Tests First (TDD)

Write `index.test.ts` before `index.ts`. Tests must fail initially.

Test structure:
```typescript
import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import type { z } from "zod";
import { {node_type}, inputSchema } from "./index.ts";

function compute(input: z.input<typeof inputSchema>) {
  return {node_type}.compute(
    { taxYear: 2025, formType: "f{FORM}" },
    inputSchema.parse(input),
  );
}

test("{node_type} — zero input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

test("{node_type} — basic {section} calculation", () => {
  const result = compute({ /* minimal valid input */ });
  // assert specific output fields and values from the IRS example,
  // e.g. fieldsOf(result.outputs, downstreamNode) from core/test-utils/output.ts
});
```

Use the values from the node spec's IRS reference to write concrete assertions.

### Step 3 — Implement the Node

Follow AGENTS.md file order exactly (imports, enums, item schema, input schema,
type aliases, pure helpers, node class, singleton export). Relative imports to
`core/` climb seven levels from an `inputs/` or `outputs/` node and eight from
an `intermediate/` node:
```typescript
import { z } from "zod";
import type { NodeResult } from "../../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";
// Import downstream nodes for output routing

// 1. Enums for finite domain codes, used with z.nativeEnum

// 2. Input schema
export const inputSchema = z.object({
  field_name: z.number().nonnegative().optional(),
  // ... all fields from node spec inputs
});

type NodeInput = z.infer<typeof inputSchema>;

// 3. Pure helper functions (one per concern)
function computeLineX(input: NodeInput): number {
  return (input.field_a ?? 0) - (input.field_b ?? 0);
}

// 4. Node class
class {NodeType}Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "{node_type}" as const;
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([/* downstream nodes */]);

  compute(ctx: NodeContext, input: NodeInput): NodeResult {
    const cfg = CONFIG_BY_YEAR[ctx.taxYear];
    const lineX = computeLineX(input);
    if (lineX === 0) return { outputs: [] };

    return {
      outputs: [
        this.outputNodes.output(downstreamNode, { field: lineX }),
      ],
    };
  }
}

// 5. Singleton export
export const {node_type} = new {NodeType}Node();
```

Edges exist only through `outputNodes` and `this.outputNodes.output(...)`; the
planner, `node graph` and the reachability check read nothing else.

### Step 4 — Year Config Constants

For any constants (tax rates, limits, phaseouts):
1. Add the field to the form's config type in `forms/f{FORM}/nodes/config/types.ts`
2. Add the value, with its IRS citation, to `forms/f{FORM}/nodes/config/{YEAR}.ts`
   and to that year's config object; `forms/f{FORM}/nodes/config/index.ts`
   maps years in `CONFIG_BY_YEAR` (create these, copying `forms/f1040/nodes/config/`, if missing)
3. Read them in `compute()` as `CONFIG_BY_YEAR[ctx.taxYear]`; never hard-code a
   year's amount in a node

`forms/f{FORM}/{YEAR}/config.ts` holds only the form type, tax year and MeF
schema version.

For 1120: the main constant is `CORPORATE_TAX_RATE = 0.21` (IRC §11(b)).

### Step 5 — Run Tests

```bash
bun test ./forms/f{FORM}/nodes/{role}/.../{node_type}/ --timeout=1800000 2>&1 | tail -10
```

Fix until all tests pass green.

### Step 6 — Register the Node

Add it to `forms/f{FORM}/{YEAR}/registry.ts`, keyed by its node type (the
executor resolves `registry[nodeType]`):
```typescript
import { {node_type} } from "../nodes/{role}/.../{node_type}/index.ts";
// ...
export const registry: NodeRegistry = {
  // existing nodes
  {node_type},
};
```

Then make it reachable:
- Input node: add an `inputNodes` entry in `forms/f{FORM}/{YEAR}/inputs.ts`
  (it becomes a CLI `--node_type` name).
- Computed node: add it to the `outputNodes` of each node that feeds it.

Run the checks:
```bash
bun run check:structure 2>&1 | tail -10
bun run typecheck 2>&1 | tail -5
```

### Step 7 — Report

After all nodes in the section are done:
```
Section: {section}
Nodes implemented: [list of node types with their paths]
Tests passing: N/N
check:structure: OK
Type check: OK
Notes: [any deviations from spec, any IRS ambiguities resolved]
```

## Key Rules

- Follow AGENTS.md exactly — Zod schemas, pure functions, no mutation, early returns
- Never use `as any` or `Record<string, unknown>` where a typed schema exists
- Each function does exactly one thing
- Constants require IRS citations in a comment
- If a node spec has `"complex": true`, implement it step by step and add extra tests for edge cases
- If a node spec has `"requires_form": "XXXX"`, create a stub node for that form (placed, registered and routed like any other) and note it in the report
- Never weaken a type to fix a compile error (`as any`, a widened parameter); fix the caller or the test
