import { assertEquals } from "@std/assert";
import { buildExecutionPlan, execute } from "../../../../mod.ts";
import { registry } from "../../../../registry.ts";
import { W2Node } from "./index.ts";

Deno.test("W2Node: single W-2 box1=85000 deposits wages=[85000] to line_01z_wages", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);

  assertEquals(result.pending["line_01z_wages"]?.["wages"], [85000]);
});

Deno.test("W2Node.compute: extracts box1 as wages output array", () => {
  const node = new W2Node();
  const result = node.compute({ w2: { box1: 85000 } });

  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "line_01z_wages");
  assertEquals(result.outputs[0].input["wages"], [85000]);
});

Deno.test("W2Node: missing box1 causes Zod validation failure", () => {
  const node = new W2Node();
  const parsed = node.inputSchema.safeParse({ w2: {} });

  assertEquals(parsed.success, false);
});
