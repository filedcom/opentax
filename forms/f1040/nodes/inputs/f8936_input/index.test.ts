import { assertEquals } from "@std/assert";
import { f8936Input } from "./index.ts";

function compute(items: Parameters<typeof f8936Input.compute>[0]["f8936_inputs"]) {
  return f8936Input.compute({ taxYear: 2025 }, { f8936_inputs: items });
}

// =============================================================================
// 1. Schema Validation
// =============================================================================

Deno.test("f8936_input: empty array is valid and produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8936_input: negative credit_amount rejected", () => {
  const parsed = f8936Input.inputSchema.safeParse({
    f8936_inputs: [{ credit_amount: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8936_input: business_use_pct > 1 rejected", () => {
  const parsed = f8936Input.inputSchema.safeParse({
    f8936_inputs: [{ business_use_pct: 1.5 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8936_input: business_use_pct < 0 rejected", () => {
  const parsed = f8936Input.inputSchema.safeParse({
    f8936_inputs: [{ business_use_pct: -0.1 }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Routing — one form8936 output per vehicle
// =============================================================================

Deno.test("f8936_input: one vehicle produces one form8936 output", () => {
  const result = compute([{ is_new_vehicle: true, credit_amount: 7_500 }]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "form8936");
});

Deno.test("f8936_input: two vehicles produce two form8936 outputs", () => {
  const result = compute([
    { is_new_vehicle: true, credit_amount: 7_500 },
    { is_new_vehicle: false, sale_price: 20_000 },
  ]);
  assertEquals(result.outputs.length, 2);
  assertEquals(result.outputs[0].nodeType, "form8936");
  assertEquals(result.outputs[1].nodeType, "form8936");
});

// =============================================================================
// 3. Pass-through fidelity
// =============================================================================

Deno.test("f8936_input: new vehicle fields pass through correctly", () => {
  const result = compute([{
    is_new_vehicle: true,
    credit_amount: 7_500,
    msrp: 45_000,
    vehicle_type: "other",
    modified_agi: 100_000,
    business_use_pct: 0.2,
  }]);
  const fields = result.outputs[0].fields as Record<string, unknown>;
  assertEquals(fields.is_new_vehicle, true);
  assertEquals(fields.credit_amount, 7_500);
  assertEquals(fields.msrp, 45_000);
  assertEquals(fields.vehicle_type, "other");
  assertEquals(fields.business_use_pct, 0.2);
});

Deno.test("f8936_input: used vehicle fields pass through correctly", () => {
  const result = compute([{
    is_new_vehicle: false,
    sale_price: 18_000,
    modified_agi: 50_000,
  }]);
  const fields = result.outputs[0].fields as Record<string, unknown>;
  assertEquals(fields.is_new_vehicle, false);
  assertEquals(fields.sale_price, 18_000);
});

Deno.test("f8936_input: SUV vehicle type passes through", () => {
  const result = compute([{ vehicle_type: "suv_van_truck", credit_amount: 7_500 }]);
  const fields = result.outputs[0].fields as Record<string, unknown>;
  assertEquals(fields.vehicle_type, "suv_van_truck");
});
