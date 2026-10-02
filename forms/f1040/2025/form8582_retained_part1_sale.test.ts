import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { buildMefXml } from "./mef/builder.ts";
import type { MefFormsPending } from "./mef/types.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { FilingStatus } from "../nodes/types.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { form4797 } from "./mef/forms/f4797.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { form4797Pdf } from "./pdf/forms/f4797.ts";
import { normalizeAllPending } from "./pending.ts";

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
  activity_id: "retained-land-rental",
  activity_name: "Retained land rental",
  part: "I" as const,
  property_description: "Long-held rental parcel",
  acquired_on: "2023-04-01",
  sold_on: "2025-05-01",
  gross_sales_price: 19_000,
  cost_or_other_basis: 12_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: false,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference:
    "2025 signed partial parcel closing statement",
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
  form_1099_payments_made: false,
  disposed_of: true,
  expense_taxes: 6_000,
  passive_property_sales: [sale],
  section_1231_lookback_source: {
    source_document_reference: "2020-2024 filed Form 4797 line 8 workpaper",
    nonrecaptured_loss: 0 as const,
  },
  prior_unallowed_passive_operating: 3_000,
  prior_year_8582_source: {
    tax_year: 2024 as const,
    activity_id: sale.activity_id,
    filed_part_vii_column_c: 3_000,
    source_document_reference: "2024 filed Form 8582 Part VII",
  },
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
  return result.pending as MefFormsPending;
}

Deno.test("retained long-held sale calculates section 1231 gain and PAL but needs authenticated prior return to export", () => {
  const pending = filedReturn();
  assertEquals(
    (pending.form8582?.current_4797_sale_gains as
      | { part: string }[]
      | undefined)
      ?.[0]?.part,
    "I",
  );
  assertEquals(pending.schedule1?.line5_schedule_e, -7_000);
  assertEquals(pending.schedule_d?.line_11_form2439, 7_000);
  assertEquals(pending.f1040?.line11_agi, 50_000);
  assertThrows(
    () => buildMefXml(pending, extractFilerIdentity(general)),
    Error,
    "needs authenticated accepted-2024 return and activity ledger",
  );
  const worksheet = form8582Pdf.projectFields!(
    pending.form8582!,
    normalizeAllPending(pending),
  );
  assertEquals(worksheet.part5_1_income, "7000");
  const partI = form4797Pdf.projectFields!(
    pending.form4797!,
    normalizeAllPending(pending),
  );
  assertEquals(partI.pdf_k1_line2_1_gain, 7_000);
  assertEquals(partI.pdf_section_1231_line9, 7_000);
});

Deno.test("retained Part I filing rejects changed sale, lookback, and PAL amounts", () => {
  const pending = filedReturn();
  assertThrows(() =>
    form8582.build(pending.form8582!, {
      pending: {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{
            ...property,
            passive_property_sales: [{ ...sale, gross_sales_price: 19_001 }],
          }],
        },
      },
    }), Error);
  assertThrows(() =>
    form4797.build(pending.form4797!, {
      pending: {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{
            ...property,
            section_1231_lookback_source: undefined,
          }],
        },
      },
    }), Error);
  assertThrows(
    () =>
      form4797Pdf.projectFields!(
        pending.form4797!,
        normalizeAllPending({
          ...pending,
          form8582: { ...pending.form8582, prior_unallowed: 2_999 },
        }),
      ),
    Error,
  );
});
