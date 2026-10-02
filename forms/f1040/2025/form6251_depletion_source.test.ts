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
  const fields = { line2d_depletion: 400, line11_amt: 100 };
  const pending = {
    schedule_c: { schedule_cs: [business] },
    schedule1: { line3_schedule_c: 49_000 },
    schedule2: { line2_amt: 100 },
    f1040: {
      line16_income_tax: 1_000,
      line17_additional_taxes: 100,
      line18_total_tax_before_credits: 1_100,
    },
  };
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
          ...pending,
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
  assertThrows(
    () => assertForm6251DepletionSource({}, pending),
    Error,
    "matching retained Schedule C property-level AMT depletion",
  );
  for (
    const tampered of [
      { ...pending, schedule1: { line3_schedule_c: 48_999 } },
      { ...pending, schedule2: { line2_amt: 99 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 99 },
      },
    ]
  ) {
    assertThrows(() => assertForm6251DepletionSource(fields, tampered));
  }
});
