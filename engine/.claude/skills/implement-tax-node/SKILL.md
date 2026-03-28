---
name: implement-tax-node
description: Implement a tax input node from its context.md. Requires black-box tests to exist first (run /black-box-tests if not). Writes index.ts (TaxNode subclass) then makes tests pass — never modifies tests to fit the implementation. Use when adding a new input node from a completed context.md.
---

# Implement Tax Node

**Node(s) to implement:** $ARGUMENTS

## Architecture Reference

Before writing anything, read `docs/product.md` (project root) — specifically:

- **§3 Core Architecture** — TaxNode contract, NodeResult, NodeOutput shape
- **§3 Start Node** — how multi-instance inputs are dispatched as arrays
- **§3 Executor: Two-Phase** — execution example showing node aggregation
- **§13 Writing Tests for Multi-Instance Input Nodes** — the golden rule for
  what `compute()` receives and what tests must assert

Key principles from that doc that govern everything below:

> A node receives ALL items for that taxpayer in one `compute()` call.
> It aggregates internally. The engine never calls it once per item.

---

## Step 0 — Verify black-box tests exist

Check whether `nodes/2025/f1040/inputs/{NODE}/index.test.ts` exists and has
tests. If not, **stop and run `/black-box-tests {NODE}` first**. Do not write
the implementation until the test file is present — tests define correct
behaviour, not the other way around.

```bash
ls nodes/2025/f1040/inputs/{NODE}/index.test.ts
```

If the file exists, read it fully before touching `index.ts`. The tests are the
spec. You will make the implementation pass them — you will **never modify tests
to match the implementation**.

---

## Step 1 — Read architecture references

Read these canonical examples:

- `nodes/2025/f1040/inputs/INT/index.ts` — simple routing pattern
- `nodes/2025/f1040/inputs/W2/index.ts` — complex routing, multi-output,
  internal aggregation across all items
- `nodes/2025/registry.ts` — registry to update

---

## Step 2 — Read context.md

`nodes/2025/f1040/inputs/{NODE}/research/context.md`

Extract:

1. **Data Entry Fields table** → Zod schema fields + types
2. **Per-Field Routing table** → `compute()` routing logic
3. **Calculation Logic section** → aggregation and computation rules
4. **Constants & Thresholds** → hard-coded TY2025 values
5. **Validation rules** → cross-field constraints that must `throw`

---

## Step 3 — Design the Zod schema

```typescript
export const itemSchema = z.object({
  // required identifiers
  payer_name: z.string(),
  // dollar amounts (nonnegative)
  box1: z.number().nonnegative().optional(),
  // amounts that can be negative (adjustments, gains/losses)
  box_adjustment: z.number().optional(),
  // checkboxes
  box13_statutory: z.boolean().optional(),
  // enum routing fields
  routing_code: z.nativeEnum(MyEnum).optional(),
});

// Multi-instance nodes wrap items in an array
export const inputSchema = z.object({
  myNodes: z.array(itemSchema).min(1),
});
```

Rules:

- **Never use `.default()`** on Zod fields — apply defaults in `compute()` with
  `?? value`
- `z.nativeEnum(MyEnum)` for finite domain codes — never `z.string()` when a
  fixed set of values exists
- Required fields: no `.optional()`

---

## Step 4 — Implement compute()

### The core contract

```typescript
compute(input: z.infer<typeof inputSchema>): NodeResult {
  // input.myNodes is the FULL array of all items for this taxpayer
  // aggregate internally, emit once per downstream node
  const outputs: NodeOutput[] = [];
  // ...
  return { outputs };
}
```

The node receives every item at once. It must:

1. **Aggregate** across all items before emitting (sum wages, sum withholding, etc.)
2. **Emit once per downstream node** — build one merged object per target nodeType,
   not one object per input item
3. **Route conditionally** based on flags (statutory employee → schedule_c not f1040)

### Pattern: aggregate then emit

```typescript
compute(input: z.infer<typeof inputSchema>) {
  const outputs: NodeOutput[] = [];

  // Step 1 — validate cross-field constraints (throw on hard errors)
  for (const item of input.myNodes) {
    if ((item.box1b ?? 0) > (item.box1a ?? 0)) {
      throw new Error(`box1b cannot exceed box1a`);
    }
  }

  // Step 2 — aggregate across all items
  const totalWages = input.myNodes.reduce((sum, item) => sum + (item.box1 ?? 0), 0);
  const totalWithheld = input.myNodes.reduce((sum, item) => sum + (item.box2 ?? 0), 0);

  // Step 3 — emit once per downstream node
  const f1040Input: Record<string, unknown> = {};
  if (totalWages > 0) f1040Input.line1a_wages = totalWages;
  if (totalWithheld > 0) f1040Input.line25a_w2_withheld = totalWithheld;
  if (Object.keys(f1040Input).length > 0) {
    outputs.push({ nodeType: "f1040", input: f1040Input });
  }

  return { outputs };
}
```

### Per-item routing (when items go to different downstream nodes)

Some items route differently based on a flag (e.g., statutory employee W-2 →
schedule_c). Handle by partitioning:

```typescript
const regular = input.w2s.filter((w) => !w.box13_statutory_employee);
const statutory = input.w2s.filter((w) => w.box13_statutory_employee);

const regularWages = regular.reduce((s, w) => s + w.box1_wages, 0);
const statutoryWages = statutory.reduce((s, w) => s + w.box1_wages, 0);

if (regularWages > 0) {
  outputs.push({ nodeType: "f1040", input: { line1a_wages: regularWages } });
}
if (statutoryWages > 0) {
  outputs.push({ nodeType: "schedule_c", input: { statutory_wages: statutoryWages } });
}
```

### Additional rules

- **No mutation** — never modify input objects; build new ones
- **Early return** for zero-value fields — don't emit outputs for empty amounts
- **Defaults in compute**, not in schema: `const x = item.someField ?? 0`
- **One output object per nodeType** — if f1040 needs wages AND withholding,
  merge them into one `{ nodeType: "f1040", input: { wages, withheld } }` output

---

## Step 5 — nodeType naming

The `nodeType` must match what upstream nodes use when routing to this node.
Verify:

```bash
grep -r "nodeType.*your_node" nodes/2025/
```

---

## Step 6 — Run tests — never modify them

```bash
deno test nodes/2025/f1040/inputs/{NODE}/ --allow-read
```

If tests fail:

- **Fix the implementation**, not the tests
- Tests are the IRS-correct specification — a failing test means the
  implementation is wrong
- The only exception: a test has an obvious typo or references a field name that
  is clearly wrong per context.md — confirm with the user before touching it

All tests must pass before proceeding.

---

## Step 7 — Add stubs for new downstream nodeTypes

If `compute()` routes to a nodeType not yet in the registry:

```bash
mkdir -p nodes/2025/f1040/intermediate/{newNode}
cat > nodes/2025/f1040/intermediate/{newNode}/index.ts << 'EOF'
import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";
export const {newNode} = new UnimplementedTaxNode("{newNode}", []);
EOF
```

---

## Step 8 — Register in nodes/2025/registry.ts

```typescript
import { myNode } from "./f1040/inputs/{NODE}/index.ts";

// registry key MUST equal the node's nodeType string
my_node_type: myNode,
```

If this replaces an existing stub, remove the stub — never register both.

---

## Step 9 — Wire into start node

Edit `nodes/2025/f1040/start/index.ts`:

1. Import the item schema:
   ```typescript
   import { itemSchema as myNodeItemSchema } from "../inputs/{NODE}/index.ts";
   ```

2. Add to start `inputSchema`:
   ```typescript
   // Multi-instance (W-2s, 1099s, etc.) — always an array
   myNodes: z.array(myNodeItemSchema).optional(),
   ```
   Multi-instance = can appear multiple times per return → array.
   Singleton = at most one per return (Schedule A, etc.) → `optional()` object.

3. Add to `outputNodeTypes`:
   ```typescript
   readonly outputNodeTypes = [..., "my_node_type"] as const;
   ```

4. Emit in `compute()`:
   ```typescript
   // Multi-instance — dispatch the full array in ONE shot
   if (input.myNodes?.length) {
     outputs.push({ nodeType: "my_node_type", input: { myNodes: input.myNodes } });
   }
   ```

   The node receives the full array. It handles iteration and aggregation
   internally. Do NOT loop in start and emit one item at a time.

---

## Step 10 — Type check + full test run

```bash
deno check nodes/2025/registry.ts
deno check nodes/2025/f1040/start/index.ts
deno test nodes/ --allow-read
```

All must pass with zero errors and zero test failures.

---

## Output

For each node, report:

- `nodeType` registered as
- Schema field count
- Routing rules (list each downstream nodeType + what field triggers it)
- Test count and result
- Any nodeType stubs added
