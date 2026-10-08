import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1099g } from "../../../../nodes/inputs/f1099g/index.ts";
import { form6251 as calculatedForm6251 } from "../../../../nodes/intermediate/forms/form6251/index.ts";
import { form6251 as nativeForm6251 } from "../../../mef/forms/taxes/f6251.ts";
import { form6251Pdf } from "../../../pdf/forms/taxes/f6251.ts";

const first = {
  payer_name: "State A Revenue Department",
  payer_tin: "12-3456789",
  source_document_reference: "2025 state A 1099-G copy",
  recipient_tin: "111223333",
  box_2_state_refund: 900,
  box_2_prior_year_itemized: true,
  box_2_taxable_recovery_verified_amount: 600,
  box_2_recovery_workpaper_reference: "reviewed combined 2024 recovery",
  box_3_tax_year: 2024,
};

const second = {
  payer_name: "State B Revenue Department",
  payer_tin: "98-7654321",
  source_document_reference: "2025 state B 1099-G copy",
  recipient_tin: "111223333",
  box_2_state_refund: 700,
  box_2_prior_year_itemized: true,
  box_2_taxable_recovery_verified_amount: 400,
  box_2_recovery_workpaper_reference: "reviewed combined 2024 recovery",
  box_3_tax_year: 2024,
};

function twoRefundReturn() {
  const source = { f1099gs: [first, second] };
  const outputs = f1099g.compute(
    { taxYear: 2025, formType: "f1040" },
    f1099g.inputSchema.parse(source),
  ).outputs;
  const refund = outputs.find((row) => row.nodeType === "form6251")?.fields
    .line2b_tax_refund;
  assertEquals(refund, 1_000);
  assertEquals(
    outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line1_state_refund,
    1_000,
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
  const fields = taxOutputs.find((row) => row.nodeType === "form6251")
    ?.fields as Record<string, unknown>;
  const amt = taxOutputs.find((row) => row.nodeType === "schedule2")?.fields
    .line2_amt;
  assertEquals(fields.line11_amt, amt);
  return {
    fields,
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

Deno.test("Form 6251 two distinct 1099-G state refunds reach AMT, Schedule 2, native and PDF", () => {
  const { fields, pending } = twoRefundReturn();
  assertEquals(fields.amti, 199_000);
  assertStringIncludes(
    nativeForm6251.build(fields, { pending }),
    "<TotalRefundReceivedAmt>1000</TotalRefundReceivedAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2b_tax_refund,
    1_000,
  );
});

Deno.test("Form 6251 two-refund export rejects duplicated or changed copies and return totals", () => {
  const { fields, pending } = twoRefundReturn();
  const changed = [
    {
      ...pending,
      f1099g: {
        f1099gs: [first, {
          ...second,
          source_document_reference: first.source_document_reference,
        }],
      },
    },
    {
      ...pending,
      f1099g: { f1099gs: [first, { ...second, payer_tin: first.payer_tin }] },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [first, {
          ...second,
          box_2_recovery_workpaper_reference: "different 2024 recovery",
        }],
      },
    },
    {
      ...pending,
      f1099g: {
        f1099gs: [first, {
          ...second,
          box_2_taxable_recovery_verified_amount: 300,
        }],
      },
    },
    { ...pending, f1099g: { f1099gs: [first] } },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line1_state_refund: 900 },
    },
    { ...pending, schedule2: { line2_amt: 18_000 } },
    {
      ...pending,
      f1040: { ...pending.f1040, line17_additional_taxes: 18_000 },
    },
  ];
  for (const altered of changed) {
    assertThrows(
      () => nativeForm6251.build(fields, { pending: altered }),
      Error,
      "reviewed 1099-G state-income-tax refunds",
    );
    assertThrows(
      () => form6251Pdf.projectFields!(fields, altered),
      Error,
      "reviewed 1099-G state-income-tax refunds",
    );
  }
});
