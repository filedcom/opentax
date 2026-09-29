import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  inputSchema as scheduleEInput,
  scheduleE as scheduleENode,
} from "../../../nodes/inputs/schedule_e/index.ts";
import {
  form4797 as form4797Node,
  inputSchema as form4797Input,
} from "../../../nodes/intermediate/forms/form4797/index.ts";
import { scheduleE as scheduleEMef } from "./schedule_e.ts";
import { form4797 as form4797Mef } from "./f4797.ts";
import { form4797Pdf } from "../../pdf/forms/f4797.ts";

const sale = {
  activity_id: "rental-sold-2025",
  activity_name: "Sold rental",
  part: "II" as const,
  property_description: "Short rental sale",
  acquired_on: "2025-01-01",
  sold_on: "2025-06-01",
  gross_sales_price: 9_000,
  cost_or_other_basis: 7_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: true,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 signed closing statement and deed",
};

const property = {
  tsj: "T",
  activity_id: "rental-sold-2025",
  property_description: "Sold rental",
  property_type: 1,
  activity_type: "B",
  fair_rental_days: 180,
  personal_use_days: 0,
  rent_income: 0,
  expense_taxes: 5_000,
  form_1099_payments_made: false,
  street_address: "12 Main Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
  disposed_of: true,
  prior_unallowed_passive_operating: 3_000,
  prior_year_8582_source: {
    tax_year: 2024,
    activity_id: "rental-sold-2025",
    filed_part_vii_column_c: 3_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  },
  passive_property_sales: [sale],
};

const scheduleEPending = scheduleEInput.parse({ schedule_es: [property] });
const form4797Pending = form4797Input.parse({
  disposed_properties: 1,
  passive_disposed_activity_ids: [sale.activity_id],
  passive_property_sales: [sale],
});

Deno.test("complete passive disposition with overall loss releases sourced PAL on normal Schedule E and Form 4797", () => {
  const eResult = scheduleENode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleEInput.parse(scheduleEPending),
  );
  assertEquals(
    eResult.outputs.find((row) => row.nodeType === "schedule1")
      ?.fields.line5_schedule_e,
    -8_000,
  );
  assertEquals(
    eResult.outputs.some((row) => row.nodeType === "form8582"),
    false,
  );
  assertEquals(
    eResult.outputs.find((row) => row.nodeType === "form4797")
      ?.fields.passive_property_sales,
    [sale],
  );

  const saleResult = form4797Node.compute(
    { taxYear: 2025, formType: "f1040" },
    form4797Input.parse(form4797Pending),
  );
  assertEquals(
    saleResult.outputs.find((row) => row.nodeType === "schedule1")
      ?.fields.line4_other_gains,
    2_000,
  );
  assertEquals(
    saleResult.outputs.some((row) => row.nodeType === "form8582"),
    false,
  );

  const pending = { schedule_e: scheduleEPending, form4797: form4797Pending };
  const eXml = scheduleEMef.build(scheduleEPending, { pending });
  const saleXml = form4797Mef.build(
    form4797Pending as Parameters<typeof form4797Mef.build>[0],
    { pending },
  );
  assertStringIncludes(
    eXml,
    "<DedRentalRealEstateLossAmt>8000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    eXml,
    "<TotalIncomeOrLossAmt>-8000</TotalIncomeOrLossAmt>",
  );
  assertStringIncludes(saleXml, "<GainOrLossAmt>2000</GainOrLossAmt>");
  assertStringIncludes(
    saleXml,
    "<TotalOrdinaryGainLossAmt>2000</TotalOrdinaryGainLossAmt>",
  );

  const pdfFields = form4797Pdf.projectFields!(form4797Pending, pending);
  assertEquals(pdfFields.pdf_sale_description, sale.property_description);
  assertEquals(pdfFields.pdf_sale_acquired, "01/01/2025");
  assertEquals(pdfFields.pdf_sale_sold, "06/01/2025");
  assertEquals(pdfFields.pdf_sale_gain, 2_000);
  assertEquals(pdfFields.ordinary_gain, 2_000);
  assertEquals(
    form4797Pdf.fields.some((field) =>
      field.kind === "text" && field.domainKey === "pdf_sale_gain" &&
      field.pdfField.endsWith("Row1[0].f1_47[0]")
    ),
    true,
  );
});

Deno.test("complete disposition requires unrelated fully taxable buyer, filed PAL and overall loss", () => {
  for (
    const changedSale of [
      { ...sale, buyer_unrelated: false },
      { ...sale, fully_taxable: false },
      { ...sale, installment_method: true },
    ]
  ) {
    assertThrows(
      () =>
        scheduleENode.compute(
          { taxYear: 2025, formType: "f1040" },
          scheduleEInput.parse({
            schedule_es: [{
              ...property,
              passive_property_sales: [changedSale],
            }],
          }),
        ),
      Error,
      "section 469(g) review",
    );
  }
  const overallGain = scheduleENode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleEInput.parse({
      schedule_es: [{
        ...property,
        passive_property_sales: [{ ...sale, gross_sales_price: 16_000 }],
      }],
    }),
  );
  assertEquals(
    overallGain.outputs.some((row) => row.nodeType === "form8582"),
    true,
  );
  assertThrows(
    () =>
      scheduleENode.compute(
        { taxYear: 2025, formType: "f1040" },
        scheduleEInput.parse({
          schedule_es: [{
            ...property,
            prior_year_8582_source: {
              ...property.prior_year_8582_source,
              filed_part_vii_column_c: 2_000,
            },
          }],
        }),
      ),
    Error,
    "section 469(g) review",
  );
  assertThrows(
    () =>
      scheduleEMef.build(scheduleEPending, {
        pending: {
          schedule_e: scheduleEPending,
          form4797: form4797Pending,
          form8582: {},
        },
      }),
    Error,
    "no Form 8582 activity",
  );
  assertThrows(
    () =>
      form4797Mef.build(
        form4797Pending as Parameters<typeof form4797Mef.build>[0],
        {
          pending: {
            schedule_e: {
              schedule_es: [{
                ...property,
                passive_property_sales: [{ ...sale, gross_sales_price: 9_001 }],
              }],
            },
            form4797: form4797Pending,
          },
        },
      ),
    Error,
    "linked Schedule E overall gain or loss source",
  );
  assertThrows(
    () =>
      form4797Mef.build(
        form4797Pending as Parameters<typeof form4797Mef.build>[0],
      ),
    Error,
    "linked Schedule E source",
  );
  assertThrows(
    () =>
      form4797Pdf.projectFields!(form4797Pending, {
        schedule_e: {
          schedule_es: [{
            ...property,
            passive_property_sales: [{
              ...sale,
              buyer_unrelated: false,
            }],
          }],
        },
        form4797: form4797Pending,
      }),
    Error,
    "linked Schedule E overall-gain or overall-loss sale",
  );
});
