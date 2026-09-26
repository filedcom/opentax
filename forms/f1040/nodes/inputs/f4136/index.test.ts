import { assertEquals, assertThrows } from "@std/assert";
import { f4136 } from "./index.ts";

function compute(input: Parameters<typeof f4136.compute>[1]) {
  return f4136.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 4136: empty and zero-gallon inputs produce no credit", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(compute({ gasoline_farming_gallons: 0 }).outputs, []);
});

Deno.test("Form 4136: off-highway and farm fuel combine on refundable Schedule 3 line 12", () => {
  const result = compute({
    gasoline_offhighway_gallons: 100,
    diesel_farming_gallons: 100,
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line12_fuel_tax_credit, 42.6);
  assertEquals(
    result.outputs[0].fields.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("Form 4136: 2025 line rates differ by fuel and taxed aviation kerosene", () => {
  const cases = [
    [{ gasoline_offhighway_gallons: 100 }, 18.3],
    [{ diesel_offhighway_gallons: 100 }, 24.3],
    [{ aviation_gas_noncommercial_gallons: 100 }, 19.3],
    [{ kerosene_offhighway_gallons: 100 }, 24.3],
    [{ kerosene_aviation_taxed_244_gallons: 100 }, 24.3],
    [{ kerosene_aviation_taxed_219_gallons: 100 }, 21.8],
    [{ lpg_offhighway_gallons: 100 }, 18.3],
    [{ cng_offhighway_gallons: 100 }, 18.3],
  ] as const;
  for (const [input, expected] of cases) {
    assertEquals(
      compute(input).outputs[0].fields.line12_fuel_tax_credit,
      expected,
    );
  }
});

Deno.test("Form 4136: fuel credit rounds to cents", () => {
  assertEquals(
    compute({ gasoline_offhighway_gallons: 1 }).outputs[0].fields
      .line12_fuel_tax_credit,
    0.18,
  );
});

Deno.test("Form 4136: negative gallons are rejected", () => {
  assertThrows(() => compute({ gasoline_offhighway_gallons: -1 }), Error);
});
