import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099g } from "../../../../nodes/inputs/f1099g/index.ts";
import {
  form6251 as calculatedForm6251,
} from "../../../../nodes/intermediate/forms/form6251/index.ts";
import { form6251 as nativeForm6251 } from "../../../mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../pdf/forms/taxes/f6251.ts";

const source = {
  f1099gs: [{
    payer_name: "State Revenue Department",
    payer_tin: "12-3456789",
    recipient_tin: "111223333",
    box_2_state_refund: 1_500,
    box_2_prior_year_itemized: true,
    box_2_taxable_recovery_verified_amount: 1_000,
    box_2_recovery_workpaper_reference: "reviewed-2024-Schedule-A-recovery",
    box_3_tax_year: 2024,
  }],
};

function reviewedReturn() {
  const outputs = f1099g.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const refund = outputs.find((row) => row.nodeType === "form6251")?.fields
    .line2b_tax_refund;
  assertEquals(refund, 1_000);
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line1_state_refund,
    refund,
  );
  const taxOutputs = calculatedForm6251.compute(
    { taxYear: 2025, formType: "f1040" },
    calculatedForm6251.inputSchema.parse({
      filing_status: "single",
      regular_tax_income: 200_000,
      regular_tax: 10_000,
      line2b_tax_refund: refund,
    }),
  ).outputs;
  const filed = taxOutputs.find((row) => row.nodeType === "form6251")?.fields;
  const amt = taxOutputs.find((row) => row.nodeType === "schedule2")?.fields
    .line2_amt;
  assertEquals(filed?.line11_amt, 18_834);
  assertEquals(amt, filed?.line11_amt);
  return {
    fields: filed as Record<string, unknown>,
    pending: {
      f1099g: source,
      schedule1: {
        line1_state_refund: 1_000,
        line10_total_additional_income: 1_000,
      },
      schedule2: { line2_amt: amt },
      f1040: {
        filing_status: "single",
        taxpayer_ssn: "111223333",
        line8_additional_income: 1_000,
        line9_total_income: 200_000,
        line10_adjustments: 0,
        line11_agi: 200_000,
        line14_deductions_qbi_total: 0,
        line16_income_tax: 10_000,
        line17_additional_taxes: amt,
        line18_total_tax_before_credits: 10_000 + Number(amt),
      },
    },
  };
}

Deno.test("Form 6251 line 2b reviewed refund reaches AMT, native, and PDF", () => {
  const { fields, pending } = reviewedReturn();
  assertEquals(fields.amti, 199_000);
  assertStringIncludes(
    nativeForm6251.build(fields, { pending }),
    "<TotalRefundReceivedAmt>1000</TotalRefundReceivedAmt>",
  );
  const printed = form6251Pdf.projectFields!(fields, pending);
  assertEquals(printed.line2b_tax_refund, 1_000);
  assertEquals(printed.regular_tax_income, 200_000);
});

Deno.test("Form 6251 line 2b rejects altered source or return joins", () => {
  const { fields, pending } = reviewedReturn();
  const changed = [
    {
      ...pending,
      f1099g: {
        f1099gs: [{
          ...source.f1099gs[0],
          box_2_taxable_recovery_verified_amount: 900,
        }],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{
          ...source.f1099gs[0],
          box_2_recovery_workpaper_reference: "",
        }],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [{ ...source.f1099gs[0], recipient_tin: "999887777" }],
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line1_state_refund: 900 },
    },
    { ...pending, schedule2: { line2_amt: 18_000 } },
    { ...pending, f1040: { ...pending.f1040, line8_additional_income: 900 } },
    {
      ...pending,
      f1040: { ...pending.f1040, line17_additional_taxes: 18_000 },
    },
  ];
  for (const altered of changed) {
    assertThrows(
      () => nativeForm6251.build(fields, { pending: altered }),
      Error,
      "reviewed 1099-G state-income-tax refund",
    );
    assertThrows(
      () => form6251Pdf.projectFields!(fields, altered),
      Error,
      "reviewed 1099-G state-income-tax refund",
    );
  }
  assertThrows(
    () =>
      nativeForm6251.build(fields, {
        pending: { ...pending, f1099g: undefined },
      }),
    Error,
    "reviewed 1099-G state-income-tax refund",
  );
});
