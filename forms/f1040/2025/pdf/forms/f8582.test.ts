import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8582Pdf } from "./f8582.ts";
import { form8582 as nativeForm8582 } from "../../mef/forms/f8582.ts";
import { scheduleEPdf } from "./schedule_e.ts";

Deno.test("first-year entire-sale gain prints Part V from the same Schedule E and Form 4797 activity", () => {
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
  const firstYear = {
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    activity_acquired_on: sale.acquired_on,
    acquisition_document_reference: "2025 purchase closing statement",
    not_grouped_with_prior_activity: true as const,
  };
  const property = {
    tsj: "T" as const,
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    property_type: 1,
    activity_type: "B" as const,
    fair_rental_days: 180,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    expense_taxes: 2_000,
    disposed_of: true,
    first_year_activity_source: firstYear,
    passive_property_sales: [sale],
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "B" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -2_000,
      prior_unallowed_operating: 0,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      first_year_activity_source: firstYear,
    }],
    current_loss: 2_000,
    has_other_passive: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 10_000,
      entire_activity_interest_disposed: true,
    }],
  };
  const pending = {
    schedule_e: { schedule_es: [property] },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -2_000 },
  };
  const xml = nativeForm8582.build(fields, { pending });
  assertStringIncludes(xml, "<OverallGainAmt>8000</OverallGainAmt>");
  const form = form8582Pdf.projectFields!(fields, pending);
  assertEquals(form.part5_1_income, "10000");
  assertEquals(form.part5_1_loss, "2000");
  assertEquals(form.part5_1_gain, "8000");
  assertEquals(form.part5_1_prior, undefined);
  const scheduleE = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(scheduleE.line22, 2_000);
  assertEquals(scheduleE.line26, -2_000);
  assertThrows(
    () =>
      nativeForm8582.build(fields, {
        pending: {
          ...pending,
          schedule_e: {
            schedule_es: [{
              ...property,
              first_year_activity_source: undefined,
            }],
          },
        },
      }),
    Error,
    "do not match their Schedule E",
  );
});

Deno.test("active rental entire-sale gain reconciles Form 8582 Part IV, Schedule E, and Form 4797", () => {
  const sale = {
    activity_id: "active-entire-gain",
    activity_name: "Active entire rental",
    part: "II" as const,
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
  };
  const prior = {
    tax_year: 2024 as const,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 8_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  };
  const property = {
    tsj: "T" as const,
    activity_id: sale.activity_id,
    property_description: sale.activity_name,
    property_type: 1,
    activity_type: "A" as const,
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    expense_taxes: 2_000,
    disposed_of: true,
    prior_unallowed_passive_operating: 8_000,
    prior_passive_losses_active_when_incurred: true,
    prior_year_8582_source: prior,
    passive_property_sales: [sale],
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "A" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -2_000,
      prior_unallowed_operating: 8_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    current_loss: 2_000,
    rental_current_loss: 2_000,
    rental_prior_eligible_loss: 8_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 15_000,
      entire_activity_interest_disposed: true,
    }],
    modified_agi: 160_000,
  };
  const pending = {
    schedule_e: { schedule_es: [property] },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -10_000 },
  };
  const xml = nativeForm8582.build(fields, { pending });
  assertStringIncludes(
    xml,
    "<RentalRealtyIncomeAmt>15000</RentalRealtyIncomeAmt>",
  );
  assertStringIncludes(xml, "<RentalRealtyLossAmt>2000</RentalRealtyLossAmt>");
  assertStringIncludes(
    xml,
    "<PYUnallowedRentalLossAmt>8000</PYUnallowedRentalLossAmt>",
  );
  assertStringIncludes(xml, "<OverallGainAmt>5000</OverallGainAmt>");
  const form = form8582Pdf.projectFields!(fields, pending);
  assertEquals(form.part4_1_income, "15000");
  assertEquals(form.part4_1_loss, "2000");
  assertEquals(form.part4_1_prior, "8000");
  assertEquals(form.part4_1_gain, "5000");
  const scheduleE = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(scheduleE.line22, 10_000);
  assertEquals(scheduleE.line26, -10_000);
  assertThrows(
    () =>
      nativeForm8582.build(fields, {
        pending: {
          ...pending,
          form4797: {
            passive_property_sales: [{ ...sale, gross_sales_price: 29_999 }],
          },
        },
      }),
    Error,
    "do not match property-sale sources",
  );
});

Deno.test("active retained-sale PAL projects Part IV and special allowance without releasing all loss", () => {
  const sale = {
    activity_id: "active-retained",
    activity_name: "Active retained rental",
    part: "II" as const,
    property_description: "Short-held rental property",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 8_000,
    cost_or_other_basis: 5_000,
    depreciation_allowed: 0 as const,
    entire_activity_interest_disposed: false,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 partial property closing statement",
  };
  const prior = {
    tax_year: 2024 as const,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 8_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  };
  const fields = {
    activities: [{
      activity_id: sale.activity_id,
      name: sale.activity_name,
      activity_type: "A" as const,
      property_type: 1,
      reporting_form: "schedule_e" as const,
      current_net: -5_000,
      prior_unallowed_operating: 8_000,
      prior_unallowed_4797_part1: 0,
      prior_unallowed_4797_part2: 0,
      prior_active_participation: true,
      prior_year_8582_source: prior,
    }],
    current_loss: 5_000,
    rental_current_loss: 5_000,
    rental_prior_eligible_loss: 8_000,
    prior_unallowed: 8_000,
    has_active_rental: true,
    active_participation: true,
    filing_status: "single" as const,
    modified_agi: 140_000,
    has_current_4797_transaction: true,
    current_4797_sale_gains: [{
      activity_id: sale.activity_id,
      activity_name: sale.activity_name,
      part: "II" as const,
      gain: 3_000,
      entire_activity_interest_disposed: false,
    }],
  };
  const pending = {
    schedule_e: {
      schedule_es: [{
        tsj: "T",
        activity_id: sale.activity_id,
        property_description: sale.activity_name,
        property_type: 1,
        activity_type: "A",
        fair_rental_days: 365,
        personal_use_days: 0,
        rent_income: 0,
        form_1099_payments_made: false,
        expense_taxes: 5_000,
        disposed_of: true,
        prior_unallowed_passive_operating: 8_000,
        prior_passive_losses_active_when_incurred: true,
        prior_year_8582_source: prior,
        passive_property_sales: [sale],
      }],
    },
    form4797: { passive_property_sales: [sale] },
    form8582: fields,
    schedule1: { line5_schedule_e: -8_000 },
  };
  const projected = form8582Pdf.projectFields!(fields, pending);
  assertEquals(projected.part4_1_income, "3000");
  assertEquals(projected.part4_1_loss, "5000");
  assertEquals(projected.part4_1_prior, "8000");
  assertEquals(projected.part4_1_overall_loss, "10000");
  assertEquals(projected.line9, "5000");
  assertEquals(projected.line11, "8000");
  assertEquals(projected.part7_1_unallowed, "5000");
});

const rental = {
  activity_id: "rental-home",
  name: "Rental home",
  activity_type: "A" as const,
  property_type: 1,
  reporting_form: "schedule_e" as const,
  current_net: -20_000,
  prior_unallowed_operating: 0,
  prior_unallowed_4797_part1: 0,
  prior_unallowed_4797_part2: 0,
};

const rentalFields = {
  activities: [rental],
  current_loss: 20_000,
  rental_current_loss: 20_000,
  has_active_rental: true,
  active_participation: true,
  filing_status: "mfs" as const,
  mfs_lived_apart_all_year: true,
  modified_agi: 60_000,
};

const rentalPending = {
  general: { filing_status: "mfs", mfs_spouse_lived_with_taxpayer: false },
  schedule_e: {
    schedule_es: [{
      tsj: "T",
      activity_id: "rental-home",
      property_description: "Rental home",
      property_type: 1,
      activity_type: "A",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 0,
      form_1099_payments_made: false,
      expense_utilities: 20_000,
    }],
  },
};

Deno.test("Form 8582 PDF projects Parts I–VIII from the native activity worksheet", () => {
  const fields = form8582Pdf.projectFields!(rentalFields, rentalPending);
  assertEquals(fields.line1b, "20000");
  assertEquals(fields.line1d, "-20000");
  assertEquals(fields.line3, "-20000");
  assertEquals(fields.line5, "75000");
  assertEquals(fields.line6, "60000");
  assertEquals(fields.line9, "7500");
  assertEquals(fields.line11, "7500");
  assertEquals(fields.part4_1_name, "Rental home");
  assertEquals(fields.part4_1_loss, "20000");
  assertEquals(fields.part4_total_loss, "20000");
  assertEquals(fields.part6_1_allowance, "7500");
  assertEquals(fields.part7_1_unallowed, "12500");
  assertEquals(fields.partVIII_1_allowed, "7500");
  assertEquals(fields.part9_name, undefined);
});

Deno.test("Form 8582 PDF keeps other-passive Part V separate from rental Part IV", () => {
  const fields = form8582Pdf.projectFields!({
    activities: [{ ...rental, activity_type: "B", current_net: -4_000 }],
    current_loss: 4_000,
    has_other_passive: true,
  }, {
    schedule_e: {
      schedule_es: [{
        ...rentalPending.schedule_e.schedule_es[0],
        activity_type: "B",
        expense_utilities: 4_000,
      }],
    },
  });
  assertEquals(fields.line1b, undefined);
  assertEquals(fields.line2b, "4000");
  assertEquals(fields.part5_1_name, "Rental home");
  assertEquals(fields.part5_1_loss, "4000");
  assertEquals(fields.part5_total_loss, "4000");
  assertEquals(fields.part7_1_unallowed, "4000");
});

Deno.test("Form 8582 PDF keeps activity rows stable when Schedule E source order changes", () => {
  const lossB = {
    ...rental,
    activity_id: "loss-b",
    name: "Loss B",
    activity_type: "B" as const,
    current_net: -1_000,
  };
  const lossA = {
    ...rental,
    activity_id: "loss-a",
    name: "Loss A",
    activity_type: "B" as const,
    current_net: -2_000,
  };
  const source = (activity: typeof lossB) => ({
    ...rentalPending.schedule_e.schedule_es[0],
    activity_id: activity.activity_id,
    property_description: activity.name,
    activity_type: "B",
    expense_utilities: -activity.current_net,
  });
  const projected = form8582Pdf.projectFields!({
    activities: [lossB, lossA],
    current_loss: 3_000,
    has_other_passive: true,
  }, {
    schedule_e: { schedule_es: [source(lossA), source(lossB)] },
  });
  assertEquals(projected.part5_1_name, "Loss B");
  assertEquals(projected.part5_2_name, "Loss A");
  assertEquals(projected.part7_1_name, "Loss B");
  assertEquals(projected.part7_2_name, "Loss A");
});

Deno.test("Form 8582 PDF field map targets all three actual 2025 pages", () => {
  const entries = form8582Pdf.fields;
  assertEquals(
    entries.find((entry) => entry.domainKey === "line1b")?.pdfField,
    "topmostSubform[0].Page1[0].f1_04[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part4_1_name")?.pdfField,
    "topmostSubform[0].Page1[0].Table_Part4[0].Row1[0].f1_20[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part7_1_unallowed")?.pdfField,
    "topmostSubform[0].Page2[0].Table_Part7[0].Row1[0].f2_74[0]",
  );
  assertEquals(
    entries.find((entry) => entry.domainKey === "part9_1_allowed")?.pdfField,
    "topmostSubform[0].Page3[0].Form1_NotATable[0].f3_08[0]",
  );
});

Deno.test("Form 8582 PDF preserves the native source and MFS guards", () => {
  assertThrows(
    () => form8582Pdf.projectFields!({ current_loss: 8_000 }, {}),
    Error,
    "requires per-activity",
  );
  assertThrows(
    () =>
      form8582Pdf.projectFields!({
        ...rentalFields,
        mfs_lived_apart_all_year: false,
      }, rentalPending),
    Error,
    "requires per-activity",
  );
  assertThrows(
    () =>
      form8582Pdf.projectFields!(rentalFields, {
        ...rentalPending,
        schedule_e: { schedule_es: [] },
      }),
    Error,
    "activities do not match",
  );
});

Deno.test("Form 8582 PDF rejects activity rows beyond the printed table", () => {
  const activities = Array.from({ length: 6 }, (_, index) => ({
    ...rental,
    activity_id: `property-${index + 1}`,
    name: `Property ${index + 1}`,
    activity_type: "B" as const,
    current_net: -1_000,
  }));
  const schedule_es = activities.map((activity) => ({
    ...rentalPending.schedule_e.schedule_es[0],
    activity_id: activity.activity_id,
    property_description: activity.name,
    activity_type: "B",
    expense_utilities: 1_000,
  }));
  assertThrows(
    () =>
      form8582Pdf.projectFields!({
        activities,
        current_loss: 6_000,
        has_other_passive: true,
      }, { schedule_e: { schedule_es } }),
    Error,
    "Part 5 exceeds five printed rows",
  );
});

Deno.test("Form 8582 PDF does not print an empty form", () => {
  assertEquals(form8582Pdf.projectFields!({ modified_agi: 80_000 }, {}), {});
});
