import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as InputFilingStatus } from "../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
import { normalizeAllPending } from "./pending.ts";
import { form4562 } from "./mef/forms/f4562.ts";
import { form4562Pdf } from "./pdf/forms/f4562.ts";
import { filedForm4562Schema } from "../nodes/intermediate/forms/form4562/index.ts";

const asset = {
  business_reference: "CONSULTING-2025",
  activity_description: "Software consulting",
  asset_description: "Computer server",
  source_document_ref: "2025 server invoice 17",
  placed_in_service_date: "2025-03-01",
  cost: 30_000,
  elected_cost: 30_000,
  taxpayer_active_business_income: 60_000,
  taxpayer_active_business_income_source_ref:
    "2025 Schedule C and employee W-2 income workpaper",
  prior_year_carryover: 0,
  prior_year_carryover_source_ref: "2024 Form 4562 line 13 review",
  business_use_pct: 100,
  is_listed_property: false,
  bonus_elected_out: true,
  no_other_depreciation_for_activity: true,
  no_other_depreciation_assets_on_return: true,
  return_asset_inventory_source_ref: "2025 fixed asset register",
  filing_status: InputFilingStatus.Single,
};

const w2 = {
  employer_ein: "12-3456789",
  employer_name: "Acme Software",
  employer_address_line1: "10 Work St",
  employer_address_city: "Wilmington",
  employer_address_state: "DE",
  employer_address_zip: "19801",
  employee_ssn: "123-45-6789",
  box1_wages: 30_000,
  box2_fed_withheld: 3_000,
};

const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  nameLine1: "Alex Taxpayer",
  nameControl: "TAXP",
  filingStatus: MefFilingStatus.Single,
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
};

function filedReturn() {
  return f1040_2025.executeReturn({
    general: {
      filing_status: InputFilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Wilmington",
      address_state: "DE",
      address_zip: "19801",
    },
    w2: [w2],
    schedule_c: [{
      business_reference: "CONSULTING-2025",
      line_a_principal_business: "Software consulting",
      line_b_business_code: "541511",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_32_at_risk: "a",
      line_1_gross_receipts: 30_000,
      line_13_depreciation: 30_000,
    }],
    form4562: { asset },
  });
}

Deno.test("Form 4562 includes one sourced employee W-2 in line 11 and joins Schedule C, Form 1040, native and PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const filed = filedForm4562Schema.parse(pending.form4562);
  assertEquals(pending.form4562.line11_business_income_limitation, 30_000);
  assertEquals(pending.form4562.taxpayer_active_business_income, 60_000);
  assertEquals(pending.form4562.line12_section179_expense_deduction, 30_000);
  assertEquals(pending.schedule1.line3_schedule_c, 0);
  assertEquals(pending.f1040.line1a_wages, 30_000);
  assertEquals(pending.f1040.line1z_total_wages, 30_000);
  assertEquals(pending.f1040.line11_agi, 30_000);
  const xml = form4562.build(filed, { pending });
  assertStringIncludes(
    xml,
    "<BusinessIncomeLimitationAmt>30000</BusinessIncomeLimitationAmt>",
  );
  assertStringIncludes(
    xml,
    "<Section179ExpenseDeductionAmt>30000</Section179ExpenseDeductionAmt>",
  );
  const projected = form4562Pdf.projectFields?.(pending.form4562, pending) ??
    {};
  assertEquals(projected.line11_business_income_limitation, 30_000);
  assertEquals(projected.line22_total_depreciation, 30_000);
  assertEquals(form4562Pdf.instances?.(projected, filer, pending)?.length, 1);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS4562 ");
  await prepared.renderPdf();
});

Deno.test("Form 4562 W-2 income limit rejects wage, taxpayer, and Schedule C tampering", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const filed = filedForm4562Schema.parse(pending.form4562);
  assertThrows(() =>
    form4562.build(filed, {
      pending: {
        ...pending,
        w2: { w2s: [{ ...w2, box1_wages: 29_000 }] },
      },
    })
  );
  assertThrows(() =>
    form4562Pdf.projectFields?.(pending.form4562, {
      ...pending,
      w2: { w2s: [{ ...w2, employee_ssn: "999-99-9999" }] },
    })
  );
  assertThrows(() =>
    form4562Pdf.instances?.(
      filed,
      { ...filer, primarySSN: "999999999" },
      pending,
    )
  );
  assertThrows(() =>
    form4562.build(filed, {
      pending: {
        ...pending,
        schedule_c: {
          schedule_cs: [{
            ...(pending.schedule_c.schedule_cs as Record<string, unknown>[])[0],
            line_1_gross_receipts: 1_999,
          }],
        },
      },
    })
  );
});
