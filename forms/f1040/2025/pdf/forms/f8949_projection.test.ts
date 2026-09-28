import { assertEquals, assertThrows } from "@std/assert";
import { form8949Pdf } from "./f8949.ts";

const shortTerm = {
  part: "A",
  description: "100 shares",
  date_acquired: "2025-01-15",
  date_sold: "2025-06-20",
  proceeds: 1_000.25,
  cost_basis: 1_200.25,
  adjustment_codes: "W",
  adjustment_amount: 100,
  gain_loss: -100,
  is_long_term: false,
};
const longTerm = {
  part: "F",
  description: "Long-term shares",
  date_acquired: "01012020",
  date_sold: "06302025",
  proceeds: 2_000,
  cost_basis: 500,
  adjustment_codes: "D",
  adjustment_amount: -100,
  gain_loss: 1_400,
  is_long_term: true,
};

Deno.test("Form 8949 PDF projects canonical Part I and Part II into separate checked pages", () => {
  const instances = form8949Pdf.instances?.({
    transaction: [shortTerm, longTerm],
  }) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances.map((instance) => instance.pdf_part), ["A", "F"]);
  assertEquals(instances.map((instance) => form8949Pdf.pageIndices?.(instance)), [
    [0], [1],
  ]);
  assertEquals(instances[0]?.pdf_page1_row1_date_acquired, "01/15/2025");
  assertEquals(instances[0]?.pdf_page1_row1_proceeds, "1000.25");
  assertEquals(instances[0]?.pdf_page1_row1_gain_loss, "(100)");
  assertEquals(instances[0]?.pdf_page1_total_gain_loss, "(100)");
  assertEquals(instances[1]?.pdf_page2_row1_date_acquired, "01/01/2020");
  assertEquals(instances[1]?.pdf_page2_row1_adjustment_amount, "(100)");
  assertEquals(instances[1]?.pdf_page2_total_gain_loss, "1400");
  assertEquals(
    form8949Pdf.fields.find((field) =>
      field.domainKey === "pdf_page1_row1_description"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_Line1_Part1[0].Row1[0].f1_03[0]",
  );
  assertEquals(
    form8949Pdf.fields.find((field) =>
      field.domainKey === "pdf_page2_row11_gain_loss"
    )?.pdfField,
    "topmostSubform[0].Page2[0].Table_Line1_Part2[0].Row11[0].f2_90[0]",
  );
  assertEquals(
    form8949Pdf.fields.find((field) =>
      field.kind === "checkboxWhen" && field.whenValue === "F"
    )?.pdfField,
    "topmostSubform[0].Page2[0].c2_1[2]",
  );
});

Deno.test("Form 8949 PDF splits a reporting category after eleven rows", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    ...shortTerm,
    description: `Short sale ${index + 1}`,
    proceeds: index + 1,
    cost_basis: 0,
    adjustment_codes: undefined,
    adjustment_amount: undefined,
    gain_loss: index + 1,
  }));
  const instances = form8949Pdf.instances?.({ transaction: rows }) ?? [];
  assertEquals(instances.length, 2);
  assertEquals(instances.map((instance) => instance.pdf_part), ["A", "A"]);
  assertEquals(instances[0]?.pdf_page1_row11_description, "Short sale 11");
  assertEquals(instances[0]?.pdf_page1_total_gain_loss, "66");
  assertEquals(instances[1]?.pdf_page1_row1_description, "Short sale 12");
  assertEquals(instances[1]?.pdf_page1_total_gain_loss, "12");
  assertEquals(instances[1]?.pdf_page1_row2_description, undefined);
});

Deno.test("Form 8949 PDF leaves dates and basis blank for linked Form 4797 excess gain", () => {
  const row = {
    part: "F",
    description: "From Form 4797",
    source_transaction_id: "investment-1245-1",
    form4797_property_id: "investment-1245-1",
    from_form4797_investment_1245: true,
    date_acquired: "",
    date_sold: "",
    proceeds: 3_000,
    cost_basis: 0,
    gain_loss: 3_000,
    is_long_term: true,
  };
  const pending = {
    form8949: { transaction: row },
    form4797: { investment_1245_dispositions: [{
      property_id: "investment-1245-1",
      property_description: "Investment equipment",
      acquired_on: "2022-05-01",
      sold_on: "2025-06-01",
      gross_sales_price: 15_000,
      cost_or_other_basis_plus_sale_expense: 12_000,
      depreciation_allowed_or_allowable: 5_000,
      property_held_for_investment_not_business: true,
      section_1245_classification_reviewed: true,
      direct_cash_sale_no_special_recapture_exception: true,
      sale_document_reference: "SALE-2025-1",
      basis_document_reference: "BASIS-2022-1",
      depreciation_schedule_reference: "DEPR-2025-1",
    }] },
  };
  form8949Pdf.projectFields?.(pending.form8949, pending as never);
  const instances = form8949Pdf.instances?.(pending.form8949) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(instances[0].pdf_part, "F");
  assertEquals(instances[0].pdf_page2_row1_description, "From Form 4797");
  assertEquals(instances[0].pdf_page2_row1_date_acquired, undefined);
  assertEquals(instances[0].pdf_page2_row1_cost_basis, undefined);
  assertEquals(instances[0].pdf_page2_row1_proceeds, "3000");
});

Deno.test("Form 8949 PDF stops mismatched holding period and unsupported dates", () => {
  assertThrows(
    () => form8949Pdf.instances?.({
      transaction: { ...longTerm, gain_loss: 1_500 },
    }),
    Error,
    "does not reconcile to proceeds, basis, and column (g)",
  );
  assertThrows(
    () => form8949Pdf.instances?.({
      transaction: { ...longTerm, is_long_term: false },
    }),
    Error,
    "holding-period flag",
  );
  assertThrows(
    () => form8949Pdf.instances?.({
      transaction: { ...shortTerm, date_sold: "2025-02-30" },
    }),
    Error,
    "valid calendar date",
  );
  assertThrows(
    () => form8949Pdf.instances?.({
      transaction: { ...shortTerm, date_acquired: "VARIOUS" },
    }),
    Error,
    "supported calendar date",
  );
});
