# Phase 2 — Black-Box Tests

**Goal:** Produce `{node_path}/index.test.ts` from context.md only. Never read index.ts.

---

## Test harness shape

**Input nodes** receive an array of items:

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { {node} } from "./index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return { /* required fields at zero/false */ ...overrides };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return {node}.compute({ {node}s: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}
```

**Intermediate nodes** receive a flat merged object:

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { {node} } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return {node}.compute(input);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}
```

---

## Step 1 — Analyst agent: build coverage checklist

Spawn an **Analyst agent**:

> Read `{node_path}/research/context.md` in full. Do NOT read any other file.
> Produce a structured coverage checklist. For each item include: test name (quoted string), scenario, and assertion type.
>
> Assertion types: routes_to / does_not_route / throws / does_not_throw / equals_scalar / output_count_unchanged
>
> Sections:
> 1. Input validation — required fields, type constraints, negative constraints
> 2. Per-field routing/calculation — one row per field to destination; include zero/absent case
> 3. Aggregation — one row per field that sums across multiple items (input nodes only)
> 4. Thresholds — below/at/above every constant in the Constants table
> 5. Hard validation rules — every ERROR rule: throw test + boundary-pass test
> 6. Output routing — one row per downstream node in Output Routing table
> 7. Edge cases — one row per entry in the Edge Cases section
> 8. Smoke test — one comprehensive test with all major fields populated
>
> Output ONLY the checklist. No prose, no code.

---

## Step 2 — Evaluator loop (max 5 iterations)

Spawn an **Evaluator agent**:

> You are a tax-software QA reviewer. You have the coverage checklist below and access to `{node_path}/research/context.md`.
> Read context.md. Add missing items. Remove hallucinated items (items with no basis in context.md). Flag ambiguities.
> Return the revised checklist. End with "Changes made: NONE" if no changes were made.
> --- CHECKLIST ---
> {CURRENT_CHECKLIST}

Loop until Evaluator writes "Changes made: NONE" or 5 iterations reached.

---

## Step 3 — Builder agent: write the test file

Spawn a **Builder agent** with the FINAL checklist:

> Write a Deno test file for tax node {NODE}. Use ONLY the checklist below — do NOT read context.md or index.ts.
>
> Node type: {INPUT | INTERMEDIATE}
> Use the correct harness for the node type (see Phase 2 harness shapes).
>
> Map assertion types:
> - routes_to → assert output exists + check field value
> - does_not_route → assert output is undefined
> - throws → assertThrows(() => compute(...), Error)
> - does_not_throw → call compute, assert result.outputs is array
> - equals_scalar → assert exact number
> - output_count_unchanged → compute with/without field; assert lengths equal
>
> Write tests in checklist section order.
> Write to: {node_path}/index.test.ts
>
> --- AGREED CHECKLIST ---
> {FINAL_CHECKLIST}

---

## Gate

`index.test.ts` exists with at least one `Deno.test(`.

**Gate passed → proceed to Phase 3.**
