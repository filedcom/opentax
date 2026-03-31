# Phase 3 — Implementation

**Goal:** Write `{node_path}/index.ts`, make all tests pass, register the node.

---

## Step 0 — Verify prerequisites

```bash
ls {node_path}/index.test.ts
```

If missing → stop and complete Phase 2 first.

Read the test file fully. Tests are the spec — never modify them.

---

## Step 1 — Read architecture references

- `nodes/2025/f1040/inputs/INT/index.ts` — simple routing pattern
- `nodes/2025/f1040/inputs/W2/index.ts` — complex multi-output routing
- `nodes/2025/registry.ts` — registry to update
- `docs/product.md` §3 Core Architecture — TaxNode contract

---

## Step 2 — Read context.md

Extract:
- Input Fields → Zod schema fields
- Calculation Logic → compute() logic
- Output Routing → downstream nodeTypes
- Constants → hard-coded TY2025 values
- Validation rules → throw conditions

---

## Step 3 — Design Zod schema

**Input node** — per-item schema wrapped in an array:

```typescript
export const itemSchema = z.object({
  field_name: z.number().nonnegative().optional(),
  code_field: z.nativeEnum(MyEnum).optional(),
});

export const inputSchema = z.object({
  {node}s: z.array(itemSchema).min(1),
});
```

**Intermediate node** — flat object of merged upstream fields:

```typescript
export const inputSchema = z.object({
  field_from_upstream: z.number().optional(),
});
```

Rules: never `.default()` in schema — apply defaults in compute() with `?? 0`. Use `z.nativeEnum` for all finite domain codes.

---

## Step 4 — Implement compute()

```typescript
compute(input: z.infer<typeof inputSchema>): NodeResult {
  const outputs: NodeOutput[] = [];
  // 1. Cross-field validation (throw on hard errors)
  // 2. Calculate / aggregate
  // 3. Emit once per downstream nodeType
  return { outputs };
}
```

Rules: no mutation; one output object per nodeType; early return for zero values.

---

## Step 5 — Run tests

```bash
deno test {node_path}/ --allow-read
```

Fix the implementation if tests fail. Never modify tests.

---

## Step 6 — Stub new downstream nodeTypes (if needed)

For any downstream nodeType that doesn't exist yet:

```bash
mkdir -p nodes/2025/f1040/intermediate/{newNode}
echo 'import { UnimplementedTaxNode } from "../../../../../core/types/tax-node.ts";\nexport const {newNode} = new UnimplementedTaxNode("{newNode}");' > nodes/2025/f1040/intermediate/{newNode}/index.ts
```

---

## Step 7 — Register in registry.ts

```typescript
import { myNode } from "./f1040/{inputs|intermediate}/{NODE}/index.ts";
// registry key MUST equal the node's nodeType string
my_node_type: myNode,
```

Remove the old stub registration if replacing one.

---

## Step 8 — Wire start node or skip

**If INPUT node** → edit `nodes/2025/f1040/start/index.ts`:
1. Import item schema: `import { itemSchema as {node}ItemSchema } from "../inputs/{NODE}/index.ts";`
2. Add to inputSchema: `{node}s: z.array({node}ItemSchema).optional(),`
3. Add to outputNodeTypes: `"my_node_type"`
4. Emit in compute(): `if (input.{node}s?.length) { outputs.push({ nodeType: "my_node_type", input: { {node}s: input.{node}s } }); }`

**If INTERMEDIATE node** → skip this step.

---

## Step 9 — Type check + full test run

```bash
deno check nodes/2025/registry.ts
deno test nodes/ --allow-read
```

All must pass with zero errors.

---

## Completion Report

```
Node:      {NODE}
Type:      {input | intermediate}
nodeType:  {registered nodeType string}
Schema:    {N} fields
Routing:   {downstream nodeTypes, comma-separated}
Tests:     {N} passed
```
