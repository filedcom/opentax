// UNRESOLVED ITEMS:
//   - section_179 $2,500,000 maximum: schema uses z.number().nonnegative() with no .max() —
//     values above $2.5M are accepted without error; not Zod-enforced and not capped silently
//   - days_owned_in_year required when tax_court_method=true: no validation in validateItem()
//     enforcing this; the field is optional and accepted even when tax_court_method=true

import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, scheduleE } from "./index.ts";
import { form8582 } from "../../intermediate/forms/form8582/index.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    tsj: "T",
    activity_id: "rental-test",
    property_description: "123 Main St, Anytown, CA 90210",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 200,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    ...overrides,
  };
}

function compute(items: Record<string, unknown>[]) {
  return scheduleE.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse({ schedule_es: items }),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── 1. Input Schema Validation ─────────────────────────────────────────────

Deno.test("input validation: empty array produces no outputs", () => {
  const result = compute([]);
  assertEquals(result.outputs.length, 0);
});

Deno.test("Schedule E retains a sourced prior operating PAL for a partial Part II property sale", () => {
  const sale = {
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
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 retained parcel closing statement",
  };
  const activity = minimalItem({
    activity_id: "rental-retained",
    property_description: "Retained rental",
    activity_type: "B",
    disposed_of: true,
    expense_taxes: 2_000,
    prior_unallowed_passive_operating: 3_000,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "rental-retained",
      filed_part_vii_column_c: 3_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
    passive_property_sales: [sale],
  });
  const result = compute([activity]);
  assertEquals(findOutput(result, "form8582")?.fields.prior_unallowed, 3_000);
  assertEquals(
    findOutput(result, "form4797")?.fields.passive_property_sales,
    [sale],
  );
  assertThrows(
    () =>
      compute([{
        ...activity,
        passive_property_sales: [{
          ...sale,
          entire_activity_interest_disposed: undefined,
        }],
      }]),
    Error,
    "section 469(g) review",
  );
  for (
    const changedSale of [
      { activity_id: "another-rental" },
      { activity_name: "Another rental" },
      { buyer_unrelated: false },
      { fully_taxable: false },
      { installment_method: true },
      { disposition_document_reference: undefined },
    ]
  ) {
    assertThrows(
      () =>
        compute([{
          ...activity,
          passive_property_sales: [{ ...sale, ...changedSale }],
        }]),
      Error,
    );
  }
  for (
    const changedActivity of [
      { prior_year_8582_source: undefined },
      { ownership_percent: 50 },
      { section_1231_gain_loss: 1 },
      { expense_taxes: 2_000.5 },
    ]
  ) {
    assertThrows(
      () => compute([{ ...activity, ...changedActivity }]),
      Error,
    );
  }
});

Deno.test("Schedule E links active-rental prior PAL to a sourced retained Part II gain", () => {
  const sale = {
    activity_id: "active-retained",
    activity_name: "Active retained rental",
    part: "II",
    property_description: "Short-held rental property",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 8_000,
    cost_or_other_basis: 5_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: false,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 partial property closing statement",
  } as const;
  const activity = minimalItem({
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    activity_type: "A",
    disposed_of: true,
    expense_taxes: 5_000,
    prior_unallowed_passive_operating: 8_000,
    prior_passive_losses_active_when_incurred: true,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: sale.activity_id,
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
    passive_property_sales: [sale],
  });
  const result = compute([activity]);
  assertEquals(findOutput(result, "form8582")?.fields.current_loss, 5_000);
  assertEquals(findOutput(result, "form8582")?.fields.prior_unallowed, 8_000);
  assertEquals(
    findOutput(result, "form8582")?.fields.rental_prior_eligible_loss,
    8_000,
  );
  assertEquals(findOutput(result, "form4797")?.fields.passive_property_sales, [
    sale,
  ]);
  for (
    const changed of [
      { prior_passive_losses_active_when_incurred: false },
      {
        passive_property_sales: [{
          ...sale,
          disposition_document_reference: undefined,
        }],
      },
      { passive_property_sales: [{ ...sale, installment_method: true }] },
    ]
  ) {
    assertThrows(
      () => compute([{ ...activity, ...changed }]),
      Error,
      "section 469(g) review",
    );
  }
});

Deno.test("Schedule E sends a sourced overall-gain entire sale to Form 8582 Part V", () => {
  const sale = {
    activity_id: "entire-gain-rental",
    activity_name: "Entire gain rental",
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
  } as const;
  const activity = minimalItem({
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    activity_type: "B",
    disposed_of: true,
    expense_taxes: 2_000,
    prior_unallowed_passive_operating: 8_000,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: sale.activity_id,
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
    passive_property_sales: [sale],
  });
  const result = compute([activity]);
  assertEquals(findOutput(result, "form8582")?.fields.prior_unallowed, 8_000);
  assertEquals(findOutput(result, "form4797")?.fields.passive_property_sales, [
    sale,
  ]);
  assertEquals(findOutput(result, "schedule1")?.fields.line5_schedule_e, 0);
  assertThrows(
    () =>
      compute([{
        ...activity,
        passive_property_sales: [{
          ...sale,
          gross_sales_price: 25_000,
        }],
      }]),
    Error,
    "section 469(g) review",
  );
});

Deno.test("Schedule E first-year entire sale sends current loss and gain to Form 8582 Part V", () => {
  const sale = {
    activity_id: "first-year-entire-gain",
    activity_name: "First year rental",
    part: "II" as const,
    property_description: "Short-held rental property",
    acquired_on: "2025-02-01",
    sold_on: "2025-08-01",
    gross_sales_price: 30_000,
    cost_or_other_basis: 20_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 sale closing statement",
  };
  const activity = minimalItem({
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    activity_type: "B",
    disposed_of: true,
    expense_taxes: 2_000,
    first_year_activity_source: {
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      activity_acquired_on: sale.acquired_on,
      acquisition_document_reference: "2025 purchase closing statement",
      not_grouped_with_prior_activity: true,
    },
    passive_property_sales: [sale],
  });
  const result = compute([activity]);
  assertEquals(findOutput(result, "form8582")?.fields.current_loss, 2_000);
  assertEquals(
    findOutput(result, "form8582")?.fields.prior_unallowed,
    undefined,
  );
  assertEquals(findOutput(result, "form4797")?.fields.passive_property_sales, [
    sale,
  ]);
  assertEquals(findOutput(result, "schedule1")?.fields.line5_schedule_e, 0);
  for (
    const change of [
      { first_year_activity_source: undefined },
      {
        first_year_activity_source: {
          activity_id: "different-rental",
          activity_name: sale.activity_name,
          activity_acquired_on: sale.acquired_on,
          acquisition_document_reference: "2025 purchase closing statement",
          not_grouped_with_prior_activity: true,
        },
      },
      { prior_unallowed_passive_operating: 0 },
      { prior_unallowed_passive_operating: 100 },
      {
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: sale.activity_id,
          filed_part_vii_column_c: 100,
          source_document_reference: "2024 Form 8582",
        },
      },
      { passive_property_sales: [{ ...sale, buyer_unrelated: false }] },
      { passive_property_sales: [{ ...sale, acquired_on: "2024-02-01" }] },
    ]
  ) {
    assertThrows(
      () => compute([{ ...activity, ...change }]),
      Error,
      "passive",
    );
  }
});

Deno.test("Schedule E sends an active-rental entire sale with overall gain to Form 8582 Part IV", () => {
  const sale = {
    activity_id: "active-entire-gain",
    activity_name: "Active entire rental",
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
    disposition_document_reference: "2025 active rental closing statement",
  } as const;
  const activity = minimalItem({
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    activity_type: "A",
    disposed_of: true,
    expense_taxes: 2_000,
    prior_unallowed_passive_operating: 8_000,
    prior_passive_losses_active_when_incurred: true,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: sale.activity_id,
      filed_part_vii_column_c: 8_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
    passive_property_sales: [sale],
  });
  const result = compute([activity]);
  const ledger = form8582.inputSchema.parse(
    findOutput(result, "form8582")?.fields,
  );
  assertEquals(ledger?.activities?.[0]?.activity_type, "A");
  assertEquals(ledger?.activities?.[0]?.prior_active_participation, true);
  assertEquals(ledger?.prior_unallowed, 8_000);
  assertEquals(findOutput(result, "form4797")?.fields.passive_property_sales, [
    sale,
  ]);
  assertEquals(findOutput(result, "schedule1")?.fields.line5_schedule_e, 0);
  assertThrows(
    () =>
      compute([{
        ...activity,
        prior_passive_losses_active_when_incurred: false,
      }]),
    Error,
    "section 469(g) review",
  );
});

Deno.test("Schedule E routes filed Part IX Form 4797 carryovers without a current sale", () => {
  const result = compute([minimalItem({
    activity_type: "B",
    activity_id: "passive-rental-part-ix",
    property_description: "Passive rental",
    rent_income: 4_000,
    prior_unallowed_passive_operating: 2_000,
    prior_unallowed_passive_4797_part1: 6_000,
    prior_unallowed_passive_4797_part2: 2_000,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "passive-rental-part-ix",
      filed_part_vii_column_c: 10_000,
      source_document_reference: "2024 filed Form 8582 Part IX",
      filed_part_ix_rows: [
        { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
        { reporting_form: "form4797_part1", filed_unallowed_loss: 6_000 },
        { reporting_form: "form4797_part2", filed_unallowed_loss: 2_000 },
      ],
    },
  })]);
  assertEquals(findOutput(result, "form8582")?.fields.prior_unallowed, 10_000);
  assertEquals(findOutput(result, "form4797")?.fields.disposed_properties, 0);
  assertEquals(
    (findOutput(result, "form4797")?.fields.passive_activity_sources as
      | unknown[]
      | undefined)?.length,
    1,
  );
});

Deno.test("royalty property with zero rental days is not a short-term home rental", () => {
  const result = compute([minimalItem({
    property_type: 6,
    fair_rental_days: 0,
    royalties_income: 4000,
  })]);
  assertEquals(findOutput(result, "schedule1")?.fields.line5_schedule_e, 4000);
});

Deno.test("Schedule E rejects 1099-MISC royalty passthrough hidden by a property item", () => {
  assertThrows(
    () =>
      scheduleE.compute(
        { taxYear: 2025, formType: "f1040" },
        inputSchema.parse({
          schedule_es: [
            minimalItem({ property_type: 6, royalties_income: 800 }),
          ],
          royalty_income: 800,
        }),
      ),
    Error,
    "need per-property reconciliation",
  );
});

Deno.test("input validation: missing required field (rent_income) throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ rent_income: undefined }),
    ])
  );
});

Deno.test("input validation: form_1099_filed required when form_1099_payments_made=true", () => {
  assertThrows(() =>
    compute([
      minimalItem({
        form_1099_payments_made: true,
        // form_1099_filed intentionally omitted
      }),
    ])
  );
});

Deno.test("input validation: property_type_other_desc required when property_type=8", () => {
  assertThrows(() =>
    compute([
      minimalItem({
        property_type: 8,
        // property_type_other_desc intentionally omitted
      }),
    ])
  );
});

Deno.test("input validation: ownership_percent above 100 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: 101 }),
    ])
  );
});

Deno.test("input validation: ownership_percent below 0 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: -1 }),
    ])
  );
});

Deno.test("input validation: fair_rental_days=366 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ fair_rental_days: 366 }),
    ])
  );
});

Deno.test("input validation: personal_use_days=366 throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ personal_use_days: 366 }),
    ])
  );
});

Deno.test("input validation: qbi_aggregation_number=100 throws (must be 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 100 }),
    ])
  );
});

Deno.test("input validation: qbi_aggregation_number=0 throws (must be 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 0 }),
    ])
  );
});

// ─── 2. Per-Box Routing ──────────────────────────────────────────────────────

Deno.test("routing: rent_income routes net to schedule1 line5", () => {
  const result = compute([
    minimalItem({ rent_income: 12_000 }),
  ]);
  const s1 = findOutput(result, "schedule1");
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 12_000);
});

Deno.test("routing: royalties_income routes net to schedule1 line5", () => {
  const result = compute([
    minimalItem({
      property_type: 6,
      rent_income: 0,
      royalties_income: 5_000,
    }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("routing: royalties_income=0 produces no extra output beyond schedule1", () => {
  const withRoyalties = compute([
    minimalItem({ rent_income: 10_000, royalties_income: 0 }),
  ]);
  const withoutRoyalties = compute([
    minimalItem({ rent_income: 10_000 }),
  ]);
  assertEquals(withRoyalties.outputs.length, withoutRoyalties.outputs.length);
});

Deno.test("routing: carry_to_8960=true routes net rental income to form8960", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000, carry_to_8960: true }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals(
    (f8960!.fields as Record<string, number>).line4b_rental_net,
    8_000,
  );
});

Deno.test("routing: carry_to_8960 absent produces no form8960 output", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000 }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals(f8960, undefined);
});

Deno.test("routing: carry_to_8960=false produces no form8960 output", () => {
  const result = compute([
    minimalItem({ rent_income: 8_000, carry_to_8960: false }),
  ]);
  const f8960 = findOutput(result, "form8960");
  assertEquals(f8960, undefined);
});

Deno.test("Schedule E at-risk property requires a per-property computation", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ rent_income: 5_000, some_investment_not_at_risk: true }),
      ]),
    Error,
    "per-property Form 6198",
  );
});

Deno.test("routing: some_investment_not_at_risk=false produces no form6198 output", () => {
  const result = compute([
    minimalItem({ rent_income: 5_000, some_investment_not_at_risk: false }),
  ]);
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198, undefined);
});

Deno.test("routing: main_home_or_second_home=true routes personal interest/taxes to scheduleA", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_mortgage_interest: 6_000,
      occupancy_percent: 50,
      main_home_or_second_home: true,
    }),
  ]);
  // 50% occupancy → 50% of $6,000 mortgage interest = $3,000 personal portion → schedule_a
  const schAFields = findOutput(result, "schedule_a")!.fields as Record<
    string,
    number
  >;
  assertEquals(schAFields.line_8a_mortgage_interest_1098, 3_000);
});

Deno.test("routing: main_home_or_second_home=false produces no scheduleA output", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_mortgage_interest: 6_000,
    }),
  ]);
  const schA = findOutput(result, "schedule_a");
  assertEquals(schA, undefined);
});

Deno.test("routing: qbi_trade_or_business=Y routes to form8995 with correct qbi amount", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      qbi_trade_or_business: "Y",
    }),
  ]);
  const f8995Fields = findOutput(result, "form8995")!.fields as Record<
    string,
    number
  >;
  assertEquals(f8995Fields.qbi, 20_000);
});

Deno.test("routing: qbi_trade_or_business=N produces no form8995 output", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      qbi_trade_or_business: "N",
    }),
  ]);
  const f8995 = findOutput(result, "form8995");
  assertEquals(f8995, undefined);
});

Deno.test("routing: activity_type=A with net loss routes to form8582 with correct loss amount", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  // net = 5000 - 10000 = -5000 → current_loss = 5000 sent to form8582
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    number | boolean
  >;
  assertEquals(f8582Fields.current_loss, 5_000);
  assertEquals(f8582Fields.has_active_rental, true);
});

Deno.test("rental profit is identified separately from other passive activity amounts", () => {
  const result = compute([
    minimalItem({
      activity_id: "rental-profit",
      property_description: "Rental profit",
      rent_income: 10_000,
    }),
    minimalItem({
      activity_id: "rental-loss",
      property_description: "Rental loss",
      expense_repairs: 20_000,
    }),
    minimalItem({
      activity_id: "other-passive-loss",
      property_description: "Other passive loss",
      activity_type: "B",
      expense_repairs: 10_000,
    }),
  ]);
  const formFields = findOutput(result, "form8582")!.fields as Record<
    string,
    unknown
  >;
  const agiFields = findOutput(result, "agi_aggregator")!.fields as Record<
    string,
    unknown
  >;
  assertEquals(formFields.current_income, 10_000);
  assertEquals(formFields.rental_current_income, 10_000);
  assertEquals(formFields.current_loss, 30_000);
  assertEquals(formFields.rental_current_loss, 20_000);
  assertEquals(agiFields.pal_current_income, 10_000);
  assertEquals(agiFields.pal_rental_income, 10_000);
  assertEquals(agiFields.pal_current_loss, 30_000);
  assertEquals(agiFields.pal_rental_loss, 20_000);
});

Deno.test("routing: activity_type=B with net loss routes to form8582 with has_other_passive=true", () => {
  const result = compute([
    minimalItem({
      activity_type: "B",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    number | boolean
  >;
  assertEquals(f8582Fields.current_loss, 5_000);
  assertEquals(f8582Fields.has_other_passive, true);
});

Deno.test("a passive loss cannot enter Form 8582 without a durable source activity ID", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({ activity_id: undefined, expense_repairs: 2_000 }),
      ]),
    Error,
    "durable activity IDs",
  );
});

Deno.test("zero active rental does not reclassify another passive loss", () => {
  const result = compute([
    minimalItem({ property_description: "Empty active rental" }),
    minimalItem({
      activity_id: "passive-loss",
      property_description: "Passive loss",
      activity_type: "B",
      expense_repairs: 10_000,
    }),
  ]);
  const fields = findOutput(result, "form8582")!.fields as Record<
    string,
    unknown
  >;
  assertEquals(fields.has_active_rental, undefined);
  assertEquals(fields.has_other_passive, true);
  assertEquals((fields.activities as unknown[]).length, 1);
});

Deno.test("routing: activity_type=C does not route to form8582", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
});

Deno.test("routing: activity_type=D does not route to form8582", () => {
  const result = compute([
    minimalItem({
      activity_type: "D",
      rent_income: 5_000,
      expense_repairs: 10_000,
    }),
  ]);
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
});

Deno.test("routing: disposed_of=true routes to form4797 with disposed_properties=1", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, disposed_of: true }),
  ]);
  const f4797Fields = findOutput(result, "form4797")!.fields as Record<
    string,
    number
  >;
  assertEquals(f4797Fields.disposed_properties, 1);
});

Deno.test("routing: disposed_of=false produces no form4797 output", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, disposed_of: false }),
  ]);
  const f4797 = findOutput(result, "form4797");
  assertEquals(f4797, undefined);
});

Deno.test("routing: a retained-activity sale reaches Form 4797 from its Schedule E property", () => {
  const sale = {
    activity_id: "rental-sale",
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
  const result = compute([minimalItem({
    activity_id: "rental-sale",
    property_description: "Rental house",
    disposed_of: true,
    passive_property_sales: [sale],
  })]);
  assertEquals(findOutput(result, "form4797")?.fields.passive_property_sales, [
    sale,
  ]);
  assertThrows(
    () =>
      compute([minimalItem({
        activity_id: "rental-sale",
        property_description: "Rental house",
        disposed_of: true,
        passive_property_sales: [{ ...sale, activity_name: "Other rental" }],
      })]),
    Error,
    "same named A or B activity",
  );
});

Deno.test("routing: expense_depreciation_amt routes to form6251 with correct adjustment", () => {
  const result = compute([
    minimalItem({
      rent_income: 20_000,
      expense_depreciation: 5_000,
      expense_depreciation_amt: 1_000,
    }),
  ]);
  const f6251Fields = findOutput(result, "form6251")!.fields as Record<
    string,
    number
  >;
  assertEquals(f6251Fields.depreciation_adjustment, 1_000);
});

Deno.test("routing: expense_depreciation_amt=0 produces no form6251 output", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_depreciation: 5_000 }),
  ]);
  const f6251 = findOutput(result, "form6251");
  assertEquals(f6251, undefined);
});

Deno.test("routing: section_179 with activity_type=C routes to form4562 with correct deduction", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 100_000,
      section_179: 50_000,
    }),
  ]);
  const f4562Fields = findOutput(result, "form4562")!.fields as Record<
    string,
    number
  >;
  assertEquals(f4562Fields.section_179_deduction, 50_000);
});

Deno.test("routing: disallowed mortgage interest needs reviewed Form 8990 records", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          rent_income: 20_000,
          disallowed_mortgage_interest_8990: 3_000,
        }),
      ]),
    Error,
    "reviewed Form 8990 source records",
  );
});

Deno.test("routing: disallowed other interest needs reviewed Form 8990 records", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          rent_income: 20_000,
          disallowed_other_interest_8990: 2_000,
        }),
      ]),
    Error,
    "reviewed Form 8990 source records",
  );
});

Deno.test("Schedule E prior at-risk loss is not treated as a return-wide amount", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          rent_income: 10_000,
          prior_unallowed_at_risk: 2_000,
        }),
      ]),
    Error,
    "per-property Form 6198",
  );
});

Deno.test("routing: prior_unallowed_passive_operating routes to form8582 with prior_unallowed amount", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_operating: 2_000,
      prior_year_8582_source: {
        tax_year: 2024,
        activity_id: "rental-test",
        filed_part_vii_column_c: 2_000,
        source_document_reference: "2024 filed Form 8582 Part VII, rental-test",
      },
      prior_passive_losses_active_when_incurred: true,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    number
  >;
  assertEquals(f8582Fields.prior_unallowed, 2_000);
  assertEquals(f8582Fields.rental_prior_eligible_loss, 2_000);
});

Deno.test("prior rental operating loss needs prior-year participation fact", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        prior_unallowed_passive_operating: 2_000,
      })]),
    Error,
    "prior-year active participation answer",
  );
  const result = compute([minimalItem({
    prior_unallowed_passive_operating: 2_000,
    prior_passive_losses_active_when_incurred: false,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "rental-test",
      filed_part_vii_column_c: 2_000,
      source_document_reference: "2024 filed Form 8582 Part VII, rental-test",
    },
  })]);
  assertThrows(
    () =>
      compute([minimalItem({
        prior_unallowed_passive_operating: 2_000,
        prior_passive_losses_active_when_incurred: false,
        disposed_of: true,
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: "rental-test",
          filed_part_vii_column_c: 2_000,
          source_document_reference:
            "2024 filed Form 8582 Part VII, rental-test",
        },
      })]),
    Error,
    "section 469(g) review",
  );
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    unknown
  >;
  assertEquals(f8582Fields.prior_unallowed, 2_000);
  assertEquals(f8582Fields.rental_prior_eligible_loss, undefined);
});

Deno.test("routing: prior_unallowed_passive_4797_part1 routes to form8582 with aggregated prior_unallowed", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_4797_part1: 1_500,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    number
  >;
  assertEquals(f8582Fields.prior_unallowed, 1_500);
});

Deno.test("routing: prior_unallowed_passive_4797_part2 routes to form8582 with aggregated prior_unallowed", () => {
  const result = compute([
    minimalItem({
      activity_type: "A",
      rent_income: 5_000,
      prior_unallowed_passive_4797_part2: 1_200,
    }),
  ]);
  const f8582Fields = findOutput(result, "form8582")!.fields as Record<
    string,
    number
  >;
  assertEquals(f8582Fields.prior_unallowed, 1_200);
});

Deno.test("routing: qbi_w2_wages routes to form8995 when qbi_trade_or_business=Y", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_w2_wages: 10_000,
    }),
  ]);
  const input = findOutput(result, "form8995")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.w2_wages, 10_000);
});

Deno.test("routing: qbi_unadjusted_basis routes to form8995 when qbi_trade_or_business=Y", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_unadjusted_basis: 200_000,
    }),
  ]);
  const input = findOutput(result, "form8995")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.unadjusted_basis, 200_000);
});

Deno.test("routing: specified service rental keeps QBI, wages, and UBIA in the SSTB pool", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_specified_service: true,
      qbi_w2_wages: 10_000,
      qbi_unadjusted_basis: 200_000,
    }),
  ]);
  const input = findOutput(result, "form8995")!.fields as Record<
    string,
    number
  >;

  assertEquals(input.qbi, 0);
  assertEquals(input.sstb_qbi, 30_000);
  assertEquals(input.sstb_w2_wages, 10_000);
  assertEquals(input.sstb_unadjusted_basis, 200_000);
});

Deno.test("routing: qbi_override routes to form8995 using override amount, ignoring computed net", () => {
  const result = compute([
    minimalItem({
      rent_income: 30_000,
      qbi_trade_or_business: "Y",
      qbi_override: 15_000,
    }),
  ]);
  // Override wins over computed net (30_000)
  const input = findOutput(result, "form8995")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.qbi, 15_000);
});

// ─── 3. Aggregation ──────────────────────────────────────────────────────────

Deno.test("aggregation: rent_income summed across two properties", () => {
  const result = compute([
    minimalItem({ rent_income: 6_000 }),
    minimalItem({ rent_income: 4_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 10_000);
});

Deno.test("aggregation: royalties summed across two royalty properties", () => {
  const result = compute([
    minimalItem({ property_type: 6, rent_income: 0, royalties_income: 3_000 }),
    minimalItem({ property_type: 6, rent_income: 0, royalties_income: 2_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("aggregation: expenses reduce net across properties in single output", () => {
  const result = compute([
    minimalItem({ rent_income: 12_000, expense_repairs: 2_000 }),
    minimalItem({ rent_income: 8_000, expense_insurance: 1_000 }),
  ]);
  // net = (12000 - 2000) + (8000 - 1000) = 17000
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 17_000);
});

Deno.test("aggregation: mortgage interest totalled across all properties (reduces net)", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_mortgage_interest: 4_000 }),
    minimalItem({ rent_income: 15_000, expense_mortgage_interest: 3_000 }),
  ]);
  // net = (20000-4000) + (15000-3000) = 28000
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 28_000);
});

Deno.test("aggregation: depreciation totalled across all properties (reduces net)", () => {
  const result = compute([
    minimalItem({ rent_income: 20_000, expense_depreciation: 5_000 }),
    minimalItem({ rent_income: 15_000, expense_depreciation: 3_000 }),
  ]);
  // net = (20000-5000) + (15000-3000) = 27000
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 27_000);
});

// ─── 4. Thresholds ───────────────────────────────────────────────────────────

Deno.test("threshold §280A: fewer than 15 rental days without home use remains taxable", () => {
  const result = compute([
    minimalItem({
      fair_rental_days: 14,
      personal_use_days: 0,
      rent_income: 5_000,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1?.fields.line5_schedule_e, 5_000);
});

Deno.test("threshold §280A: fair_rental_days=15 — income NOT excluded (≥ 15 days)", () => {
  const result = compute([
    minimalItem({
      fair_rental_days: 15,
      personal_use_days: 0,
      rent_income: 5_000,
    }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 5_000);
});

Deno.test("threshold §280A: personal_use_days=14 with fair_rental_days=200 — no vacation home (14 ≤ 14)", () => {
  // Does not trigger vacation home rules — full loss allowed
  const result = compute([
    minimalItem({
      fair_rental_days: 200,
      personal_use_days: 14,
      rent_income: 8_000,
      expense_repairs: 10_000,
    }),
  ]);
  // Loss survives the §280A expense cap, then goes to Form 8582 for the §469 limit
  // instead of straight onto Schedule 1 line 5.
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 0);
  assertEquals(
    (findOutput(result, "form8582")!.fields as Record<string, number>)
      .current_loss,
    2_000,
  );
});

Deno.test("threshold §280A: personal_use_days=15 with fair_rental_days=140 — vacation home caps loss at zero", () => {
  // Vacation home: expenses limited to gross rental income — no loss allowed
  const result = compute([
    minimalItem({
      fair_rental_days: 140,
      personal_use_days: 15,
      rent_income: 8_000,
      expense_repairs: 15_000,
    }),
  ]);
  // §280A(c)(5): net capped at 0 when vacation home rules apply
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 0);
});

Deno.test("threshold §280A: personal use below 14 days is not home use even above 10%", () => {
  // FRD=10, PUD=2: the greater threshold is 14 days, not 10% of rental days.
  const result = compute([
    minimalItem({
      fair_rental_days: 10,
      personal_use_days: 2,
      rent_income: 1_000,
      expense_repairs: 2_000,
    }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 0);
  assertEquals(
    (findOutput(result, "form8582")!.fields as Record<string, number>)
      .current_loss,
    1_000,
  );
});

Deno.test("threshold §280A: more than 14 days can still be below 10% of rental days", () => {
  const result = compute([minimalItem({
    fair_rental_days: 300,
    personal_use_days: 15,
    rent_income: 1_000,
    expense_repairs: 2_000,
  })]);
  assertEquals(
    (findOutput(result, "form8582")!.fields as Record<string, number>)
      .current_loss,
    1_000,
  );
});

Deno.test("threshold §280A: personal_use_days=0 — pure rental, no vacation home proration", () => {
  const result = compute([
    minimalItem({
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 12_000,
      expense_repairs: 3_000,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 9_000);
});

Deno.test("Schedule E positive QBI aggregation number fails closed without Schedule B member evidence", () => {
  for (const number of [1, 99]) {
    assertThrows(
      () =>
        compute([minimalItem({
          rent_income: 10_000,
          qbi_trade_or_business: "Y",
          qbi_aggregation_number: number,
        })]),
      Error,
      "Schedule E QBI aggregation number needs Form 8995-A Schedule B",
    );
  }
});

Deno.test("threshold §179: section_179=$2,500,000 with activity_type=C routes full amount to form4562", () => {
  const result = compute([
    minimalItem({
      activity_type: "C",
      rent_income: 5_000_000,
      section_179: 2_500_000,
    }),
  ]);
  const f4562Fields = findOutput(result, "form4562")!.fields as Record<
    string,
    number
  >;
  assertEquals(f4562Fields.section_179_deduction, 2_500_000);
});

Deno.test("threshold ownership_percent=0: all income/expenses allocated as $0 to this taxpayer", () => {
  const result = compute([
    minimalItem({ rent_income: 10_000, ownership_percent: 0 }),
  ]);
  // 0% ownership → net = 0 → schedule1 may be omitted or carry line5=0
  const s1 = findOutput(result, "schedule1");
  if (s1 !== undefined) {
    assertEquals((s1.fields as Record<string, number>).line5_schedule_e, 0);
  } else {
    assertEquals(s1, undefined);
  }
});

Deno.test("threshold ownership_percent=50: prorates income and expenses by 50%", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      expense_repairs: 2_000,
      ownership_percent: 50,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  // net at 100% = 8000; at 50% = 4000
  assertEquals(input.line5_schedule_e, 4_000);
});

// ─── 5. Hard Validation Rules (throws) ──────────────────────────────────────

Deno.test("hard validation: property_type=8 without property_type_other_desc throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ property_type: 8 }),
    ])
  );
});

Deno.test("hard validation: property_type=8 with property_type_other_desc does not throw", () => {
  const result = compute([
    minimalItem({
      property_type: 8,
      property_type_other_desc: "Storage unit rental",
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("hard validation: form_1099_payments_made=true without form_1099_filed throws", () => {
  assertThrows(() =>
    compute([
      minimalItem({ form_1099_payments_made: true }),
    ])
  );
});

Deno.test("hard validation: fair_rental_days=366 throws (out of 0–365)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ fair_rental_days: 366 }),
    ])
  );
});

Deno.test("hard validation: personal_use_days=366 throws (out of 0–365)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ personal_use_days: 366 }),
    ])
  );
});

Deno.test("hard validation: ownership_percent=101 throws (out of 0–100)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ ownership_percent: 101 }),
    ])
  );
});

Deno.test("hard validation: qbi_aggregation_number=100 throws (out of 1–99)", () => {
  assertThrows(() =>
    compute([
      minimalItem({ qbi_aggregation_number: 100 }),
    ])
  );
});

// ─── 6. Warning-Only Rules (does_not_throw) ──────────────────────────────────

Deno.test("warning only: form_1099_payments_made=true with form_1099_filed=false does not throw", () => {
  const result = compute([
    minimalItem({
      form_1099_payments_made: true,
      form_1099_filed: false,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: elect_out_biie=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      elect_out_biie: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: placed_in_service=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      placed_in_service: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: disposed_of=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      disposed_of: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("warning only: carry_to_8960=true does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 10_000,
      carry_to_8960: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("Schedule E does not silently accept missing at-risk facts", () => {
  assertThrows(
    () =>
      compute([
        minimalItem({
          rent_income: 10_000,
          some_investment_not_at_risk: true,
        }),
      ]),
    Error,
    "per-property Form 6198",
  );
});

// ─── 7. Informational Fields (output count unchanged) ────────────────────────

Deno.test("informational: tsj='T' and tsj='S' produce same output count", () => {
  const resultT = compute([minimalItem({ tsj: "T", rent_income: 10_000 })]);
  const resultS = compute([minimalItem({ tsj: "S", rent_income: 10_000 })]);
  assertEquals(resultT.outputs.length, resultS.outputs.length);
});

Deno.test("informational: street_address does not change output count", () => {
  const withAddr = compute([
    minimalItem({ rent_income: 10_000, street_address: "123 Main St" }),
  ]);
  const withoutAddr = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withAddr.outputs.length, withoutAddr.outputs.length);
});

Deno.test("informational: city/state/zip do not change output count", () => {
  const withFields = compute([
    minimalItem({
      rent_income: 10_000,
      city: "Anytown",
      state: "CA",
      zip: "90210",
    }),
  ]);
  const withoutFields = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withFields.outputs.length, withoutFields.outputs.length);
});

Deno.test("informational: foreign_country does not change output count", () => {
  const withForeign = compute([
    minimalItem({ rent_income: 10_000, foreign_country: "Paris, France" }),
  ]);
  const withoutForeign = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withForeign.outputs.length, withoutForeign.outputs.length);
});

Deno.test("informational: tax_court_method=true does not change output count", () => {
  const withTCM = compute([
    minimalItem({
      rent_income: 10_000,
      fair_rental_days: 200,
      personal_use_days: 30,
      tax_court_method: true,
    }),
  ]);
  const withoutTCM = compute([
    minimalItem({
      rent_income: 10_000,
      fair_rental_days: 200,
      personal_use_days: 30,
    }),
  ]);
  assertEquals(withTCM.outputs.length, withoutTCM.outputs.length);
});

Deno.test("informational: qualified_joint_venture=true does not change output count", () => {
  const withQJV = compute([
    minimalItem({ rent_income: 10_000, qualified_joint_venture: true }),
  ]);
  const withoutQJV = compute([minimalItem({ rent_income: 10_000 })]);
  assertEquals(withQJV.outputs.length, withoutQJV.outputs.length);
});

// ─── 8. Edge Cases ───────────────────────────────────────────────────────────

Deno.test("edge case vacation home <15 rental days: §280A(g) excludes all income — net=0", () => {
  // IRC §280A(g): if FRD < 15, do NOT report rental income on Schedule E
  const result = compute([
    minimalItem({
      fair_rental_days: 10,
      personal_use_days: 355,
      rent_income: 8_000,
      expense_mortgage_interest: 12_000,
      expense_taxes: 3_000,
    }),
  ]);
  // computePropertyNet returns 0 → schedule1 output carries line5=0 or is omitted
  const s1 = findOutput(result, "schedule1");
  if (s1 !== undefined) {
    assertEquals(
      (s1.fields as Record<string, number>).line5_schedule_e ?? 0,
      0,
    );
  } else {
    assertEquals(s1, undefined);
  }
});

Deno.test("edge case self-rental (property_type=7): net income is nonpassive (no form8582 for income)", () => {
  // Treas. Reg. §1.469-2(f)(6): net rental income recharacterized as nonpassive
  const result = compute([
    minimalItem({
      property_type: 7,
      activity_type: "A",
      rent_income: 20_000,
      expense_repairs: 5_000,
    }),
  ]);
  // Net income (15000) → nonpassive; should NOT route loss to form8582
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582, undefined);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("edge case: multiple properties (4) in one call — all nets aggregated", () => {
  const result = compute([
    minimalItem({ rent_income: 1_000 }),
    minimalItem({ rent_income: 2_000 }),
    minimalItem({ rent_income: 3_000 }),
    minimalItem({ rent_income: 4_000 }),
  ]);
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  assertEquals(input.line5_schedule_e, 10_000);
});

Deno.test("edge case: royalty property (type=6) with no street_address does not throw", () => {
  // Context: for royalty property, leave Lines 1a and 2 blank
  const result = compute([
    minimalItem({
      property_type: 6,
      rent_income: 0,
      royalties_income: 5_000,
      fair_rental_days: 0,
      // no street_address
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
});

Deno.test("edge case: qualified_joint_venture=true does not throw and processes normally", () => {
  const result = compute([
    minimalItem({
      rent_income: 24_000,
      qualified_joint_venture: true,
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
});

Deno.test("edge case: operating_expenses_carryover re-enters expense pool (reduces net)", () => {
  // Prior-year §280A disallowed expenses flow back into current-year expense pool
  const withCarryover = compute([
    minimalItem({
      rent_income: 10_000,
      operating_expenses_carryover: 2_000,
    }),
  ]);
  const withoutCarryover = compute([
    minimalItem({ rent_income: 10_000 }),
  ]);
  const netWith =
    (findOutput(withCarryover, "schedule1")!.fields as Record<string, number>)
      .line5_schedule_e;
  const netWithout =
    (findOutput(withoutCarryover, "schedule1")!.fields as Record<
      string,
      number
    >).line5_schedule_e;
  // Carryover should reduce net income
  assertEquals(netWith < netWithout, true);
});

Deno.test("edge case: expense_other_lines with 6 rows does not throw", () => {
  const result = compute([
    minimalItem({
      rent_income: 15_000,
      expense_other_lines: [
        { description: "HOA fees", amount: 500 },
        { description: "Pest control", amount: 200 },
        { description: "Snow removal", amount: 300 },
        { description: "Landscaping", amount: 400 },
        { description: "Pool maintenance", amount: 600 },
        { description: "Security system", amount: 250 },
      ],
    }),
  ]);
  assertEquals(Array.isArray(result.outputs), true);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  // net = 15000 - (500+200+300+400+600+250) = 15000 - 2250 = 12750
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 12_750);
});

Deno.test("edge case: expense_other_lines amounts reduce net income", () => {
  const result = compute([
    minimalItem({
      rent_income: 12_000,
      expense_other_lines: [
        { description: "HOA fees", amount: 1_200 },
        { description: "Pest control", amount: 300 },
      ],
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 10_500);
});

Deno.test("edge case: all expense lines combined reduce net correctly", () => {
  const result = compute([
    minimalItem({
      rent_income: 50_000,
      expense_advertising: 500,
      expense_auto_travel: 400,
      expense_cleaning: 600,
      expense_commissions: 1_500,
      expense_insurance: 1_200,
      expense_legal_professional: 800,
      expense_management: 2_000,
      expense_mortgage_interest: 10_000,
      expense_other_interest: 500,
      expense_repairs: 3_000,
      expense_supplies: 300,
      expense_taxes: 2_500,
      expense_utilities: 1_000,
      expense_depreciation: 8_000,
    }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  // total expenses = 500+400+600+1500+1200+800+2000+10000+500+3000+300+2500+1000+8000 = 32300
  // net = 50000 - 32300 = 17700
  assertEquals(input.line5_schedule_e, 17_700);
});

// ─── 9. Smoke Test ───────────────────────────────────────────────────────────

Deno.test("smoke: comprehensive test with all major boxes populated", () => {
  const result = compute([
    {
      tsj: "T",
      activity_id: "rental-oak-ave",
      property_description: "456 Oak Ave, Springfield, IL 62701",
      street_address: "456 Oak Ave",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 300,
      personal_use_days: 0,
      rent_income: 24_000,
      royalties_income: 0,
      expense_advertising: 600,
      expense_cleaning: 800,
      expense_insurance: 1_200,
      expense_management: 1_800,
      expense_mortgage_interest: 9_000,
      expense_repairs: 2_400,
      expense_taxes: 3_000,
      expense_utilities: 1_200,
      expense_depreciation: 5_500,
      expense_other_lines: [{ description: "HOA fees", amount: 600 }],
      carry_to_8960: true,
      some_investment_not_at_risk: false,
      main_home_or_second_home: false,
      qbi_trade_or_business: "Y",
      qbi_w2_wages: 0,
      form_1099_payments_made: false,
      ownership_percent: 100,
    },
  ]);

  // schedule1 output must exist; the passive loss is held for Form 8582, not line 5
  const input = findOutput(result, "schedule1")!.fields as Record<
    string,
    number
  >;
  // net = 24000 - (600+800+1200+1800+9000+2400+3000+1200+5500+600) = 24000 - 26100 = -2100
  assertEquals(input.line5_schedule_e, 0);

  // form8582 required: activity_type=A, net loss
  assertEquals(
    (findOutput(result, "form8582")!.fields as Record<string, number>)
      .current_loss,
    2_100,
  );

  // form8960 required: carry_to_8960=true, net=-2100
  assertEquals(
    (findOutput(result, "form8960")!.fields as Record<string, number>)
      .line4b_rental_net,
    -2_100,
  );

  // form8995 required: qbi_trade_or_business=Y, qbi=net=-2100
  assertEquals(
    (findOutput(result, "form8995")!.fields as Record<string, number>).qbi,
    -2_100,
  );

  // form6198 must NOT be present: some_investment_not_at_risk=false
  const f6198 = findOutput(result, "form6198");
  assertEquals(f6198, undefined);

  // scheduleA must NOT be present: main_home_or_second_home=false
  const schA = findOutput(result, "schedule_a");
  assertEquals(schA, undefined);
});

Deno.test("edge case self-rental (property_type=7): net loss is passive — routes to form8582", () => {
  // Treas. Reg. §1.469-2(f)(6): net rental LOSS on self-rental is passive (unlike income)
  const result = compute([
    minimalItem({
      property_type: 7,
      activity_type: "A",
      rent_income: 5_000,
      expense_repairs: 8_000, // net = -3,000
    }),
  ]);
  // Net loss → passive → must route to form8582, not onto Schedule 1 line 5
  const f8582 = findOutput(result, "form8582");
  assertEquals(f8582 !== undefined, true);
  assertEquals((f8582!.fields as Record<string, number>).current_loss, 3_000);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1 !== undefined, true);
  const input = s1!.fields as Record<string, number>;
  assertEquals(input.line5_schedule_e, 0);
});
