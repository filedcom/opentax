import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { form4562 as form4562Node } from "../../../nodes/intermediate/forms/form4562/index.ts";
import { FilingStatus as SourceFilingStatus } from "../../../nodes/types.ts";
import { form4562Pdf } from "./f4562.ts";

const asset = {
  business_reference: "CONSULTING",
  activity_description: "Software consulting",
  asset_description: "Computer server",
  source_document_ref: "2025 equipment invoice 24",
  placed_in_service_date: "2025-03-01",
  cost: 100_000,
  elected_cost: 100_000,
  taxpayer_active_business_income: 100_000,
  taxpayer_active_business_income_source_ref:
    "2025 active-business income workpaper",
  prior_year_carryover: 0 as const,
  prior_year_carryover_source_ref: "2024 Form 4562 line 13 review",
  business_use_pct: 100 as const,
  is_listed_property: false as const,
  bonus_elected_out: true as const,
  no_other_depreciation_for_activity: true as const,
  no_other_depreciation_assets_on_return: true as const,
  return_asset_inventory_source_ref: "2025 fixed asset register",
  filing_status: SourceFilingStatus.Single,
};
const filedOutput = form4562Node.compute(
  { taxYear: 2025, formType: "f1040" },
  { asset },
).outputs[0];
if (!filedOutput) throw new Error("Expected Form 4562 node output");
const filed = filedOutput.fields;
const allPending = {
  form4562: { asset },
  general: { filing_status: SourceFilingStatus.Single },
  f1040: { filing_status: SourceFilingStatus.Single },
  schedule1: { line3_schedule_c: 0 },
  schedule_c: {
    schedule_cs: [{
      business_reference: "CONSULTING",
      line_a_principal_business: "Software consulting",
      line_b_business_code: "541511",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_32_at_risk: "a",
      line_1_gross_receipts: 100_000,
      line_13_depreciation: 100_000,
    }],
  },
};

Deno.test("Form 4562 PDF maps the bounded Section 179 lines to canonical 2025 fields", () => {
  const field = (key: string) =>
    form4562Pdf.fields.filter((entry) => entry.domainKey === key).map((entry) =>
      entry.pdfField
    );
  assertEquals(field("line1_maximum_dollar_limitation"), [
    "topmostSubform[0].Page1[0].f1_4[0]",
  ]);
  assertEquals(field("asset_description"), [
    "topmostSubform[0].Page1[0].Table_Ln6[0].BodyRow1[0].f1_9[0]",
  ]);
  assertEquals(field("line2_total_cost"), [
    "topmostSubform[0].Page1[0].f1_5[0]",
    "topmostSubform[0].Page1[0].Table_Ln6[0].BodyRow1[0].f1_10[0]",
  ]);
  assertEquals(field("line12_section179_expense_deduction"), [
    "topmostSubform[0].Page1[0].f1_20[0]",
  ]);
  assertEquals(field("line22_total_depreciation"), [
    "topmostSubform[0].Page2[0].f2_2[0]",
  ]);
  assertEquals(field("bonus_depreciation_basis"), []);
});

Deno.test("Form 4562 PDF uses the native single-asset and Schedule C reconciliation", () => {
  const projected = form4562Pdf.projectFields?.(filed, allPending) ?? {};
  assertEquals(projected.line12_section179_expense_deduction, 100_000);
  assertEquals(projected.line22_total_depreciation, 100_000);
  const copies = form4562Pdf.instances?.(projected, {
    primarySSN: "123-45-6789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    filingStatus: HeaderFilingStatus.Single,
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  }) ?? [];
  assertEquals(copies.length, 1);
  assertEquals(copies[0].filer_ssn, "123456789");
  assertThrows(
    () =>
      form4562Pdf.projectFields?.(filed, {
        ...allPending,
        schedule_c: {
          schedule_cs: [{
            ...allPending.schedule_c.schedule_cs[0],
            line_13_depreciation: 99_999,
          }],
        },
      }),
    Error,
    "does not reconcile to Schedule C line 13",
  );
  assertThrows(
    () =>
      form4562Pdf.projectFields?.({ section_179_cost: 100_000 }, allPending),
    Error,
  );
});
