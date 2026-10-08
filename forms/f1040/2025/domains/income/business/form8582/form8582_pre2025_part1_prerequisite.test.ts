import { assertEquals, assertThrows } from "@std/assert";
import {
  inputSchema as scheduleEInputSchema,
  reviewPre2025PartIEntireGainCandidate,
  scheduleE,
} from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { passivePropertySaleSchema } from "../../../../../nodes/intermediate/forms/income/business/form4797/index.ts";
import { form4797 } from "../../../../mef/forms/income/business/f4797.ts";
import { form8582 } from "../../../../mef/forms/income/business/f8582/f8582.ts";
import { form4797Pdf } from "../../../../pdf/forms/income/business/f4797.ts";
import { form8582Pdf } from "../../../../pdf/forms/income/business/f8582.ts";

const sale = {
  activity_id: "long-held-rental",
  activity_name: "Long-held rental",
  part: "I" as const,
  property_description: "Rental land",
  acquired_on: "2023-04-01",
  sold_on: "2025-08-01",
  gross_sales_price: 17_000,
  cost_or_other_basis: 10_000,
  depreciation_allowed: 0 as const,
  entire_activity_interest_disposed: true,
  buyer_unrelated: true,
  fully_taxable: true,
  installment_method: false,
  disposition_document_reference: "2025 entire-interest closing statement",
};

const property = {
  tsj: "T",
  activity_id: sale.activity_id,
  property_description: sale.activity_name,
  property_type: 5,
  activity_type: "B",
  fair_rental_days: 200,
  personal_use_days: 0,
  rent_income: 0,
  expense_taxes: 3_000,
  form_1099_payments_made: false,
  disposed_of: true,
  passive_property_sales: [sale],
  section_1231_lookback_source: {
    source_document_reference: "2020–2024 Form 4797 loss history",
    nonrecaptured_loss: 0 as const,
  },
  pre2025_part1_entire_disposition_source: {
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    activity_acquired_on: sale.acquired_on,
    acquisition_document_reference: "2023 signed purchase statement",
    prior_year_schedule_e_document_reference: "2024 filed Schedule E",
    prior_year_unallowed_passive_loss: 0 as const,
    not_grouped_with_other_activity: true as const,
  },
};

const parsed = (item: unknown) =>
  scheduleEInputSchema.parse({ schedule_es: [item] }).schedule_es[0];
const pending = { schedule_e: { schedule_es: [property] } };
const proposed8582 = {
  activities: [{
    activity_id: sale.activity_id,
    name: sale.activity_name,
    activity_type: "B",
    property_type: 5,
    reporting_form: "schedule_e",
    current_net: -3_000,
    prior_unallowed_operating: 0,
    prior_unallowed_4797_part1: 0,
    prior_unallowed_4797_part2: 0,
  }],
  current_loss: 3_000,
  has_other_passive: true,
  has_current_4797_transaction: true,
  current_4797_sale_gains: [{
    activity_id: sale.activity_id,
    activity_name: sale.activity_name,
    part: "I",
    gain: 7_000,
    entire_activity_interest_disposed: true,
  }],
};

Deno.test("pre-2025 Part I candidate reconciles sale character and operating loss but remains unfileable", () => {
  assertEquals(reviewPre2025PartIEntireGainCandidate(parsed(property)), {
    activity_id: sale.activity_id,
    part: "I",
    sale_gain: 7_000,
    current_schedule_e_loss: 3_000,
    overall_gain: 4_000,
  });
  assertThrows(
    () =>
      scheduleE.compute(
        { taxYear: 2025, formType: "f1040" },
        scheduleEInputSchema.parse({ schedule_es: [property] }),
      ),
    Error,
    "executor-owned authentication of the accepted prior-year activity",
  );
  assertThrows(
    () => form8582.build(proposed8582, { pending }),
    Error,
    "executor-owned authentication of accepted prior-year activity",
  );
  assertThrows(
    () => form8582Pdf.projectFields!(proposed8582, pending),
    Error,
    "executor-owned authentication of accepted prior-year activity",
  );
  assertThrows(
    () => form4797.build({ passive_property_sales: [sale] }, { pending }),
    Error,
    "executor-owned authentication of accepted prior-year activity",
  );
  assertThrows(
    () =>
      form4797Pdf.projectFields!(
        { passive_property_sales: [sale] },
        pending,
      ),
    Error,
    "executor-owned authentication of accepted prior-year activity",
  );
});

Deno.test("pre-2025 Part I candidate rejects purchase, prior activity, closing, and lookback tampering", () => {
  for (
    const changed of [
      { ...property, pre2025_part1_entire_disposition_source: undefined },
      {
        ...property,
        pre2025_part1_entire_disposition_source: {
          ...property.pre2025_part1_entire_disposition_source,
          activity_acquired_on: "2022-04-01",
        },
      },
      {
        ...property,
        pre2025_part1_entire_disposition_source: {
          ...property.pre2025_part1_entire_disposition_source,
          activity_id: "other-rental",
        },
      },
      {
        ...property,
        passive_property_sales: [{ ...sale, buyer_unrelated: false }],
      },
      { ...property, section_1231_lookback_source: undefined },
      { ...property, prior_unallowed_passive_operating: 0 },
    ]
  ) {
    assertThrows(
      () => reviewPre2025PartIEntireGainCandidate(parsed(changed)),
      Error,
      "matching purchase, closing, filed prior activity, zero-PAL",
    );
  }
});

Deno.test("a 2025 purchase and sale cannot be a direct section 1231 Part I transaction", () => {
  assertThrows(
    () =>
      passivePropertySaleSchema.parse({
        ...sale,
        acquired_on: "2025-01-01",
        sold_on: "2025-12-31",
      }),
    Error,
    "cannot meet the more-than-one-year holding period",
  );
});
