import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form4562 } from "./f4562.ts";
import { filedForm4562Schema } from "../../../nodes/intermediate/forms/form4562/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";

const filed = {
  filing_status: FilingStatus.Single,
  business_reference: "CONSULTING",
  activity_description: "Software consulting",
  asset_description: "Computer server",
  source_document_ref: "2025 equipment invoice 24",
  taxpayer_active_business_income_source_ref:
    "2025 active-business income workpaper",
  taxpayer_active_business_income: 100_000,
  line1_maximum_dollar_limitation: 100_000,
  line2_total_cost: 100_000,
  line3_threshold_cost: 4_000_000,
  line4_reduction: 0,
  line5_dollar_limitation: 100_000,
  line6_elected_cost: 100_000,
  line8_total_elected_cost: 100_000,
  line9_tentative_deduction: 100_000,
  line10_prior_carryover: 0 as const,
  line11_business_income_limitation: 100_000,
  line12_section179_expense_deduction: 100_000,
  line13_next_year_carryover: 0,
  line22_total_depreciation: 100_000,
};

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
  prior_year_carryover: 0,
  prior_year_carryover_source_ref: "2024 Form 4562 line 13 review",
  business_use_pct: 100,
  is_listed_property: false,
  bonus_elected_out: true,
  no_other_depreciation_for_activity: true,
  no_other_depreciation_assets_on_return: true,
  return_asset_inventory_source_ref: "2025 fixed asset register",
  filing_status: "single",
};

const context = {
  pending: {
    form4562: { asset },
    general: { filing_status: "single" },
    f1040: { filing_status: "single" },
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
  },
};

Deno.test("Form 4562 is absent when no source was filed", () => {
  assertEquals(form4562.build([]), "");
});

Deno.test("Form 4562 emits native TY2025 section 179 tags and one asset row", () => {
  const xml = form4562.build(filed, context);
  assertStringIncludes(
    xml,
    "<BusinessOrActivityTxt>Software consulting</BusinessOrActivityTxt>",
  );
  assertStringIncludes(
    xml,
    "<MaximumDollarLimitationAmt>100000</MaximumDollarLimitationAmt>",
  );
  assertStringIncludes(xml, "<PropertyDesc>Computer server</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<CostForBusinessUseOnlyAmt>100000</CostForBusinessUseOnlyAmt>",
  );
  assertStringIncludes(
    xml,
    "<Section179ExpenseDeductionAmt>100000</Section179ExpenseDeductionAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalDepreciationAmt>100000</TotalDepreciationAmt>",
  );
  assertEquals(
    xml.indexOf("<DollarLimitationForTaxYearAmt>") <
      xml.indexOf("<ElectedProperty>"),
    true,
  );
  assertEquals(
    xml.indexOf("</ElectedProperty>") <
      xml.indexOf("<TotalElectedCostSect179PropAmt>"),
    true,
  );
  assertEquals(xml.includes("<Section179DeductionAmt>"), false);
});

Deno.test("Form 4562 rejects Schedule C line 13 mismatch or missing activity", () => {
  assertThrows(() =>
    form4562.build(filed, {
      pending: {
        ...context.pending,
        schedule_c: {
          schedule_cs: [{
            business_reference: "CONSULTING",
            line_13_depreciation: 90_000,
          }],
        },
      },
    })
  );
  assertThrows(() =>
    form4562.build(filed, {
      pending: { ...context.pending, schedule_c: { schedule_cs: [] } },
    })
  );
});

Deno.test("Form 4562 line 11 rejects asserted income above the filed pre-section-179 Schedule C profit", () => {
  assertThrows(
    () =>
      form4562.build(filed, {
        pending: {
          ...context.pending,
          schedule_c: {
            schedule_cs: [{
              ...context.pending.schedule_c.schedule_cs[0],
              line_1_gross_receipts: 90_000,
            }],
          },
          schedule1: { line3_schedule_c: -10_000 },
        },
      }),
    Error,
    "active-business income does not reconcile",
  );
});

Deno.test("Form 4562 bounded income route rejects wages and another business source", () => {
  assertThrows(
    () =>
      form4562.build(filed, {
        pending: {
          ...context.pending,
          f1040: { filing_status: "single", line1a_wages: 10_000 },
        },
      }),
    Error,
    "needs employee compensation included",
  );
  assertThrows(
    () =>
      form4562.build(filed, {
        pending: { ...context.pending, schedule_f: {} },
      }),
    Error,
    "cannot include another business-income",
  );
});

Deno.test("Form 4562 rejects inconsistent lines and MFS allocation", () => {
  assertThrows(() =>
    form4562.build({ ...filed, line22_total_depreciation: 99_999 }, context)
  );
  assertThrows(() =>
    form4562.build(filed, {
      pending: { ...context.pending, general: { filing_status: "mfs" } },
    })
  );
  assertThrows(() =>
    form4562.build(filed, {
      pending: {
        ...context.pending,
        form4562: { asset: { ...asset, cost: 99_000 } },
      },
    })
  );
});

Deno.test("Form 4562 no longer accepts aggregate-only XML fields", () => {
  assertThrows(() =>
    filedForm4562Schema.parse({ section_179_deduction: 100_000 })
  );
});
