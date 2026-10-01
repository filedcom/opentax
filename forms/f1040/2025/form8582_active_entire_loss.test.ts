import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { scheduleE } from "./mef/forms/schedule_e.ts";
import { form4797 } from "./mef/forms/f4797.ts";
import { scheduleEPdf } from "./pdf/forms/schedule_e.ts";
import { form4797Pdf } from "./pdf/forms/f4797.ts";

const general = {
  digital_assets: false,
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
  activity_id: "first-year-active-loss-rental",
  activity_name: "First year active loss rental",
  part: "II" as const,
  property_description: "Rental equipment",
  acquired_on: "2025-01-01",
  sold_on: "2025-06-01",
  gross_sales_price: 9_000,
  cost_or_other_basis: 7_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: true,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 signed active-rental closing",
};
const property = {
  tsj: "T",
  activity_id: sale.activity_id,
  property_description: sale.activity_name,
  property_type: 1,
  activity_type: "A",
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
    acquisition_document_reference: "2025 signed active-rental purchase",
    not_grouped_with_prior_activity: true,
  },
  passive_property_sales: [sale],
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employer_ein: "987654321",
      employer_name: "Austin Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 50_000,
      box2_fed_withheld: 8_000,
    }],
    schedule_e: [property],
  });
  assertEquals(result.diagnostics, []);
  return result.pending;
}

Deno.test("first-year active rental entire loss stays on Schedule E and Form 4797 without Form 8582", () => {
  const pending = filedReturn();
  assertEquals(pending.form8582, { filing_status: "single" });
  assertEquals(pending.schedule1?.line5_schedule_e, -5_000);
  assertEquals(pending.schedule1?.line4_other_gains, 2_000);
  assertEquals(pending.f1040?.line8_additional_income, -3_000);
  assertEquals(pending.f1040?.line11_agi, 47_000);
  const scheduleXml = scheduleE.build(pending.schedule_e!, { pending });
  const saleXml = form4797.build(pending.form4797!, { pending });
  assertStringIncludes(
    scheduleXml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    saleXml,
    "<TotalOrdinaryGainLossAmt>2000</TotalOrdinaryGainLossAmt>",
  );
  assertEquals(
    scheduleEPdf.projectFields!(pending.schedule_e!, pending).property_0_line22,
    5_000,
  );
  assertEquals(
    form4797Pdf.projectFields!(pending.form4797!, pending).ordinary_gain,
    2_000,
  );
});

Deno.test("active entire-loss export rejects MFS, changed acquisition, closing and final amount", () => {
  const pending = filedReturn();
  const altered: Array<typeof pending> = [
    {
      ...pending,
      f1040: { ...pending.f1040, filing_status: FilingStatus.MFS },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{
          ...property,
          first_year_activity_source: {
            ...property.first_year_activity_source,
            activity_acquired_on: "2024-01-01",
          },
        }],
      },
    },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 47_001 } },
  ];
  for (const candidate of altered) {
    assertThrows(
      () =>
        scheduleE.build(
          candidate.schedule_e as Parameters<typeof scheduleE.build>[0],
          { pending: candidate },
        ),
      Error,
    );
    assertThrows(
      () => form4797.build(pending.form4797!, { pending: candidate }),
      Error,
    );
    assertThrows(
      () => scheduleEPdf.projectFields!(candidate.schedule_e!, candidate),
      Error,
    );
    assertThrows(
      () => form4797Pdf.projectFields!(pending.form4797!, candidate),
      Error,
    );
  }
  const changedClosing = {
    ...pending,
    form4797: {
      ...pending.form4797,
      passive_property_sales: [{
        ...sale,
        disposition_document_reference: "Different closing",
      }],
    },
  };
  assertThrows(
    () => scheduleE.build(pending.schedule_e!, { pending: changedClosing }),
    Error,
  );
  assertThrows(
    () => scheduleEPdf.projectFields!(pending.schedule_e!, changedClosing),
    Error,
  );
});
