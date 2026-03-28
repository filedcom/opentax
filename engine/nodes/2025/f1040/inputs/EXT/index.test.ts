import { assertEquals } from "@std/assert";
import { ext } from "./index.ts";

// ---- Unit: amount_paid_with_extension routing ----

Deno.test("ext.compute: amount_paid_with_extension > 0 routes to f1040 line38", () => {
  const result = ext.compute({
    extension_filed: true,
    amount_paid_with_extension: 1500,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line38_amount_paid_extension, 1500);
});

Deno.test("ext.compute: amount_paid_with_extension = 0 does not emit f1040 output", () => {
  const result = ext.compute({
    extension_filed: true,
    amount_paid_with_extension: 0,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

Deno.test("ext.compute: no amount_paid_with_extension emits no outputs", () => {
  const result = ext.compute({
    extension_filed: true,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("ext.compute: extension_filed=false with no payment emits no outputs", () => {
  const result = ext.compute({
    extension_filed: false,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("ext.compute: default extension_filed with payment still routes to f1040", () => {
  const result = ext.compute({
    amount_paid_with_extension: 750,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line38_amount_paid_extension, 750);
});

Deno.test("ext.compute: large extension payment is routed correctly", () => {
  const result = ext.compute({
    extension_filed: true,
    amount_paid_with_extension: 25000,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line38_amount_paid_extension, 25000);
});

Deno.test("ext.compute: emits at most one f1040 output", () => {
  const result = ext.compute({
    amount_paid_with_extension: 500,
  });

  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
});
