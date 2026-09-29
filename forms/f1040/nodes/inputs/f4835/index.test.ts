import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm4835AtRiskNet,
  calculateForm4835Lines,
  f4835,
  itemSchema,
} from "./index.ts";
import { scheduleE } from "../schedule_e/index.ts";

function item(overrides: Record<string, unknown> = {}) {
  return {
    activity_id: "farm-test",
    activity_name: "Test Farm",
    livestock_crop_income: 0,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof item>[]) {
  return f4835.compute({ taxYear: 2025, formType: "f1040" }, { f4835s: items });
}

Deno.test("Form 4835 requires at least one and at most four farms", () => {
  assertThrows(() => compute([]));
  assertThrows(() => compute(Array.from({ length: 5 }, () => item())));
});

Deno.test("Form 4835 uses taxable columns, not gross payment columns", () => {
  const parsed = itemSchema.parse(item({
    livestock_crop_income: 100,
    cooperative_distributions_gross: 500,
    cooperative_distributions_taxable: 250,
    agricultural_program_payments_gross: 600,
    agricultural_program_payments_taxable: 300,
    ccc_loans_forfeited_gross: 700,
    ccc_loans_forfeited_taxable: 350,
    crop_insurance_disaster_received: 800,
    crop_insurance_disaster_taxable: 400,
    crop_insurance_deferred_prior_year: 50,
    other_income: 25,
  }));
  assertEquals(calculateForm4835Lines(parsed).gross, 1475);
});

Deno.test("Form 4835 rejects taxable income exceeding gross receipts", () => {
  assertThrows(
    () => compute([item({ agricultural_program_payments_taxable: 1 })]),
    Error,
  );
  assertThrows(
    () =>
      compute([
        item({
          crop_insurance_disaster_received: 100,
          crop_insurance_disaster_taxable: 101,
        }),
      ]),
    Error,
  );
});

Deno.test("Form 4835 subtracts named and other expenses, net of 263A capitalization", () => {
  const parsed = itemSchema.parse(item({
    livestock_crop_income: 10000,
    expense_feed: 1000,
    expense_repairs_maintenance: 500,
    expense_other_details: [{ description: "Farm supplies", amount: 200 }],
    expense_capitalized_263a: 300,
  }));
  assertEquals(calculateForm4835Lines(parsed), {
    gross: 10000,
    expenses: 1400,
    preliminaryNet: 8600,
  });
  assertThrows(() => compute([item({ expense_capitalized_263a: 1 })]), Error);
});

Deno.test("Form 4835 income routes to Schedule E rather than Schedule 1 directly", () => {
  const result = compute([item({ livestock_crop_income: 5000 })]);
  assertEquals(result.outputs, [{
    nodeType: "schedule_e",
    fields: {
      farm_rental_net: 5000,
      farm_rental_gross: 5000,
      farm_rental_activities: [{
        activity_id: "farm-test",
        name: "Test Farm",
        current_net: 5000,
        actively_participated: false,
      }],
    },
  }]);
  const scheduleResult = scheduleE.compute(
    { taxYear: 2025, formType: "f1040" },
    { schedule_es: [], farm_rental_net: 5000, farm_rental_gross: 5000 },
  );
  assertEquals(
    scheduleResult.outputs.find((out) => out.nodeType === "schedule1")?.fields
      .line5_schedule_e,
    5000,
  );
});

Deno.test("Form 4835 passes each preliminary farm result for passive allocation", () => {
  const result = compute([
    item({ livestock_crop_income: 3000 }),
    item({
      activity_id: "farm-second",
      activity_name: "Second farm",
      livestock_crop_income: 500,
      expense_feed: 2000,
      some_investment_not_at_risk: false,
    }),
  ]);
  assertEquals(result.outputs[0].fields, {
    farm_rental_net: 1500,
    farm_rental_gross: 3500,
    farm_rental_activities: [
      {
        activity_id: "farm-test",
        name: "Test Farm",
        current_net: 3000,
        actively_participated: false,
      },
      {
        activity_id: "farm-second",
        name: "Second farm",
        current_net: -1500,
        actively_participated: false,
      },
    ],
  });
});

Deno.test("Form 4835 loss requires at-risk facts and does not trust a supplied deduction", () => {
  assertThrows(() => compute([item({ expense_feed: 2000 })]), Error);
  assertEquals(
    compute([
      item({
        expense_feed: 2000,
        some_investment_not_at_risk: false,
      }),
    ]).outputs[0]
      .fields.farm_rental_net,
    -2000,
  );
  assertThrows(
    () =>
      compute([
        item({ expense_feed: 2000, some_investment_not_at_risk: true }),
      ]),
    Error,
  );
  assertThrows(
    () =>
      compute([
        item({
          expense_feed: 2000,
          deductible_loss: 2001,
          some_investment_not_at_risk: false,
        }),
      ]),
    Error,
  );
  assertThrows(
    () => compute([item({ livestock_crop_income: 100, deductible_loss: 1 })]),
    Error,
  );
});

Deno.test("Form 4835 limits each farm loss to its computed Form 6198 amount at risk", () => {
  const farm = itemSchema.parse(item({
    activity_id: "farm-at-risk",
    expense_feed: 2000,
    some_investment_not_at_risk: true,
    at_risk_simplified: {
      opening_adjusted_basis: 1000,
      current_year_increases: 200,
      line9_decreases_and_exclusions: 600,
    },
  }));
  assertEquals(calculateForm4835AtRiskNet(farm), {
    preliminaryNet: -2000,
    atRiskNet: -600,
    suspended: 1400,
    amountAtRisk: 600,
  });
  const result = compute([{ ...farm, activity_id: "farm-at-risk" }]);
  assertEquals(result.outputs[0].fields.farm_rental_net, -600);
  assertEquals(result.carryforwards?.f4835_at_risk_suspended_1, 1400);
  assertThrows(
    () =>
      compute([item({
        expense_feed: 2000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 100,
          current_year_increases: 0,
          line9_decreases_and_exclusions: 101,
        },
      })]),
    Error,
    "line 10a",
  );
});

Deno.test("Form 4835 retains prior passive losses by farm and checks participation history", () => {
  const result = compute([item({
    livestock_crop_income: 1000,
    prior_unallowed_passive_operating: 1500,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "farm-test",
      filed_part_vii_column_c: 1500,
      source_document_reference: "2024 filed Form 8582 Part VII, farm-test",
    },
  })]);
  assertEquals(result.outputs[0].fields.farm_rental_activities, [{
    activity_id: "farm-test",
    name: "Test Farm",
    current_net: 1000,
    actively_participated: false,
    prior_unallowed_operating: 1500,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "farm-test",
      filed_part_vii_column_c: 1500,
      source_document_reference: "2024 filed Form 8582 Part VII, farm-test",
    },
    prior_active_participation: undefined,
  }]);
  assertThrows(
    () =>
      compute([item({
        livestock_crop_income: 1000,
        actively_participated: true,
        prior_unallowed_passive_operating: 500,
      })]),
    Error,
    "prior-year active participation answer",
  );
  const changedParticipation = compute([item({
    livestock_crop_income: 1000,
    actively_participated: true,
    prior_unallowed_passive_operating: 500,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "farm-test",
      filed_part_vii_column_c: 500,
      source_document_reference: "2024 filed Form 8582 Part VII, farm-test",
    },
    prior_passive_losses_active_when_incurred: false,
  })]);
  assertEquals(changedParticipation.outputs[0].fields.farm_rental_activities, [{
    activity_id: "farm-test",
    name: "Test Farm",
    current_net: 1000,
    actively_participated: true,
    prior_unallowed_operating: 500,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "farm-test",
      filed_part_vii_column_c: 500,
      source_document_reference: "2024 filed Form 8582 Part VII, farm-test",
    },
    prior_active_participation: false,
  }]);
});

Deno.test("Form 4835 CCC election needs loan details matching line 4a", () => {
  assertThrows(
    () => compute([item({ ccc_loans_reported_election: 100 })]),
    Error,
    "itemized CCC loans",
  );
  assertThrows(
    () =>
      compute([item({
        ccc_loans_reported_election: 100,
        ccc_loan_details: [{ description: "Corn loan", amount: 90 }],
      })]),
    Error,
    "itemized CCC loans",
  );
  const result = compute([item({
    ccc_loans_reported_election: 100,
    ccc_loan_details: [{ description: "Corn loan", amount: 100 }],
  })]);
  assertEquals(result.outputs[0].fields, {
    farm_rental_net: 100,
    farm_rental_gross: 100,
    farm_rental_activities: [{
      activity_id: "farm-test",
      name: "Test Farm",
      current_net: 100,
      actively_participated: false,
    }],
  });
});

Deno.test("Form 4835 still refuses crop-insurance deferral without its statement", () => {
  assertThrows(() => compute([item({ defer_crop_insurance: true })]), Error);
});

Deno.test("Form 4835 defers eligible crop insurance but taxes current and prior-year amounts", () => {
  const details = {
    cash_method: true,
    normal_practice_next_year_percent: 80,
    damaged_crops: [{ crop: "Corn", damage_date: "2025-08-15", cause: "Hail" }],
    payments: [{
      crop: "Corn",
      received_date: "2025-10-01",
      amount: 4000,
      carrier: "Farm Mutual",
    }],
  };
  const result = compute([item({
    defer_crop_insurance: true,
    crop_insurance_deferral_details: details,
    crop_insurance_disaster_received: 5000,
    crop_insurance_disaster_taxable: 1000,
    crop_insurance_deferred_prior_year: 700,
  })]);
  assertEquals(result.outputs[0].fields, {
    farm_rental_net: 1700,
    farm_rental_gross: 1700,
    farm_rental_activities: [{
      activity_id: "farm-test",
      name: "Test Farm",
      current_net: 1700,
      actively_participated: false,
    }],
  });
  assertThrows(
    () =>
      compute([item({
        defer_crop_insurance: true,
        crop_insurance_deferral_details: details,
        crop_insurance_disaster_received: 4500,
        crop_insurance_disaster_taxable: 1000,
      })]),
    Error,
    "must equal taxable and deferred",
  );
  assertThrows(
    () =>
      compute([item({
        crop_insurance_deferral_details: details,
      })]),
    Error,
    "require a deferral election",
  );
  assertThrows(
    () =>
      compute([item({
        defer_crop_insurance: true,
        crop_insurance_deferral_details: {
          ...details,
          payments: [{ ...details.payments[0], crop: "Wheat" }],
        },
        crop_insurance_disaster_received: 4000,
      })]),
    Error,
    "identify a damaged crop",
  );
});

Deno.test("Form 4835 rejects old override and withholding shortcuts", () => {
  assertThrows(() => compute([item({ net_farm_rental_income: 100 })]), Error);
  assertThrows(() => compute([item({ federal_withheld: 100 })]), Error);
  assertThrows(() => compute([item({ gross_farm_rental_income: 100 })]), Error);
});
