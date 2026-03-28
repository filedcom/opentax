---
name: tax-node-from-context
description: Implement a tax input node from its context.md research file. Reads the context, writes index.ts (TaxNode subclass with Zod schema + compute routing) and index.test.ts (unit tests per routing rule), then registers it. Use when adding a new tax form node from a completed context.md.
---

# Implement Tax Node from Context

**Node(s) to implement:** $ARGUMENTS

## Step 0 — Read architecture references

Before writing anything, read:

- `nodes/2025/f1040/inputs/INT/index.ts` — canonical simple routing pattern
- `nodes/2025/f1040/inputs/W2/index.ts` — canonical complex routing with
  multiple outputs
- `nodes/2025/f1040/inputs/W2/index.test.ts` — canonical test structure
- `nodes/2025/registry.ts` — registry to update

## Step 1 — Read the context.md

For each node being implemented, read:
`nodes/2025/f1040/inputs/{NODE}/research/context.md`

Extract from the context:

1. **Data Entry Fields table** → Zod schema fields
2. **Per-Field Routing table** → `compute()` routing logic
3. **Calculation Logic section** → any non-trivial computation before routing
4. **Constants & Thresholds** → hard-coded TY2025 values (phase-out limits,
   caps, rates)
5. **Edge Cases** → validation rules (throw on invalid input)

## Step 2 — Design the Zod schema

Rules:

- `export const inputSchema = z.object({...})`
- Use `z.string()` for required identifiers (payer_name, etc.)
- Use `z.number().nonnegative().optional()` for dollar amounts (most box fields)
- Use `z.number().optional()` (no `.nonnegative()`) for amounts that can be
  negative (adjustments, gains/losses)
- Use `z.boolean().optional()` for checkboxes — **NEVER use `.default()`** on
  Zod fields. Apply defaults in `compute()` with `?? defaultValue`
- Use `z.enum([...]).optional()` for routing selectors — **NEVER use
  `.default()`**
- Required fields (payer_name, etc.): no `.optional()`

## Step 3 — Implement compute()

```typescript
class XNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "x";          // matches what upstream nodes route to
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = ["f1040", "schedule1", ...] as const;

  compute(input: XInput): NodeResult {
    const outputs: NodeOutput[] = [];
    // routing logic here
    return { outputs };
  }
}

export const x = new XNode();
```

Key patterns:

- **No mutation** — push to `outputs[]`, never modify inputs
- **Collect then emit**: when multiple fields go to the same downstream node
  (e.g., f1040), build a single merged output object instead of multiple outputs
  to the same nodeType
- **Threshold checks**: validate cross-field constraints (box1b <= box1a, etc.)
  with `throw new Error(...)` at the top of compute()
- **Default handling**: `const someField = input.someField ?? defaultValue`
- For routing selectors: `const routing = input.for_routing ?? "schedule_c"`

## Step 4 — nodeType naming convention

The `nodeType` must match what upstream nodes route to when they emit
`{ nodeType: "..." }`. Check existing routing in other nodes:

```bash
grep -r '"nodeType":' nodes/2025/f1040/inputs/ | grep "yourNodeType"
```

If the node receives inputs from upstream (e.g., `schedule_a` receives from
`1098`), it MUST use the exact nodeType that upstream nodes reference.

## Step 5 — Write tests

```typescript
// index.test.ts
import { assertEquals } from "@std/assert";
import { myNode } from "./index.ts";

Deno.test("myNode.compute: [field] routes to [destination]", () => {
  const result = myNode.compute({ requiredField: "value", targetField: 1000 });
  const out = result.outputs.find((o) => o.nodeType === "targetNode");
  assertEquals(out !== undefined, true);
  const input = out!.input as Record<string, unknown>;
  assertEquals(input.expectedKey, 1000);
});
```

One test per routing rule. Test:

- Each box/field routing to correct downstream node with correct key
- Validation errors (throw on invalid cross-field combos)
- Edge cases from context (zero amounts, missing optionals, enum branches)
- Schema validation (`myNode.inputSchema.safeParse({})` returns `success: false`
  for missing required fields)

Do NOT write integration tests (no executor/planner imports) unless the node
already has them.

## Step 6 — Run tests

```bash
deno test nodes/2025/f1040/inputs/{NODE}/ --allow-read
```

All tests must pass before proceeding.

## Step 7 — Add intermediate stubs for new downstream nodeTypes

If `compute()` routes to a nodeType not yet in `nodes/2025/f1040/intermediate/`:

```bash
mkdir -p nodes/2025/f1040/intermediate/{newNode}
cat > nodes/2025/f1040/intermediate/{newNode}/index.ts << 'EOF'
import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";
export const {newNode} = new UnimplementedTaxNode("{newNode}", []);
EOF
```

## Step 8 — Register in nodes/2025/registry.ts

Add import and registry entry. The registry key MUST equal the node's `nodeType`
string:

```typescript
// import
import { myNode } from "./f1040/inputs/{NODE}/index.ts";

// registry entry (key = nodeType)
myNode_nodeType_string: myNode,
```

If the input node's nodeType matches an existing intermediate stub (e.g.,
`schedule_a`), replace the stub in the registry with the real node. Do NOT
register both.

## Step 9 — Wire into start node

**All input nodes must be reachable from the graph.** The graph is start-driven:
only nodes discoverable via `outputNodeTypes` traversal from `start` are
executed.

Edit `nodes/2025/f1040/start/index.ts`:

1. Import the new node's `inputSchema`:
   ```typescript
   import { inputSchema as myNodeInputSchema } from "../inputs/{NODE}/index.ts";
   ```

2. Add the input array to the start `inputSchema`:
   ```typescript
   myNodes: z.array(myNodeInputSchema).optional(),   // for multi-instance forms
   // OR for singletons (one per return, like schedule_a, ext):
   my_node: myNodeInputSchema.optional(),
   ```
   **Multi-instance** (can appear multiple times per return): W2s, 1099s,
   Schedule Cs, etc. → use array. **Singleton** (at most one per return):
   Schedule A, D summary screen, EXT → use optional object.

3. Add the nodeType to `outputNodeTypes`:
   ```typescript
   readonly outputNodeTypes = [..., "my_node_type"] as const;
   ```

4. Add emission in `compute()`:
   ```typescript
   // Multi-instance — use the emitArray helper:
   emitArray(
     outputs,
     input.myNodes as Array<Record<string, unknown>> | undefined,
     "my_node_type",
   );

   // Singleton:
   if (input.my_node) {
     outputs.push({
       nodeType: "my_node_type",
       input: input.my_node as Record<string, unknown>,
     });
   }
   ```

## Step 10 — Type check

```bash
deno check nodes/2025/registry.ts
deno check nodes/2025/f1040/start/index.ts
```

Both must pass with zero errors.

Then run full node tests:

```bash
deno test nodes/ --allow-read
```

## Output

For each node implemented, report:

- `nodeType`: what it's registered as
- Fields in schema (count)
- Routing rules implemented (list each downstream nodeType)
- Test count and pass/fail
