import { assertEquals, assertThrows } from "@std/assert";
import {
  f8283,
  FMVMethod,
  inputSchema,
  SectionBPropertyType,
} from "./index.ts";
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
    section_a_items: [{
      fmv: 300,
      fmv_method: FMVMethod.ThriftShopValue,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
    }],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: invalid FMVMethod fails", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [{ fmv_method: "INVALID_METHOD" }],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: positive gift cannot omit AGI-limit classification", () => {
  assertEquals(
    f8283.inputSchema.safeParse({ section_a_items: [{ fmv: 250 }] }).success,
    false,
  );
  assertEquals(
    f8283.inputSchema.safeParse({
      section_b_items: [{ fmv: 6_000, deduction_claimed: 5_500 }],
    }).success,
    false,
  );
});

Deno.test("f8283.inputSchema: capital-gain 50% election needs reduced basis", () => {
  assertEquals(
    f8283.inputSchema.safeParse({
      section_a_items: [{
        fmv: 1_000,
        deduction_claimed: 1_000,
        cost_or_adjusted_basis: 400,
        is_capital_gain_property: true,
        charitable_limit_category: "noncash_50",
        capital_gain_reduction_election_confirmed: true,
      }],
    }).success,
    false,
  );
});

// =============================================================================
// 2. Per-Section Routing
// =============================================================================

Deno.test("f8283.compute: section A item routes categorized source to Schedule A", () => {
  const result = compute({
    section_a_items: [{
      fmv: 300,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.map((item) => ({
      source: item.source,
      amount: item.amount,
      category: item.category,
    })),
    [{
      source: "Form 8283 item 1: property",
      amount: 300,
      category: "noncash_50",
    }],
  );
});

Deno.test("f8283.compute: Section A routes the claimed deduction, not the higher FMV", () => {
  const result = compute({
    section_a_items: [
      {
        fmv: 1_200,
        deduction_claimed: 700,
        date_acquired: "2025-01-01",
        date_contributed: "2025-06-01",
        donor_acquisition_description: "Purchase",
        cost_or_adjusted_basis: 700,
        short_term_ordinary_income_reduction_confirmed: true,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        fmv: 400,
        deduction_claimed: 250,
        date_acquired: "2025-01-01",
        date_contributed: "2025-06-01",
        donor_acquisition_description: "Purchase",
        cost_or_adjusted_basis: 250,
        short_term_ordinary_income_reduction_confirmed: true,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
    ],
  });
  assertEquals(
    fieldsOf(result.outputs, schedule_a)?.noncash_contribution_items?.map((
      item,
    ) => ({
      source: item.source,
      amount: item.amount,
      category: item.category,
    })),
    [
      {
        source: "Form 8283 item 1: property",
        amount: 700,
        category: "noncash_50",
      },
      {
        source: "Form 8283 item 2: property",
        amount: 250,
        category: "noncash_50",
      },
    ],
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
    section_b_items: [{
      fmv: 7000,
      deduction_claimed: 6000,
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.map((item) => ({
      source: item.source,
      amount: item.amount,
      category: item.category,
    })),
    [{
      source: "Form 8283 item 1: property",
      amount: 6000,
      category: "noncash_50",
    }],
  );
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
      charitable_limit_category: "capital_gain_30",
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.noncash_contribution_items?.[0]?.amount, 10000);
});

Deno.test("f8283.compute: a stated reduction is honored when below FMV", () => {
  const result = compute({
    section_a_items: [{
      fmv: 3000,
      deduction_claimed: 2500,
      date_acquired: "2025-01-01",
      date_contributed: "2025-06-01",
      donor_acquisition_description: "Purchase",
      cost_or_adjusted_basis: 2500,
      short_term_ordinary_income_reduction_confirmed: true,
      is_capital_gain_property: false,
      charitable_limit_category: "noncash_50",
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.noncash_contribution_items?.[0]?.amount, 2500);
});

Deno.test("f8283.compute: a voluntary underclaim cannot masquerade as a required FMV reduction", () => {
  const item = {
    fmv: 3_000,
    deduction_claimed: 2_500,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: false,
  };
  assertThrows(
    () => compute({ section_a_items: [item] }),
    Error,
    "needs certified sale proceeds, a sourced short-term ordinary-income reduction",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          date_acquired: "2025-01-01",
          date_contributed: "2025-06-01",
          donor_acquisition_description: "Purchase",
          cost_or_adjusted_basis: 2_400,
          short_term_ordinary_income_reduction_confirmed: true,
        }],
      }),
    Error,
    "claim equal to basis below FMV",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          date_acquired: "2023-01-01",
          date_contributed: "2025-06-01",
          donor_acquisition_description: "Purchase",
          cost_or_adjusted_basis: 2_500,
          short_term_ordinary_income_reduction_confirmed: true,
        }],
      }),
    Error,
    "held no more than one year",
  );
});

Deno.test("f8283.compute: section B NOT capital gain property — uses full fmv", () => {
  const result = compute({
    section_b_items: [{
      fmv: 10000,
      deduction_claimed: 10000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: false,
      charitable_limit_category: "noncash_50",
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.noncash_contribution_items?.[0]?.amount, 10000);
});

// =============================================================================
// 4. Aggregation
// =============================================================================

Deno.test("f8283.inputSchema: cross-donee similar books above $5,000 cannot remain in Section A", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [
      {
        property_description: "Books to college",
        fmv: 2_000,
        deduction_claimed: 2_000,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        property_description: "Books to university",
        fmv: 2_500,
        deduction_claimed: 2_500,
        similar_item_group: "Books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        property_description: "Books to library",
        fmv: 900,
        deduction_claimed: 900,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
    ],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.inputSchema: same cross-donee books qualify for separate Section B items", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_b_items: [
      {
        property_description: "Books to college",
        fmv: 2_000,
        deduction_claimed: 2_000,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        property_description: "Books to university",
        fmv: 2_500,
        deduction_claimed: 2_500,
        similar_item_group: "Books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        property_description: "Books to library",
        fmv: 900,
        deduction_claimed: 900,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
    ],
  });
  assertEquals(parsed.success, true);
});

Deno.test("f8283.inputSchema: multiple positive gifts require explicit similar-property categories", () => {
  const parsed = f8283.inputSchema.safeParse({
    section_a_items: [
      {
        fmv: 200,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        fmv: 350,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
    ],
  });
  assertEquals(parsed.success, false);
});

Deno.test("f8283.compute: multiple section A items — fmv summed", () => {
  const result = compute({
    section_a_items: [
      {
        fmv: 200,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        fmv: 350,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        fmv: 150,
        similar_item_group: "books",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
    ],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.map((item: { amount: number }) =>
      item.amount
    ),
    [200, 350, 150],
  );
});

Deno.test("f8283.compute: section A + section B items combined", () => {
  const result = compute({
    section_a_items: [{
      fmv: 1000,
      similar_item_group: "clothing",
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
    }],
    section_b_items: [{
      fmv: 6000,
      deduction_claimed: 6000,
      similar_item_group: "equipment",
      charitable_limit_category: "noncash_50",
      is_capital_gain_property: false,
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.map((item: { amount: number }) =>
      item.amount
    ),
    [1000, 6000],
  );
});

Deno.test("f8283.compute: capital gain 50% election routes property facts for return-wide reconciliation", () => {
  const result = compute({
    section_a_items: [
      {
        fmv: 500,
        similar_item_group: "clothing",
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
      },
      {
        fmv: 8000,
        deduction_claimed: 3000,
        similar_item_group: "securities",
        date_acquired: "2022-02-01",
        date_contributed: "2025-06-01",
        donor_acquisition_description: "Purchase",
        cost_or_adjusted_basis: 3000,
        is_capital_gain_property: true,
        charitable_limit_category: "noncash_50",
        capital_gain_reduction_election_confirmed: true,
      },
    ],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.[1]?.contribution_id,
    "f8283:2",
  );
  assertEquals(fields.noncash_contribution_items?.[1]?.original_fmv, 8000);
  assertEquals(fields.noncash_contribution_items?.[1]?.adjusted_basis, 3000);
  assertEquals(schedule_a.inputSchema.safeParse(fields).success, false);
});

Deno.test("f8283.compute: two elected capital gifts retain distinct IDs and still need the carryover ledger", () => {
  const gift = {
    date_acquired: "2022-02-01",
    date_contributed: "2025-06-01",
    donor_acquisition_description: "Purchase",
    fmv: 4_500,
    deduction_claimed: 3_000,
    cost_or_adjusted_basis: 3_000,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: true,
    capital_gain_reduction_election_confirmed: true,
  };
  const result = compute({
    section_a_items: [
      { ...gift, similar_item_group: "coins", property_description: "Coin" },
      { ...gift, similar_item_group: "stamps", property_description: "Stamp" },
    ],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(
    fields.noncash_contribution_items?.map((item) => item.contribution_id),
    ["f8283:1", "f8283:2"],
  );
  assertEquals(schedule_a.inputSchema.safeParse(fields).success, false);
});

Deno.test("f8283.inputSchema: Section B election is limited to purchased unimproved investment land", () => {
  const land = {
    property_type: SectionBPropertyType.OtherRealEstate,
    investment_land_unimproved_confirmed: true as const,
    date_acquired: "2022-02-01",
    date_contributed: "2025-06-01",
    donor_acquisition_description: "Purchase",
    fmv: 27_000,
    deduction_claimed: 20_000,
    cost_or_adjusted_basis: 20_000,
    charitable_limit_category: "noncash_50" as const,
    is_capital_gain_property: true,
    capital_gain_reduction_election_confirmed: true as const,
    reduction_statement_attachment_file_name: "LandReduction.pdf",
    reduction_statement_source_review: {
      reviewed_by: "Test reviewer",
      reviewed_on: "2025-06-11",
      pdf_sha256: "b".repeat(64),
      original_fmv_matches_pdf_confirmed: true as const,
      adjusted_basis_matches_pdf_confirmed: true as const,
      appreciation_reduction_matches_pdf_confirmed: true as const,
      election_reason_matches_pdf_confirmed: true as const,
    },
  };
  assertEquals(
    inputSchema.safeParse({ section_b_items: [land] }).success,
    true,
  );
  for (
    const changed of [
      { ...land, property_type: SectionBPropertyType.Equipment },
      { ...land, investment_land_unimproved_confirmed: undefined },
      { ...land, date_acquired: "2025-01-01" },
      { ...land, deduction_claimed: 21_000 },
      { ...land, reduction_statement_attachment_file_name: undefined },
      { ...land, reduction_statement_source_review: undefined },
    ]
  ) {
    assertEquals(
      inputSchema.safeParse({ section_b_items: [changed] }).success,
      false,
    );
  }
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
    cost_or_adjusted_basis: 25_000,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: false,
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
    fieldsOf(result.outputs, schedule_a)?.noncash_contribution_items?.[0]
      ?.amount,
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
        section_a_items: [{ ...item, cost_or_adjusted_basis: 10_000 }],
      }),
    Error,
    "needs sourced basis at least FMV",
  );
  assertThrows(
    () =>
      compute({ section_a_items: [{ ...item, deduction_claimed: 14_000 }] }),
    Error,
    "combined reductions are not yet supported",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{ ...item, vehicle_sale_acknowledgment: undefined }],
      }),
    Error,
    "needs exactly one donee sale, needy-transfer, significant-use, or material-improvement acknowledgment",
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

Deno.test("f8283.compute: needy-transfer certificate requires timely exclusive acknowledgment and source-backed reduction", () => {
  const needy = {
    property_description: "2020 Honda Civic, good condition, 60,000 miles",
    is_vehicle: true,
    vehicle_vin: "1HGBH41JXMN109186",
    date_contributed: "2025-06-01",
    fmv: 20_000,
    deduction_claimed: 4_500,
    date_acquired: "2025-01-01",
    donor_acquisition_description: "Purchase",
    cost_or_adjusted_basis: 4_500,
    short_term_ordinary_income_reduction_confirmed: true,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: false,
    vehicle_needy_transfer_acknowledgment: {
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
      acknowledgment_furnished_date: "2025-06-20",
      vehicle_to_be_transferred_to_needy_confirmed: true,
      transfer_for_significantly_below_fmv_confirmed: true,
      direct_charitable_transportation_purpose_confirmed: true,
      vehicle_year: 2020,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Good condition",
      odometer_miles: 60_000,
      goods_or_services_received: false,
    },
  };
  assertEquals(
    fieldsOf(compute({ section_a_items: [needy] }).outputs, schedule_a)
      ?.noncash_contribution_items?.[0]?.amount,
    4_500,
  );
  assertThrows(
    () =>
      compute({ section_a_items: [{ ...needy, deduction_claimed: 20_001 }] }),
    Error,
    "deduction exceeds FMV",
  );
  assertThrows(
    () =>
      compute({ section_a_items: [{ ...needy, deduction_claimed: 5_001 }] }),
    Error,
    "needs Section B and a qualified appraisal",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...needy,
          vehicle_needy_transfer_acknowledgment: {
            ...needy.vehicle_needy_transfer_acknowledgment,
            acknowledgment_furnished_date: "2025-07-02",
          },
        }],
      }),
    Error,
    "furnished within 30 days of contribution",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...needy,
          vehicle_needy_transfer_acknowledgment: {
            ...needy.vehicle_needy_transfer_acknowledgment,
            direct_charitable_transportation_purpose_confirmed: false,
          },
        }],
      }),
    Error,
  );
});

Deno.test("f8283.compute: significant-use certificate permits Section A FMV but requires box 5a facts", () => {
  const item = {
    property_description: "2019 van, good condition, 70,000 miles",
    is_vehicle: true,
    vehicle_vin: "1HGBH41JXMN109186",
    date_contributed: "2025-06-01",
    fmv: 4_800,
    deduction_claimed: 4_800,
    cost_or_adjusted_basis: 20_000,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: false,
    vehicle_significant_use_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "Meals Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true,
      intended_use_description: "Deliver meals daily to needy residents",
      intended_use_duration: "one year",
      regularly_conducted_charitable_activity_confirmed: true,
      substantial_nonincidental_use_confirmed: true,
      vehicle_year: 2019,
      vehicle_make: "Ford",
      vehicle_model: "Transit",
      vehicle_condition: "Good condition",
      odometer_miles: 70_000,
      goods_or_services_received: false,
    },
  };
  assertEquals(
    fieldsOf(compute({ section_a_items: [item] }).outputs, schedule_a)
      ?.noncash_contribution_items?.[0]?.amount,
    4_800,
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{ ...item, deduction_claimed: 5_001, fmv: 6_000 }],
      }),
    Error,
    "needs Section B and a qualified appraisal",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          vehicle_significant_use_acknowledgment: {
            ...item.vehicle_significant_use_acknowledgment,
            acknowledgment_furnished_date: "2025-07-02",
          },
        }],
      }),
    Error,
    "furnished within 30 days of contribution",
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          vehicle_significant_use_acknowledgment: {
            ...item.vehicle_significant_use_acknowledgment,
            intended_use_duration: "",
          },
        }],
      }),
    Error,
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          vehicle_material_improvement_acknowledgment: {
            ...item.vehicle_significant_use_acknowledgment,
            intended_improvement_description: "Replace engine",
            major_repair_or_addition_confirmed: true,
            significant_value_increase_confirmed: true,
            no_additional_donor_payment_confirmed: true,
          },
        }],
      }),
    Error,
    "exactly one donee",
  );
});

Deno.test("f8283.compute: material-improvement certificate requires major value-adding work without donor payment", () => {
  const item = {
    property_description: "2018 sedan, fair condition, 90,000 miles",
    is_vehicle: true,
    vehicle_vin: "1HGBH41JXMN109186",
    date_contributed: "2025-08-01",
    fmv: 3_500,
    deduction_claimed: 3_500,
    cost_or_adjusted_basis: 20_000,
    charitable_limit_category: "noncash_50",
    is_capital_gain_property: false,
    vehicle_material_improvement_acknowledgment: {
      copy_received_from_donee: true,
      donee_certified: true,
      donee_name: "Repair Charity",
      donee_ein: "987654321",
      donee_us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      acknowledgment_furnished_date: "2025-08-25",
      no_transfer_before_completion_confirmed: true,
      intended_improvement_description: "Replace failed engine with new engine",
      major_repair_or_addition_confirmed: true,
      significant_value_increase_confirmed: true,
      no_additional_donor_payment_confirmed: true,
      vehicle_year: 2018,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Fair condition",
      odometer_miles: 90_000,
      goods_or_services_received: false,
    },
  };
  assertEquals(
    fieldsOf(compute({ section_a_items: [item] }).outputs, schedule_a)
      ?.noncash_contribution_items?.[0]?.amount,
    3_500,
  );
  assertThrows(
    () =>
      compute({
        section_a_items: [{
          ...item,
          vehicle_material_improvement_acknowledgment: {
            ...item.vehicle_material_improvement_acknowledgment,
            no_additional_donor_payment_confirmed: false,
          },
        }],
      }),
    Error,
  );
});

Deno.test("f8283.compute: Section B exception vehicle routes claimed amount with signed appraisal facts", () => {
  const item = {
    property_description: "2018 Honda Civic, fair condition, 90,000 miles",
    property_type: SectionBPropertyType.Vehicle,
    physical_condition: "Fair condition; engine needs replacement",
    date_acquired: "2018-05-15",
    donor_acquisition_description: "Purchase",
    date_contributed: "2025-06-01",
    fmv: 20_000,
    deduction_claimed: 15_000,
    charitable_limit_category: "capital_gain_30",
    is_capital_gain_property: true,
    cost_or_adjusted_basis: 18_000,
    vehicle_vin: "1HGBH41JXMN109186",
    vehicle_acknowledgment_attachment_file_name: "Form1098C-Improvement.pdf",
    vehicle_material_improvement_acknowledgment: {
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
      acknowledgment_furnished_date: "2025-06-20",
      no_transfer_before_completion_confirmed: true,
      intended_improvement_description: "Replace failed engine with new engine",
      major_repair_or_addition_confirmed: true,
      significant_value_increase_confirmed: true,
      no_additional_donor_payment_confirmed: true,
      vehicle_year: 2018,
      vehicle_make: "Honda",
      vehicle_model: "Civic",
      vehicle_condition: "Fair condition",
      odometer_miles: 90_000,
      goods_or_services_received: false,
    },
    qualified_appraisal: {
      appraiser_first_name: "Jane",
      appraiser_last_name: "Smith",
      signed_date: "2025-05-28",
      appraiser_ein: "123456789",
      signed_by_appraiser: true,
      signature_attachment_file_name: "Form8283AppraiserSignature.pdf",
      us_address: {
        line1: "1 Art Way",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
    donee_acknowledgment: {
      organization_name: "City Charity",
      ein: "987654321",
      received_date: "2025-06-01",
      signed_by_donee: true,
      unrelated_use: false,
      signature_attachment_file_name: "Form8283DoneeSignature.pdf",
      us_address: {
        line1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
    },
  };
  assertEquals(
    fieldsOf(compute({ section_b_items: [item] }).outputs, schedule_a)
      ?.noncash_contribution_items?.[0]?.amount,
    15_000,
  );
  assertThrows(
    () => compute({ section_b_items: [{ ...item, vehicle_vin: undefined }] }),
    Error,
    "needs VIN",
  );
  assertThrows(
    () =>
      compute({
        section_b_items: [{
          ...item,
          qualified_appraisal: undefined,
        }],
      }),
    Error,
    "needs qualified appraisal and signed donee facts",
  );
  assertThrows(
    () =>
      compute({
        section_b_items: [{
          ...item,
          qualified_appraisal: {
            ...item.qualified_appraisal,
            signature_attachment_file_name: undefined,
          },
        }],
      }),
    Error,
    "needs appraiser and donee signature PDFs",
  );
  assertThrows(
    () =>
      compute({
        section_b_items: [{
          ...item,
          vehicle_material_improvement_acknowledgment: {
            ...item.vehicle_material_improvement_acknowledgment,
            no_additional_donor_payment_confirmed: false,
          },
        }],
      }),
    Error,
  );
});

Deno.test("f8283.compute: high-value Section B appraisal gate keeps special routes explicit", () => {
  assertThrows(
    () =>
      compute({
        section_b_items: [{
          property_type: SectionBPropertyType.Equipment,
          fmv: 650_000,
          deduction_claimed: 600_000,
          charitable_limit_category: "noncash_50",
          is_capital_gain_property: false,
        }],
      }),
    Error,
    "full qualified-appraisal PDF",
  );
  assertThrows(
    () =>
      compute({
        section_b_items: [{
          property_type: SectionBPropertyType.OtherRealEstate,
          fmv: 650_000,
          deduction_claimed: 600_000,
          charitable_limit_category: "noncash_50",
          is_capital_gain_property: false,
        }],
      }),
    Error,
    "special-substantiation route",
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

Deno.test("f8283.compute: Section A capital gain with no basis uses full FMV", () => {
  const result = compute({
    section_a_items: [{
      fmv: 5000,
      deduction_claimed: 5000,
      is_capital_gain_property: true,
      charitable_limit_category: "capital_gain_30",
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.noncash_contribution_items?.[0]?.amount, 5000);
});

Deno.test("f8283.compute: fmv equals basis — uses fmv exactly", () => {
  const result = compute({
    section_a_items: [{
      fmv: 4000,
      deduction_claimed: 4000,
      cost_or_adjusted_basis: 4000,
      is_capital_gain_property: true,
      charitable_limit_category: "capital_gain_30",
    }],
  });
  const fields = fieldsOf(result.outputs, schedule_a)!;
  assertEquals(fields.noncash_contribution_items?.[0]?.amount, 4000);
});

// =============================================================================
// 8. Smoke Test
// =============================================================================

Deno.test("f8283.compute: smoke test — section A and section B items combined", () => {
  const result = compute({
    section_a_items: [
      {
        property_description: "Used clothing",
        similar_item_group: "clothing",
        fmv: 250,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
        fmv_method: FMVMethod.ThriftShopValue,
        date_contributed: "2025-11-15",
      },
      {
        property_description: "Books",
        similar_item_group: "books",
        fmv: 75,
        charitable_limit_category: "noncash_50",
        is_capital_gain_property: false,
        fmv_method: FMVMethod.CatalogValue,
      },
    ],
    section_b_items: [
      {
        property_description: "Artwork",
        similar_item_group: "paintings",
        fmv: 12000,
        deduction_claimed: 12000,
        cost_or_adjusted_basis: 8000,
        is_capital_gain_property: true,
        charitable_limit_category: "capital_gain_30",
      },
    ],
  });

  const fields = fieldsOf(result.outputs, schedule_a)!;
  // Section A: 250 + 75 = 325; Section B: claimed FMV of 12,000.
  assertEquals(
    fields.noncash_contribution_items?.map((item: { amount: number }) =>
      item.amount
    ),
    [250, 75, 12000],
  );
});
