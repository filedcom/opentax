import { assertEquals } from "@std/assert";
import { buildExecutionPlan, execute } from "../../../../mod.ts";
import { registry } from "../../registry.ts";
import { f1040_line_1z } from "./index.ts";

Deno.test("f1040_line_1z: two W-2s (85000+45000) accumulate wages=[85000,45000] in pending", () => {
  const inputs = { w2s: [{ box1: 85000 }, { box1: 45000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  const wages = result.pending[f1040_line_1z.nodeType]?.wages as number[];
  assertEquals(Array.isArray(wages), true);
  assertEquals(wages.length, 2);
  assertEquals(wages.includes(85000), true);
  assertEquals(wages.includes(45000), true);
});

Deno.test("f1040_line_1z: single W-2 produces wages=[85000] in pending", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  assertEquals(result.pending[f1040_line_1z.nodeType]?.wages, [85000]);
});

Deno.test("f1040_line_1z.compute: accepts scalar wages without error", () => {
  const result = f1040_line_1z.compute({ wages: 85000 });
  assertEquals(result.outputs, []);
});

Deno.test("f1040_line_1z.compute: accepts array wages [85000,45000] without error", () => {
  const result = f1040_line_1z.compute({ wages: [85000, 45000] });
  assertEquals(result.outputs, []);
});

Deno.test("f1040_line_1z: end-to-end plan contains start, w2, f1040_line_1z steps", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const nodeTypes = plan.map((s) => s.nodeType);

  assertEquals(nodeTypes.includes("start"), true);
  assertEquals(nodeTypes.includes("w2"), true);
  assertEquals(nodeTypes.includes(f1040_line_1z.nodeType), true);
});
