import { assertEquals, assertStringIncludes } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8936ScheduleA } from "./f8936_schedule_a.ts";

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
};

const taxpayer = {
  current_year_magi: { adjusted_gross_income: 50_000 },
  prior_year_magi: { adjusted_gross_income: 50_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
};

Deno.test("Form 8936 Schedule A: one new-vehicle document carries VIN, service date, and personal amount", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      business_use: {
        kind: "mileage",
        business_miles: 250,
        commuting_miles: 0,
        total_miles: 1_000,
        months_in_business_use: 12,
      },
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<VehicleModelYr>2025</VehicleModelYr>");
  assertStringIncludes(xml[0], "<VIN>1HGCM82633A004352</VIN>");
  assertStringIncludes(
    xml[0],
    "<VehiclePlacedInServiceDt>2025-09-30</VehiclePlacedInServiceDt>",
  );
  assertStringIncludes(
    xml[0],
    "<BusinessInvestmentUsePct>0.25000</BusinessInvestmentUsePct>",
  );
  assertStringIncludes(
    xml[0],
    "<BusinessInvestmentUseAmt>1875</BusinessInvestmentUseAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<PrsnlUseNewCleanVehicleCrAmt>5625</PrsnlUseNewCleanVehicleCrAmt>",
  );
});

Deno.test("Form 8936 Schedule A: fully business-use vehicle still has its own document", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      business_use: {
        kind: "mileage",
        business_miles: 1_000,
        commuting_miles: 0,
        total_miles: 1_000,
        months_in_business_use: 12,
      },
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0],
    "<BusinessInvestmentUseAmt>7500</BusinessInvestmentUseAmt>",
  );
  assertEquals(xml[0].includes("<PrsnlUseNewCleanVehicleCrAmt>"), false);
});

Deno.test("Form 8936 Schedule A: commercial Part V includes source-backed basis and incremental cost", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "qualified_commercial_clean_vehicle",
      business_credit_subject_to_passive_activity_limit: false,
      commercial: {
        owned_by_taxpayer: true,
        qualified_manufacturer: true,
        original_use_begins_with_taxpayer: true,
        claimed_new_clean_credit_for_vin: false,
        primarily_used_in_us: true,
        subject_to_depreciation: true,
        vehicle_design: "street_vehicle",
        powered_partly_by_gas_or_diesel: true,
        gvwr_pounds: 10_000,
        cost_or_other_basis: 50_000,
        section179_expense_deduction: 10_000,
        incremental_cost: {
          kind: "comparable_vehicle",
          purchase_price: 50_000,
          comparable_vehicle_price: 43_000,
          comparable_vehicle_description: "Comparable diesel van",
          comparable_in_size_and_use: true,
        },
        propulsion: {
          kind: "plug_in_electric",
          battery_capacity_kwh: 8,
          externally_rechargeable: true,
        },
      },
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<QlfyCmrclCleanVehicleYesGrp>");
  assertStringIncludes(
    xml[0],
    "<NetSect179ExpenseDedAmt>40000</NetSect179ExpenseDedAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<NetSect179ExpenseDedPctAmt>6000</NetSect179ExpenseDedPctAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<VehicleIncrementalCostAmt>7000</VehicleIncrementalCostAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<QlfyCmrclCleanVehicleCrAmt>6000</QlfyCmrclCleanVehicleCrAmt>",
  );
});

Deno.test("Form 8936 Schedule A: odd-dollar business split stays additive", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      credit_amount: 1_001,
      msrp: 45_000,
      vehicle_type: "other",
      business_use: {
        kind: "mileage",
        business_miles: 500,
        commuting_miles: 0,
        total_miles: 1_000,
        months_in_business_use: 12,
      },
    }],
  });
  assertStringIncludes(
    xml[0],
    "<BusinessInvestmentUseAmt>501</BusinessInvestmentUseAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<PrsnlUseNewCleanVehicleCrAmt>500</PrsnlUseNewCleanVehicleCrAmt>",
  );
});

Deno.test("Form 8936 Schedule A: previously owned vehicle uses Part IV group", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      vehicle_year: 2022,
      credit_kind: "previously_owned_clean_vehicle",
      sale_price: 15_000,
      claimed_as_dependent: false,
      claimed_prev_owned_credit_last_3_years: false,
      purchased_from_dealer: true,
      previously_owned_first_eligible_transfer: true,
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<PrevOwnCleanVehicleGrp>");
  assertStringIncludes(xml[0], "<SalePriceAmt>15000</SalePriceAmt>");
  assertStringIncludes(
    xml[0],
    "<PrevOwnedCleanVehCreditAmt>4000</PrevOwnedCleanVehCreditAmt>",
  );
});

Deno.test("Form 8936 Schedule A: dealer transfer retains filing document", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<CrTrnsfrDlrSaleInd>true</CrTrnsfrDlrSaleInd>");
  assertStringIncludes(xml[0], "<CrTrnsfrDlrSaleAmt>7500</CrTrnsfrDlrSaleAmt>");
});

Deno.test("Form 8936 Schedule A: ineligible dealer transfer marks the directed repayment box", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    current_year_magi: { adjusted_gross_income: 200_000 },
    prior_year_magi: { adjusted_gross_income: 200_000 },
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
      transferred_to_dealer: true,
      transferred_amount: 7_500,
    }],
  });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0],
    "<NotAllowedClaimClnVehCrInd>X</NotAllowedClaimClnVehCrInd>",
  );
  assertStringIncludes(
    xml[0],
    "<AmtGrtrThanCYFSLimitInd>true</AmtGrtrThanCYFSLimitInd>",
  );
  assertStringIncludes(
    xml[0],
    "<AmtGrtrThanPYFSLimitInd>true</AmtGrtrThanPYFSLimitInd>",
  );
});

Deno.test("Form 8936 Schedule A: post-cutoff acquisition with no transfer emits no document", () => {
  const xml = form8936ScheduleA.build({
    ...taxpayer,
    f8936s: [{
      ...vehicle,
      credit_kind: "new_clean_vehicle",
      acquisition_date: "2025-10-01",
      credit_amount: 7_500,
      msrp: 45_000,
      vehicle_type: "other",
    }],
  });
  assertEquals(xml, []);
});
