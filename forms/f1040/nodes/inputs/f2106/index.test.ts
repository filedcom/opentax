import { assertEquals, assertThrows } from "@std/assert";
import { f2106, EmployeeType, VehicleMethod } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

import type { z } from "zod";
import { itemSchema } from "./index.ts";

type F2106Item = Partial<z.infer<typeof itemSchema>> & { employee_type: EmployeeType };

function minimalItem(overrides: Partial<z.infer<typeof itemSchema>> = {}): F2106Item {
  return { employee_type: EmployeeType.RESERVIST, ...overrides };
}

function compute(items: F2106Item[], agi?: number) {
  return f2106.compute({ taxYear: 2025, formType: "f1040" }, { f2106s: items as z.infer<typeof itemSchema>[], agi });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o: { nodeType: string }) => o.nodeType === nodeType);
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f2106.inputSchema: empty array fails (min 1)", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [] });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: valid minimal item with RESERVIST passes", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [{ employee_type: EmployeeType.RESERVIST }] });
  assertEquals(parsed.success, true);
});

Deno.test("f2106.inputSchema: valid PERFORMING_ARTIST employee type passes", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [{ employee_type: EmployeeType.PERFORMING_ARTIST }] });
  assertEquals(parsed.success, true);
});

Deno.test("f2106.inputSchema: valid FEE_BASIS_OFFICIAL employee type passes", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [{ employee_type: EmployeeType.FEE_BASIS_OFFICIAL }] });
  assertEquals(parsed.success, true);
});

Deno.test("f2106.inputSchema: valid DISABLED_IMPAIRMENT employee type passes", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [{ employee_type: EmployeeType.DISABLED_IMPAIRMENT }] });
  assertEquals(parsed.success, true);
});

Deno.test("f2106.inputSchema: invalid employee_type string fails", () => {
  const parsed = f2106.inputSchema.safeParse({ f2106s: [{ employee_type: "CIVILIAN" }] });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: negative business_miles fails", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{ employee_type: EmployeeType.RESERVIST, business_miles: -10 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: negative travel_expenses fails", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{ employee_type: EmployeeType.RESERVIST, travel_expenses: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: negative meals_expenses fails", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{ employee_type: EmployeeType.RESERVIST, meals_expenses: -50 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: negative employer_reimbursements fails", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{ employee_type: EmployeeType.RESERVIST, employer_reimbursements: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: business_use_pct > 100 fails", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{ employee_type: EmployeeType.RESERVIST, business_use_pct: 110 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f2106.inputSchema: valid full item passes", () => {
  const parsed = f2106.inputSchema.safeParse({
    f2106s: [{
      employee_type: EmployeeType.RESERVIST,
      vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
      business_miles: 1000,
      parking_tolls_transportation: 200,
      travel_expenses: 800,
      other_expenses: 150,
      meals_expenses: 400,
      employer_reimbursements: 500,
    }],
  });
  assertEquals(parsed.success, true);
});

// =============================================================================
// 2. Employee Type Gating
// =============================================================================

Deno.test("f2106.compute: RESERVIST with expenses routes to schedule1.line12_business_expenses", () => {
  const result = compute([minimalItem({ travel_expenses: 1000 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1000);
});

Deno.test("f2106.compute: PERFORMING_ARTIST with expenses routes to schedule1", () => {
  const result = compute([{ employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 500 }]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 500);
});

Deno.test("f2106.compute: FEE_BASIS_OFFICIAL with expenses routes to schedule1", () => {
  const result = compute([{ employee_type: EmployeeType.FEE_BASIS_OFFICIAL, other_expenses: 750 }]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 750);
});

Deno.test("f2106.compute: DISABLED_IMPAIRMENT with expenses routes to schedule1", () => {
  const result = compute([{ employee_type: EmployeeType.DISABLED_IMPAIRMENT, other_expenses: 1200 }]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1200);
});

Deno.test("f2106.compute: qualifying type with all zero expenses — no output", () => {
  const result = compute([minimalItem({ travel_expenses: 0, other_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2106.compute: qualifying type with no expense fields — no output", () => {
  const result = compute([minimalItem()]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Vehicle Expenses — Standard Mileage Method
// =============================================================================

Deno.test("f2106.compute: standard mileage 100 miles = $70 (0.70/mile)", () => {
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
    business_miles: 100,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 70);
});

Deno.test("f2106.compute: standard mileage 1000 miles = $700", () => {
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
    business_miles: 1000,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 700);
});

Deno.test("f2106.compute: standard mileage 0 miles = no vehicle expense", () => {
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
    business_miles: 0,
    other_expenses: 100,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 100);
});

// =============================================================================
// 4. Vehicle Expenses — Actual Expense Method
// =============================================================================

Deno.test("f2106.compute: actual expenses × business_use_pct", () => {
  // $2000 × 80% = $1600
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.ACTUAL_EXPENSE,
    actual_vehicle_expenses: 2000,
    business_use_pct: 80,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1600);
});

Deno.test("f2106.compute: actual expenses 100% business use", () => {
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.ACTUAL_EXPENSE,
    actual_vehicle_expenses: 3000,
    business_use_pct: 100,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 3000);
});

// =============================================================================
// 5. Meals — 50% Limitation
// =============================================================================

Deno.test("f2106.compute: meals_expenses subject to 50% limitation", () => {
  // $400 meals × 50% = $200
  const result = compute([minimalItem({ meals_expenses: 400 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 200);
});

Deno.test("f2106.compute: meals combined with other expenses", () => {
  // travel $500 + meals $200 × 50% = 500 + 100 = $600
  const result = compute([minimalItem({
    travel_expenses: 500,
    meals_expenses: 200,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 600);
});

// =============================================================================
// 6. Employer Reimbursements
// =============================================================================

Deno.test("f2106.compute: reimbursements reduce deduction", () => {
  // travel $1000 - reimbursement $300 = $700
  const result = compute([minimalItem({
    travel_expenses: 1000,
    employer_reimbursements: 300,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 700);
});

Deno.test("f2106.compute: reimbursements equal expenses — no deduction", () => {
  const result = compute([minimalItem({
    travel_expenses: 500,
    employer_reimbursements: 500,
  })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2106.compute: reimbursements exceed expenses — no deduction (floors at 0)", () => {
  const result = compute([minimalItem({
    travel_expenses: 300,
    employer_reimbursements: 1000,
  })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 7. Aggregation — Multiple Items (Multiple Form 2106s)
// =============================================================================

Deno.test("f2106.compute: multiple items summed", () => {
  const result = compute([
    minimalItem({ travel_expenses: 1000 }),
    { employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 500 },
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1500);
});

Deno.test("f2106.compute: multiple items produce exactly one schedule1 output", () => {
  const result = compute([
    minimalItem({ travel_expenses: 800 }),
    minimalItem({ other_expenses: 200 }),
  ]);
  const schedule1Outputs = result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1");
  assertEquals(schedule1Outputs.length, 1);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1000);
});

Deno.test("f2106.compute: one item with zero expenses in multi-item — only non-zero sums", () => {
  const result = compute([
    minimalItem({ other_expenses: 0 }),
    { employee_type: EmployeeType.FEE_BASIS_OFFICIAL, other_expenses: 900 },
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 900);
});

// =============================================================================
// 8. Hard Validation
// =============================================================================

Deno.test("f2106.compute: throws on negative travel_expenses", () => {
  assertThrows(() => compute([minimalItem({ travel_expenses: -100 })]), Error);
});

Deno.test("f2106.compute: throws on negative meals_expenses", () => {
  assertThrows(() => compute([minimalItem({ meals_expenses: -50 })]), Error);
});

Deno.test("f2106.compute: throws on negative employer_reimbursements", () => {
  assertThrows(() => compute([minimalItem({ employer_reimbursements: -200 })]), Error);
});

Deno.test("f2106.compute: throws on invalid employee_type", () => {
  assertThrows(
    () => f2106.compute({ taxYear: 2025, formType: "f1040" }, { f2106s: [{ employee_type: "NOT_A_TYPE" as EmployeeType }] }),
    Error,
  );
});

Deno.test("f2106.compute: zero expenses do not throw", () => {
  const result = compute([minimalItem({ travel_expenses: 0 })]);
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 9. Edge Cases
// =============================================================================

Deno.test("f2106.compute: all expense types combined correctly", () => {
  // vehicle (std mileage) 200mi × 0.70 = 140
  // parking = 50
  // travel = 300
  // other = 100
  // meals 200 × 50% = 100
  // total = 140 + 50 + 300 + 100 + 100 = 690
  // reimbursements = 100
  // net = 590
  const result = compute([minimalItem({
    vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
    business_miles: 200,
    parking_tolls_transportation: 50,
    travel_expenses: 300,
    other_expenses: 100,
    meals_expenses: 200,
    employer_reimbursements: 100,
  })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 590);
});

Deno.test("f2106.compute: parking_tolls_transportation alone routes correctly", () => {
  const result = compute([minimalItem({ parking_tolls_transportation: 250 })]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 250);
});

// =============================================================================
// 10. Smoke Test
// =============================================================================

Deno.test("f2106.compute: smoke test — two qualifying employees with different expense types", () => {
  const result = compute([
    // Reservist: standard mileage + travel + meals
    {
      employee_type: EmployeeType.RESERVIST,
      vehicle_expense_method: VehicleMethod.STANDARD_MILEAGE,
      business_miles: 500,    // 500 × 0.70 = 350
      travel_expenses: 1200,  // 1200
      meals_expenses: 600,    // 600 × 50% = 300
      employer_reimbursements: 200,
      // total before reimbursement: 350 + 1200 + 300 = 1850
      // net: 1850 - 200 = 1650
    },
    // Performing artist: actual vehicle + other expenses
    {
      employee_type: EmployeeType.PERFORMING_ARTIST,
      vehicle_expense_method: VehicleMethod.ACTUAL_EXPENSE,
      actual_vehicle_expenses: 1000, // 1000 × 75% = 750
      business_use_pct: 75,
      other_expenses: 400,  // 400
      // total: 750 + 400 = 1150, no reimbursements
    },
  ]);

  // Reservist: 1650, Performing artist: 1150, total = 2800
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 2800);
  assertEquals(result.outputs.filter((o: { nodeType: string }) => o.nodeType === "schedule1").length, 1);
});

// =============================================================================
// AGI limit for performing artists (IRC §62(b)(1)(C))
// =============================================================================

Deno.test("f2106: performing artist with AGI ≤ $16,000 — deduction allowed", () => {
  const result = compute([
    minimalItem({ employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 1000 }),
  ], 15_000);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 1000);
});

Deno.test("f2106: performing artist with AGI > $16,000 — deduction disallowed", () => {
  const result = compute([
    minimalItem({ employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 1000 }),
  ], 20_000);
  assertEquals(result.outputs.length, 0);
});

Deno.test("f2106: performing artist AGI > $16,000 but reservist present — reservist deduction retained", () => {
  const result = compute([
    minimalItem({ employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 500 }),
    minimalItem({ employee_type: EmployeeType.RESERVIST, other_expenses: 800 }),
  ], 25_000);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 800);
});

Deno.test("f2106: no AGI provided — performing artist deduction allowed (no limit enforced)", () => {
  const result = compute([
    minimalItem({ employee_type: EmployeeType.PERFORMING_ARTIST, other_expenses: 600 }),
  ]);
  const fields = fieldsOf(result.outputs, schedule1)!;
  assertEquals(fields.line12_business_expenses, 600);
});
