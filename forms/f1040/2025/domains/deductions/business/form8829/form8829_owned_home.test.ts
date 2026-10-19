import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { TS } from "../../../../../nodes/types.ts";
import {
  calculateOwnedHomeForm8829,
  OwnedHomeDeductionRoute,
  type OwnedHomeSource,
} from "../../../../../nodes/intermediate/forms/deductions/business/form_8829/index.ts";

// Synthetic owned home, 600 of 6,000 sq ft (10%), figured by hand from the
// 2025 Instructions for Form 8829: lines 10-11 for an itemizer, lines 16-24
// operating expenses, the line 15 and 28 income limits, Part III depreciation
// at 2.564% for business use that began before 2025, and Part IV carryovers.
const ownedHome: OwnedHomeSource = {
  business_reference: "Owner-consulting",
  home_identifier: "Owned-home-2025",
  recipient: TS.T,
  business_area_sqft: 600,
  total_area_sqft: 6_000,
  schedule_c_line29_tentative_profit: 120_000,
  deduction_route: OwnedHomeDeductionRoute.Itemized,
  mortgage_interest_indirect: 64_962,
  excess_mortgage_interest_indirect: 0,
  real_estate_taxes_indirect: 25_095,
  state_local_taxes_within_limit_verified: true,
  insurance_indirect: 7_166,
  repairs_direct: 0,
  repairs_indirect: 10_483,
  utilities_indirect: 20_646,
  other_indirect: 3_862,
  prior_operating_carryover: 0,
  prior_casualty_and_depreciation_carryover: 0,
  depreciation: {
    home_cost_or_other_basis: 700_000,
    home_fmv_when_business_use_began: 820_000,
    land_basis: 130_000,
    business_use_began_year: 2021,
    business_use_began_month: 3,
    no_additions_after_business_use_verified: true,
  },
  regular_exclusive_use_verified: true,
  actual_expense_method_verified: true,
  sole_home_and_business_verified: true,
  all_schedule_c_gross_income_attributable_to_home_verified: true,
  no_daycare_or_inventory_exception: true,
  no_home_business_gain_or_other_trade_loss: true,
  no_casualty_loss: true,
  home_expenses_excluded_from_schedule_c_verified: true,
  direct_repairs_business_area_only_verified: true,
  home_interest_and_taxes_entered_only_here_verified: true,
};

test("owned-home Form 8829 deducts interest, taxes, operating costs and depreciation", () => {
  const lines = calculateOwnedHomeForm8829(ownedHome, 2025);
  assertEquals(lines.line7, 0.1);
  assertEquals(lines.line12b, 90_057);
  assertEquals(lines.line13, 9_006);
  assertEquals(lines.line15, 110_994);
  assertEquals(lines.line23b, 42_157);
  assertEquals(lines.line24, 4_216);
  assertEquals(lines.line27, 4_216);
  assertEquals(lines.line40, 57_000);
  assertEquals(lines.line42, 1_461);
  assertEquals(lines.line33, 1_461);
  assertEquals(lines.line36, 14_683);
  assertEquals(lines.line43, 0);
  assertEquals(lines.line44, 0);
  // Lines 10-11: the personal shares stay on Schedule A lines 8a and 5b.
  assertEquals(lines.schedule_a_mortgage_interest, 58_466);
  assertEquals(lines.schedule_a_real_estate_taxes, 22_585);
});

test("owned-home Form 8829 reaches Schedule C line 30 and Schedule A", () => {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1975-06-15",
      address_line1: "1 Example Way",
      address_city: "Albany",
      address_state: "NY",
      address_zip: "12207",
      digital_assets: false,
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      business_reference: ownedHome.business_reference,
      proprietor_recipient: TS.T,
      line_a_principal_business: "Consulting",
      line_b_business_code: "541600",
      line_c_business_name: "Alex Owner Consulting",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      qbi_no_other_adjustments_confirmed: true,
      line_1_gross_receipts: 120_000,
    }],
    form_8829: { owned_home: ownedHome },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form_8829.line36, 14_683);
  assertEquals(result.pending.schedule1.line3_schedule_c, 105_317);
  assertEquals(result.pending.schedule_a.line_8a_mortgage_interest_1098, 58_466);
  assertEquals(result.pending.schedule_a.line_5b_real_estate_tax, 22_585);
});

test("owned-home Form 8829 limits operating costs and depreciation to income", () => {
  const lines = calculateOwnedHomeForm8829(
    { ...ownedHome, schedule_c_line29_tentative_profit: 10_000 },
    2025,
  );
  assertEquals(lines.line15, 994);
  assertEquals(lines.line27, 994);
  assertEquals(lines.line28, 0);
  assertEquals(lines.line33, 0);
  assertEquals(lines.line36, 10_000);
  assertEquals(lines.line43, 3_222);
  assertEquals(lines.line44, 1_461);
  const carried = calculateOwnedHomeForm8829({
    ...ownedHome,
    prior_operating_carryover: 3_222,
    prior_casualty_and_depreciation_carryover: 1_461,
  }, 2025);
  assertEquals(carried.line26, 7_438);
  assertEquals(carried.line32, 2_922);
  assertEquals(carried.line36, 19_366);
});

test("owned-home Form 8829 standard-deduction route and first-year depreciation", () => {
  const standard = calculateOwnedHomeForm8829({
    ...ownedHome,
    deduction_route: OwnedHomeDeductionRoute.Standard,
  }, 2025);
  // Lines 16-17 carry the interest and taxes; nothing goes to Schedule A.
  assertEquals(standard.line12b, 0);
  assertEquals(standard.line16b, 64_962);
  assertEquals(standard.line17b, 25_095);
  assertEquals(standard.line24, 13_221);
  assertEquals(standard.schedule_a_mortgage_interest, 0);
  assertEquals(standard.schedule_a_real_estate_taxes, 0);
  const july = calculateOwnedHomeForm8829({
    ...ownedHome,
    depreciation: {
      ...ownedHome.depreciation!,
      business_use_began_year: 2025,
      business_use_began_month: 7,
    },
  }, 2025);
  assertEquals(july.line41, 0.01177);
  assertEquals(july.line42, 671);
  assertThrows(
    () =>
      calculateOwnedHomeForm8829({
        ...ownedHome,
        state_local_taxes_within_limit_verified: undefined,
      }, 2025),
    Error,
    "Line 11 Worksheet",
  );
});
