import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../nodes/types.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { form4797 } from "../../../mef/forms/business/f4797.ts";
import { scheduleE } from "../../../mef/forms/business/schedule_e.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { form4797Pdf } from "../../../pdf/forms/business/f4797.ts";
import { scheduleEPdf } from "../../../pdf/forms/business/schedule_e.ts";

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
  activity_id: "first-year-retained-rental",
  activity_name: "Retained rental",
  part: "II" as const,
  property_description: "Rental equipment",
  acquired_on: "2025-01-01",
  sold_on: "2025-06-01",
  gross_sales_price: 9_000,
  cost_or_other_basis: 7_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: false,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 signed equipment closing",
};

const property = {
  tsj: "T",
  activity_id: sale.activity_id,
  property_description: sale.activity_name,
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
  first_year_activity_source: {
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    activity_acquired_on: sale.acquired_on,
    acquisition_document_reference: "2025 signed rental acquisition",
    not_grouped_with_prior_activity: true,
  },
  passive_property_sales: [sale],
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

Deno.test("first-year retained Part II sale uses ordinary gain and preserves the activity PAL", () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:first-year-retained-rental"],
    3_000,
  );
  assertEquals(pending.schedule1.line4_other_gains, 2_000);
  assertEquals(pending.schedule1.line5_schedule_e, -2_000);
  assertEquals(pending.f1040.line11_agi, 50_000);
  assertStringIncludes(
    form8582.build(pending.form8582, { pending }),
    "<TotalLossesAllowedAmt>2000</TotalLossesAllowedAmt>",
  );
  assertStringIncludes(
    form4797.build(pending.form4797, { pending }),
    "<GainOrLossAmt>2000</GainOrLossAmt>",
  );
  assertStringIncludes(
    scheduleE.build(pending.schedule_e, { pending }),
    "<DedRentalRealEstateLossAmt>2000</DedRentalRealEstateLossAmt>",
  );
  assertEquals(
    form8582Pdf.projectFields!(pending.form8582, pending).part7_1_unallowed,
    "3000",
  );
  assertEquals(
    form4797Pdf.projectFields!(pending.form4797, pending).ordinary_gain,
    2_000,
  );
  assertEquals(
    scheduleEPdf.projectFields!(pending.schedule_e, pending).property_0_line22,
    2_000,
  );
});

Deno.test("first-year retained Part II sale rejects changed acquisition, closing, gain and return", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const altered: Array<typeof pending> = [
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...property,
          first_year_activity_source: {
            ...property.first_year_activity_source,
            activity_acquired_on: "2025-02-01",
          },
        }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...property,
          passive_property_sales: [{ ...sale, gross_sales_price: 9_001 }],
        }],
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line4_other_gains: 2_001 },
    },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 50_001 } },
  ];
  for (const graph of altered) {
    assertThrows(() => form8582.build(graph.form8582, { pending: graph }));
    assertThrows(() => form8582Pdf.projectFields!(graph.form8582, graph));
  }
});
