---
name: black-box-tests
description: Generate thorough black-box Deno tests for a tax input node from its context.md only. Never reads the implementation. Uses a builder→evaluator loop to agree on a coverage checklist before writing the test file.
---

# Black-Box Test Generation

**Node to test:** $ARGUMENTS

## Ground Rules

- **Read ONLY `research/context.md`** for the node. Do NOT read `index.ts`.
- Tests must be purely behavioural — input in, outputs out.
- The goal is IRS correctness, not code coverage. Every rule in context.md must
  have at least one test.

### Nodes receive ALL items in one call

Input nodes (W-2, 1099-INT, 1099-DIV, etc.) are called **once** with the full
array of all items for that taxpayer. They are never called once per item.

```typescript
// CORRECT — all items in one compute() call; node aggregates internally
const result = w2.compute({
  w2s: [
    { box1_wages: 85000, box2_fed_withheld: 12000 },
    { box1_wages: 45000, box2_fed_withheld:  6800 },
  ],
});
// assert: single f1040 output with line1a_wages = 130000

// WRONG — two separate calls
const r1 = w2.compute({ w2s: [{ box1_wages: 85000 }] });
const r2 = w2.compute({ w2s: [{ box1_wages: 45000 }] });
// tests something that never happens in production
```

Consequences for test writing:
- **Per-routing tests:** single-item array is fine — isolates one box.
- **Aggregation tests:** multiple items in the SAME `compute()` call; assert the
  combined scalar — never pre-sum in test code and feed a single item.
- Output is always flat `NodeOutput[]` — one entry per downstream form with
  aggregated values, not one entry per input item.

---

## Phase 1 — Analyst: build the coverage checklist

Spawn an **Analyst agent** with this prompt:

> Read `nodes/2025/f1040/inputs/{NODE}/research/context.md` in full.
> Do NOT read any other file.
> Produce a structured coverage checklist as a markdown document with these
> sections. For each item include: the test name (quoted string), the scenario
> being tested, and the expected assertion type (routes_to / does_not_route /
> throws / does_not_throw / equals_scalar / output_count_unchanged).
>
> Sections:
> 1. **Input schema validation** — required fields, negative constraints, empty arrays
> 2. **Per-box routing** — one row per box → destination; include zero-value case
> 3. **Aggregation** — one row per box that sums across multiple items
> 4. **Thresholds** — one row each for below/at/above every constant in the
>    Constants table
> 5. **Hard validation rules** — every rule marked ERROR: throw test + boundary-pass test
> 6. **Warning-only rules** — every rule marked WARNING: does_not_throw test
> 7. **Informational fields** — every field that must NOT produce tax outputs
> 8. **Edge cases** — one row per entry in the Edge Cases section
> 9. **Smoke test** — one comprehensive test with all major boxes populated
>
> Output ONLY the checklist. No prose, no code.

---

## Phase 2 — Evaluator loop: critique until stable

Spawn an **Evaluator agent** with this prompt, passing in the current checklist.
Repeat — feeding the Evaluator's output back as the new checklist — until the
Evaluator reports **"NO CHANGES"**. Cap at 5 iterations to prevent runaway loops.

> You are a tax-software QA reviewer.
> You have the coverage checklist below and access to
> `nodes/2025/f1040/inputs/{NODE}/research/context.md`.
>
> Read context.md. For each item in the checklist, verify it is correctly
> derived from context.md. Then:
>
> **Add** any missing items — boxes, rules, thresholds, or edge cases present
> in context.md that have no checklist entry.
>
> **Remove** any items that are not derivable from context.md (hallucinated
> field names, invented rules, wrong destinations).
>
> **Flag** any ambiguities the builder must note for the implementor
> (uncertain nodeType strings, field names that context.md does not specify).
>
> Return the revised checklist in the same structured format.
> End with a "Changes made" section.
> If you made NO additions or removals (wording fixes don't count), write
> exactly: `Changes made: NONE` — this signals the loop to stop.
> Do not write any test code.
>
> --- CHECKLIST ---
> {CURRENT_CHECKLIST}

**Loop termination:** stop when the Evaluator writes `Changes made: NONE`, or
after 5 iterations (whichever comes first). The output of the final iteration
is the **agreed checklist**.

---

## Phase 3 — Builder: write the test file from the agreed checklist

Spawn a **Builder agent** with this prompt, passing in the FINAL agreed checklist:

> You are writing a Deno test file for the tax node **{NODE}**.
> You have the agreed coverage checklist below.
> Do NOT read context.md or the implementation.
> Your only source of truth is the checklist.
>
> Follow these conventions exactly:
>
> ### Harness shape
>
> ```typescript
> // NOTE FOR IMPLEMENTORS:
> // This is a black-box test file generated from context.md only.
> // Before running, verify:
> //   1. The import name matches the exported singleton (e.g. `div`, `int`, `w2`)
> //   2. The input wrapper key (e.g. `div1099s`, `w2s`) matches compute()'s parameter
> //   3. The nodeType strings match the actual node routing strings
> //   4. Any AMBIGUITIES flagged below must be resolved against the implementation
> // These tests define the IRS-correct behaviour — if a test fails, fix the
> // implementation, not the test.
> //
> // AMBIGUITIES: {LIST_FROM_EVALUATOR}
>
> import { assertEquals, assertThrows } from "@std/assert";
> import { {node} } from "./index.ts";
>
> function minimalItem(overrides: Record<string, unknown> = {}) {
>   return {
>     // required fields at zero/false/empty
>     ...overrides,
>   };
> }
>
> function compute(items: ReturnType<typeof minimalItem>[]) {
>   return {node}.compute({ {node}s: items }); // adjust key per checklist
> }
>
> function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
>   return result.outputs.find((o) => o.nodeType === nodeType);
> }
> ```
>
> ### Test order
> Write tests in the exact order of the checklist sections:
> 1. Input schema validation
> 2. Per-box routing (positive + zero cases)
> 3. Aggregation
> 4. Thresholds (below / at / above)
> 5. Hard validation rules (throw + boundary-pass)
> 6. Warning-only rules (must NOT throw)
> 7. Informational fields (output count unchanged)
> 8. Edge cases
> 9. Smoke test
>
> ### Assertion types (map from checklist)
> - `routes_to` → assert output exists, assert specific field value
> - `does_not_route` → assert output is undefined (or value is 0/absent)
> - `throws` → `assertThrows(() => compute([...]), Error)`
> - `does_not_throw` → call compute inside `assertEquals(Array.isArray(...), true)`
> - `equals_scalar` → assert the field equals an exact number
> - `output_count_unchanged` → compute with and without the field; assert lengths equal
>
> Write the complete test file. At the end, report:
> - Total test count
> - Coverage section breakdown
>
> Write the file to:
> `nodes/2025/f1040/inputs/{NODE}/index.test.ts`
>
> --- AGREED CHECKLIST ---
> {FINAL_CHECKLIST}
