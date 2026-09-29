import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8990 } from "./mef/forms/f8990.ts";
import { form8990Pdf } from "./pdf/forms/f8990.ts";
import { buildPending } from "./mef/pending.ts";
import { normalizeAllPending } from "./pending.ts";
import type { Form8990Projection } from "./form8990_projection.ts";
import { f1040_2025 } from "./index.ts";

const baseInputs = {
  general: { filing_status: "single", taxpayer_ssn: "123456789" },
  schedule_c: [{
    business_reference: "C-1",
    line_a_principal_business: "Software consulting",
    line_b_business_code: "541510",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_1_gross_receipts: 200_000,
    line_12_depletion: 1_000,
    amt_depletion_worksheet: {
      source_reference: "2025 C-1 AMT depletion review",
      all_property_income_and_basis_limits_applied_verified: true,
      no_at_risk_or_basis_limitation_verified: true,
      properties: [{
        property_reference: "C-1-depletion-property",
        regular_allowed_depletion: 1_000,
        amt_allowed_depletion: 1_000,
      }],
    },
    line_13_depreciation: 7_500,
    line_16b_interest_other: 100_000,
  }],
};

const sourceRecords = {
  receipts: [{ source_reference: "sale-1", kind: "sale", amount: 200_000 }],
  interestExpenseRecords: [{
    interest_payment_reference: "interest-statement-1",
    debt_proceeds_tracing_reference: "business-loan-ledger-1",
    business_reference: "C-1",
    allocation: "nonexcepted_schedule_c_business",
    interest_paid_amount: 100_000,
    line16b_business_interest_amount: 100_000,
  }],
  priorFiledScheduleCs: [2022, 2023, 2024].map((taxYear) => ({
    tax_year: taxYear,
    business_reference: "C-1",
    filed_schedule_c_document_reference: `filed-${taxYear}-schedule-c`,
    filed_tax_period_start: `${taxYear}-01-01`,
    filed_tax_period_end: `${taxYear}-12-31`,
    filed_line1_gross_receipts: 33_000_000,
    filed_line2_returns_and_allowances: 1_000_000,
    filed_line3_net_receipts: 32_000_000,
  })),
  priorFiledForm8990: {
    tax_year: 2024,
    filed_form8990_document_reference: "filed-2024-form8990",
    filed_taxpayer_ssn: "123456789",
    filed_line31_disallowed_business_interest: 0,
  },
};

Deno.test("2025 Form 1040 Form 8990 has reconciled native projections and an unfiled carryforward", () => {
  const result = f1040_2025.executeReturn({
    ...baseInputs,
    form8990: sourceRecords,
  });
  const projected = result.pending.form8990 as unknown as Form8990Projection;
  assertEquals(typeof result.pending.form8990?.line30, "number");
  assertEquals(typeof result.pending.form8990?.line31, "number");
  assertEquals(projected.nextYearCarryforward.targetLine2, projected.line31);
  assertEquals(result.carryforwards.form8990_disallowed_2025, projected.line31);
  const mefPending = buildPending(result.pending);
  const xml = form8990.build(mefPending.form8990 ?? {}, {
    pending: mefPending,
  });
  assertStringIncludes(xml, "<IRS8990>");
  assertStringIncludes(xml, "<LossDeductionNotAllocableAmt>");
  const pdfPending = normalizeAllPending(result.pending);
  assertEquals(
    form8990Pdf.includeWhen?.(pdfPending.form8990, pdfPending),
    true,
  );
  const pdfFields = form8990Pdf.projectFields?.(
    pdfPending.form8990,
    pdfPending,
  );
  assertEquals(pdfFields?.line27, projected.line25);
  assertEquals(pdfFields?.line28, 0);
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "form8990" && entry.message.includes("unfileable")
    ),
    true,
  );
  assertEquals(projected.nextYearCarryforward.status, "unfiled-workpaper");
});

Deno.test("2025 Form 8990 native projections reject changed lines, carryforward, and final return", () => {
  const result = f1040_2025.executeReturn({
    ...baseInputs,
    form8990: sourceRecords,
  });
  const pending = buildPending(result.pending);
  const form = pending.form8990 ?? {};
  assertThrows(
    () => form8990.build({ ...form, line30: 1 }, { pending }),
    Error,
    "projected lines or carryforward changed",
  );
  assertThrows(
    () =>
      form8990.build({
        ...form,
        nextYearCarryforward: {
          ...(form.nextYearCarryforward as Record<string, unknown>),
          targetLine2: 1,
        },
      }, { pending }),
    Error,
    "projected lines or carryforward changed",
  );
  assertThrows(
    () =>
      form8990.build({
        ...form,
        sourceRecords: {
          ...(form.sourceRecords as Record<string, unknown>),
          form8990: {
            ...((form.sourceRecords as Record<string, unknown>)
              .form8990 as Record<string, unknown>),
            interestExpenseRecords: [{
              ...sourceRecords.interestExpenseRecords[0],
              interest_paid_amount: 99_999,
              line16b_business_interest_amount: 99_999,
            }],
          },
        },
      }, { pending }),
    Error,
    "does not match Schedule C line 16b",
  );
  assertThrows(
    () =>
      form8990.build({
        ...form,
        sourceRecords: {
          ...(form.sourceRecords as Record<string, unknown>),
          form8990: {
            ...((form.sourceRecords as Record<string, unknown>)
              .form8990 as Record<string, unknown>),
            receipts: [{
              source_reference: "sale-1",
              kind: "sale",
              amount: 199_999,
            }],
          },
        },
      }, { pending }),
    Error,
  );
  assertThrows(
    () =>
      form8990.build(form, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line9_total_income: 1 },
        },
      }),
    Error,
    "final f1040 differs",
  );
});

Deno.test("2025 Form 1040 rejects legacy asserted Form 8990 input without a fallback", () => {
  assertThrows(
    () =>
      f1040_2025.executeReturn({
        ...baseInputs,
        form8990: { direct_schedule_c: { line30: 100_000 } },
      }),
    Error,
  );
});
