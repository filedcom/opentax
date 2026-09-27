import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { ExclusionType } from "../../../nodes/intermediate/forms/form982/index.ts";
import { form982 } from "./f982.ts";

Deno.test("Form 982 absent input emits no document", () => {
  assertEquals(form982.build({}), "");
});

Deno.test("Form 982 QPRI disposed residence emits line 1e and capped line 2", () => {
  const xml = form982.build({
    line2_excluded_cod: 900_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 900_000,
    qpri_qualified_loan_balance_before_discharge: 900_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: false,
  });
  assertStringIncludes(
    xml,
    "<DischargeOfQualifiedPrinResInd>X</DischargeOfQualifiedPrinResInd>",
  );
  assertStringIncludes(
    xml,
    "<TotalDischargedIndebtednessAmt>750000</TotalDischargedIndebtednessAmt>",
  );
  assertEquals(xml.includes("<ExcludedToReducePrinResAmt>"), false);
});

Deno.test("Form 982 retained home reduces basis by no more than excluded debt", () => {
  const xml = form982.build({
    line2_excluded_cod: 300_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 300_000,
    qpri_qualified_loan_balance_before_discharge: 300_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: true,
    principal_residence_basis: 200_000,
  });
  assertStringIncludes(
    xml,
    "<TotalDischargedIndebtednessAmt>300000</TotalDischargedIndebtednessAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExcludedToReducePrinResAmt>200000</ExcludedToReducePrinResAmt>",
  );
});

Deno.test("Form 982 QPRI MFS cap is $375,000", () => {
  const xml = form982.build({
    line2_excluded_cod: 500_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: true,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 500_000,
    qpri_qualified_loan_balance_before_discharge: 500_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: false,
  });
  assertStringIncludes(
    xml,
    "<TotalDischargedIndebtednessAmt>375000</TotalDischargedIndebtednessAmt>",
  );
});

Deno.test("Form 982 line 2 excludes only discharged qualified debt from a mixed-use loan", () => {
  const xml = form982.build({
    line2_excluded_cod: 120_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 300_000,
    qpri_qualified_loan_balance_before_discharge: 240_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: true,
    principal_residence_basis: 80_000,
  });
  assertStringIncludes(
    xml,
    "<TotalDischargedIndebtednessAmt>60000</TotalDischargedIndebtednessAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExcludedToReducePrinResAmt>60000</ExcludedToReducePrinResAmt>",
  );
});

Deno.test("Form 982 refuses unverified exclusion details", () => {
  assertThrows(() => form982.build({ line2_excluded_cod: 5_000 }), Error);
  assertThrows(
    () =>
      form982.build({
        line2_excluded_cod: 5_000,
        exclusion_type: ExclusionType.Bankruptcy,
      }),
    Error,
    "tax-attribute reduction details",
  );
  assertThrows(
    () =>
      form982.build({
        line2_excluded_cod: 5_000,
        exclusion_type: ExclusionType.Qpri,
        principal_residence_retained: false,
      }),
    Error,
    "discharge date",
  );
  assertThrows(
    () =>
      form982.build({
        line2_excluded_cod: 5_000,
        exclusion_type: ExclusionType.Qpri,
        discharge_date: "2025-06-15",
        principal_residence_retained: true,
      }),
    Error,
    "basis",
  );
});
