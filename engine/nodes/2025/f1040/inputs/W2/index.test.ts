import { assertEquals } from "@std/assert";
import type { z } from "zod";
import {
  buildExecutionPlan,
  execute,
} from "../../../../../core/runtime/mod.ts";
import { registry } from "../../../registry.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { w2 } from "./index.ts";

Deno.test("w2: single W-2 box1=85000 deposits wages=[85000] to f1040", () => {
  const inputs = { w2s: [{ box1: 85000 }] };
  const plan = buildExecutionPlan(registry, inputs);
  const result = execute(plan, registry, inputs);
  const pendingF1040 = result.pending[f1040.nodeType] as z.infer<
    typeof f1040.inputSchema
  >;

  assertEquals(pendingF1040.wages, [85000]);
});

Deno.test("w2.compute: extracts box1 as wages output array", () => {
  const result = w2.compute({ box1: 85000 });
  const outputLine1z = result.outputs[0].input as z.infer<
    typeof f1040.inputSchema
  >;

  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, f1040.nodeType);
  assertEquals(outputLine1z.wages, [85000]);
});

Deno.test("w2: missing box1 causes Zod validation failure", () => {
  const parsed = w2.inputSchema.safeParse({});
  assertEquals(parsed.success, false);
});
