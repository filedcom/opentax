import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import { TS } from "../../../nodes/types.ts";
import {
  calculateRentedHomeForm8829,
  type RentedHomeSource,
} from "../../../nodes/intermediate/forms/form_8829/index.ts";
import { form8829 } from "./f8829.ts";

const source: RentedHomeSource = {
  business_reference: "C-1",
  home_identifier: "HOME-1",
  recipient: TS.T,
  business_area_sqft: 200,
  total_area_sqft: 1_000,
  schedule_c_line29_tentative_profit: 5_000,
  insurance_indirect: 1_000,
  rent_indirect: 10_000,
  repairs_indirect: 500,
  utilities_indirect: 2_000,
  other_indirect: 500,
  prior_operating_carryover: 100,
  regular_exclusive_use_verified: true,
  actual_expense_method_verified: true,
  rented_home_verified: true,
  sole_home_and_business_verified: true,
  no_daycare_or_inventory_exception: true,
  no_home_business_gain_or_other_trade_loss: true,
  no_casualty_mortgage_tax_or_depreciation: true,
  home_expenses_excluded_from_schedule_c_verified: true,
};

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAX",
  fullName: "Alex Taxpayer",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

function context(sourceFacts: RentedHomeSource = source) {
  const lines = calculateRentedHomeForm8829(sourceFacts);
  return {
    filer,
    pending: {
      schedule_c: {
        schedule_cs: [{
          business_reference: "C-1",
          line_a_principal_business: "Consulting",
          line_b_business_code: "541600",
          line_f_accounting_method: "cash",
          line_g_material_participation: true,
          line_1_gross_receipts: 5_000,
        }],
        ...(lines.line36 > 0 ? { line_30_home_office: lines.line36 } : {}),
      },
    },
  };
}

Deno.test("2025 Form 8829 empty pending slice emits no document", () => {
  assertEquals(form8829.build({}), "");
});

Deno.test("2025 Form 8829 MeF rejects positive line 36 without item-linked Schedule C line 30", () => {
  assertThrows(
    () =>
      form8829.build({
        rented_home: source,
        ...calculateRentedHomeForm8829(source),
      }, context()),
    Error,
    "cannot be reconciled to filed Schedule C item line 30",
  );
});

Deno.test("2025 Form 8829 files line 43 carryover with zero current deduction", () => {
  const noIncome = { ...source, schedule_c_line29_tentative_profit: 0 };
  const xml = form8829.build(
    { rented_home: noIncome, ...calculateRentedHomeForm8829(noIncome) },
    {
      ...context(noIncome),
      pending: {
        schedule_c: {
          ...context(noIncome).pending.schedule_c,
          schedule_cs: [{
            ...context(noIncome).pending.schedule_c.schedule_cs[0],
            line_1_gross_receipts: 0,
          }],
        },
      },
    },
  );
  assertStringIncludes(
    xml,
    "<AllowableHomeBusExpnssSchCAmt>0</AllowableHomeBusExpnssSchCAmt>",
  );
  assertStringIncludes(xml, "<ProprietorNm>Alex Taxpayer</ProprietorNm>");
  assertStringIncludes(xml, "<BusinessPct>0.20000</BusinessPct>");
  assertStringIncludes(
    xml,
    "<OperatingExpensesAmt>2900</OperatingExpensesAmt>",
  );
});

Deno.test("2025 Form 8829 rejects stale line 36 before filing", () => {
  const lines = calculateRentedHomeForm8829(source);
  assertThrows(
    () =>
      form8829.build(
        { rented_home: source, ...lines, line36: 3_000 },
        context(),
      ),
    Error,
    "differs from source calculation",
  );
});
