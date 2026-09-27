import { assertEquals, assertThrows } from "@std/assert";
import { f8283, FMVMethod } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";

function compute(input: Record<string, unknown>) {
  return f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    input as Parameters<typeof f8283.compute>[1],
  );
}

// =============================================================================
// 1. Input Schema Validation
// =============================================================================

Deno.test("f8283.inputSchema: empty input (no items) passes validation", () => {
  const parsed = f8283.inputSchema.safeParse({});
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: empty arrays pass validation", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [],
    section_b_items: [],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: negative section A fmv fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv: -100 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: negative section B fmv fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_b_items: [{ fmv: -500 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: Section B requires a claimed amount not above appraised FMV", () => {
  assertEquals(
    f8283.inputSchema.safeParse({ section_b_items: [{ fmv: 6000 }] }).success,
    false,
  );
  assertEquals(
    f8283.inputSchema.safeParse({
      section_b_items: [{ fmv: 6000, deduction_claimed: 6500 }],
    }).success,
    false,
  );
});

Deno.test("f8283.inputSchema: negative cost_or_adjusted_basis fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ cost_or_adjusted_basis: -200 }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: valid FMVMethod passes", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv: 300, fmv_method: FMVMethod.ThriftShopValue }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: invalid FMVMethod fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv_method: "INVALID_METHOD" }],
  });
  assertEquals(parsed.success, false);
});

// =============================================================================
// 2. Per-Section Routing
// =============================================================================

Deno.test("f8283.compute: section A item routes fmv to schedule_a line_12_noncash_contributions", () => {
  const result = compute({ section_a_items: [{ fmv: 300 }] });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 300);
});

Deno.test("f8283.compute: Section A routes the claimed deduction, not the higher FMV", () => {
  const result = compute({
    section_a_items: [
      { fmv: 1_200, deduction_claimed: 700 },
      { fmv: 400, deduction_claimed: 250 },
    ],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule_a)?.line_12_noncash_contributions,
    950,
  );
});

Deno.test("f8283.compute: Section A rejects claimed amounts without FMV or above FMV", () => {
  assertThrows(
    () => compute({ section_a_items: [{ deduction_claimed: 200 }] }),
    Error,
    "claimed deduction needs fair market value",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{ fmv: 200, deduction_claimed: 250 }],
      }),
    Error,
    "deduction exceeds FMV",
  );
});

Deno.test("f8283.compute: section B item routes claimed deduction to schedule_a line 12", () => {
  const result = compute({
    section_b_items: [{ fmv: 7000, deduction_claimed: 6000 }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 6000);
});

Deno.test("f8283.compute: zero fmv — no schedule_a output", () => {
  const result = compute({ section_a_items: [{ fmv: 0 }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: no items — no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: empty arrays — no outputs", () => {
  const result = compute({ section_a_items: [], section_b_items: [] });
  assertEquals(result.outputs.length, 0);
});

// =============================================================================
// 3. Claimed deduction is distinct from appraised FMV and cost basis
// =============================================================================

Deno.test("f8283.compute: capital gain property is not automatically capped at basis", () => {
  const result = compute({
    section_b_items: [{
      fmv: 10000,
      deduction_claimed: 10000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 10000);
});

Deno.test("f8283.compute: a stated reduction is honored when below FMV", () => {
  const result = compute({
    section_b_items: [{
      fmv: 3000,
      deduction_claimed: 2500,
      cost_or_adjusted_basis: 5000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 2500);
});

Deno.test("f8283.compute: section B NOT capital gain property — uses full fmv", () => {
  const result = compute({
    section_b_items: [{
      fmv: 10000,
      deduction_claimed: 10000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: false,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 10000);
});

// =============================================================================
// 4. Aggregation
// =============================================================================

Deno.test("f8283.compute: multiple section A items — fmv summed", () => {
  const result = compute({
    section_a_items: [{ fmv: 200 }, { fmv: 350 }, { fmv: 150 }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 700);
});

Deno.test("f8283.compute: section A + section B items combined", () => {
  const result = compute({
    section_a_items: [{ fmv: 1000 }],
    section_b_items: [{ fmv: 6000, deduction_claimed: 6000 }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 7000);
});

Deno.test("f8283.compute: section B with capital gain basis limitation combined with section A", () => {
  const result = compute({
    section_a_items: [{ fmv: 500 }],
    section_b_items: [{
      fmv: 8000,
      deduction_claimed: 3000,
      cost_or_adjusted_basis: 3000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  // Explicitly reduced deduction, not an automatic capital-gain basis cap.
  assertEquals(fields.line_12_noncash_contributions, 3500);
});

// =============================================================================
// 5. Informational Fields — must NOT produce tax outputs
// =============================================================================

Deno.test("f8283.compute: only property description — no outputs", () => {
  const result = compute({
    section_a_items: [{ property_description: "Used clothing" }],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: only date fields — no outputs", () => {
  const result = compute({
    section_a_items: [{
      date_acquired: "2020-01-15",
      date_contributed: "2025-03-10",
    }],
  });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: vehicle flag only — no outputs without fmv", () => {
  const result = compute({ section_a_items: [{ is_vehicle: true }] });
  assertEquals(result.outputs.length, 0);
});

Deno.test("f8283.compute: sold vehicle is limited to acknowledged proceeds", () => {
  const item = {
    property_description: "2020 sedan",
    is_vehicle: true,
    vehicle_vin: "1HGBH41JXMN109186",
    date_contributed: "2025-06-01",
    fmv: 20_000,
    deduction_claimed: 15_000,
    vehicle_sale_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "City Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      acknowledgment_received_date: "2025-07-15",
      sale_to_unrelated_party: true,
      sale_date: "2025-07-01",
      gross_proceeds: 15_000,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false,
    },
  };
  const result = compute({ section_a_items: [item] });
  assertEquals(
    fieldsOf(result.outputs, schedule_a)?.line_12_noncash_contributions,
    15_000,
  );
  assertThrows(
    () =>
      compute({ section_a_items: [{ ...item, deduction_claimed: 16_000 }] }),
    Error,
    "exceeds gross sale proceeds",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{ ...item, vehicle_sale_acknowledgment: undefined }],
      }),
    Error,
    "needs the donee sale acknowledgment",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          vehicle_sale_acknowledgment: {
            ...item.vehicle_sale_acknowledgment,
            sale_date: "2025-05-31",
          },
        }],
      }),
    Error,
    "vehicle sale must follow its contribution",
  );
});

// =============================================================================
// 6. Hard Validation
// =============================================================================

Deno.test("f8283.compute: throws on negative fmv in section A", () => {
  assertThrows(() => compute({ section_a_items: [{ fmv: -100 }] }), Error);
});

Deno.test("f8283.compute: throws on negative fmv in section B", () => {
  assertThrows(() => compute({ section_b_items: [{ fmv: -500 }] }), Error);
});

// =============================================================================
// 7. Edge Cases
// =============================================================================

Deno.test("f8283.compute: section B capital gain with no basis — uses full fmv", () => {
  const result = compute({
    section_b_items: [{
      fmv: 5000,
      deduction_claimed: 5000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 5000);
});

Deno.test("f8283.compute: fmv equals basis — uses fmv exactly", () => {
  const result = compute({
    section_b_items: [{
      fmv: 4000,
      deduction_claimed: 4000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: true,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.line_12_noncash_contributions, 4000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8283.compute: smoke test — section A and section B items combined", () => {
  const result = compute({
    section_a_items: [
      {
        property_description: "Used clothing",
        fmv: 250,
        fmv_method: FMVMethod.ThriftShopValue,
        date_contributed: "2025-11-15",
      },
      {
        property_description: "Books",
        fmv: 75,
        fmv_method: FMVMethod.CatalogValue,
      },
    ],
    section_b_items: [
      {
        property_description: "Artwork",
        fmv: 12000,
        deduction_claimed: 12000,
        cost_or_adjusted_basis: 8000,
        is_capital_gain_property: true,
      },
    ],
  });

  const fields = fieldsOf(result.outputs, schedule_a)!;
  // Section A: 250 + 75 = 325; Section B: claimed FMV of 12,000.
  assertEquals(fields.line_12_noncash_contributions, 12325);
});
