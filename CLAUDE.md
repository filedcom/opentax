# Code Practices

This document captures the coding taste and conventions for this codebase. Read it before writing a new node or touching core.

---

## The Core Idea

Each node is a **pure transformation**: validated input in, typed outputs out. No state, no side effects, no surprises.

---

## Schema First, Types Inferred

Define the shape with Zod. Never write a type that mirrors a schema — infer it.

```ts
// Define once
export const itemSchema = z.object({
  box1_wages: z.number().nonnegative(),
  box2_fed_withheld: z.number().nonnegative(),
});

// Infer, don't redeclare
type W2Item = z.infer<typeof itemSchema>;
```

Use `z.nativeEnum` for domain codes. Never `z.string()` when a finite set of values exists.

```ts
export enum Box12Code { A = "A", W = "W", ... }

const schema = z.object({ code: z.nativeEnum(Box12Code), ... });
```

---

## Pure Functions, Composed

Break `compute()` into small pure functions. Each takes data, returns data. No accumulation inside them.

```ts
// Good: pure, named, testable in isolation
function wageFields(w2s: W2Item[]): F1040Input {
  const total = regularItems(w2s).reduce((sum, item) => sum + item.box1_wages, 0);
  return total > 0 ? { line1a_wages: total } : {};
}

// Good: compose in compute()
compute(input) {
  return {
    outputs: [
      ...statutoryOutput(input.w2s),
      ...medicareOutputs(input.w2s),
      { nodeType: f1040.nodeType, input: {
        ...withholdingFields(input.w2s),
        ...wageFields(input.w2s),
      }},
    ]
  };
}
```

Even for per-item logic, break it into pure functions — one per concern, composed in `compute()`.

---

## Small Functions

Each function does exactly one thing. If you can't name it clearly, it's doing too much.

- Filter → separate function
- Aggregate → separate function
- Route → separate function

```ts
function regularItems(w2s: W2Items) {
  return w2s.filter((item) => item.box13_statutory_employee !== true);
}

function allocatedTipsOutputs(w2s: W2Items): NodeOutput[] {
  return regularItems(w2s)
    .filter((item) => (item.box8_allocated_tips ?? 0) > 0)
    .map((item) => ({ nodeType: form4137.nodeType, input: { allocated_tips: item.box8_allocated_tips } }));
}
```

---

## No Mutation

Never modify an argument. Spread, map, filter, reduce — always return new values.

```ts
// Wrong
function addField(fields: F1040Input, key: string, value: number) {
  fields[key] = value; // mutation
}

// Right
function withWages(fields: F1040Input, total: number): F1040Input {
  return { ...fields, line1a_wages: total };
}
```

---

## Early Returns

Don't nest. Return early when there's nothing to do.

```ts
function statutoryOutput(w2s: W2Items): NodeOutput[] {
  const statutory = w2s.filter((item) => item.box13_statutory_employee === true);
  const wages = statutory.reduce((sum, item) => sum + item.box1_wages, 0);
  if (wages === 0) return []; // done
  const withholding = statutory.reduce((sum, item) => sum + item.box2_fed_withheld, 0);
  return [{ nodeType: schedule_c.nodeType, input: { statutory_wages: wages, withholding } }];
}
```

---

## Type-Safe Output Routing

`OutputNodes` enforces at compile time that you can only route to declared nodes, and that input shapes match the target's schema. Declare all possible output nodes in the class, then the builder enforces them.

```ts
readonly outputNodes = new OutputNodes([f1040, schedule1, form8889]);

// Compile error if form8889 is not in outputNodes, or input doesn't match its schema
out.add(form8889, { employer_hsa_contributions: amount });
```

---

## Enums for Domain Codes

Finite domain values get an enum — not `string`, not a comment. The enum is exported so the CLI, tests, and other nodes can reference the same constants.

---

## Type Safety Is Non-Negotiable

Never reduce type safety to fix a compile error. Forbidden:

- `as any`
- `Record<string, unknown>` where a typed schema exists
- Widening a function parameter from a typed schema to a looser type

When tests use string literals for enum fields (e.g. `"7"` for `DistributionCode`), fix the test to import and use the enum value — don't weaken the type of the compute helper.

```ts
// Wrong
function compute(items: Record<string, unknown>[]) { ... }

// Right — import the enum, use it in the test
import { DistributionCode } from "./index.ts";
minimalItem({ box7_distribution_code: DistributionCode.Code7 });
```

---

## No Speculative Abstraction

Don't extract a helper because you *might* reuse it. Don't add a config object because you *might* add options. Three similar lines of code is better than a premature abstraction.

---

## File Shape

Every node file follows this order:

1. Imports
2. Enum(s) (if any domain codes)
3. Per-item schema (`itemSchema`)
4. Node input schema (`inputSchema`)
5. Local type aliases (`type W2Items = ...`)
6. Pure helper functions
7. Node class
8. Singleton export (`export const w2 = new W2Node()`)
