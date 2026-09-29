import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form4797 } from "./f4797.ts";
import { form8949 } from "./f8949.ts";

Deno.test("Form 4797 investment recapture links Part III to the excess-gain Form 8949 row", () => {
  const fields = { investment_1245_dispositions: [{
    property_id: "investment-1245-1",
    property_description: "Investment equipment",
    acquired_on: "2022-05-01",
    sold_on: "2025-06-01",
    gross_sales_price: 15_000,
    cost_or_other_basis_plus_sale_expense: 12_000,
    depreciation_allowed_or_allowable: 5_000,
    property_held_for_investment_not_business: true as const,
    section_1245_classification_reviewed: true as const,
    direct_cash_sale_no_special_recapture_exception: true as const,
    sale_document_reference: "SALE-2025-1",
    basis_document_reference: "BASIS-2022-1",
    depreciation_schedule_reference: "DEPR-2025-1",
  }] };
  const row = {
    part: "F",
    description: "From Form 4797",
    source_transaction_id: "investment-1245-1",
    form4797_property_id: "investment-1245-1",
    from_form4797_investment_1245: true as const,
    date_acquired: "",
    date_sold: "",
    proceeds: 3_000,
    cost_basis: 0,
    gain_loss: 3_000,
    is_long_term: true,
  };
  const context = { pending: {
    form4797: fields,
    form8949: [row],
    schedule1: { line4_other_gains: 5_000 },
  } };
  const xml = form4797.build(fields, context);
  assertStringIncludes(xml, "<Section1245PropertyAmt>5000</Section1245PropertyAmt>");
  assertStringIncludes(xml, "<NetGainAmt>3000</NetGainAmt>");
  const assetXml = form8949.build([row], context);
  assertStringIncludes(assetXml, "<PropertyDesc>From Form 4797</PropertyDesc>");
  assertEquals(assetXml.includes("<AcquiredDt>"), false);
  assertEquals(assetXml.includes("<CostOrOtherBasisAmt>"), false);
  assertThrows(() => form4797.build(fields, { pending: {
    ...context.pending,
    form8949: [{ ...row, proceeds: 2_999, gain_loss: 2_999 }],
  } }), Error, "matching Form 8949 row");
  assertThrows(() => form4797.build(fields, { pending: {
    ...context.pending,
    schedule1: { line4_other_gains: 5_001 },
  } }), Error, "finalized Schedule 1 line 4");
  assertThrows(() => form4797.build({
    ...fields,
    investment_1245_dispositions: [{
      ...fields.investment_1245_dispositions[0],
      property_description: "Rental property longer",
    }],
  }, context), Error, "20-character MeF limit");
});

Deno.test("Form 4797: no gain or loss does not emit a document", () => {
  assertEquals(form4797.build({}), "");
  assertEquals(form4797.build({ section_1231_gain: 0 }), "");
  assertEquals(form4797.build({ junk: 999 }), "");
});

Deno.test("Form 4797: prior passive losses use finalized Form 8582 Part IX amounts", () => {
  const f8582 = {
    activities: [
      {
        activity_id: "id-Rental A",
        name: "Rental A",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 0,
        prior_unallowed_operating: 2_000,
        prior_unallowed_4797_part1: 6_000,
        prior_unallowed_4797_part2: 2_000,
        prior_year_8582_source: {
          tax_year: 2024,
          activity_id: "id-Rental A",
          filed_part_vii_column_c: 10_000,
          source_document_reference: "2024 filed Form 8582 Part IX",
          filed_part_ix_rows: [
            { reporting_form: "schedule_e", filed_unallowed_loss: 2_000 },
            { reporting_form: "form4797_part1", filed_unallowed_loss: 6_000 },
            { reporting_form: "form4797_part2", filed_unallowed_loss: 2_000 },
          ],
        },
      },
      {
        activity_id: "id-Rental B",
        name: "Rental B",
        activity_type: "B",
        property_type: 1,
        reporting_form: "schedule_e",
        current_net: 4_000,
        prior_unallowed_operating: 0,
        prior_unallowed_4797_part1: 0,
        prior_unallowed_4797_part2: 0,
      },
    ],
    current_income: 4_000,
    prior_unallowed: 10_000,
    has_other_passive: true,
  };
  const xml = form4797.build({}, { pending: { form8582: f8582 } });
  assertStringIncludes(xml, "<PropertyDesc>PAL</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>-2400</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>-2400</TotalGainLossAmt>");
  assertStringIncludes(xml, "<OrdinaryLossAmt>2400</OrdinaryLossAmt>");
  assertStringIncludes(
    xml,
    "<PassiveActivityLossLiteralCd>PAL</PassiveActivityLossLiteralCd>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>-3200</TotalOrdinaryGainLossAmt>",
  );
  assertThrows(
    () =>
      form4797.build({ section_1231_gain: 100 }, {
        pending: { form8582: f8582 },
      }),
    Error,
    "cannot overlap current Form 4797 transactions",
  );
});

Deno.test("Form 4797: section 1231 gain uses Part I line 7", () => {
  const xml = form4797.build({ section_1231_gain: 20_000 });
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>20000</TotalPropertyGainLossAmt>",
  );
  assertEquals(xml.includes("<TotalOrdinaryGainLossAmt>"), false);
  assertEquals(xml.includes("<TotalGainLossAmt>"), false);
});

Deno.test("Form 4797: linked passive property sale rows populate native Parts I and II", () => {
  const rows = [
    {
      activity_id: "id-Land rental",
      activity_name: "Land rental",
      part: "I",
      property_description: "Undeveloped parcel",
      acquired_on: "2023-04-01",
      sold_on: "2025-05-01",
      gross_sales_price: 20_000,
      cost_or_other_basis: 12_000,
      depreciation_allowed: 0,
    },
    {
      activity_id: "id-Land rental",
      activity_name: "Land rental",
      part: "II",
      property_description: "Short-held parcel",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: 9_000,
      cost_or_other_basis: 7_000,
      depreciation_allowed: 0,
    },
  ];
  const scheduleEItem = {
    tsj: "T",
    activity_id: "id-Land rental",
    property_description: "Land rental",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 0,
    form_1099_payments_made: false,
    disposed_of: true,
  };
  const xml = form4797.build(
    { passive_property_sales: rows },
    { pending: { schedule_e: { schedule_es: [scheduleEItem] } } },
  );
  assertStringIncludes(xml, "<PropertySaleOrExchange>");
  assertStringIncludes(xml, "<OrdinaryGainLoss>");
  assertStringIncludes(xml, "<PropertyDesc>Undeveloped parcel</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>8000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>8000</TotalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>2000</TotalOrdinaryGainLossAmt>",
  );
  assertThrows(
    () =>
      form4797.build(
        { passive_property_sales: rows },
        {
          pending: {
            schedule_e: {
              schedule_es: [{
                ...scheduleEItem,
                prior_unallowed_passive_4797_part1: 100,
              }],
            },
          },
        },
      ),
    Error,
    "matching Form 8582 sale allocation",
  );
  assertThrows(
    () =>
      form4797.build({ passive_property_sales: rows }, {
        pending: { schedule_e: { schedule_es: [] } },
      }),
    Error,
    "linked disposed Schedule E activity",
  );
});

Deno.test("Form 4797: retained sale and prior PAL reconcile in both native parts", () => {
  const sales = [
    {
      activity_id: "id-Land rental",
      activity_name: "Land rental",
      part: "I",
      property_description: "Long-held parcel",
      acquired_on: "2023-04-01",
      sold_on: "2025-05-01",
      gross_sales_price: 20_000,
      cost_or_other_basis: 12_000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
    },
    {
      activity_id: "id-Land rental",
      activity_name: "Land rental",
      part: "II",
      property_description: "Short-held parcel",
      acquired_on: "2025-01-01",
      sold_on: "2025-06-01",
      gross_sales_price: 9_000,
      cost_or_other_basis: 7_000,
      depreciation_allowed: 0,
      entire_activity_interest_disposed: false,
    },
  ];
  const xml = form4797.build({ passive_property_sales: sales }, {
    pending: {
      schedule_e: {
        schedule_es: [{
          tsj: "T",
          activity_id: "id-Land rental",
          property_description: "Land rental",
          property_type: 1,
          activity_type: "B",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: 0,
          form_1099_payments_made: false,
          disposed_of: true,
          prior_unallowed_passive_operating: 1_000,
          prior_unallowed_passive_4797_part1: 3_000,
          prior_unallowed_passive_4797_part2: 1_000,
        }],
      },
      form8582: {
        activities: [{
          activity_id: "id-Land rental",
          name: "Land rental",
          activity_type: "B",
          property_type: 1,
          reporting_form: "schedule_e",
          current_net: 0,
          prior_unallowed_operating: 1_000,
          prior_unallowed_4797_part1: 3_000,
          prior_unallowed_4797_part2: 1_000,
        }],
        current_income: 0,
        prior_unallowed: 5_000,
        has_other_passive: true,
        has_current_4797_transaction: true,
        current_4797_sale_gains: [
          {
            activity_id: "id-Land rental",
            activity_name: "Land rental",
            part: "I",
            gain: 8_000,
            entire_activity_interest_disposed: false,
          },
          {
            activity_id: "id-Land rental",
            activity_name: "Land rental",
            part: "II",
            gain: 2_000,
            entire_activity_interest_disposed: false,
          },
        ],
      },
    },
  });
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>5000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>1000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<PassiveActivityLossLiteralCd>PAL</PassiveActivityLossLiteralCd>",
  );
});

Deno.test("Form 4797: active-rental PAL uses finalized Form 8582 allowance", () => {
  const sale = {
    activity_id: "id-Rental house",
    activity_name: "Rental house",
    part: "I",
    property_description: "Retained parcel",
    acquired_on: "2023-04-01",
    sold_on: "2025-05-01",
    gross_sales_price: 12_000,
    cost_or_other_basis: 10_000,
    depreciation_allowed: 0,
    entire_activity_interest_disposed: false,
  };
  const xml = form4797.build({ passive_property_sales: [sale] }, {
    pending: {
      schedule_e: {
        schedule_es: [{
          tsj: "T",
          activity_id: "id-Rental house",
          property_description: "Rental house",
          property_type: 1,
          activity_type: "A",
          fair_rental_days: 365,
          personal_use_days: 0,
          rent_income: 0,
          form_1099_payments_made: false,
          disposed_of: true,
          prior_unallowed_passive_operating: 1_000,
          prior_unallowed_passive_4797_part1: 3_000,
          prior_passive_losses_active_when_incurred: true,
        }],
      },
      form8582: {
        activities: [{
          activity_id: "id-Rental house",
          name: "Rental house",
          activity_type: "A",
          property_type: 1,
          reporting_form: "schedule_e",
          current_net: 0,
          prior_unallowed_operating: 1_000,
          prior_active_participation: true,
          prior_unallowed_4797_part1: 3_000,
          prior_unallowed_4797_part2: 0,
        }],
        prior_unallowed: 4_000,
        rental_prior_eligible_loss: 4_000,
        has_active_rental: true,
        active_participation: true,
        has_current_4797_transaction: true,
        current_4797_sale_gains: [{
          activity_id: "id-Rental house",
          activity_name: "Rental house",
          part: "I",
          gain: 2_000,
          entire_activity_interest_disposed: false,
        }],
        modified_agi: 200_000,
      },
    },
  });
  assertStringIncludes(
    xml,
    "<PropertyDesc>PAL</PropertyDesc><GainOrLossAmt>-2000</GainOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<PropertyDesc>Retained parcel</PropertyDesc>",
  );
  assertStringIncludes(
    xml,
    "<PassiveActivityLossLiteralCd>PAL</PassiveActivityLossLiteralCd>",
  );
});

Deno.test("Form 4797: Form 6252 section 1231 gain appears on line 4 and line 7", () => {
  const xml = form4797.build({
    section_1231_gain: 8_000,
    gain_form6252: 8_000,
  });
  assertStringIncludes(
    xml,
    "<GainInstallmentSalesFrm6252Amt>8000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>8000</TotalPropertyGainLossAmt>",
  );
  assertThrows(
    () => form4797.build({ section_1231_gain: 7_000, gain_form6252: 8_000 }),
    Error,
    "included in its line 7",
  );
});

Deno.test("Form 4797: Form 8824 section 1231 gain appears on line 5 and line 7", () => {
  const xml = form4797.build({
    section_1231_gain: 8_000,
    gain_form8824: 8_000,
  });
  assertStringIncludes(xml, "<GainLossForm8824Amt>8000</GainLossForm8824Amt>");
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>8000</TotalPropertyGainLossAmt>",
  );
});

Deno.test("Form 4797: partnership and S-corp K-1 amounts retain line 2 source rows", () => {
  const xml = form4797.build({
    section_1231_gain: 7_000,
    k1_1231_rows: [
      { source: "partnership", entity_name: "Partner One", gain_loss: 10_000 },
      { source: "s_corp", entity_name: "Corp Two", gain_loss: -3_000 },
    ],
  });
  assertStringIncludes(xml, "<PropertyDesc>K-1 Form 1065</PropertyDesc>");
  assertStringIncludes(xml, "<PropertyDesc>K-1 Form 1120-S</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<DateAcquiredInheritedCd>FROM SCHEDULE K-1 F1120S</DateAcquiredInheritedCd>",
  );
  assertStringIncludes(xml, "<GainOrLossAmt>10000</GainOrLossAmt>");
  assertStringIncludes(xml, "<GainOrLossAmt>-3000</GainOrLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>7000</TotalPropertyGainLossAmt>",
  );
});

Deno.test("Form 4797: prior section 1231 loss recaptures only the smaller gain", () => {
  const xml = form4797.build({
    section_1231_gain: 20_000,
    nonrecaptured_1231_loss: 5_000,
  });
  assertStringIncludes(
    xml,
    "<NonrecapturedNet1231LossesAmt>5000</NonrecapturedNet1231LossesAmt>",
  );
  assertStringIncludes(xml, "<TotalGainLossAmt>15000</TotalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<PropGainNonrecapturedLossAmt>5000</PropGainNonrecapturedLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>5000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>5000</OtherGainLossAmt>");
});

Deno.test("Form 4797: prior loss exceeding current gain recaptures all current gain", () => {
  const xml = form4797.build({
    section_1231_gain: 3_000,
    nonrecaptured_1231_loss: 8_000,
  });
  assertStringIncludes(xml, "<TotalGainLossAmt>0</TotalGainLossAmt>");
  assertStringIncludes(
    xml,
    "<PropGainNonrecapturedLossAmt>3000</PropGainNonrecapturedLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>3000</OtherGainLossAmt>");
});

Deno.test("Form 4797: section 1231 loss flows through Part II lines 11, 17, and 18b", () => {
  const xml = form4797.build({ section_1231_gain: -4_000 });
  assertStringIncludes(
    xml,
    "<TotalPropertyGainLossAmt>-4000</TotalPropertyGainLossAmt>",
  );
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>-4000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-4000</OtherGainLossAmt>");
});

Deno.test("Form 4797: Form 4684 business loss reaches line 14 and Schedule 1 total", () => {
  const xml = form4797.build({ ordinary_gain_form4684: -20_000 });
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>-20000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>-20000</TotalOrdinaryGainLossAmt>",
  );
  assertStringIncludes(xml, "<OtherGainLossAmt>-20000</OtherGainLossAmt>");
  assertEquals(xml.includes("<TotalPropertyGainLossAmt>"), false);
});

Deno.test("Form 4797: source amounts reconcile even when the ordinary total is zero", () => {
  const xml = form4797.build({
    section_1231_gain: -4_000,
    ordinary_gain_form4684: 4_000,
  });
  assertStringIncludes(xml, "<OrdinaryLossAmt>4000</OrdinaryLossAmt>");
  assertStringIncludes(
    xml,
    "<NetGainLossForm4684Amt>4000</NetGainLossForm4684Amt>",
  );
  assertStringIncludes(
    xml,
    "<TotalOrdinaryGainLossAmt>0</TotalOrdinaryGainLossAmt>",
  );
});

Deno.test("Form 4797: line 8 requires a current positive section 1231 gain", () => {
  assertThrows(
    () => form4797.build({ nonrecaptured_1231_loss: 5_000 }),
    Error,
    "line 8",
  );
  assertThrows(
    () =>
      form4797.build({
        section_1231_gain: -2_000,
        nonrecaptured_1231_loss: 5_000,
      }),
    Error,
    "line 8",
  );
});

Deno.test("Form 4797: ordinary and recapture aggregates need source detail", () => {
  assertThrows(
    () => form4797.build({ ordinary_gain: 8_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_1245: 3_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_1250: 1_500 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => form4797.build({ recapture_form6252: 10_000 }),
    Error,
    "source-line and property detail",
  );
  assertThrows(
    () => buildMefXml({ form4797: { ordinary_gain: 8_000 } }, testFiler()),
    Error,
    "source-line and property detail",
  );
});

Deno.test("Form 4797: amounts must be whole dollars", () => {
  assertThrows(
    () => form4797.build({ section_1231_gain: 1.5 }),
    Error,
    "whole-dollar",
  );
  assertThrows(
    () =>
      form4797.build({ section_1231_gain: 100, nonrecaptured_1231_loss: -1 }),
    Error,
    "negative",
  );
});
