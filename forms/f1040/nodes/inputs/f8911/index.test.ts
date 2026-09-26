import { assertEquals, assertThrows } from "@std/assert";
import { f8911, type F8911Input, FuelType } from "./index.ts";

const scenario13: F8911Input = {
  cost: 1_000,
  business_use_pct: 0,
  fuel_type: FuelType.ElectricCharging,
  property_description: "ELECTRIC CHARGER",
  property_us_address: {
    line1: "13 Elm Street",
    city: "Anytown",
    state: "TX",
    zip: "77013",
  },
  construction_began: "2025-03-01",
  placed_in_service: "2025-03-01",
  eligible_census_tract: true,
  census_tract_geoid: "48201100000",
  main_home_property: true,
  regular_tax_before_credits: 162,
  tentative_minimum_tax: 0,
};

function compute(input: F8911Input) {
  return f8911.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 8911 routes the limited ATS Scenario 13 credit to Schedule 3 line 6j", () => {
  const result = compute(scenario13);
  assertEquals(result.outputs, [{
    nodeType: "schedule3",
    fields: { line6j_alt_fuel_vehicle_refueling: 162 },
  }, {
    nodeType: "form6251",
    fields: { must_file_for_credit: true },
  }]);
});

Deno.test("Form 8911 personal credit is capped at $1,000 before the tax limit", () => {
  const result = compute({
    ...scenario13,
    cost: 10_000,
    regular_tax_before_credits: 5_000,
  });
  assertEquals(
    result.outputs[0]?.fields.line6j_alt_fuel_vehicle_refueling,
    1_000,
  );
});

Deno.test("Form 8911 accounts for other credits and tentative minimum tax", () => {
  const result = compute({
    ...scenario13,
    cost: 2_000,
    regular_tax_before_credits: 700,
    foreign_tax_credit: 100,
    certain_allowable_credits: 50,
    tentative_minimum_tax: 200,
  });
  assertEquals(
    result.outputs[0]?.fields.line6j_alt_fuel_vehicle_refueling,
    350,
  );
});

Deno.test("Form 8911 does not route a personal credit when the tax limit is zero", () => {
  assertEquals(
    compute({ ...scenario13, regular_tax_before_credits: 0 }).outputs,
    [{ nodeType: "form6251", fields: { must_file_for_credit: true } }],
  );
  assertEquals(compute({ ...scenario13, cost: 0 }).outputs, []);
});

Deno.test("Form 8911 rejects unsupported or unsubstantiated claims", () => {
  assertThrows(
    () => compute({ ...scenario13, business_use_pct: 0.2 }),
    Error,
    "Form 3800 path",
  );
  assertThrows(
    () => compute({ ...scenario13, eligible_census_tract: false }),
    Error,
    "eligible census tract",
  );
  assertThrows(
    () => compute({ ...scenario13, main_home_property: false }),
    Error,
    "main home",
  );
  assertThrows(
    () => compute({ ...scenario13, regular_tax_before_credits: undefined }),
    Error,
    "regular tax",
  );
  assertThrows(
    () => compute({ ...scenario13, property_us_address: undefined }),
    Error,
    "structured address",
  );
});

Deno.test("Form 8911 validates credit inputs", () => {
  assertEquals(f8911.inputSchema.safeParse({ cost: -500 }).success, false);
  assertEquals(
    f8911.inputSchema.safeParse({ cost: 500, business_use_pct: 1.5 }).success,
    false,
  );
  assertEquals(
    f8911.inputSchema.safeParse({ ...scenario13, census_tract_geoid: "123" })
      .success,
    false,
  );
  for (const fuelType of Object.values(FuelType)) {
    assertEquals(
      f8911.inputSchema.safeParse({ ...scenario13, fuel_type: fuelType })
        .success,
      true,
    );
  }
});
