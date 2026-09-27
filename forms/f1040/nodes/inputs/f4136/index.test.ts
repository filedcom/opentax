import { assertEquals, assertThrows } from "@std/assert";
import { f4136, type Form4136Input, inputSchema } from "./index.ts";

const business = {
  qualifying_business_activity: true,
  claimant_is_ultimate_purchaser: true,
  business_name: "Example Farm",
  principal_activity_code: "111000",
  equipment_make: "Example",
  equipment_model: "Tractor",
  equipment_type: "farm tractor",
  purchase_records_confirmed: true,
  no_duplicate_excise_claim: true,
} as const;
const certifications = {
  undyed_fuel_confirmed: true,
  right_to_claim_not_waived: true,
  credit_card_issuer_certificate_not_provided: true,
  not_highway_vehicle: true,
} as const;

function compute(
  input: Pick<
    Extract<Form4136Input, { claimant_context: "business" }>,
    "business" | "claims"
  >,
) {
  return f4136.compute({ taxYear: 2025, formType: "f1040" }, {
    ...input,
    claimant_context: "business",
    additional_activities: [],
    primary_activity_has_most_qualified_fuel_usage: true,
  });
}

function parseInput(input: Record<string, unknown>) {
  return inputSchema.safeParse({
    claimant_context: "business",
    additional_activities: [],
    primary_activity_has_most_qualified_fuel_usage: true,
    ...input,
  });
}

Deno.test("Form 4136: qualified business gasoline and diesel route to refundable Schedule 3 line 12", () => {
  const result = compute({
    business,
    claims: [
      {
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 300,
      },
      {
        ...certifications,
        line: "3b",
        unit: "gallons",
        qualified_quantity: 100,
        actual_fuel_cost: 400,
      },
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
    ["11b", "02", 18.3],
    ["11c", "02", 18.3],
    ["11d", "02", 18.3],
    ["11e", "02", 24.3],
    ["11f", "02", 24.3],
    ["11g", "02", 24.3],
    ["11h", "02", 18.3],
  ] as const;
  for (const [line, type_of_use, expected] of cases) {
    const result = compute({
      business,
      claims: [{
        ...certifications,
        line,
        type_of_use,
        unit: line === "11a" || line === "11c"
          ? "GGE"
          : line === "11g"
          ? "DGE"
          : "gallons",
        qualified_quantity: 100,
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
      claims: [{
        ...certifications,
        line: "1a",
        unit: "gallons",
        qualified_quantity: 1,
        actual_fuel_cost: 3,
      }],
    }).outputs[0].fields.line12_fuel_tax_credit,
    0.18,
  );
});

Deno.test("Form 4136: eligibility, costs, use codes, and duplicate claims are required", () => {
  const claim = {
    ...certifications,
    line: "3a",
    type_of_use: "02",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  } as const;
  assertEquals(parseInput({ claims: [claim] }).success, false);
  assertEquals(
    parseInput({
      business: { ...business, claimant_is_ultimate_purchaser: false },
      claims: [claim],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [claim],
      primary_activity_has_most_qualified_fuel_usage: false,
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, actual_fuel_cost: 0 }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, type_of_use: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({ business, claims: [claim, claim] }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, undyed_fuel_confirmed: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, not_highway_vehicle: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, unit: "GGE" }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      compute({
        business,
        claims: [{ ...claim, unit: "gallons", qualified_quantity: -1 }],
      }),
    Error,
  );
});

Deno.test("Form 4136: aviation claims require no-waiver and credit-card certifications", () => {
  const aviation = {
    ...certifications,
    line: "2b" as const,
    type_of_use: "13",
    unit: "gallons",
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    parseInput({ business, claims: [aviation] }).success,
    true,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...aviation, right_to_claim_not_waived: undefined }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...aviation,
        credit_card_issuer_certificate_not_provided: undefined,
      }],
    }).success,
    false,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{
        ...aviation,
        line: "5c",
        type_of_use: "01",
        right_to_claim_not_waived: undefined,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: line 11 retains an explicit equivalent-fuel unit", () => {
  const claim = {
    ...certifications,
    line: "11c" as const,
    type_of_use: "02",
    unit: "DGE" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    parseInput({ business, claims: [claim] }).success,
    true,
  );
  assertEquals(
    compute({ business, claims: [claim] }).outputs[0].fields
      .line12_fuel_tax_credit,
    18.3,
  );
  assertEquals(
    parseInput({
      business,
      claims: [{ ...claim, line: "3a" }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: line 11 bus claims use reduced rates and required units", () => {
  const cases = [
    ["11a", "GGE", 10.9],
    ["11b", "gallons", 11],
    ["11c", "GGE", 10.9],
    ["11d", "gallons", 11],
    ["11e", "gallons", 17],
    ["11f", "gallons", 17],
    ["11g", "DGE", 16.9],
    ["11h", "gallons", 11],
  ] as const;
  for (const [line, unit, expected] of cases) {
    const claim = {
      ...certifications,
      line,
      type_of_use: "05",
      unit,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
    } as const;
    assertEquals(
      parseInput({ business, claims: [claim] }).success,
      true,
    );
    assertEquals(
      compute({ business, claims: [claim] }).outputs[0].fields
        .line12_fuel_tax_credit,
      expected,
    );
    assertEquals(
      parseInput({
        business,
        claims: [{ ...claim, unit: "gallons" }],
      }).success,
      unit === "gallons",
    );
  }
});

Deno.test("Form 4136: separate business activities combine credit without merging claim validation", () => {
  const claim = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  const input = {
    claimant_context: "business" as const,
    business: { ...business, business_ein: "123456789" },
    claims: [claim],
    additional_activities: [{
      business: {
        ...business,
        business_name: "Second Business",
        business_ein: "987654321",
      },
      claims: [{ ...claim, qualified_quantity: 50 }],
    }],
    primary_activity_has_most_qualified_fuel_usage: true as const,
  };
  assertEquals(inputSchema.safeParse(input).success, true);
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    27.45,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      additional_activities: [{
        ...input.additional_activities[0],
        claims: [claim, claim],
      }],
    }).success,
    false,
  );
});

Deno.test("Form 4136: claim cents on separate Schedules A add to the parent credit", () => {
  const claim = {
    ...certifications,
    line: "1a" as const,
    unit: "gallons" as const,
    qualified_quantity: 1,
    actual_fuel_cost: 3,
  };
  const input = {
    claimant_context: "business" as const,
    business,
    claims: [claim],
    additional_activities: [{
      business: { ...business, business_name: "Second Activity" },
      claims: [claim],
    }],
    primary_activity_has_most_qualified_fuel_usage: true as const,
  };
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    0.36,
  );
});

Deno.test("Form 4136: a combined fuel line rejects mixed units without conversion", () => {
  const claim = {
    ...certifications,
    line: "11a" as const,
    type_of_use: "02",
    unit: "GGE" as const,
    qualified_quantity: 100,
    actual_fuel_cost: 300,
  };
  assertEquals(
    inputSchema.safeParse({
      claimant_context: "business",
      business,
      claims: [claim],
      additional_activities: [{
        business: { ...business, business_name: "Second Activity" },
        claims: [{ ...claim, unit: "gallons" }],
      }],
      primary_activity_has_most_qualified_fuel_usage: true,
    }).success,
    false,
  );
});

Deno.test("Form 4136: home heating kerosene follows the nonbusiness exception", () => {
  const input = {
    claimant_context: "home_kerosene" as const,
    claimant_is_ultimate_purchaser: true as const,
    home_purchase_outside_blocked_pump: true as const,
    home_use_heating_lighting_or_cooking: true as const,
    purchase_records_confirmed: true as const,
    no_duplicate_excise_claim: true as const,
    claims: [{
      line: "4a" as const,
      type_of_use: "08",
      unit: "gallons" as const,
      qualified_quantity: 100,
      actual_fuel_cost: 300,
      undyed_fuel_confirmed: true as const,
    }],
  };
  assertEquals(inputSchema.safeParse(input).success, true);
  assertEquals(
    f4136.compute({ taxYear: 2025, formType: "f1040" }, input).outputs[0]
      .fields.line12_fuel_tax_credit,
    24.3,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      home_purchase_outside_blocked_pump: false,
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...input,
      claims: [{ ...input.claims[0], type_of_use: "02" }],
    }).success,
    false,
  );
});
