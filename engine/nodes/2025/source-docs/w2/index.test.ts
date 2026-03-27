import { assertEquals } from "@std/assert";
import type { z } from "zod";
import { buildExecutionPlan, execute } from "../../../../mod.ts";
import { f1040_line_1z } from "../../f1040/f1040_line_01z/index.ts";
import { registry } from "../../registry.ts";
import { w2 } from "./index.ts";

Deno.test("W2Node: single W-2 box1=85000 deposits wages=[85000] to f1040_line_1z", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);
  const pendingLine1z = result.pending[f1040_line_1z.nodeType] as z.infer<
    typeof f1040_line_1z.inputSchema
  >;

  assertEquals(pendingLine1z.wages, [85000]);
});

Deno.test("w2.compute: extracts box1 as wages output array", () => {
  const result = w2.compute({ box1: 85000 });
  const outputLine1z = result.outputs[0].input as z.infer<
    typeof f1040_line_1z.inputSchema
  >;

  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, f1040_line_1z.nodeType);
  assertEquals(outputLine1z.wages, [85000]);
});

Deno.test("w2: missing box1 causes Zod validation failure", () => {
  const parsed = w2.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});
