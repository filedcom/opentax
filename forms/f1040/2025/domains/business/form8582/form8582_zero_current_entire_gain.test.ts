import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import type { MefFormsPending } from "../../../mef/types.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { form4797Pdf } from "../../../pdf/forms/business/f4797.ts";
import { scheduleEPdf } from "../../../pdf/forms/business/schedule_e.ts";
import { normalizeAllPending } from "../../execution/pending.ts";

const general = {
  filing_status: FilingStatus.Single,
  digital_assets: false,
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
  activity_id: "prior-pal-zero-current",
  activity_name: "Prior PAL rental",
  part: "II" as const,
  property_description: "Short-held rental fixture",
  acquired_on: "2024-12-01",
  sold_on: "2025-06-01",
  gross_sales_price: 20_000,
  cost_or_other_basis: 12_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: true,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 signed sale closing statement",
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
  form_1099_payments_made: false,
  street_address: "12 Main Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
  disposed_of: true,
  prior_unallowed_passive_operating: 3_000,
  prior_year_8582_source: {
    tax_year: 2024,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 3_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  },
  passive_property_sales: [sale],
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: general.taxpayer_ssn,
      box1_wages: 50_000,
      box2_fed_withheld: 8_000,
    }],
    schedule_e: [property],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 8582 calculates entire-sale PAL release but requires authenticated prior return to export", () => {
  const result = filedReturn();
  assertEquals(result.carryforwards.suspended_pal_8582, undefined);
  assertEquals(result.pending.form8582?.current_loss ?? 0, 0);
  assertEquals(result.pending.form8582?.prior_unallowed, 3_000);
  assertEquals(result.pending.schedule1?.line5_schedule_e, -3_000);
  assertEquals(result.pending.schedule1?.line4_other_gains, 8_000);
  assertEquals(result.pending.f1040?.line11_agi, 55_000);

  const pending = result.pending as MefFormsPending;
  assertThrows(
    () => buildMefXml(pending, extractFilerIdentity(general)),
    Error,
    "needs authenticated accepted-2024 return and activity ledger",
  );
  const projected = form8582Pdf.projectFields!(
    pending.form8582!,
    normalizeAllPending(pending),
  );
  assertEquals(projected.part5_1_income, "8000");
  assertEquals(projected.part5_1_prior, "3000");
  assertEquals(projected.part5_1_gain, "5000");
  assertEquals(
    scheduleEPdf.projectFields!(
      pending.schedule_e!,
      normalizeAllPending(pending),
    )
      .property_0_line22,
    3_000,
  );
  assertEquals(
    form4797Pdf.projectFields!(pending.form4797!, normalizeAllPending(pending))
      .ordinary_gain,
    8_000,
  );
});

Deno.test("zero-current entire-gain route rejects prior balance, buyer, sale identity and final amounts", () => {
  const result = filedReturn();
  const pending = result.pending as MefFormsPending;
  const fields = pending.form8582!;
  const changed = (overrides: Record<string, unknown>) => ({
    ...pending,
    schedule_e: {
      ...pending.schedule_e,
      schedule_es: [{ ...property, ...overrides }],
    },
  });
  assertThrows(() =>
    form8582.build(fields, {
      pending: changed({
        prior_year_8582_source: {
          ...property.prior_year_8582_source,
          filed_part_vii_column_c: 2_999,
        },
      }),
    }), Error);
  assertThrows(() =>
    form8582Pdf.projectFields!(
      fields,
      normalizeAllPending(changed({
        passive_property_sales: [{ ...sale, buyer_unrelated: false }],
      })),
    ), Error);
  assertThrows(
    () =>
      form8582.build(fields, {
        pending: {
          ...pending,
          form4797: {
            ...pending.form4797,
            passive_property_sales: [{
              ...sale,
              disposition_document_reference: "Different closing",
            }],
          },
        },
      }),
    Error,
    "disposition facts do not match",
  );
  assertThrows(
    () => form8582.build({ ...fields, prior_unallowed: 2_999 }, { pending }),
    Error,
  );
});
