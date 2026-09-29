import { assertEquals, assertThrows } from "@std/assert";
import { scheduleEPdf } from "./schedule_e.ts";
import { scheduleE } from "../../mef/forms/schedule_e.ts";
import { inputSchema as scheduleEInputSchema } from "../../../nodes/inputs/schedule_e/index.ts";

Deno.test("partnership K-1 royalty and code I reconcile Schedule E MeF and PDF", () => {
  const k1 = {
    partnership_name: "Mineral Partnership",
    partnership_ein: "123456789",
    source_document_reference: "2025 partnership K-1 A",
    box7_royalties: 700,
    box7_royalty_reporting: {
      tsj: "T",
      property_description: "Mineral royalty A",
      portfolio_nonpassive: true,
      form_1099_payments_made: false,
    },
    box13_code_i_royalty_deduction: {
      reported_amount: 100,
      allowed_amount: 100,
      statement_reference: "2025 code I statement A",
      expense_kind: "depletion",
      basis_workpaper_reference: "2025 basis worksheet A",
      at_risk_workpaper_reference: "2025 at-risk worksheet A",
    },
  };
  const row = {
    tsj: "T",
    property_description: "Mineral royalty A",
    property_type: 6,
    activity_type: "D",
    fair_rental_days: 0,
    personal_use_days: 0,
    rent_income: 0,
    royalties_income: 700,
    form_1099_payments_made: false,
    expense_other_lines: [{
      description: "From Schedule K-1 (Form 1065)",
      amount: 100,
    }],
    k1_royalty_source: {
      partnership_ein: "123456789",
      source_document_reference: "2025 partnership K-1 A",
      box7_gross_royalties: 700,
      box13_code_i_allowed_deduction: 100,
      box13_code_i_statement_reference: "2025 code I statement A",
    },
  };
  const raw = scheduleEInputSchema.parse({ schedule_es: [row] });
  const pending = {
    k1_partnership: { k1_partnerships: [k1] },
    schedule_e: raw,
    schedule1: { line5_schedule_e: 600 },
  };
  const xml = scheduleE.build(raw, { pending });
  assertEquals(
    xml.includes("<TotalRoyaltiesReceivedAmt>700</TotalRoyaltiesReceivedAmt>"),
    true,
  );
  assertEquals(
    xml.includes("<TotalIncomeOrLossAmt>600</TotalIncomeOrLossAmt>"),
    true,
  );
  const projected = scheduleEPdf.projectFields?.(raw, pending);
  assertEquals(projected?.property_address, undefined);
  assertEquals(projected?.fair_rental_days, undefined);
  assertEquals(projected?.personal_use_days, undefined);
  assertEquals(projected?.line4, 700);
  assertEquals(projected?.line19, 100);
  assertEquals(projected?.line26, 600);
  assertThrows(
    () =>
      scheduleE.build(raw, {
        pending: {
          ...pending,
          k1_partnership: { k1_partnerships: [{ ...k1, box7_royalties: 701 }] },
        },
      }),
    Error,
    "matching partnership K-1",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(raw, {
        ...pending,
        schedule1: { line5_schedule_e: 700 },
      }),
    Error,
    "Schedule 1 line 5",
  );
});

const rental = {
  tsj: "T",
  activity_id: "rental-house",
  property_description: "Rental house",
  property_type: 1,
  activity_type: "A",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 12_000,
  form_1099_payments_made: false,
  street_address: "12 Main Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
  expense_advertising: 100,
  expense_mortgage_interest: 2_000,
  expense_depreciation: 1_500,
  expense_other_lines: [{ description: "Bank fees", amount: 50 }],
};

Deno.test("Schedule E PDF prints a Form 8582 suspended rental loss without a current deduction", () => {
  const item = {
    ...rental,
    activity_type: "B" as const,
    rent_income: 5_000,
    expense_advertising: undefined,
    expense_mortgage_interest: undefined,
    expense_depreciation: undefined,
    expense_other_lines: undefined,
    expense_repairs: 10_000,
  };
  const raw = { schedule_es: [item] };
  const linked = {
    schedule_e: raw,
    schedule1: { line5_schedule_e: 0 },
    form8582: {
      filing_status: "single",
      activities: [{
        activity_id: item.activity_id,
        name: item.property_description,
        activity_type: "B",
        property_type: item.property_type,
        reporting_form: "schedule_e",
        current_net: -5_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      }],
      current_loss: 5_000,
      has_other_passive: true,
      modified_agi: 90_000,
    },
  };
  const projected = scheduleEPdf.projectFields?.(raw, linked);
  assertEquals(projected?.line21, -5_000);
  assertEquals(projected?.line22, undefined);
  assertEquals(projected?.line25, undefined);
  assertEquals(projected?.line26, 0);
  assertThrows(() => scheduleEPdf.projectFields?.(raw, {
    ...linked,
    form8582: { ...linked.form8582, activities: [{
      ...linked.form8582.activities[0], current_net: -4_999,
    }] },
  }), Error, "does not match Form 8582 activity");
});

Deno.test("Schedule E PDF maps one rental to the official 2025 Part I property A widgets", () => {
  const raw = { schedule_es: [rental] };
  const projected = scheduleEPdf.projectFields?.(raw, {
    schedule_e: raw,
    schedule1: { line5_schedule_e: 8_350 },
  });
  assertEquals(projected?.property_address, "12 Main Street, Austin, TX 78701");
  assertEquals(projected?.property_type, 1);
  assertEquals(projected?.payments_made, false);
  assertEquals(projected?.personal_use_days, 0);
  assertEquals(projected?.line3, 12_000);
  assertEquals(projected?.line18, 1_500);
  assertEquals(projected?.line19_description, "Bank fees");
  assertEquals(projected?.line19, 50);
  assertEquals(projected?.line20, 3_650);
  assertEquals(projected?.line21, 8_350);
  assertEquals(projected?.line22, undefined);
  assertEquals(projected?.line23c, 2_000);
  assertEquals(projected?.line23e, 3_650);
  assertEquals(projected?.line24, 8_350);
  assertEquals(projected?.line26, 8_350);
  assertEquals(scheduleEPdf.pageIndices?.(projected ?? {}), [0]);
  assertEquals(
    scheduleEPdf.fields.find((field) => field.domainKey === "line22")?.pdfField,
    "topmostSubform[0].Page1[0].Table_Expenses[0].Line22[0].f1_74[0]",
  );
  assertEquals(
    scheduleEPdf.fields.find((field) => field.domainKey === "line26")?.pdfField,
    "topmostSubform[0].Page1[0].f1_84[0]",
  );
});

Deno.test("Schedule E PDF prints a sourced full-disposition operating loss and no Form 8582", () => {
  const sale = {
    activity_id: "rental-house",
    activity_name: "Rental house",
    part: "II",
    property_description: "Short-held parcel",
    acquired_on: "2025-01-01",
    sold_on: "2025-06-01",
    gross_sales_price: 6_000,
    cost_or_other_basis: 5_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: true,
    buyer_unrelated: true,
    fully_taxable: true,
    installment_method: false,
    disposition_document_reference: "2025 settlement statement",
  };
  const item = {
    ...rental,
    activity_type: "B",
    rent_income: 1_000,
    expense_advertising: undefined,
    expense_mortgage_interest: undefined,
    expense_depreciation: undefined,
    expense_other_lines: undefined,
    expense_taxes: 7_000,
    disposed_of: true,
    prior_unallowed_passive_operating: 3_000,
    prior_year_8582_source: {
      tax_year: 2024,
      activity_id: "rental-house",
      filed_part_vii_column_c: 3_000,
      source_document_reference: "2024 filed Form 8582 Part VII",
    },
    passive_property_sales: [sale],
  };
  const raw = { schedule_es: [item] };
  const allPending = {
    schedule_e: raw,
    form4797: { passive_property_sales: [sale] },
    schedule1: { line5_schedule_e: -9_000 },
  };
  const projected = scheduleEPdf.projectFields?.(raw, allPending);
  assertEquals(projected?.line3, 1_000);
  assertEquals(projected?.expense_taxes, 7_000);
  assertEquals(projected?.line20, 7_000);
  assertEquals(projected?.line21, -6_000);
  assertEquals(projected?.line22, 9_000);
  assertEquals(projected?.line24, 0);
  assertEquals(projected?.line25, 9_000);
  assertEquals(projected?.line26, -9_000);
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(raw, {
        ...allPending,
        form4797: {
          passive_property_sales: [{ ...sale, gross_sales_price: 6_001 }],
        },
      }),
    Error,
    "matching Form 4797",
  );
});

Deno.test("Schedule E PDF fails closed on unprojected paths and Schedule 1 mismatch", () => {
  const raw = { schedule_es: [rental] };
  const linked = {
    schedule_e: raw,
    schedule1: { line5_schedule_e: 8_350 },
  };
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.(raw, {
        ...linked,
        schedule1: { line5_schedule_e: 8_351 },
      }),
    Error,
    "Schedule 1 line 5",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.({ schedule_es: [rental, rental] }, linked),
    Error,
    "one supported Part I rental",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.({
        schedule_es: [rental],
        farm_rental_net: 100,
        farm_rental_gross: 100,
      }, linked),
    Error,
    "one supported Part I rental",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.({
        schedule_es: [{ ...rental, rent_income: 1_000, expense_taxes: 2_000 }],
      }, linked),
    Error,
    "matching Form 8582",
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields?.({
        schedule_es: [{ ...rental, disposed_of: true }],
      }, linked),
    Error,
    "entire-interest overall-loss",
  );
});
