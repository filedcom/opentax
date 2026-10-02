import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { FilingStatus as InputFilingStatus } from "../nodes/types.ts";
import { FilingStatus as MefFilingStatus } from "../mef/header.ts";
import { filedForm4562Schema } from "../nodes/intermediate/forms/form4562/index.ts";
import { form4562 } from "./mef/forms/f4562.ts";
import { form4562Pdf } from "./pdf/forms/f4562.ts";

const asset = {
  business_reference: "CONSULTING-2025",
  activity_description: "Software consulting",
  asset_description: "Computer server",
  source_document_ref: "2025 server invoice 17",
  placed_in_service_date: "2025-03-01",
  cost: 70_000,
  elected_cost: 70_000,
  taxpayer_active_business_income: 60_000,
  taxpayer_active_business_income_source_ref:
    "2025 Schedule C and two employer W-2 income workpaper",
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

const wages = [{
  employer_ein: "12-3456789",
  employer_name: "Acme Software",
  employee_ssn: "123-45-6789",
  box1_wages: 30_000,
  box2_fed_withheld: 3_000,
}, {
  employer_ein: "98-7654321",
  employer_name: "Beta Software",
  employee_ssn: "123-45-6789",
  box1_wages: 20_000,
  box2_fed_withheld: 2_000,
}];

const filer = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
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
    w2: wages,
    schedule_c: [{
      business_reference: "CONSULTING-2025",
      line_a_principal_business: "Software consulting",
      line_b_business_code: "541511",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_32_at_risk: "a",
      line_1_gross_receipts: 10_000,
      line_13_depreciation: 60_000,
    }],
    form4562: { asset },
  });
}

Deno.test("Form 4562 combines two employer W-2s with Schedule C to cap section 179 and carry over the remainder", () => {
  const result = filedReturn();
  assertEquals(
    result.diagnostics.map(({ nodeType, message }) => [nodeType, message]),
    [
      [
        "form461",
        'compute() threw for node "form461": Form 461 C/F-only calculation needs a sourced review of other Part I items and Part II adjustments',
      ],
      [
        "form8995",
        'compute() threw for node "form8995": Form 8995 net QBI loss needs a sourced carryforward filing route',
      ],
    ],
  );
  const pending = normalizeAllPending(result.pending);
  const filed = filedForm4562Schema.parse(pending.form4562);
  assertEquals(filed.taxpayer_active_business_income, 60_000);
  assertEquals(filed.line11_business_income_limitation, 60_000);
  assertEquals(filed.line12_section179_expense_deduction, 60_000);
  assertEquals(filed.line13_next_year_carryover, 10_000);
  assertEquals(pending.schedule1.line3_schedule_c, -50_000);
  assertEquals(pending.f1040.line1a_wages, 50_000);
  assertEquals(pending.f1040.line1z_total_wages, 50_000);
  assertEquals(pending.f1040.line11_agi, 0);

  const xml = form4562.build(filed, { pending });
  assertStringIncludes(
    xml,
    "<BusinessIncomeLimitationAmt>60000</BusinessIncomeLimitationAmt>",
  );
  assertStringIncludes(
    xml,
    "<Section179ExpenseDeductionAmt>60000</Section179ExpenseDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<NextYearCarryoverAmt>10000</NextYearCarryoverAmt>",
  );
  const projected = form4562Pdf.projectFields?.(pending.form4562, pending) ??
    {};
  assertEquals(projected.line11_business_income_limitation, 60_000);
  assertEquals(projected.line12_section179_expense_deduction, 60_000);
  assertEquals(projected.line13_next_year_carryover, 10_000);
  assertEquals(form4562Pdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Form 4562 two-W-2 limit rejects duplicate, missing, third, changed-owner, and return tampering", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const filed = filedForm4562Schema.parse(pending.form4562);
  const badW2s = [
    [{ ...wages[0], box1_wages: 29_999 }, wages[1]],
    [wages[0], { ...wages[1], employer_ein: "123456789" }],
    [wages[0]],
    [wages[0], wages[1], { ...wages[1], employer_ein: "11-1111111" }],
    [wages[0], { ...wages[1], employee_ssn: "999-99-9999" }],
  ];
  for (const w2s of badW2s) {
    const changed = { ...pending, w2: { w2s } };
    assertThrows(
      () => form4562.build(filed, { pending: changed }),
      Error,
      "one or two distinct taxpayer-owned ordinary W-2",
    );
    assertThrows(
      () => form4562Pdf.projectFields?.(pending.form4562, changed),
      Error,
      "one or two distinct taxpayer-owned ordinary W-2",
    );
  }
  assertThrows(
    () =>
      form4562.build(filed, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line1a_wages: 49_999 },
        },
      }),
    Error,
    "matching final Form 1040 wages",
  );
  assertThrows(
    () =>
      form4562Pdf.projectFields?.(pending.form4562, {
        ...pending,
        schedule_c: {
          schedule_cs: [{
            ...(pending.schedule_c.schedule_cs as Record<string, unknown>[])[0],
            line_1_gross_receipts: 9_999,
          }],
        },
      }),
    Error,
    "active-business income",
  );
});
