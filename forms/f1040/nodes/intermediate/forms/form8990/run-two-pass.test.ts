import { assert, assertEquals, assertThrows } from "@std/assert";
import { form8990 as form8990Mef } from "../../../../2025/mef/forms/f8990.ts";
import { form8990Pdf } from "../../../../2025/pdf/forms/f8990.ts";
import { reconcileBoundedForm8990FinalReturn } from "./final-reconciliation.ts";
import { form8990LinesSchema } from "./index.ts";
import { runBoundedForm8990TwoPass } from "./run-two-pass.ts";

Deno.test("2025 Form 8990 bounded two-pass recomputes Schedule C after a sourced disallowance", () => {
  const result = runBoundedForm8990TwoPass({
    returnInputs: {
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
          source_reference: "2025 AMT depletion worksheet C-1",
          all_property_income_and_basis_limits_applied_verified: true,
          no_at_risk_or_basis_limitation_verified: true,
          properties: [{
            property_reference: "PROPERTY-1",
            regular_allowed_depletion: 1_000,
            amt_allowed_depletion: 1_000,
          }],
        },
        line_13_depreciation: 7_500,
        line_16b_interest_other: 100_000,
      }],
    },
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
      tax_year: taxYear as 2022 | 2023 | 2024,
      business_reference: "C-1",
      filed_schedule_c_document_reference: `filed-${taxYear}`,
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
  });
  assert(result.limit.line31 > 0);
  assert(result.limit.line30 < result.limit.line1);
  assertEquals(
    result.finalizedSource.finalizedAtRiskNet,
    result.provisionalSource.interest
      .tentativeScheduleCAtRiskNetWithFullInterest +
      result.limit.line31,
  );
  assertEquals(
    result.finalizedReturn.pending.schedule_c?.schedule_cs,
    result.finalizedSource.source.schedule_cs,
  );
  assertEquals(result.calculatedForm8990Node.nodeType, "form8990");
  assertEquals(
    result.calculatedForm8990Node.fields.line7,
    result.provisionalAti.line7NonbusinessDeduction,
  );
  assertEquals(
    result.calculatedForm8990Node.fields.line30,
    result.limit.line30,
  );
  assertEquals(
    result.calculatedForm8990Node.fields.line31,
    result.limit.line31,
  );
  assertEquals(
    result.internalProjectedPending.form8990,
    result.calculatedForm8990Node.fields,
  );
  assertEquals(result.finalizedReturn.pending.form8990, undefined);
  assertEquals(result.reviewedPriorCarryforward.targetLine2, 0);
  assertEquals(result.unfiledNextYearCarryforward.status, "unfiled-workpaper");
  assertEquals(
    result.unfiledNextYearCarryforward.sourceLine31,
    result.limit.line31,
  );
  assertEquals(
    result.unfiledNextYearCarryforward.targetLine2,
    result.limit.line31,
  );
  const calculatedLines = form8990LinesSchema.parse(
    result.internalProjectedPending.form8990,
  );
  assertThrows(() => form8990Mef.build(calculatedLines), Error);
  assertThrows(
    () => form8990Pdf.projectFields?.(calculatedLines, {}),
    Error,
  );

  const mismatchedQbi = {
    ...result.finalizedReturn,
    pending: {
      ...result.finalizedReturn.pending,
      form8995: {
        ...result.finalizedReturn.pending.form8995,
        qbi_deduction: 0,
      },
    },
  };
  assertThrows(
    () =>
      reconcileBoundedForm8990FinalReturn({
        source: result.finalizedSource,
        provisionalAti: result.provisionalAti,
        limit: result.limit,
        result: mismatchedQbi,
      }),
    Error,
    "Form 1040 QBI deduction",
  );

  const unsupportedTax = {
    ...result.finalizedReturn,
    pending: {
      ...result.finalizedReturn.pending,
      schedule2: {
        ...result.finalizedReturn.pending.schedule2,
        line11_additional_medicare: 1,
      },
    },
  };
  assertThrows(
    () =>
      reconcileBoundedForm8990FinalReturn({
        source: result.finalizedSource,
        provisionalAti: result.provisionalAti,
        limit: result.limit,
        result: unsupportedTax,
      }),
    Error,
    "unsupported line11_additional_medicare",
  );
});
