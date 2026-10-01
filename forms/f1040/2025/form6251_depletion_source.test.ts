import { assertThrows } from "@std/assert";
import { assertForm6251DepletionSource } from "./form6251_depletion_source.ts";

const business = {
  line_a_principal_business: "Mine",
  line_b_business_code: "212000",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_1_gross_receipts: 50_000,
  line_12_depletion: 1_000,
  amt_depletion_worksheet: {
    source_reference: "2025 depletion worksheet",
    all_property_income_and_basis_limits_applied_verified: true,
    no_at_risk_or_basis_limitation_verified: true,
    properties: [{
      property_reference: "mine-1",
      regular_allowed_depletion: 1_000,
      amt_allowed_depletion: 600,
    }],
  },
};

Deno.test("Form 6251 line 2d replays retained Schedule C property depletion", () => {
  const fields = { line2d_depletion: 400 };
  const pending = { schedule_c: { schedule_cs: [business] } };
  assertForm6251DepletionSource(fields, pending);
  for (
    const altered of [
      { ...business, line_12_depletion: 900 },
      { ...business, line_g_material_participation: false },
      {
        ...business,
        amt_depletion_worksheet: {
          ...business.amt_depletion_worksheet,
          properties: [{
            ...business.amt_depletion_worksheet.properties[0],
            amt_allowed_depletion: 700,
          }],
        },
      },
    ]
  ) {
    assertThrows(
      () =>
        assertForm6251DepletionSource(fields, {
          schedule_c: { schedule_cs: [altered] },
        }),
      Error,
      "matching retained Schedule C property-level AMT depletion",
    );
  }
  assertThrows(
    () => assertForm6251DepletionSource(fields, undefined),
    Error,
    "matching retained Schedule C property-level AMT depletion",
  );
});
