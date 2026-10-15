import { z } from "zod";
import { roundWholeDollars } from "../whole-dollars.ts";
import { calculateSchedule3Totals } from "../nodes/intermediate/aggregation/general/return-assembly/schedule3/index.ts";

const amount = z.number().finite().nonnegative();
const line = z.union([amount, z.array(amount)]).transform((v) =>
  roundWholeDollars(Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v)
).optional();
const other = z.array(
  z.object({
    description: z.string().trim().min(1),
    amount,
    source_reference: z.string().trim().min(1),
  }).strict(),
).optional();

/** Internal finalized-source contract, not a public input accepting credit totals. */
export const schedule3Input2026Schema = z.object({
  line1_foreign_tax_credit: line,
  line1_foreign_tax_1099: line,
  line2_childcare_credit: line,
  line3_education_credit: line,
  line4_retirement_savings_credit: line,
  line5a_residential_clean_energy: line,
  line6a_general_business_credit: line,
  line6a_low_income_housing_credit: line,
  line6b_prior_year_min_tax_credit: line,
  line6c_adoption_credit: line,
  line6d_elderly_disabled_credit: line,
  line6f_clean_vehicle_credit: line,
  line6g_mortgage_interest_credit: line,
  line6h_dc_homebuyer_credit: line,
  line6i_qualified_electric_vehicle_credit: line,
  line6j_alt_fuel_vehicle_refueling: line,
  line6k_tax_credit_bonds: line,
  line6l_form8978_credit: line,
  line6m_prev_owned_clean_vehicle_credit: line,
  line6z_other_credits: other,
  line9_premium_tax_credit: line,
  line10_amount_paid_extension: line,
  line11_excess_ss: line,
  line12_fuel_tax_credit: line,
  line13a_tax_paid_by_ric_or_reit: line,
  line13b_section1341_credit: line,
  line13c_elective_payment: line,
  line13d_deferred_section965: line,
  line13e_section1062_tax: line,
  line13z_other_payments: other,
}).strict();
export type Schedule3Input2026 = z.input<typeof schedule3Input2026Schema>;
export function calculateSchedule3_2026(raw: Schedule3Input2026) {
  const input = schedule3Input2026Schema.parse(raw);
  // Round after combining sources on each printed line, including the common
  // two-source foreign-tax and general-business-credit lines.
  const line1 = roundWholeDollars(
    total(raw.line1_foreign_tax_credit) + total(raw.line1_foreign_tax_1099),
  );
  const line6a = roundWholeDollars(
    total(raw.line6a_general_business_credit) +
      total(raw.line6a_low_income_housing_credit),
  );
  const common = calculateSchedule3Totals({
    ...input,
    line1_foreign_tax_credit: line1,
    line1_foreign_tax_1099: 0,
    line6a_general_business_credit: line6a,
    line6a_low_income_housing_credit: 0,
  });
  const line6z = roundWholeDollars(
    (input.line6z_other_credits ?? []).reduce((n, r) => n + r.amount, 0),
  );
  const line13z = roundWholeDollars(
    (input.line13z_other_payments ?? []).reduce((n, r) => n + r.amount, 0),
  );
  const line14 = common.line14_total + (input.line13b_section1341_credit ?? 0) +
    (input.line13c_elective_payment ?? 0) +
    (input.line13d_deferred_section965 ?? 0) +
    (input.line13e_section1062_tax ?? 0) + line13z;
  const lines = {
    ...common,
    line6z_total: line6z,
    line7_total: common.line7_total + line6z,
    line8_total: common.line8_total + line6z,
    line13z_total: line13z,
    line14_total: line14,
    line15_total: common.line15_total - common.line14_total + line14,
  };
  return {
    source_input: raw,
    input,
    lines,
    file_schedule3: lines.line8_total > 0 || lines.line15_total > 0,
  };
}
function total(v: number | number[] | undefined) {
  return Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v ?? 0;
}
