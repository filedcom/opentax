import { assertEquals, assertThrows } from "@std/assert";
import { form4797, inputSchema } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return form4797.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}
function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("smoke: disposed_properties alone produces no outputs (indicator only)", () => {
  const result = compute({ disposed_properties: 2 });
  assertEquals(result.outputs.length, 0);
});

Deno.test("investment section 1245 recapture and excess gain take separate return paths", () => {
  const result = compute({
    investment_1245_dispositions: [{
      property_id: "investment-1245-1",
      property_description: "Investment equipment",
      acquired_on: "2022-05-01",
      sold_on: "2025-06-01",
      gross_sales_price: 15_000,
      cost_or_other_basis_plus_sale_expense: 12_000,
      depreciation_allowed_or_allowable: 5_000,
      property_held_for_investment_not_business: true,
      section_1245_classification_reviewed: true,
      direct_cash_sale_no_special_recapture_exception: true,
      sale_document_reference: "SALE-2025-1",
      basis_document_reference: "BASIS-2022-1",
      depreciation_schedule_reference: "DEPR-2025-1",
    }],
  });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    5_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line4_other_gains,
    5_000,
  );
  const transaction = findOutput(result, "form8949")?.fields
    .transaction as Record<string, unknown>;
  assertEquals(transaction.description, "From Form 4797");
  assertEquals(transaction.proceeds, 3_000);
  assertEquals(transaction.cost_basis, 0);
  assertEquals(transaction.date_acquired, "");
});

// ─── Part I — Section 1231 long-term gain ─────────────────────────────────────

Deno.test("Part I: pure §1231 gain routes to schedule_d line_11_form2439", () => {
  const result = compute({ section_1231_gain: 10_000 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 10_000);
});

Deno.test("passive property sale source routes dated Part I and Part II gains", () => {
  const result = compute({
    passive_property_sales: [
      {
        activity_id: "id-Land rental",
        activity_name: "Land rental",
        part: "I",
        property_description: "Undeveloped parcel",
        acquired_on: "2023-04-01",
        sold_on: "2025-05-01",
        gross_sales_price: 20_000,
        cost_or_other_basis: 12_000,
        depreciation_allowed: 0,
      },
      {
        activity_id: "id-Land rental",
        activity_name: "Land rental",
        part: "II",
        property_description: "Short-held parcel",
        acquired_on: "2025-01-01",
        sold_on: "2025-06-01",
        gross_sales_price: 9_000,
        cost_or_other_basis: 7_000,
        depreciation_allowed: 0,
      },
    ],
  });
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    8_000,
  );
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    2_000,
  );
  assertEquals(
    result.outputs.find((row) =>
      row.nodeType === "agi_aggregator" &&
      row.fields.line4_other_gains !== undefined
    )?.fields.line4_other_gains,
    2_000,
  );
});

Deno.test("Form 4797 carries the retained-activity fact with a Part II sale gain", () => {
  const result = compute({
    passive_property_sales: [{
      activity_id: "rental-retained",
      activity_name: "Retained rental",
      part: "II",
      property_description: "Short-held parcel",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: 9_000,
      cost_or_other_basis: 5_000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
    }],
  });
  assertEquals(findOutput(result, "form8582")?.fields.current_4797_sale_gains, [
    {
      activity_id: "rental-retained",
      activity_name: "Retained rental",
      part: "II",
      gain: 4_000,
      entire_activity_interest_disposed: false,
    },
  ]);
});

Deno.test("Form 4797 carries an entire overall-gain sale to Form 8582 and AGI", () => {
  const activity = {
    activity_id: "entire-gain-rental",
    name: "Entire gain rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: -2_000,
    prior_unallowed_operating: 8_000,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "entire-gain-rental",
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
  };
  const sale = {
    activity_id: activity.activity_id,
    activity_name: activity.name,
    part: "II",
    property_description: "Short-held rental property",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 15_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 closing statement",
  };
  const result = compute({
    passive_activity_sources: [activity],
    passive_disposed_activity_ids: [activity.activity_id],
    passive_property_sales: [sale],
  });
  assertEquals(findOutput(result, "form8582")?.fields.current_4797_sale_gains, [
    {
      activity_id: activity.activity_id,
      activity_name: activity.name,
      part: "II",
      gain: 15_000,
      entire_activity_interest_disposed: true,
    },
  ]);
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.pal_current_4797_gain,
    15_000,
  );
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    15_000,
  );
});

Deno.test("mixed retained passive sale nets prior Part I and II PAL once", () => {
  const activity = {
    activity_id: "id-Land rental",
    name: "Land rental",
    activity_type: "B",
    property_type: 1,
    reporting_form: "schedule_e",
    current_net: 0,
    prior_unallowed_operating: 1_000,
    prior_unallowed_4797_part1: 3_000,
    prior_unallowed_4797_part2: 1_000,
  };
  const result = compute({
    passive_activity_sources: [activity],
    passive_disposed_activity_ids: [activity.activity_id],
    passive_property_sales: [
      {
        activity_id: activity.activity_id,
        activity_name: activity.name,
        part: "I",
        property_description: "Long-held parcel",
        acquired_on: "2023-04-01",
        sold_on: "2025-05-01",
        gross_sales_price: 20_000,
        cost_or_other_basis: 12_000,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
      },
      {
        activity_id: activity.activity_id,
        activity_name: activity.name,
        part: "II",
        property_description: "Short-held parcel",
        acquired_on: "2025-01-01",
        sold_on: "2025-06-01",
        gross_sales_price: 9_000,
        cost_or_other_basis: 7_000,
        depreciation_allowed: 0,
        entire_activity_interest_disposed: false,
      },
    ],
  });
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    5_000,
  );
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    1_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.pal_4797_preapplied_loss,
    4_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.pal_current_4797_gain,
    10_000,
  );
  assertEquals(findOutput(result, "form8582")?.fields.current_4797_sale_gains, [
    {
      activity_id: activity.activity_id,
      activity_name: activity.name,
      part: "I",
      gain: 8_000,
      entire_activity_interest_disposed: false,
    },
    {
      activity_id: activity.activity_id,
      activity_name: activity.name,
      part: "II",
      gain: 2_000,
      entire_activity_interest_disposed: false,
    },
  ]);
});

Deno.test("active rental sale defers Part I and II PAL until modified AGI is known", () => {
  const input = {
    passive_activity_sources: [{
      activity_id: "id-Rental house",
      name: "Rental house",
      activity_type: "A",
      property_type: 1,
      reporting_form: "schedule_e",
      current_net: 0,
      prior_unallowed_operating: 1_000,
      prior_active_participation: true,
      prior_unallowed_4797_part1: 3_000,
      prior_unallowed_4797_part2: 1_000,
    }],
    passive_disposed_activity_ids: ["id-Rental house"],
    passive_property_sales: [{
      activity_id: "id-Rental house",
      activity_name: "Rental house",
      part: "I",
      property_description: "Retained rental parcel",
      acquired_on: "2023-04-01",
      sold_on: "2025-05-01",
      gross_sales_price: 12_000,
      cost_or_other_basis: 10_000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
    }, {
      activity_id: "id-Rental house",
      activity_name: "Rental house",
      part: "II",
      property_description: "Short-held rental parcel",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: 5_000,
      cost_or_other_basis: 4_500,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
    }],
  };
  const result = compute(input);
  assertEquals(
    findOutput(result, "schedule_d")?.fields.pending_active_4797,
    true,
  );
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    2_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.pal_pending_active_4797,
    true,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.pal_current_4797_gain,
    2_500,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line4_other_gains,
    500,
  );
  assertEquals(findOutput(result, "schedule1"), undefined);
  assertEquals(
    compute({
      passive_activity_sources: input.passive_activity_sources,
      disposed_properties: 1,
    }).outputs,
    [],
  );
  assertThrows(() =>
    compute({
      ...input,
      passive_property_sales: [{
        ...input.passive_property_sales[0],
        entire_activity_interest_disposed: true,
      }, input.passive_property_sales[1]],
    })
  );
  assertThrows(
    () =>
      compute({
        ...input,
        passive_property_sales: [{
          ...input.passive_property_sales[0],
          activity_id: "different-rental",
        }, input.passive_property_sales[1]],
      }),
    Error,
    "linked Schedule E activity",
  );
});

Deno.test("the same sale from Schedule E and direct Form 4797 cannot be counted twice", () => {
  const sale = {
    activity_id: "id-Rental house",
    activity_name: "Rental house",
    part: "I",
    property_description: "Retained rental parcel",
    acquired_on: "2023-04-01",
    sold_on: "2025-05-01",
    gross_sales_price: 12_000,
    cost_or_other_basis: 10_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: false,
  };
  assertThrows(
    () => compute({ passive_property_sales: [sale, sale] }),
    Error,
    "duplicate passive property sale source",
  );
});

Deno.test("passive property sale source rejects duplicate aggregate and unsupported sale facts", () => {
  const sale = {
    activity_id: "id-Land rental",
    activity_name: "Land rental",
    part: "I",
    property_description: "Undeveloped parcel",
    acquired_on: "2023-04-01",
    sold_on: "2025-05-01",
    gross_sales_price: 20_000,
    cost_or_other_basis: 12_000,
    depreciation_allowed: 0,
  };
  assertThrows(() =>
    compute({ passive_property_sales: [sale], section_1231_gain: 8_000 })
  );
  assertThrows(() =>
    compute({
      passive_property_sales: [{ ...sale, depreciation_allowed: 100 }],
    })
  );
  assertThrows(() =>
    compute({ passive_property_sales: [{ ...sale, part: "II" }] })
  );
  assertThrows(() =>
    compute({
      passive_property_sales: [{ ...sale, cost_or_other_basis: 25_000 }],
    })
  );
});

Deno.test("Part I: K-1 and Form 6252 section 1231 gains accumulate", () => {
  const result = compute({
    section_1231_gain: [4_000, 10_000],
    gain_form6252: 10_000,
  });
  assertEquals(
    findOutput(result, "schedule_d")?.fields.line_11_form2439,
    14_000,
  );
  assertEquals(
    findOutput(result, "form4797")?.fields.section_1231_gain,
    14_000,
  );
});

Deno.test("Part I: §1231 gain with no prior losses goes entirely to schedule_d", () => {
  const result = compute({
    section_1231_gain: 5_000,
    nonrecaptured_1231_loss: 0,
  });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 5_000);
});

Deno.test("Part I: §1231 gain partially offset by prior nonrecaptured loss → reduced LT gain + ordinary income", () => {
  // §1231 gain = 10,000; prior loss recapture = 3,000
  // → net LT gain = 7,000 to schedule_d; ordinary gain from recapture = 3,000 to schedule1
  const result = compute({
    section_1231_gain: 10_000,
    nonrecaptured_1231_loss: 3_000,
  });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.fields.line_11_form2439, 7_000);
  assertEquals(s1?.fields.line4_other_gains, 3_000);
});

Deno.test("Part I: §1231 gain fully offset by prior losses → all ordinary income, no schedule_d output", () => {
  const result = compute({
    section_1231_gain: 5_000,
    nonrecaptured_1231_loss: 5_000,
  });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined);
  assertEquals(s1?.fields.line4_other_gains, 5_000);
});

Deno.test("Part I: §1231 gain less than prior losses → all gain is ordinary, no schedule_d output", () => {
  const result = compute({
    section_1231_gain: 3_000,
    nonrecaptured_1231_loss: 8_000,
  });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined);
  assertEquals(s1?.fields.line4_other_gains, 3_000);
});

Deno.test("Part I: zero §1231 gain produces no schedule_d output", () => {
  const result = compute({ section_1231_gain: 0 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd, undefined);
});

// ─── Part I — §1231 net LOSS → ordinary income (IRC §1231(a)(2)) ──────────────

Deno.test("Part I: §1231 net loss routes to schedule1 as ordinary loss — NOT schedule_d", () => {
  // IRC §1231(a)(2): net §1231 losses are ordinary, fully deductible, no $3k cap
  const result = compute({ section_1231_gain: -4_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined); // must NOT go to Schedule D
  assertEquals(s1?.fields.line4_other_gains, -4_000); // ordinary loss
});

Deno.test("Part I: §1231 loss combined with ordinary gain → single schedule1 output", () => {
  // §1231 loss -3,000 + Part II ordinary gain 1,000 = net -2,000 ordinary
  const result = compute({ section_1231_gain: -3_000, ordinary_gain: 1_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd, undefined);
  assertEquals(s1?.fields.line4_other_gains, -2_000);
});

Deno.test("Part I: §1231 loss also routes to agi_aggregator", () => {
  const result = compute({ section_1231_gain: -5_000 });
  const agi = findOutput(result, "agi_aggregator");
  assertEquals(agi?.fields.line4_other_gains, -5_000);
});

// ─── Part II — Ordinary gains ─────────────────────────────────────────────────

Deno.test("Part II: ordinary_gain routes to schedule1 line4_other_gains", () => {
  const result = compute({ ordinary_gain: 8_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line4_other_gains, 8_000);
});

Deno.test("Part II: ordinary_gain of zero produces no schedule1 output", () => {
  const result = compute({ ordinary_gain: 0 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("Part II: negative ordinary_gain (loss) routes to schedule1", () => {
  const result = compute({ ordinary_gain: -2_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line4_other_gains, -2_000);
});

Deno.test("Part II: Form 4684 line 38a loss remains a distinct Form 4797 source", () => {
  const result = compute({ ordinary_gain_form4684: -20_000 });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    -20_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line4_other_gains,
    -20_000,
  );
});

Deno.test("Part III: Form 6252 line 12 recapture remains a distinct source", () => {
  const result = compute({ recapture_form6252: 15_000 });
  assertEquals(
    findOutput(result, "schedule1")?.fields.line4_other_gains,
    15_000,
  );
  assertEquals(
    findOutput(result, "agi_aggregator")?.fields.line4_other_gains,
    15_000,
  );
});

// ─── Part III — §1245/§1250 recapture (flows into ordinary_gain) ─────────────

Deno.test("Part III: §1245 recapture alone produces schedule1 ordinary gain output", () => {
  // §1245 recapture is ordinary income; it is included in Part II
  // The user provides ordinary_gain which already includes Part III recapture
  const result = compute({ ordinary_gain: 15_000, recapture_1245: 15_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line4_other_gains, 15_000);
});

Deno.test("Part III: §1250 recapture included in ordinary gain", () => {
  const result = compute({ ordinary_gain: 5_000, recapture_1250: 5_000 });
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line4_other_gains, 5_000);
});

// ─── Unrecaptured §1250 gain → Schedule D line 19 (25% rate tier) ─────────────

Deno.test("unrecaptured §1250 gain routes to schedule_d line19_unrecaptured_1250", () => {
  // §1231 gain of 50,000 with 20,000 of unrecaptured §1250 gain
  const result = compute({
    section_1231_gain: 50_000,
    unrecaptured_section_1250_gain: 20_000,
  });
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  const gainOut = sdOutputs.find((o) => "line_11_form2439" in o.fields);
  const unrecapturedOut = sdOutputs.find((o) =>
    "line19_unrecaptured_1250" in o.fields
  );
  assertEquals(gainOut?.fields.line_11_form2439, 50_000);
  assertEquals(unrecapturedOut?.fields.line19_unrecaptured_1250, 20_000);
});

Deno.test("unrecaptured §1250 gain routes to schedule_d even without §1231 gain", () => {
  const result = compute({
    ordinary_gain: 10_000,
    unrecaptured_section_1250_gain: 8_000,
  });
  const sdOut = findOutput(result, "schedule_d");
  assertEquals(sdOut?.fields.line19_unrecaptured_1250, 8_000);
});

Deno.test("zero unrecaptured §1250 gain produces no schedule_d line19 output", () => {
  const result = compute({
    section_1231_gain: 10_000,
    unrecaptured_section_1250_gain: 0,
  });
  const sdOutputs = result.outputs.filter((o) => o.nodeType === "schedule_d");
  const unrecapturedOut = sdOutputs.find((o) =>
    "line19_unrecaptured_1250" in o.fields
  );
  assertEquals(unrecapturedOut, undefined);
});

// ─── Combined scenarios ────────────────────────────────────────────────────────

Deno.test("combined: §1231 gain + ordinary gain routes to both schedule_d and schedule1", () => {
  const result = compute({ section_1231_gain: 20_000, ordinary_gain: 6_000 });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.fields.line_11_form2439, 20_000);
  assertEquals(s1?.fields.line4_other_gains, 6_000);
});

Deno.test("combined: §1231 gain with partial prior loss recapture + additional ordinary gain", () => {
  // §1231 gain = 12,000; prior §1231 loss recapture = 4,000; separate ordinary gain = 3,000
  // → LT gain to Sch D = 8,000; ordinary to schedule1 = 4,000 (recaptured) + 3,000 = 7,000
  const result = compute({
    section_1231_gain: 12_000,
    nonrecaptured_1231_loss: 4_000,
    ordinary_gain: 3_000,
  });
  const sd = findOutput(result, "schedule_d");
  const s1 = findOutput(result, "schedule1");
  assertEquals(sd?.fields.line_11_form2439, 8_000);
  assertEquals(s1?.fields.line4_other_gains, 7_000); // 4,000 recaptured + 3,000 ordinary
});

Deno.test("combined: disposed_properties + sale data both present", () => {
  const result = compute({ disposed_properties: 1, section_1231_gain: 5_000 });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 5_000);
});

// ─── Holding period / schema validation ──────────────────────────────────────

Deno.test("schema: negative nonrecaptured_1231_loss is rejected", () => {
  assertThrows(() => compute({ nonrecaptured_1231_loss: -1_000 }));
});

Deno.test("schema: negative disposed_properties is rejected", () => {
  assertThrows(() => compute({ disposed_properties: -1 }));
});

Deno.test("schema: unknown fields are stripped without error", () => {
  const result = compute({ section_1231_gain: 5_000, unknown_field: "foo" });
  const sd = findOutput(result, "schedule_d");
  assertEquals(sd?.fields.line_11_form2439, 5_000);
});
