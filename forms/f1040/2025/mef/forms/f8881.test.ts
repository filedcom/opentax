import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8881 } from "./f8881.ts";
import { form8881Pdf } from "../../pdf/forms/f8881.ts";

const source = {
  schedule_c_business_reference: "PLAN-BUSINESS-1",
  plan_type: "401k",
  startup: {
    plan_effective_on: "2025-01-01",
    first_credit_year: 2025,
    preceding_first_credit_year_qualified_employee_count: 20,
    eligible_non_hce_count: 3,
    startup_costs: 4_000,
    cost_record_reference: "plan-invoice-1",
    costs_paid_or_incurred_on: "2025-02-15",
    eligible_plan_confirmed: true,
    no_substantially_same_employee_plan_in_prior_three_years_confirmed: true,
    startup_cost_deduction_reduced_by_credit_confirmed: true,
  },
  auto_enrollment: {
    first_credit_year: 2025,
    preceding_first_credit_year_qualified_employee_count: 20,
    arrangement_record_reference: "plan-amendment-1",
    arrangement_first_included_on: "2025-01-01",
    eligible_automatic_contribution_arrangement_confirmed: true,
    qualified_employer_plan_confirmed: true,
    maintained_in_2025_confirmed: true,
  },
};

const form3800 = {
  f8881_credit: {
    schedule_c_business_reference: "PLAN-BUSINESS-1",
    part_i_credit: 750,
    part_ii_credit: 500,
    part_iii_credit: 0,
    subject_to_passive_activity_limit: false,
  },
};

Deno.test("staged IRS8881 XML and paper fields agree with source Form 3800 parts", () => {
  const xml = form8881.build(source, {
    pending: {
      f8881: source,
      f3800: form3800,
      schedule_c: {
        schedule_cs: [{
          business_reference: "PLAN-BUSINESS-1",
          line_a_principal_business: "Consulting",
          line_b_business_code: "541611",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 10_000,
        }],
      },
    },
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<QualifiedEmployeeCnt>20</QualifiedEmployeeCnt>");
  assertStringIncludes(
    xml,
    "<PensionPlanEmplLimitedCalcAmt>750</PensionPlanEmplLimitedCalcAmt>",
  );
  assertStringIncludes(
    xml,
    "<SmllrStartupCostEmplLtdCalcAmt>750</SmllrStartupCostEmplLtdCalcAmt>",
  );
  assertStringIncludes(
    xml,
    "<PensionPlanStartupCostsCrAmt>750</PensionPlanStartupCostsCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<SmllEmplrAutoEnrlmtCrAmt>500</SmllEmplrAutoEnrlmtCrAmt>",
  );
  assertEquals(xml.includes("<MilSpsParticipationCrAmt>"), false);

  const printed = form8881Pdf.projectFields!(source, {
    f8881: source,
    f3800: form3800,
    schedule_c: {
      schedule_cs: [{
        business_reference: "PLAN-BUSINESS-1",
        line_a_principal_business: "Consulting",
        line_b_business_code: "541611",
        line_f_accounting_method: "cash",
        line_g_material_participation: true,
        line_1_gross_receipts: 10_000,
      }],
    },
  });
  assertEquals(printed.lineA, 20);
  assertEquals(printed.line3Count, 3);
  assertEquals(printed.line5, 750);
  assertEquals(printed.line11, 500);
  assertEquals(
    form8881Pdf.fields.find((field) => field.domainKey === "line5")?.pdfField,
    "topmostSubform[0].Page1[0].f1_9[0]",
  );
});

Deno.test("staged IRS8881 XML and paper reject a missing or altered Form 3800 claim", () => {
  assertThrows(
    () =>
      form8881.build(source, {
        pending: { f8881: source },
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "needs its Form 3800 source credit",
  );
  const tampered = {
    f8881_credit: { ...form3800.f8881_credit, part_i_credit: 751 },
  };
  assertThrows(
    () =>
      form8881.build(source, {
        pending: {
          f8881: source,
          f3800: tampered,
          schedule_c: {
            schedule_cs: [{
              business_reference: "PLAN-BUSINESS-1",
              line_a_principal_business: "Consulting",
              line_b_business_code: "541611",
              line_f_accounting_method: "cash",
              line_g_material_participation: true,
              line_1_gross_receipts: 10_000,
            }],
          },
        },
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      form8881Pdf.projectFields!(source, {
        f8881: source,
        f3800: tampered,
        schedule_c: {
          schedule_cs: [{
            business_reference: "PLAN-BUSINESS-1",
            line_a_principal_business: "Consulting",
            line_b_business_code: "541611",
            line_f_accounting_method: "cash",
            line_g_material_participation: true,
            line_1_gross_receipts: 10_000,
          }],
        },
      }),
    Error,
    "do not reconcile",
  );
});
