import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8936 } from "./f8936.ts";

const vehicle = {
  vin: "1HGCM82633A004352",
  vehicle_year: 2025,
  vehicle_make: "Example",
  vehicle_model: "EV",
  placed_in_service_date: "2025-09-30",
  acquisition_date: "2025-09-30",
  seller_report_received: true,
  transferred_to_dealer: false,
  resold_within_30_days: false,
  acquired_for_use_not_resale: true,
  is_new_vehicle: true,
  credit_amount: 7_500,
  msrp: 45_000,
  vehicle_type: "other" as const,
};

const source = {
  current_year_magi: {
    adjusted_gross_income: 50_000,
    excluded_puerto_rico_income: 1_000,
  },
  prior_year_magi: { adjusted_gross_income: 48_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
  f8936s: [vehicle],
};

function context(line18: number, line6f = 7_500, line6m = 0) {
  return {
    pending: {
      f1040: { line11_agi: 50_000, line18_total_tax_before_credits: line18 },
      schedule3: { line6f_total: line6f, line6m_total: line6m },
    },
  };
}

Deno.test("Form 8936: current/prior MAGI groups and new credit follow 2025 XSD lines", () => {
  const xml = form8936.build(source, context(10_000));
  assertStringIncludes(xml, "<CurrentYrMAGIAmountGrp>");
  assertStringIncludes(
    xml,
    "<AdjustedGrossIncomeAmt>50000</AdjustedGrossIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExcldSect933PuertoRicoIncmAmt>1000</ExcldSect933PuertoRicoIncmAmt>",
  );
  assertStringIncludes(xml, "<NetIncomeAmt>51000</NetIncomeAmt>");
  assertStringIncludes(xml, "<PriorYrMAGIAmountGrp>");
  assertStringIncludes(
    xml,
    "<PYIndivReturnFilingStatusCd>1</PYIndivReturnFilingStatusCd>",
  );
  assertStringIncludes(
    xml,
    "<PrsnlUseNewCleanVehicleCrAmt>7500</PrsnlUseNewCleanVehicleCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalTaxBeforeCrAndOthTaxesAmt>10000</TotalTaxBeforeCrAndOthTaxesAmt>",
  );
  assertStringIncludes(
    xml,
    "<CleanVehPrsnlUsePartCrAmt>7500</CleanVehPrsnlUsePartCrAmt>",
  );
});

Deno.test("Form 8936: previously owned credit uses Part IV and prior MFJ status code", () => {
  const used = {
    ...vehicle,
    is_new_vehicle: false,
    vehicle_year: 2022,
    credit_amount: undefined,
    sale_price: 15_000,
    claimed_as_dependent: false,
    claimed_prev_owned_credit_last_3_years: false,
    purchased_from_dealer: true,
    previously_owned_first_eligible_transfer: true,
  };
  const xml = form8936.build({
    ...source,
    prior_year_filing_status: FilingStatus.MFJ,
    f8936s: [used],
  }, context(10_000, 0, 4_000));
  assertStringIncludes(
    xml,
    "<PYIndivReturnFilingStatusCd>2</PYIndivReturnFilingStatusCd>",
  );
  assertStringIncludes(xml, "<CrPreviouslyOwnedCleanVehGrp>");
  assertStringIncludes(
    xml,
    "<PrevOwnedCleanVehCreditAmt>4000</PrevOwnedCleanVehCreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<MaxPrevOwnedCleanVehCrAmt>4000</MaxPrevOwnedCleanVehCrAmt>",
  );
});

Deno.test("Form 8936: empty vehicle input emits no document", () => {
  assertEquals(form8936.build({ ...source, f8936s: [] }), "");
});

Deno.test("Form 8936: tax-liability shortage caps line 13 but preserves tentative line 9", () => {
  const xml = form8936.build(source, context(5_000, 5_000));
  assertStringIncludes(
    xml,
    "<PrsnlUseNewCleanVehicleCrAmt>7500</PrsnlUseNewCleanVehicleCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<AdjustedPersonalTaxCreditsAmt>5000</AdjustedPersonalTaxCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CleanVehPrsnlUsePartCrAmt>5000</CleanVehPrsnlUsePartCrAmt>",
  );
});

Deno.test("Form 8936: mismatched Schedule 3 credit stops XML", () => {
  assertThrows(
    () => form8936.build(source, context(10_000, 5_000)),
    Error,
    "does not reconcile",
  );
});

Deno.test("Form 8936: mismatched Form 1040 AGI stops XML", () => {
  assertThrows(
    () =>
      form8936.build(source, {
        pending: {
          f1040: {
            line11_agi: 49_000,
            line18_total_tax_before_credits: 10_000,
          },
          schedule3: { line6f_total: 7_500 },
        },
      }),
    Error,
    "does not match",
  );
});

Deno.test("Form 8936: dealer transfer is not silently serialized as a claimed personal credit", () => {
  const xml = form8936.build({
    ...source,
    f8936s: [{
      ...vehicle,
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }],
  }, context(10_000, 0));
  assertStringIncludes(xml, "<IRS8936>");
  assertEquals(xml.includes("<CrPrsnlUsePartNewCleanVehGrp>"), false);
});

Deno.test("Form 8936: disqualified dealer transfer requires matching Schedule 2 repayment", () => {
  const transferred = {
    ...source,
    current_year_magi: { adjusted_gross_income: 200_000 },
    prior_year_magi: { adjusted_gross_income: 200_000 },
    f8936s: [{
      ...vehicle,
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }],
  };
  assertThrows(
    () =>
      form8936.build(transferred, {
        pending: {
          f1040: {
            line11_agi: 200_000,
            line18_total_tax_before_credits: 7_500,
          },
        },
      }),
    Error,
    "does not reconcile with Schedule 2",
  );
  const xml = form8936.build(transferred, {
    pending: {
      f1040: { line11_agi: 200_000, line18_total_tax_before_credits: 7_500 },
      schedule2: { line1b_new_clean_vehicle_repayment: 7_500 },
    },
  });
  assertStringIncludes(xml, "<IRS8936>");
});

Deno.test("Form 8936: business-use amount is held for Form 3800 routing", () => {
  assertThrows(
    () =>
      form8936.build({
        ...source,
        f8936s: [{ ...vehicle, business_use_pct: 0.25 }],
      }, context(10_000, 5_625)),
    Error,
    "Form 3800 routing",
  );
});
