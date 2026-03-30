import { assertEquals, assertThrows } from "@std/assert";
import { f8609, itemSchema } from "./index.ts";
import type { NodeOutput } from "../../../../../core/types/tax-node.ts";
import type { z } from "zod";

type F8609Item = z.infer<typeof itemSchema>;

function minimalItem(overrides: Partial<F8609Item> = {}): F8609Item {
  return {
    annual_credit_amount: 0,
    ...overrides,
  };
}

function compute(items: F8609Item[]) {
  return f8609.compute({ f8609s: items });
}

function findSchedule3(result: ReturnType<typeof compute>) {
  return result.outputs.find((o: NodeOutput) => o.nodeType === "schedule3");
}

// ── Schema Validation ────────────────────────────────────────────────────────

Deno.test("schema_rejects_empty_array", () => {
  assertThrows(() => f8609.compute({ f8609s: [] }), Error);
});

Deno.test("schema_rejects_negative_annual_credit_amount", () => {
  const result = f8609.inputSchema.safeParse({
    f8609s: [{ annual_credit_amount: -500 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_accepts_valid_minimal_item", () => {
  const result = f8609.inputSchema.safeParse({
    f8609s: [{ annual_credit_amount: 10000 }],
  });
  assertEquals(result.success, true);
});

Deno.test("schema_accepts_item_with_all_optional_fields", () => {
  const result = f8609.inputSchema.safeParse({
    f8609s: [
      {
        annual_credit_amount: 10000,
        building_id: "WA-2025-001",
        credit_percentage: 0.09,
        qualified_basis: 111111,
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("schema_rejects_negative_qualified_basis", () => {
  const result = f8609.inputSchema.safeParse({
    f8609s: [{ annual_credit_amount: 5000, qualified_basis: -100 }],
  });
  assertEquals(result.success, false);
});

Deno.test("schema_rejects_negative_credit_percentage", () => {
  const result = f8609.inputSchema.safeParse({
    f8609s: [{ annual_credit_amount: 5000, credit_percentage: -0.09 }],
  });
  assertEquals(result.success, false);
});

// ── Zero Output Cases ─────────────────────────────────────────────────────────

Deno.test("zero_annual_credit_produces_no_output", () => {
  const result = compute([minimalItem({ annual_credit_amount: 0 })]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("all_zero_credits_produce_no_output", () => {
  const result = compute([
    minimalItem({ annual_credit_amount: 0 }),
    minimalItem({ annual_credit_amount: 0 }),
  ]);
  assertEquals(result.outputs.length, 0);
});

// ── Single Building ───────────────────────────────────────────────────────────

Deno.test("single_building_routes_to_schedule3", () => {
  const result = compute([minimalItem({ annual_credit_amount: 10000 })]);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

Deno.test("single_building_credit_amount_passed_through", () => {
  const result = compute([minimalItem({ annual_credit_amount: 10000 })]);
  const s3 = findSchedule3(result);
  assertEquals(s3?.fields.line6b_low_income_housing_credit, 10000);
});

Deno.test("single_building_with_optional_fields_routes_correctly", () => {
  const result = compute([
    {
      annual_credit_amount: 7500,
      building_id: "CA-2025-042",
      credit_percentage: 0.09,
      qualified_basis: 83333,
    },
  ]);
  const s3 = findSchedule3(result);
  assertEquals(s3?.fields.line6b_low_income_housing_credit, 7500);
});

// ── Multiple Buildings ────────────────────────────────────────────────────────

Deno.test("two_buildings_total_is_summed", () => {
  const result = compute([
    minimalItem({ annual_credit_amount: 10000 }),
    minimalItem({ annual_credit_amount: 5000 }),
  ]);
  const s3 = findSchedule3(result);
  assertEquals(s3?.fields.line6b_low_income_housing_credit, 15000);
});

Deno.test("three_buildings_total_is_summed", () => {
  const result = compute([
    minimalItem({ annual_credit_amount: 10000 }),
    minimalItem({ annual_credit_amount: 8000 }),
    minimalItem({ annual_credit_amount: 2000 }),
  ]);
  const s3 = findSchedule3(result);
  assertEquals(s3?.fields.line6b_low_income_housing_credit, 20000);
});

Deno.test("multiple_buildings_only_one_schedule3_output", () => {
  const result = compute([
    minimalItem({ annual_credit_amount: 10000 }),
    minimalItem({ annual_credit_amount: 5000 }),
  ]);
  const s3Outputs = result.outputs.filter((o: NodeOutput) => o.nodeType === "schedule3");
  assertEquals(s3Outputs.length, 1);
});

Deno.test("mix_of_zero_and_nonzero_buildings_sums_correctly", () => {
  const result = compute([
    minimalItem({ annual_credit_amount: 0 }),
    minimalItem({ annual_credit_amount: 12000 }),
    minimalItem({ annual_credit_amount: 0 }),
  ]);
  const s3 = findSchedule3(result);
  assertEquals(s3?.fields.line6b_low_income_housing_credit, 12000);
});

// ── Routing Correctness ───────────────────────────────────────────────────────

Deno.test("output_node_type_is_schedule3", () => {
  const result = compute([minimalItem({ annual_credit_amount: 5000 })]);
  assertEquals(result.outputs[0]?.nodeType, "schedule3");
});

Deno.test("no_extra_outputs_produced", () => {
  const result = compute([minimalItem({ annual_credit_amount: 5000 })]);
  assertEquals(result.outputs.length, 1);
});
