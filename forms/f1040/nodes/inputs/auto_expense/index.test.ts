import { assertEquals, assertThrows } from "@std/assert";
import { auto_expense, AutoMethod, AutoPurpose } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleC } from "../schedule_c/index.ts";
import { scheduleE } from "../schedule_e/index.ts";
import { schedule_f } from "../../intermediate/forms/schedule_f/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    vehicle_description: "2022 Toyota Camry",
    placed_in_service_date: "2022-01-15",
    business_miles: 0,
    total_miles: 10000,
    method: AutoMethod.Standard,
    purpose: AutoPurpose.SCHEDULE_C,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return auto_expense.compute({ taxYear: 2025 }, { auto_expenses: items });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Validation
// =============================================================================

Deno.test("auto_expense.inputSchema: valid standard mileage item passes", () => {
  const parsed = auto_expense.inputSchema.safeParse({
    auto_expenses: [{
      vehicle_description: "2022 Toyota Camry",
      placed_in_service_date: "2022-01-15",
      business_miles: 5000,
      total_miles: 10000,
      method: "standard",
      purpose: "SCHEDULE_C",
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("auto_expense.inputSchema: empty array fails (min 1)", () => {
  const parsed = auto_expense.inputSchema.safeParse({ auto_expenses: [] });
  assertEquals(parsed.success, false);
});

Deno.test("auto_expense.inputSchema: negative business_miles fails", () => {
  const parsed = auto_expense.inputSchema.safeParse({
    auto_expenses: [{ ...minimalItem(), business_miles: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("auto_expense.inputSchema: negative total_miles fails", () => {
  const parsed = auto_expense.inputSchema.safeParse({
    auto_expenses: [{ ...minimalItem(), total_miles: -1 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("auto_expense.inputSchema: invalid method fails", () => {
  const parsed = auto_expense.inputSchema.safeParse({
    auto_expenses: [{ ...minimalItem(), method: "invalid" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("auto_expense.inputSchema: invalid purpose fails", () => {
  const parsed = auto_expense.inputSchema.safeParse({
    auto_expenses: [{ ...minimalItem(), purpose: "INVALID" }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Standard mileage calculation (70 cents/mile)
// =============================================================================

Deno.test("auto_expense.compute: standard mileage — 10,000 business miles = $7,000", () => {
  const result = compute([minimalItem({ business_miles: 10000, total_miles: 15000, method: AutoMethod.Standard })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 7000);
});

Deno.test("auto_expense.compute: standard mileage — 1,000 business miles = $700", () => {
  const result = compute([minimalItem({ business_miles: 1000, total_miles: 5000, method: AutoMethod.Standard })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 700);
});

Deno.test("auto_expense.compute: standard mileage — zero business miles = no output", () => {
  const result = compute([minimalItem({ business_miles: 0, total_miles: 10000, method: AutoMethod.Standard })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Actual expense method calculation
// =============================================================================

Deno.test("auto_expense.compute: actual method — 50% business use on $10,000 actual = $5,000", () => {
  const result = compute([minimalItem({
    business_miles: 5000,
    total_miles: 10000,
    method: AutoMethod.Actual,
    actual_expenses: {
      depreciation: 3000,
      gas_oil: 2000,
      repairs: 1000,
      insurance: 2000,
      registration: 500,
      other: 1500,
    },
  })]);
  // total actual = 10000, business_pct = 0.5, deductible = 5000
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 5000);
});

Deno.test("auto_expense.compute: actual method — 100% business use", () => {
  const result = compute([minimalItem({
    business_miles: 10000,
    total_miles: 10000,
    method: AutoMethod.Actual,
    actual_expenses: { gas_oil: 2000, repairs: 500 },
  })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 2500);
});

Deno.test("auto_expense.compute: actual method with no actual_expenses — no output", () => {
  const result = compute([minimalItem({
    business_miles: 5000,
    total_miles: 10000,
    method: AutoMethod.Actual,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 4. Purpose routing
// =============================================================================

Deno.test("auto_expense.compute: purpose SCHEDULE_C routes to schedule_c", () => {
  const result = compute([minimalItem({
    business_miles: 5000,
    total_miles: 10000,
    method: AutoMethod.Standard,
    purpose: AutoPurpose.SCHEDULE_C,
  })]);
  const out = findOutput(result, "schedule_c");
  assertEquals(out !== undefined, true);
  assertEquals(findOutput(result, "schedule_e"), undefined);
  assertEquals(findOutput(result, "schedule_f"), undefined);
});

Deno.test("auto_expense.compute: purpose SCHEDULE_E routes to schedule_e", () => {
  const result = compute([minimalItem({
    business_miles: 5000,
    total_miles: 10000,
    method: AutoMethod.Standard,
    purpose: AutoPurpose.SCHEDULE_E,
  })]);
  const out = findOutput(result, "schedule_e");
  assertEquals(out !== undefined, true);
  assertEquals(findOutput(result, "schedule_c"), undefined);
  const fields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(fields.expense_auto_travel, 3500);
});

Deno.test("auto_expense.compute: purpose SCHEDULE_F routes to schedule_f", () => {
  const result = compute([minimalItem({
    business_miles: 5000,
    total_miles: 10000,
    method: AutoMethod.Standard,
    purpose: AutoPurpose.SCHEDULE_F,
  })]);
  const out = findOutput(result, "schedule_f");
  assertEquals(out !== undefined, true);
  assertEquals(findOutput(result, "schedule_c"), undefined);
  const fields = fieldsOf(result.outputs, schedule_f)!;
  assertEquals(fields.line10_car_truck, 3500);
});

// =============================================================================
// 5. Aggregation — multiple vehicles, same purpose
// =============================================================================

Deno.test("auto_expense.compute: two SCHEDULE_C vehicles — deductions summed into one output", () => {
  const result = compute([
    minimalItem({ business_miles: 10000, total_miles: 15000, method: AutoMethod.Standard, purpose: AutoPurpose.SCHEDULE_C }),
    minimalItem({ business_miles: 5000, total_miles: 8000, method: AutoMethod.Standard, purpose: AutoPurpose.SCHEDULE_C }),
  ]);
  // 10000 × 0.70 = 7000; 5000 × 0.70 = 3500; total = 10500
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 10500);
  const schedCOutputs = result.outputs.filter((o) => o.nodeType === "schedule_c");
  assertEquals(schedCOutputs.length, 1);
});

Deno.test("auto_expense.compute: mixed purposes — separate outputs for each", () => {
  const result = compute([
    minimalItem({ business_miles: 10000, total_miles: 15000, method: AutoMethod.Standard, purpose: AutoPurpose.SCHEDULE_C }),
    minimalItem({ business_miles: 5000, total_miles: 10000, method: AutoMethod.Standard, purpose: AutoPurpose.SCHEDULE_E }),
  ]);
  assertEquals(result.outputs.length, 2);
  const cFields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(cFields.line_9_car_truck_expenses, 7000);
  const eFields = fieldsOf(result.outputs, scheduleE)!;
  assertEquals(eFields.expense_auto_travel, 3500);
});

// =============================================================================
// 6. Hard validation
// =============================================================================

Deno.test("auto_expense.compute: throws when business_miles > total_miles", () => {
  assertThrows(
    () => compute([minimalItem({ business_miles: 15000, total_miles: 10000, method: AutoMethod.Standard })]),
    Error,
  );
});

Deno.test("auto_expense.compute: throws when total_miles = 0 (with actual method)", () => {
  assertThrows(
    () => compute([minimalItem({ business_miles: 0, total_miles: 0, method: AutoMethod.Actual, actual_expenses: { gas_oil: 1000 } })]),
    Error,
  );
});

Deno.test("auto_expense.compute: business_miles = total_miles does not throw", () => {
  const result = compute([minimalItem({ business_miles: 5000, total_miles: 5000, method: AutoMethod.Standard })]);
  assertEquals(Array.isArray(result.outputs), true);
});

// =============================================================================
// 7. Edge cases
// =============================================================================

Deno.test("auto_expense.compute: standard method — exact mileage calculation at 70 cents", () => {
  const result = compute([minimalItem({ business_miles: 100, total_miles: 200, method: AutoMethod.Standard })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(fields.line_9_car_truck_expenses, 70);
});

Deno.test("auto_expense.compute: actual method — partial business use rounds correctly", () => {
  // 3000/7000 = ~42.86%; 4200 total × 0.4286 ≈ 1800
  const result = compute([minimalItem({
    business_miles: 3000,
    total_miles: 7000,
    method: AutoMethod.Actual,
    actual_expenses: { gas_oil: 2000, insurance: 1400, repairs: 800 },  // total = 4200
    purpose: AutoPurpose.SCHEDULE_C,
  })]);
  const fields = fieldsOf(result.outputs, scheduleC)!;
  // 4200 × (3000/7000) = 4200 × 0.42857... = 1800
  assertEquals(fields.line_9_car_truck_expenses, 1800);
});

// =============================================================================
// 8. Smoke test
// =============================================================================

Deno.test("auto_expense.compute: smoke test — two vehicles mixed methods and purposes", () => {
  const result = compute([
    minimalItem({
      vehicle_description: "2023 Ford F-150",
      business_miles: 20000,
      total_miles: 25000,
      method: AutoMethod.Standard,
      purpose: AutoPurpose.SCHEDULE_C,
    }),
    minimalItem({
      vehicle_description: "2021 Honda CR-V",
      business_miles: 4000,
      total_miles: 8000,
      method: AutoMethod.Actual,
      actual_expenses: { depreciation: 2000, gas_oil: 1200, repairs: 400, insurance: 1200, registration: 200 },
      purpose: AutoPurpose.SCHEDULE_F,
    }),
  ]);
  // Vehicle 1 (standard): 20000 × 0.70 = 14000 → schedule_c
  // Vehicle 2 (actual): total=5000; pct=0.5; deductible=2500 → schedule_f
  const cFields = fieldsOf(result.outputs, scheduleC)!;
  assertEquals(cFields.line_9_car_truck_expenses, 14000);
  const fFields = fieldsOf(result.outputs, schedule_f)!;
  assertEquals(fFields.line10_car_truck, 2500);
  assertEquals(result.outputs.length, 2);
});
