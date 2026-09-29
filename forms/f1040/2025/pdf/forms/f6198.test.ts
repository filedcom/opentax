import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form6198 as form6198Mef } from "../../mef/forms/f6198.ts";
import { form4835AtRisk } from "../../mef/forms/f4835_at_risk.ts";
import { TS } from "../../../nodes/types.ts";
import { form6198Pdf } from "./f6198.ts";

const risk = (opening: number) => ({
  opening_adjusted_basis: opening,
  current_year_increases: 0,
  line9_decreases_and_exclusions: 0,
});

function instances(pending: Record<string, Record<string, unknown>>) {
  const projected = form6198Pdf.projectFields?.(
    pending.form6198 ?? {},
    pending,
  );
  return form6198Pdf.instances?.(projected ?? {}) ?? [];
}

Deno.test("Form 6198 PDF creates separate source-backed Schedule C and F copies", () => {
  const pending = {
    schedule_c: {
      schedule_cs: [{
        line_a_principal_business: "Design",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 1_000,
        line_8_advertising: 3_000,
        line_32_at_risk: "b",
        at_risk_simplified: risk(500),
      }],
    },
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "South farm",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 1_000,
        line16_feed: 4_000,
        line36_at_risk: "b",
        at_risk_simplified: risk(900),
      }],
    },
  };
  const copies = instances(pending);
  const xml = form6198Mef.build({}, { pending });
  assertEquals(copies.length, 2);
  assertEquals(xml.length, copies.length);
  assertEquals(copies[0].activity_description, "Design");
  assertEquals(copies[0].line1_ordinary_loss, -2_000);
  assertEquals(copies[0].line10b_amount_at_risk, 500);
  assertEquals(copies[0].line21_deductible_loss_display, 500);
  assertStringIncludes(xml[0], "<DeductibleLossAmt>-500</DeductibleLossAmt>");
  assertEquals(copies[1].activity_description, "South farm");
  assertEquals(copies[1].line5_current_year_loss, -3_000);
  assertEquals(copies[1].line21_deductible_loss_display, 900);
  assertStringIncludes(xml[1], "<DeductibleLossAmt>-900</DeductibleLossAmt>");
});

Deno.test("Form 6198 PDF includes the same source-backed Form 4835 activity as MeF", () => {
  const pending = {
    f4835: {
      f4835s: [{
        activity_name: "Risk-limited rental farm",
        livestock_crop_income: 1_000,
        expense_feed: 3_000,
        some_investment_not_at_risk: true,
        at_risk_simplified: {
          opening_adjusted_basis: 1_000,
          current_year_increases: 200,
          line9_decreases_and_exclusions: 600,
        },
      }],
    },
  };
  const [pdf] = instances(pending);
  const [xml] = form4835AtRisk.build({}, { pending });
  assertEquals(instances(pending).length, 1);
  assertEquals(pdf.activity_description, "Risk-limited rental farm");
  assertEquals(pdf.line1_ordinary_loss, -2_000);
  assertEquals(pdf.line10b_amount_at_risk, 600);
  assertEquals(pdf.line21_deductible_loss_display, 600);
  assertStringIncludes(xml, "<ActivityDescriptionTxt>Risk-limited rental farm</ActivityDescriptionTxt>");
  assertStringIncludes(xml, "<DeductibleLossAmt>-600</DeductibleLossAmt>");
});

Deno.test("Form 6198 PDF rejects an incomplete Form 4835 at-risk loss", () => {
  assertThrows(
    () => instances({
      f4835: {
        f4835s: [{
          activity_name: "Farm without risk facts",
          livestock_crop_income: 0,
          expense_feed: 2_000,
          some_investment_not_at_risk: true,
        }],
      },
    }),
    Error,
    "requires Form 6198 simplified-computation facts",
  );
});

Deno.test("Form 6198 PDF uses the printed line 1, 10b, 20, and 21 widgets", () => {
  const byKey = Object.fromEntries(
    form6198Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(
    byKey.activity_description,
    "topmostSubform[0].Page1[0].f1_3[0]",
  );
  assertEquals(byKey.line1_ordinary_loss, "topmostSubform[0].Page1[0].f1_4[0]");
  assertEquals(
    byKey.line10b_amount_at_risk,
    "topmostSubform[0].Page1[0].f1_16[0]",
  );
  assertEquals(
    byKey.line20_amount_at_risk,
    "topmostSubform[0].Page1[0].f1_27[0]",
  );
  assertEquals(
    byKey.line21_deductible_loss_display,
    "topmostSubform[0].Page1[0].f1_28[0]",
  );
});

Deno.test("Form 6198 PDF refuses aggregate loss fields and incomplete source facts", () => {
  assertThrows(
    () => instances({ form6198: { schedule_c_loss: -100 } }),
    Error,
    "aggregate loss fields",
  );
  assertThrows(
    () =>
      instances({
        schedule_c: {
          schedule_cs: [{
            line_a_principal_business: "Design",
            line_b_business_code: "541310",
            line_f_accounting_method: "cash",
            line_g_material_participation: true,
            line_1_gross_receipts: 1_000,
            line_8_advertising: 3_000,
            line_32_at_risk: "b",
          }],
        },
      }),
    Error,
    "requires Form 6198 simplified-computation facts",
  );
});

Deno.test("Form 6198 MeF and PDF use linked Form 5884 wage reductions", () => {
  const pending = {
    schedule_c: {
      schedule_cs: [{
        line_a_principal_business: "Design",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        business_reference: "design-1",
        line_1_gross_receipts: 1_000,
        line_26_wages: 3_000,
        line_32_at_risk: "b",
        at_risk_simplified: risk(1_600),
      }],
      wotc_wage_reductions: [{
        business_reference: "design-1",
        credit_amount: 500,
      }],
    },
  };
  const [pdf] = instances(pending);
  const [xml] = form6198Mef.build({}, { pending });
  assertEquals(pdf.line1_ordinary_loss, -1_500);
  assertEquals(pdf.line21_deductible_loss_display, 1_500);
  assertStringIncludes(
    xml,
    "<OrdinaryIncomeLossAmt>-1500</OrdinaryIncomeLossAmt>",
  );
  assertStringIncludes(xml, "<DeductibleLossAmt>-1500</DeductibleLossAmt>");
});

Deno.test("Form 6198 MeF and PDF use linked Form 5884 farm labor reduction", () => {
  const pending = {
    schedule_f: {
      schedule_fs: [{
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "South farm",
        line_e_material_participation: true,
        accounting_method: "cash",
        farm_id: "farm-1",
        line1_sales_livestock_resale: 1_000,
        line22_labor_hired: 3_000,
        line36_at_risk: "b",
        at_risk_simplified: risk(1_600),
      }],
      wotc_wage_reductions: [{ farm_id: "farm-1", credit_amount: 500 }],
    },
  };
  const [pdf] = instances(pending);
  const [xml] = form6198Mef.build({}, { pending });
  assertEquals(pdf.line1_ordinary_loss, -1_500);
  assertStringIncludes(
    xml,
    "<OrdinaryIncomeLossAmt>-1500</OrdinaryIncomeLossAmt>",
  );
});

Deno.test("Form 6198 MeF and PDF reject home-office-only at-risk loss", () => {
  const pending = {
    schedule_c: {
      schedule_cs: [{
        line_a_principal_business: "Design",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        business_reference: "design-1",
        proprietor_recipient: TS.T,
        line_1_gross_receipts: 1_000,
        line_8_advertising: 500,
        line_32_at_risk: "b",
        at_risk_simplified: risk(100),
      }],
      form8829_line30: {
        business_reference: "design-1",
        home_identifier: "home-1",
        recipient: TS.T,
        schedule_c_line29_tentative_profit: 500,
        line36: 700,
      },
    },
  };
  assertThrows(
    () => instances(pending),
    Error,
    "Form 6198 facts require a current-year loss",
  );
  assertThrows(
    () => form6198Mef.build({}, { pending }),
    Error,
    "Form 6198 facts require a current-year loss",
  );
});

Deno.test("Form 6198 rejects an unreconciled Form 5884 reduction in both serializers", () => {
  const pending = {
    schedule_c: {
      schedule_cs: [{
        line_a_principal_business: "Design",
        line_b_business_code: "541310",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        business_reference: "design-1",
        line_1_gross_receipts: 1_000,
        line_26_wages: 3_000,
        line_32_at_risk: "b",
        at_risk_simplified: risk(500),
      }],
      wotc_wage_reductions: [{
        business_reference: "design-1",
        credit_amount: 3_500,
      }],
    },
  };
  assertThrows(
    () => instances(pending),
    Error,
    "employment credits exceed gross wages",
  );
  assertThrows(
    () => form6198Mef.build({}, { pending }),
    Error,
    "employment credits exceed gross wages",
  );
});
