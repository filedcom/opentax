import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  type PriorYearAsset,
  PriorYearConvention,
  priorYearDepreciation,
  PriorYearMethod,
  PriorYearRecoveryPeriod,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/prior-year.ts";

// Synthetic assets. Rates are Pub. 946 (2025), Appendix A: Table A-6 gives a
// January-placed residential rental 3.485% in year 1, 3.636% in years 2-9,
// then 3.637% in even years; 2025 is recovery year 14 of a 2012 rental.
const rental: PriorYearAsset = {
  asset_description: "Residential rental building",
  placed_in_service_date: "2012-01-01",
  cost_or_other_basis: 149_683,
  business_use_pct: 100,
  section179_deduction: 0,
  special_depreciation_allowance: 0,
  recovery_period: PriorYearRecoveryPeriod.Residential,
  method: PriorYearMethod.StraightLine,
  convention: PriorYearConvention.MidMonth,
  prior_depreciation: 70_529,
  not_disposed_in_tax_year_verified: true,
};

test("Table A-6 year 14 depreciates a 2012 residential rental", () => {
  const row = priorYearDepreciation(rental, 2025);
  assertEquals(row.recovery_year, 14);
  assertEquals(row.rate_pct, 3.637);
  assertEquals(row.deduction, 5_444);
});

test("Pub. 946 table rates for real and personal property", () => {
  const rate = (asset: Partial<PriorYearAsset>, year: number) =>
    priorYearDepreciation({ ...rental, prior_depreciation: 0, ...asset }, year)
      .rate_pct;
  // Table A-6: July-December take 3.636% in even years from year 10;
  // December's year 29 is the remainder.
  assertEquals(rate({ placed_in_service_date: "2012-07-01" }, 2025), 3.636);
  assertEquals(rate({ placed_in_service_date: "1997-12-01" }, 2025), 1.667);
  assertEquals(rate({ placed_in_service_date: "1998-01-01" }, 2025), 1.97);
  // Table A-7a: 2.564% in years 2-39; year 40 of a January property 0.107%.
  const building = {
    recovery_period: PriorYearRecoveryPeriod.Nonresidential,
  };
  assertEquals(rate({ ...building, placed_in_service_date: "2020-03-01" }, 2025), 2.564);
  assertEquals(rate({ ...building, placed_in_service_date: "2000-01-01" }, 2039), 0.107);
  const personal = {
    recovery_period: PriorYearRecoveryPeriod.Year7,
    method: PriorYearMethod.DoubleDeclining,
    convention: PriorYearConvention.HalfYear,
  };
  // Table A-1, 7-year, year 4: 12.49%. Table A-5 (fourth quarter), 5-year,
  // year 2: 38.00%.
  assertEquals(rate({ ...personal, placed_in_service_date: "2022-05-01" }, 2025), 12.49);
  assertEquals(
    rate({
      ...personal,
      recovery_period: PriorYearRecoveryPeriod.Year5,
      convention: PriorYearConvention.MidQuarter,
      placed_in_service_date: "2024-11-15",
    }, 2025),
    38,
  );
  // Fully recovered property has no deduction.
  assertEquals(rate({ ...personal, placed_in_service_date: "2010-05-01" }, 2025), 0);
  assertThrows(
    () => priorYearDepreciation({ ...rental, convention: PriorYearConvention.HalfYear }, 2025),
    Error,
    "mid-month",
  );
});

test("a prior-year rental asset reaches Schedule E line 18 and Schedule 1", () => {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1975-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 6_000 }],
    schedule_e: [{
      tsj: "T",
      activity_id: "rental-2012",
      property_description: "Elm St rental",
      property_type: 1,
      activity_type: "A",
      street_address: "10 Elm St",
      city: "Austin",
      state: "TX",
      zip: "78701",
      fair_rental_days: 365,
      personal_use_days: 0,
      rent_income: 30_000,
      expense_repairs: 5_000,
      form_1099_payments_made: false,
      prior_year_assets: [rental],
    }],
  });
  assertEquals(result.diagnostics, []);
  const row = (result.pending.schedule_e.schedule_es as Record<string, unknown>[])[0];
  assertEquals(row.expense_depreciation, 5_444);
  assertEquals(row.prior_year_assets, undefined);
  assertEquals(result.pending.schedule1.line5_schedule_e, 19_556);
  assertEquals(result.pending.f1040.line11_agi, 69_556);
});
