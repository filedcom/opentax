import { assertEquals, assertThrows } from "@std/assert";
import { TS } from "../../../types.ts";
import { inputNodes } from "../../../../2025/inputs.ts";
import {
  calculateRentedHomeForm8829,
  form_8829,
  inputSchema,
  type RentedHomeSource,
} from "./index.ts";

export const rentedHome: RentedHomeSource = {
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
  all_schedule_c_gross_income_attributable_to_home_verified: true,
  no_daycare_or_inventory_exception: true,
  no_home_business_gain_or_other_trade_loss: true,
  no_casualty_mortgage_tax_or_depreciation: true,
  home_expenses_excluded_from_schedule_c_verified: true,
};

Deno.test("2025 Form 8829 rented-home input is registered", () => {
  assertEquals(
    inputNodes.some((entry) => entry.node.nodeType === "form_8829"),
    true,
  );
});

Deno.test("2025 Form 8829 sends one business-linked line 36 claim to Schedule C", () => {
  const lines = calculateRentedHomeForm8829(rentedHome);
  assertEquals(lines.line3, 0.2);
  assertEquals(lines.line23b, 14_000);
  assertEquals(lines.line24, 2_800);
  assertEquals(lines.line26, 2_900);
  assertEquals(lines.line27, 2_900);
  assertEquals(lines.line36, 2_900);
  assertEquals(lines.line43, 0);
  const result = form_8829.compute(
    { taxYear: 2025, formType: "f1040" },
    { rented_home: rentedHome },
  );
  assertEquals(
    result.outputs.find((item) => item.nodeType === "schedule_c")?.fields
      .form8829_line30,
    {
      business_reference: "C-1",
      home_identifier: "HOME-1",
      recipient: TS.T,
      schedule_c_line29_tentative_profit: 5_000,
      line36: 2_900,
    },
  );
});

Deno.test("2025 Form 8829 retains operating carryover when current deduction is zero", () => {
  const source = { ...rentedHome, schedule_c_line29_tentative_profit: 0 };
  const lines = calculateRentedHomeForm8829(source);
  assertEquals(lines.line36, 0);
  assertEquals(lines.line43, 2_900);
  const result = form_8829.compute({ taxYear: 2025, formType: "f1040" }, {
    rented_home: source,
  });
  assertEquals(
    result.outputs.some((item) => item.nodeType === "schedule_c"),
    false,
  );
  assertEquals(
    result.outputs.find((item) => item.nodeType === "form_8829")?.fields.line43,
    2_900,
  );
});

Deno.test("2025 Form 8829 rejects area overflow and old flat calculation inputs", () => {
  assertThrows(
    () =>
      calculateRentedHomeForm8829({ ...rentedHome, business_area_sqft: 1_001 }),
    Error,
    "business area exceeds",
  );
  assertThrows(
    () =>
      inputSchema.parse({
        total_area: 1_000,
        business_area: 200,
        mortgage_interest: 4_000,
      }),
    Error,
  );
  assertThrows(
    () =>
      inputSchema.parse({
        rented_home: { ...rentedHome, rented_home_verified: false },
      }),
    Error,
  );
});
