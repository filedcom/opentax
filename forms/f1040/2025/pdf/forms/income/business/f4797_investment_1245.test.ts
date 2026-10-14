import { assertEquals, assertThrows } from "@std/assert";
import { form4797Pdf } from "./f4797.ts";

const sale = {
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
};
const fields = { investment_1245_dispositions: [sale] };
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

Deno.test("Form 4797 PDF projects the sourced investment recapture property column", () => {
  const projected = form4797Pdf.projectFields?.(fields, {
    form4797: fields,
    form8949: { transaction: row },
    schedule1: { line4_other_gains: 5_000 },
  } as never);
  assertEquals(projected?.pdf_investment_1_description, "Investment equipment");
  assertEquals(projected?.pdf_investment_1_acquired, "05/01/2022");
  assertEquals(projected?.pdf_investment_1_line23, 7_000);
  assertEquals(projected?.pdf_investment_1_line25b, 5_000);
  assertEquals(projected?.pdf_line13, 5_000);
  assertEquals(projected?.pdf_investment_line32, 3_000);
  assertEquals(
    form4797Pdf.fields.find((entry) =>
      entry.domainKey === "pdf_investment_1_line25b"
    )?.pdfField,
    "topmostSubform[0].Page2[0].PartIIITable2[0].Row25b[0].f2_37[0]",
  );
});

Deno.test("Form 4797 PDF rejects aggregate recapture without Part III property", () => {
  assertThrows(
    () => form4797Pdf.projectFields?.({ recapture_1245: 5_000 }, {}),
    Error,
    "property-level Part III source",
  );
});
