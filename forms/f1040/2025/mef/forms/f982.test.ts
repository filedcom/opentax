import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { z } from "zod";
import {
  ExclusionType,
  inputSchema,
} from "../../../nodes/intermediate/forms/form982/index.ts";
import { form982Pdf } from "../../pdf/forms/f982.ts";
import { form982 } from "./f982.ts";

type QpriInput = z.infer<typeof inputSchema>;

function sourceForQpri(raw: QpriInput) {
  return {
    f1099c: {
      f1099cs: [{
        creditor_name: "Mortgage lender",
        box2_cod_amount: raw.line2_excluded_cod,
        routing: "excluded",
        exclusion_type: ExclusionType.Qpri,
        qpri_discharged_principal_amount: raw.line2_excluded_cod,
        qpri_actual_discharge_date: raw.discharge_date,
        qpri_mfs: raw.qpri_mfs,
        qpri_total_loan_balance_before_discharge:
          raw.qpri_total_loan_balance_before_discharge,
        qpri_qualified_loan_balance_before_discharge:
          raw.qpri_qualified_loan_balance_before_discharge,
        qpri_main_home_security_confirmed:
          raw.qpri_main_home_security_confirmed,
        qpri_discharge_reason: raw.qpri_discharge_reason,
        qpri_discharge_reason_source: raw.qpri_discharge_reason_source,
        principal_residence_retained: raw.principal_residence_retained,
        principal_residence_basis: raw.principal_residence_basis,
      }],
    },
  };
}

function buildQpri(raw: QpriInput): string {
  return form982.build(raw, { pending: sourceForQpri(raw) });
}

Deno.test("Form 982 absent input emits no document", () => {
  assertEquals(form982.build({}), "");
});

Deno.test("Form 982 cannot omit an original excluded 1099-C", () => {
  const source = sourceForQpri({
    line2_excluded_cod: 100_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 100_000,
    qpri_qualified_loan_balance_before_discharge: 100_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: false,
  });
  assertThrows(
    () => form982.build({}, { pending: source }),
    Error,
    "source exists without its required filing form",
  );
  assertThrows(
    () =>
      form982.build([] as unknown as Parameters<typeof form982.build>[0], {
        pending: source,
      }),
    Error,
    "source exists without its required filing form",
  );
  assertThrows(
    () => form982Pdf.projectFields?.({}, source),
    Error,
    "source exists without its required filing form",
  );
});

Deno.test("Form 982 QPRI disposed residence emits line 1e and capped line 2", () => {
  const xml = buildQpri({
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
  const xml = buildQpri({
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
  const xml = buildQpri({
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
  const xml = buildQpri({
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
      }, { pending: {} }),
    Error,
    "tax-attribute reduction details",
  );
  assertThrows(
    () =>
      buildQpri({
        line2_excluded_cod: 5_000,
        exclusion_type: ExclusionType.Qpri,
        principal_residence_retained: false,
      }),
    Error,
    "discharge date",
  );
  assertThrows(
    () =>
      buildQpri({
        line2_excluded_cod: 5_000,
        exclusion_type: ExclusionType.Qpri,
        discharge_date: "2025-06-15",
        principal_residence_retained: true,
      }),
    Error,
    "basis",
  );
});

Deno.test("Form 982 QPRI native and PDF reconcile one original 1099-C", () => {
  const raw: QpriInput = {
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
  };
  const source = sourceForQpri(raw);
  const pending = { ...source, f1040: { filing_status: "single" } };
  assertStringIncludes(
    form982.build(raw, { pending }),
    "<ExcludedToReducePrinResAmt>200000</ExcludedToReducePrinResAmt>",
  );
  assertEquals(form982Pdf.projectFields?.(raw, pending), {
    qpri_checkbox: true,
    line2_excluded_cod: 300_000,
    line10b_principal_residence_basis_reduction: 200_000,
  });
  assertEquals(
    form982Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
    [
      ["qpri_checkbox", "topmostSubform[0].Page1[0].c1_5[0]"],
      ["line2_excluded_cod", "topmostSubform[0].Page1[0].f1_3[0]"],
      [
        "line10b_principal_residence_basis_reduction",
        "topmostSubform[0].Page1[0].f1_11[0]",
      ],
    ],
  );
  assertThrows(
    () => form982.build({ ...raw, line2_excluded_cod: 299_999 }, { pending }),
    Error,
    "differs from its original 1099-C deposit",
  );
  assertThrows(
    () => form982.build(raw),
    Error,
    "needs its original 1099-C source",
  );
  assertThrows(
    () =>
      form982Pdf.projectFields?.(raw, {
        ...pending,
        f1099c: {
          f1099cs: [{
            ...source.f1099c.f1099cs[0],
            box2_cod_amount: 299_999,
          }],
        },
      }),
    Error,
  );
  assertThrows(
    () =>
      form982Pdf.projectFields?.(raw, {
        ...pending,
        f1040: { filing_status: "mfs" },
      }),
    Error,
    "filing-status cap conflicts",
  );
  assertThrows(
    () =>
      form982Pdf.projectFields?.(raw, {
        f1040: { filing_status: "single" },
      }),
    Error,
  );
});

Deno.test("Form 982 PDF keeps line 10b blank for a disposed home and prints zero retained basis", () => {
  const raw: QpriInput = {
    line2_excluded_cod: 100_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    discharge_date: "2025-06-15",
    qpri_total_loan_balance_before_discharge: 100_000,
    qpri_qualified_loan_balance_before_discharge: 100_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: false,
  };
  const all = { ...sourceForQpri(raw), f1040: { filing_status: "single" } };
  assertEquals(form982Pdf.projectFields?.(raw, all), {
    qpri_checkbox: true,
    line2_excluded_cod: 100_000,
  });
  const retained = {
    ...raw,
    principal_residence_retained: true,
    principal_residence_basis: 0,
  };
  assertEquals(
    form982Pdf.projectFields?.(retained, {
      ...sourceForQpri(retained),
      f1040: { filing_status: "single" },
    }),
    {
      qpri_checkbox: true,
      line2_excluded_cod: 100_000,
      line10b_principal_residence_basis_reduction: 0,
    },
  );
  assertThrows(
    () =>
      form982Pdf.projectFields?.({
        ...raw,
        exclusion_type: ExclusionType.Bankruptcy,
      }, all),
    Error,
    "tax-attribute reduction details",
  );
});
