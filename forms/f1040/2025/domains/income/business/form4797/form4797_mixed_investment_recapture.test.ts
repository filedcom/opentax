import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { form4797 } from "../../../../mef/forms/income/business/f4797.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form4797Pdf } from "../../../../pdf/forms/income/business/f4797.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!;
const common = {
  acquired_on: "2022-05-01",
  sold_on: "2025-06-01",
  cost_or_other_basis_plus_sale_expense: 12_000,
  depreciation_allowed_or_allowable: 5_000,
  property_held_for_investment_not_business: true,
  section_1245_classification_reviewed: true,
  direct_cash_sale_no_special_recapture_exception: true,
};
const sales = [{
  ...common,
  property_id: "investment-fully-recaptured",
  property_description: "Investment tool",
  gross_sales_price: 10_000,
  sale_document_reference: "FULL-SALE-2025",
  basis_document_reference: "FULL-BASIS-2022",
  depreciation_schedule_reference: "FULL-DEPR-2025",
}, {
  ...common,
  property_id: "investment-partly-recaptured",
  property_description: "Investment machine",
  gross_sales_price: 15_000,
  sale_document_reference: "PART-SALE-2025",
  basis_document_reference: "PART-BASIS-2022",
  depreciation_schedule_reference: "PART-DEPR-2025",
}];

function filedReturn() {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    form4797_investment_1245: { investment_1245_dispositions: sales },
  });
  assertEquals(result.diagnostics, []);
  return buildPending(result.pending);
}

Deno.test("mixed full and partial investment recapture reaches Schedule 1, D, Form 1040 and Form 4797 outputs", () => {
  const pending = filedReturn();
  assertEquals(pending.schedule1!.line4_other_gains, 8_000);
  assertEquals(pending.schedule_d!.print_line16_combined, 3_000);
  assertEquals(pending.f1040!.line7_capital_gain, 3_000);
  assertEquals(pending.f1040!.line8_additional_income, 8_000);
  assertEquals(pending.f1040!.line11_agi, 86_000);
  const xml = form4797.build(pending.form4797!, { pending });
  assertStringIncludes(
    xml,
    "<TotalSectionPropertyAmt>8000</TotalSectionPropertyAmt>",
  );
  assertStringIncludes(xml, "<NetGainAmt>3000</NetGainAmt>");
  const pdf = form4797Pdf.projectFields!(
    pending.form4797!,
    {
      ...normalizeAllPending(pending),
      form8949: { transaction: pending.form8949 },
    },
  );
  assertEquals(pdf.pdf_investment_line31, 8_000);
  assertEquals(pdf.pdf_investment_line32, 3_000);
});

Deno.test("mixed investment recapture rejects property and final-return tampering in MeF and PDF", () => {
  const pending = filedReturn();
  const changed = [{
    ...pending,
    form4797: {
      ...pending.form4797,
      investment_1245_dispositions: [sales[0], {
        ...sales[1],
        gross_sales_price: 15_001,
      }],
    },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line4_other_gains: 7_999 },
  }, {
    ...pending,
    schedule_d: { ...pending.schedule_d, print_line16_combined: 2_999 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line7_capital_gain: 2_999 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line11_agi: 85_999 },
  }];
  for (const altered of changed) {
    assertThrows(
      () =>
        form4797.build(
          altered.form4797! as Parameters<typeof form4797.build>[0],
          { pending: altered },
        ),
      Error,
    );
    assertThrows(
      () =>
        form4797Pdf.projectFields!(
          altered.form4797!,
          {
            ...normalizeAllPending(altered),
            form8949: { transaction: altered.form8949 },
          },
        ),
      Error,
    );
  }
});
