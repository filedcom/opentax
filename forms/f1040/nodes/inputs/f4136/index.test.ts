import { assertEquals, assertAlmostEquals, assertThrows } from "jsr:@std/assert";
import { f4136 } from "./index.ts";

// Singleton harness
function compute(input: Parameters<typeof f4136.compute>[1]) {
  return f4136.compute({ taxYear: 2025 }, input);
}

// ── Smoke test ────────────────────────────────────────────────────────────────

Deno.test("f4136 smoke: empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f4136 smoke: all-zero gallons returns no outputs", () => {
  const result = compute({
    gasoline_offhighway_gallons: 0,
    diesel_farming_gallons: 0,
  });
  assertEquals(result.outputs.length, 0);
});

// ── Nonrefundable credits (off-highway business) ──────────────────────────────

Deno.test("f4136 nonrefundable: gasoline off-highway → schedule3 line6z", () => {
  // 100 gal × $0.184 = $18.40
  const result = compute({ gasoline_offhighway_gallons: 100 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 18.4);
});

Deno.test("f4136 nonrefundable: diesel off-highway → schedule3 line6z", () => {
  // 50 gal × $0.244 = $12.20
  const result = compute({ diesel_offhighway_gallons: 50 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 12.2);
});

Deno.test("f4136 nonrefundable: aviation gasoline non-commercial → schedule3 line6z", () => {
  // 200 gal × $0.194 = $38.80
  const result = compute({ aviation_gas_noncommercial_gallons: 200 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertAlmostEquals(
    result.outputs[0].fields.line6z_general_business_credit as number,
    38.8,
    0.01,
  );
});

Deno.test("f4136 nonrefundable: kerosene off-highway → schedule3 line6z", () => {
  // 100 gal × $0.244 = $24.40
  const result = compute({ kerosene_offhighway_gallons: 100 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 24.4);
});

Deno.test("f4136 nonrefundable: kerosene aviation non-commercial → schedule3 line6z", () => {
  // 100 gal × $0.219 = $21.90
  const result = compute({ kerosene_aviation_gallons: 100 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 21.9);
});

Deno.test("f4136 nonrefundable: LPG off-highway → schedule3 line6z", () => {
  // 100 gal × $0.183 = $18.30
  const result = compute({ lpg_offhighway_gallons: 100 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 18.3);
});

Deno.test("f4136 nonrefundable: CNG off-highway → schedule3 line6z", () => {
  // 100 GGE × $0.183 = $18.30
  const result = compute({ cng_offhighway_gallons: 100 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 18.3);
});

// ── Refundable credits (farming) ──────────────────────────────────────────────

Deno.test("f4136 refundable: gasoline farming → f1040 line35", () => {
  // 100 gal × $0.184 = $18.40
  const result = compute({ gasoline_farming_gallons: 100 });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line35_fuel_tax_credit, 18.4);
});

Deno.test("f4136 refundable: diesel farming → f1040 line35", () => {
  // 100 gal × $0.244 = $24.40
  const result = compute({ diesel_farming_gallons: 100 });
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line35_fuel_tax_credit, 24.4);
});

Deno.test("f4136 refundable: aviation gasoline farming → f1040 line35", () => {
  // 100 gal × $0.194 = $19.40
  const result = compute({ aviation_gas_farming_gallons: 100 });
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line35_fuel_tax_credit, 19.4);
});

Deno.test("f4136 refundable: kerosene farming → f1040 line35", () => {
  // 100 gal × $0.244 = $24.40
  const result = compute({ kerosene_farming_gallons: 100 });
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line35_fuel_tax_credit, 24.4);
});

// ── Mixed: both nonrefundable and refundable ──────────────────────────────────

Deno.test("f4136 mixed: off-highway + farming → two outputs", () => {
  const result = compute({
    gasoline_offhighway_gallons: 100, // $18.40 nonrefundable
    diesel_farming_gallons: 100,      // $24.40 refundable
  });
  assertEquals(result.outputs.length, 2);

  const schedule3Out = result.outputs.find((o) => o.nodeType === "schedule3");
  const f1040Out = result.outputs.find((o) => o.nodeType === "f1040");

  assertEquals(schedule3Out?.fields.line6z_general_business_credit, 18.4);
  assertEquals(f1040Out?.fields.line35_fuel_tax_credit, 24.4);
});

// ── Aggregation across fuel types ─────────────────────────────────────────────

Deno.test("f4136 aggregation: multiple nonrefundable fuels sum to one schedule3 output", () => {
  // gasoline: 100 × $0.184 = $18.40
  // diesel:   50  × $0.244 = $12.20
  // total: $30.60
  const result = compute({
    gasoline_offhighway_gallons: 100,
    diesel_offhighway_gallons: 50,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 30.6);
});

Deno.test("f4136 aggregation: multiple refundable fuels sum to one f1040 output", () => {
  // gasoline farming: 100 × $0.184 = $18.40
  // diesel farming:   100 × $0.244 = $24.40
  // total: $42.80
  const result = compute({
    gasoline_farming_gallons: 100,
    diesel_farming_gallons: 100,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f1040");
  assertEquals(result.outputs[0].fields.line35_fuel_tax_credit, 42.8);
});

// ── Boundary / precision ──────────────────────────────────────────────────────

Deno.test("f4136 boundary: fractional gallons round to 2 decimal places", () => {
  // 1 gal × $0.184 = $0.184 → rounds to $0.18
  const result = compute({ gasoline_offhighway_gallons: 1 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 0.18);
});

Deno.test("f4136 boundary: very large gallons compute correctly", () => {
  // 1,000,000 gal × $0.244 = $244,000
  const result = compute({ diesel_offhighway_gallons: 1_000_000 });
  assertEquals(result.outputs[0].fields.line6z_general_business_credit, 244000);
});

// ── Schema validation ─────────────────────────────────────────────────────────

Deno.test("f4136 schema: negative gallons throws", () => {
  assertThrows(() => compute({ gasoline_offhighway_gallons: -1 }), Error);
});
