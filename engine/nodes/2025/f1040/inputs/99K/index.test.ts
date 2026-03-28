import { assertEquals } from "@std/assert";
import { k99 } from "./index.ts";

// ---- Unit: no federal routing for informational fields ----

Deno.test("k99.compute: box1a_gross_payments alone emits no outputs", () => {
  const result = k99.compute({
    pse_name: "PayPal",
    box1a_gross_payments: 15000,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("k99.compute: box8_state_withheld alone emits no federal outputs", () => {
  const result = k99.compute({
    pse_name: "Venmo",
    box8_state_withheld: 300,
  });

  assertEquals(result.outputs.length, 0);
});

Deno.test("k99.compute: minimal input with no boxes emits no outputs", () => {
  const result = k99.compute({
    pse_name: "Square",
  });

  assertEquals(result.outputs.length, 0);
});

// ---- Unit: box4 federal withholding routing ----

Deno.test("k99.compute: box4_federal_withheld > 0 routes to f1040 line25b", () => {
  const result = k99.compute({
    pse_name: "Stripe",
    box4_federal_withheld: 480,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output !== undefined, true);
  const input = f1040Output!.input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 480);
});

Deno.test("k99.compute: box4_federal_withheld = 0 does not emit f1040 output", () => {
  const result = k99.compute({
    pse_name: "Stripe",
    box4_federal_withheld: 0,
  });

  const f1040Output = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(f1040Output, undefined);
});

// ---- Unit: combined fields ----

Deno.test("k99.compute: gross payments + federal withheld only emits one f1040 output", () => {
  const result = k99.compute({
    pse_name: "eBay",
    box1a_gross_payments: 22000,
    box4_federal_withheld: 1200,
    box8_state_withheld: 400,
  });

  const f1040Outputs = result.outputs.filter((o) => o.nodeType === "f1040");
  assertEquals(f1040Outputs.length, 1);
  const input = f1040Outputs[0].input as Record<string, unknown>;
  assertEquals(input.line25b_withheld_1099, 1200);
});
