import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
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
  activity_id: "first-year-loss-rental",
  activity_name: "First year loss rental",
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
  disposition_document_reference: "2025 signed complete closing statement",
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
    acquisition_document_reference: "2025 signed acquisition statement",
    not_grouped_with_prior_activity: true,
  },
  passive_property_sales: [sale],
};

function returnWithFirstYearLoss() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employer_ein: "987654321",
      employer_name: "Austin Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 50_000,
      box2_fed_withheld: 8_000,
    }],
    schedule_e: [property],
  });
  assertEquals(result.diagnostics, []);
  return result.pending;
}

Deno.test("first-year entire passive disposition releases overall loss on Schedule E and Form 4797", async () => {
  const pending = returnWithFirstYearLoss();
  assertEquals(pending.form8582, { filing_status: "single" });
  assertEquals(pending.schedule1?.line5_schedule_e, -5_000);
  assertEquals(pending.schedule1?.line4_other_gains, 2_000);
  assertEquals(pending.f1040?.line8_additional_income, -3_000);
  assertEquals(pending.f1040?.line11_agi, 47_000);
  const filer = extractFilerIdentity(general);
  const prepared = await f1040_2025.prepareReturn(pending, filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<DedRentalRealEstateLossAmt>5000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalOrdinaryGainLossAmt>2000</TotalOrdinaryGainLossAmt>",
  );
  assertEquals(
    scheduleEPdf.projectFields!(pending.schedule_e!, pending)
      .property_0_line22,
    5_000,
  );
  assertEquals(
    form4797Pdf.projectFields!(pending.form4797!, pending).ordinary_gain,
    2_000,
  );
  assert((await prepared.renderPdf()).length > 0);
});

Deno.test("first-year overall-loss export rejects changed purchase and closing evidence", async () => {
  const pending = returnWithFirstYearLoss();
  const changedPurchase = {
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
  };
  assertThrows(
    () =>
      scheduleE.build(
        changedPurchase.schedule_e as Parameters<typeof scheduleE.build>[0],
        { pending: changedPurchase },
      ),
    Error,
  );
  assertThrows(
    () =>
      scheduleEPdf.projectFields!(changedPurchase.schedule_e, changedPurchase),
    Error,
  );
  const changedClosing = {
    ...pending,
    form4797: {
      ...pending.form4797,
      passive_property_sales: [{
        ...sale,
        disposition_document_reference: "Different closing statement",
      }],
    },
  };
  assertThrows(
    () => scheduleE.build(pending.schedule_e!, { pending: changedClosing }),
    Error,
  );
  assertThrows(
    () =>
      form4797.build(
        changedClosing.form4797 as Parameters<typeof form4797.build>[0],
        { pending: changedClosing },
      ),
    Error,
  );
  await assertRejects(() =>
    f1040_2025.prepareReturn(changedClosing, extractFilerIdentity(general))
  );
});
