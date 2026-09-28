import { assertEquals, assertThrows } from "@std/assert";
import { inputNodes } from "../../../../2025/inputs.ts";
import { form8990, publicInputSchema } from "./index.ts";

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

Deno.test("2025 Form 8990 has one public source-record shape", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "form8990"),
    true,
  );
  assertEquals(publicInputSchema.safeParse(sourceRecords).success, true);
  assertEquals(
    publicInputSchema.safeParse({
      ...sourceRecords,
      interestExpenseRecords: undefined,
    }).success,
    false,
  );
  assertEquals(
    publicInputSchema.safeParse({ direct_schedule_c: {} }).success,
    false,
  );
  assertEquals(
    publicInputSchema.safeParse({ ...sourceRecords, line30: 8_000 }).success,
    false,
  );
  assertEquals(
    publicInputSchema.safeParse({ business_interest_expense: 8_000 }).success,
    false,
  );
});

Deno.test("2025 Form 8990 ordinary one-pass node rejects active source records", () => {
  assertEquals(
    form8990.compute({ taxYear: 2025, formType: "f1040" }, {}),
    { outputs: [] },
  );
  assertThrows(
    () =>
      form8990.compute(
        { taxYear: 2025, formType: "f1040" },
        publicInputSchema.parse(sourceRecords),
      ),
    Error,
    "require the Form 1040 two-pass execution path",
  );
});
