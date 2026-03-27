import { assertEquals } from "jsr:@std/assert";
import { buildExecutionPlan, execute } from "../../../../mod.ts";
import { registry } from "../../../../registry.ts";
import { Line01zWagesNode } from "./index.ts";

Deno.test("line_01z_wages: two W-2s (85000+45000) accumulate wages=[85000,45000] in pending", () => {
  const inputs = { w2s: [{ box1: 85000 }, { box1: 45000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  const wages = result.pending["line_01z_wages"]?.["wages"] as number[];
  assertEquals(Array.isArray(wages), true);
  assertEquals(wages.length, 2);
  assertEquals(wages.includes(85000), true);
  assertEquals(wages.includes(45000), true);
});

Deno.test("line_01z_wages: single W-2 produces wages=[85000] in pending", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  assertEquals(result.pending["line_01z_wages"]?.["wages"], [85000]);
});

Deno.test("Line01zWagesNode.compute: accepts scalar wages without error", () => {
  const node = new Line01zWagesNode();
  const result = node.compute({ wages: 85000 });
  assertEquals(result.outputs, []);
});

Deno.test("Line01zWagesNode.compute: accepts array wages [85000,45000] without error", () => {
  const node = new Line01zWagesNode();
  const result = node.compute({ wages: [85000, 45000] });
  assertEquals(result.outputs, []);
});

Deno.test("line_01z_wages: end-to-end plan contains start, w2, line_01z_wages steps", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const nodeTypes = plan.map((s) => s.nodeType);

  assertEquals(nodeTypes.includes("start"), true);
  assertEquals(nodeTypes.includes("w2"), true);
  assertEquals(nodeTypes.includes("line_01z_wages"), true);
});
