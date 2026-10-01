import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { form4797 } from "./mef/forms/f4797.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { form4797Pdf } from "./pdf/forms/f4797.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Taxpayer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const sale = {
  activity_id: "retained-current-rental",
  activity_name: "Retained rental",
  part: "I" as const,
  property_description: "Long-held parcel",
  acquired_on: "2023-04-01",
  sold_on: "2025-05-01",
  gross_sales_price: 19_000,
  cost_or_other_basis: 12_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: false,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 signed parcel closing",
};

const property = {
  tsj: "T",
  activity_id: sale.activity_id,
  property_description: sale.activity_name,
  property_type: 5,
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 0,
  expense_taxes: 9_000,
  form_1099_payments_made: false,
  disposed_of: true,
  passive_property_sales: [sale],
  section_1231_lookback_source: {
    source_document_reference: "2020-2024 filed Form 4797 line 8 workpaper",
    nonrecaptured_loss: 0 as const,
  },
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    schedule_e: [property],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("retained current-year Part I gain releases only its passive rental loss", () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form8582.current_income, 0);
  assertEquals(pending.form8582.current_loss, 9_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:retained-current-rental"],
    2_000,
  );
  assertEquals(pending.schedule1.line5_schedule_e, -7_000);
  assertEquals(pending.schedule_d.line_11_form2439, 7_000);
  assertEquals(pending.f1040.line7_capital_gain, 7_000);
  assertEquals(pending.f1040.line11_agi, 50_000);
  const worksheet = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    worksheet,
    "<OtherActivityLossAmt>9000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    worksheet,
    "<TotalLossesAllowedAmt>7000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    form4797.build(pending.form4797, { pending }),
    "<GainOrLossAmt>7000</GainOrLossAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.part5_1_income, "7000");
  assertEquals(pdf.part7_1_unallowed, "2000");
  assertEquals(
    form4797Pdf.projectFields!(pending.form4797, pending)
      .pdf_section_1231_line9,
    7_000,
  );
});

Deno.test("retained current-year Part I Form 8582 exports reject source and final-return tampering", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const altered = [
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{ ...property, expense_taxes: 9_001 }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...property,
          passive_property_sales: [{ ...sale, gross_sales_price: 19_001 }],
        }],
      },
    },
    {
      ...pending,
      schedule_d: { ...pending.schedule_d, line_11_form2439: 7_001 },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: -7_001 },
    },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 50_001 } },
  ];
  for (const graph of altered) {
    assertThrows(() => form8582.build(graph.form8582, { pending: graph }));
    assertThrows(() => form8582Pdf.projectFields!(graph.form8582, graph));
  }
});
