import { assertEquals } from "@std/assert";
import { f1040es } from "./index.ts";

function minimalInput(overrides: Record<string, unknown> = {}) {
  return { ...overrides };
}

function compute(input: ReturnType<typeof minimalInput>) {
  return f1040es.compute({ taxYear: 2025 }, input as Parameters<typeof f1040es.compute>[1]);
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

Deno.test("f1040es.inputSchema: empty object passes (all optional)", () => {
  assertEquals(f1040es.inputSchema.safeParse({}).success, true);
});

Deno.test("f1040es.inputSchema: negative payment_q1 fails", () => {
  assertEquals(f1040es.inputSchema.safeParse({ payment_q1: -1 }).success, false);
});

Deno.test("f1040es.inputSchema: negative payment_q2 fails", () => {
  assertEquals(f1040es.inputSchema.safeParse({ payment_q2: -100 }).success, false);
});

Deno.test("f1040es.inputSchema: all quarterly payments valid", () => {
  assertEquals(f1040es.inputSchema.safeParse({ payment_q1: 1000, payment_q2: 1000, payment_q3: 1000, payment_q4: 1000 }).success, true);
});

Deno.test("f1040es.compute: no payments → no output", () => {
  assertEquals(compute({}).outputs.length, 0);
});

Deno.test("f1040es.compute: all zero payments → no output", () => {
  assertEquals(compute({ payment_q1: 0, payment_q2: 0, payment_q3: 0, payment_q4: 0 }).outputs.length, 0);
});

Deno.test("f1040es.compute: q1 only → routes to f1040 line26", () => {
  const out = findOutput(compute({ payment_q1: 2000 }), "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line26_estimated_tax, 2000);
});

Deno.test("f1040es.compute: q2 only → routes to f1040", () => {
  const out = findOutput(compute({ payment_q2: 1500 }), "f1040");
  assertEquals(out!.fields.line26_estimated_tax, 1500);
});

Deno.test("f1040es.compute: q3 only → routes to f1040", () => {
  const out = findOutput(compute({ payment_q3: 3000 }), "f1040");
  assertEquals(out!.fields.line26_estimated_tax, 3000);
});

Deno.test("f1040es.compute: q4 only → routes to f1040", () => {
  const out = findOutput(compute({ payment_q4: 500 }), "f1040");
  assertEquals(out!.fields.line26_estimated_tax, 500);
});

Deno.test("f1040es.compute: all 4 quarters summed correctly", () => {
  const out = findOutput(compute({ payment_q1: 1000, payment_q2: 1000, payment_q3: 1000, payment_q4: 1000 }), "f1040");
  assertEquals(out!.fields.line26_estimated_tax, 4000);
});

Deno.test("f1040es.compute: partial quarters summed", () => {
  const out = findOutput(compute({ payment_q1: 2500, payment_q3: 2500 }), "f1040");
  assertEquals(out!.fields.line26_estimated_tax, 5000);
});

Deno.test("f1040es.compute: result.outputs is array", () => {
  assertEquals(Array.isArray(compute({}).outputs), true);
});

Deno.test("f1040es.compute: smoke test — full year payments", () => {
  const result = compute({ payment_q1: 3000, payment_q2: 3000, payment_q3: 3000, payment_q4: 3000 });
  const out = findOutput(result, "f1040");
  assertEquals(out !== undefined, true);
  assertEquals(out!.fields.line26_estimated_tax, 12000);
  assertEquals(result.outputs.length, 1);
});
