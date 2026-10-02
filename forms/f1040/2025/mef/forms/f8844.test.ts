import { assertStringIncludes, assertThrows } from "@std/assert";
import { form8844 } from "./f8844.ts";

const source = {
  schedule_c_business_reference: "SHOP-1",
  payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
  f8844s: [{
    employee_reference: "EMP-1",
    payroll_record_reference: "PAY-2025-1",
    zone_designation_reference: "EZ-LOS-ANGELES-2025",
    residence_zone_reference: "EZ-LOS-ANGELES-2025",
    work_zone_reference: "EZ-LOS-ANGELES-2025",
    qualified_zone_wages: 10_000,
    wages_used_for_work_opportunity_credit: 0,
    zone_designation_active_in_2025_confirmed: true,
    substantially_all_services_in_zone_confirmed: true,
    principal_residence_in_zone_confirmed: true,
    ninety_day_employment_or_exception_confirmed: true,
    no_excluded_employee_or_business_confirmed: true,
    futa_wage_and_other_credit_exclusions_reviewed_confirmed: true,
  }],
};
const pending = {
  f8844: source,
  f3800: {
    f8844_direct_employer_credit: {
      credit_amount: 2_000,
      schedule_c_business_reference: "SHOP-1",
      payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
      subject_to_passive_activity_limit: false,
    },
  },
  schedule_c: {
    schedule_cs: [{
      business_reference: "SHOP-1",
      line_a_principal_business: "Retail shop",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 30_000,
      line_26_wages: 10_000,
      line_26_other_employment_credits: 2_000,
    }],
  },
};
const context = {
  pending,
  documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
};

Deno.test("Form 8844 native XML carries sourced line 1, line 2 and line 4", () => {
  const xml = form8844.build(source, context);
  assertStringIncludes(
    xml,
    "<TotalQualifiedEmpwrZoneWgsAmt>10000</TotalQualifiedEmpwrZoneWgsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CurrentYearCreditAmt>2000</CurrentYearCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalCurrentYearEZRCECreditAmt>2000</TotalCurrentYearEZRCECreditAmt>",
  );
});

Deno.test("Form 8844 refuses Form 3800 or Schedule C tampering", () => {
  assertThrows(
    () =>
      form8844.build(source, {
        ...context,
        pending: {
          ...pending,
          f3800: {
            f8844_direct_employer_credit: {
              ...pending.f3800.f8844_direct_employer_credit,
              credit_amount: 1_999,
            },
          },
        },
      }),
    Error,
    "differs from Form 3800",
  );
  assertThrows(
    () =>
      form8844.build(source, {
        ...context,
        pending: {
          ...pending,
          schedule_c: {
            schedule_cs: [{
              ...pending.schedule_c.schedule_cs[0],
              line_26_other_employment_credits: 1_999,
            }],
          },
        },
      }),
    Error,
    "differs from linked Schedule C",
  );
});
