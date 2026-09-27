import { assertEquals, assertThrows } from "@std/assert";
import { f4136, inputSchema } from "./index.ts";

const business = {
  qualifying_business_activity: true,
  activity_count: 1,
  business_name: "Example Farm",
  principal_activity_code: "111000",
  equipment_make: "Example",
  equipment_model: "Tractor",
  equipment_type: "farm tractor",
  purchase_records_confirmed: true,
  no_duplicate_excise_claim: true,
} as const;

function compute(input: Parameters<typeof f4136.compute>[1]) {
  return f4136.compute({ taxYear: 2025, formType: "f1040" }, input);
}

Deno.test("Form 4136: qualified business gasoline and diesel route to refundable Schedule 3 line 12", () => {
  const result = compute({
    business,
    claims: [
      { line: "1a", qualified_gallons: 100, actual_fuel_cost: 300 },
      { line: "3b", qualified_gallons: 100, actual_fuel_cost: 400 },
    ],
  });
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "schedule3");
  assertEquals(result.outputs[0].fields.line12_fuel_tax_credit, 42.6);
  assertEquals(
    result.outputs[0].fields.line6a_general_business_credit,
    undefined,
  );
});

Deno.test("Form 4136: represented 2025 Part II rates are line-specific", () => {
  const cases = [
    ["1a", undefined, 18.3],
    ["1b", undefined, 18.3],
    ["2b", "01", 19.3],
    ["3a", "02", 24.3],
    ["3b", undefined, 24.3],
    ["4a", "02", 24.3],
    ["4b", undefined, 24.3],
    ["5c", "01", 24.3],
    ["5d", "01", 21.8],
    ["11a", "02", 18.3],
    ["11c", "02", 18.3],
  ] as const;
  for (const [line, type_of_use, expected] of cases) {
    const result = compute({
      business,
      claims: [{
        line,
        type_of_use,
        qualified_gallons: 100,
        actual_fuel_cost: 200,
      }],
    });
    assertEquals(result.outputs[0].fields.line12_fuel_tax_credit, expected);
  }
});

Deno.test("Form 4136: credit rounds to cents", () => {
  assertEquals(
    compute({
      business,
      claims: [{ line: "1a", qualified_gallons: 1, actual_fuel_cost: 3 }],
    }).outputs[0].fields.line12_fuel_tax_credit,
    0.18,
  );
});

Deno.test("Form 4136: eligibility, costs, use codes, and duplicate claims are required", () => {
  const claim = {
    line: "3a",
    type_of_use: "02",
    qualified_gallons: 100,
    actual_fuel_cost: 300,
  } as const;
  assertEquals(inputSchema.safeParse({ claims: [claim] }).success, false);
  assertEquals(
    inputSchema.safeParse({
      business: { ...business, activity_count: 2 },
      claims: [claim],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      business,
      claims: [{ ...claim, actual_fuel_cost: 0 }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      business,
      claims: [{ ...claim, type_of_use: undefined }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({ business, claims: [claim, claim] }).success,
    false,
  );
  assertThrows(
    () => compute({ business, claims: [{ ...claim, qualified_gallons: -1 }] }),
    Error,
  );
});
