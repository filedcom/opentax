import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8844, f8844, inputSchema } from "./index.ts";

const employee = {
  employee_reference: "EMP-1",
  payroll_record_reference: "PAY-2025-1",
  zone_designation_reference: "EZ-LOS-ANGELES-2025",
  residence_zone_reference: "EZ-LOS-ANGELES-2025",
  work_zone_reference: "EZ-LOS-ANGELES-2025",
  qualified_zone_wages: 12_000,
  wages_used_for_work_opportunity_credit: 2_000,
  zone_designation_active_in_2025_confirmed: true as const,
  substantially_all_services_in_zone_confirmed: true as const,
  principal_residence_in_zone_confirmed: true as const,
  ninety_day_employment_or_exception_confirmed: true as const,
  no_excluded_employee_or_business_confirmed: true as const,
  futa_wage_and_other_credit_exclusions_reviewed_confirmed: true as const,
};
const source = {
  schedule_c_business_reference: "SHOP-1",
  payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
  f8844s: [employee],
};

Deno.test("Form 8844 direct employer calculates qualified wages after WOTC exclusion", () => {
  const lines = calculateForm8844(source);
  assertEquals(lines.line1, 10_000);
  assertEquals(lines.line2, 2_000);
  assertEquals(lines.line4, 2_000);
  const result = f8844.compute({ taxYear: 2025, formType: "f1040" }, source);
  assertEquals(result.outputs.length, 1);
  assertEquals(result.outputs[0].nodeType, "f3800");
  assertEquals(result.outputs[0].fields.f8844_direct_employer_credit, {
    credit_amount: 2_000,
    schedule_c_business_reference: "SHOP-1",
    payroll_ledger_reference: "PAYROLL-2025-SHOP-1",
    subject_to_passive_activity_limit: false,
  });
});

Deno.test("Form 8844 direct employer enforces per-employee $15,000 cap and same-zone evidence", () => {
  assertEquals(
    calculateForm8844({
      ...source,
      f8844s: [{ ...employee, qualified_zone_wages: 20_000 }],
    }).line2,
    2_600,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      f8844s: [{ ...employee, residence_zone_reference: "OTHER-ZONE" }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      ...source,
      f8844s: [{
        ...employee,
        ninety_day_employment_or_exception_confirmed: false,
      }],
    }).success,
    false,
  );
});

Deno.test("Form 8844 rejects duplicate payroll and unfounded precision", () => {
  assertEquals(
    inputSchema.safeParse({
      ...source,
      f8844s: [employee, { ...employee, employee_reference: "EMP-2" }],
    }).success,
    false,
  );
  assertThrows(
    () =>
      calculateForm8844({
        ...source,
        f8844s: [{ ...employee, qualified_zone_wages: 12_001 }],
      }),
    Error,
    "whole-dollar source precision",
  );
});
