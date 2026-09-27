import { z } from "zod";

const amount = z.number().finite().nonnegative().optional();

/** Draft 2026 Schedule 2 line amounts, before the form totals are calculated. */
export const schedule2Input2026Schema = z.object({
  line1a_excess_advance_premium: amount,
  line1b_new_clean_vehicle_repayment: amount,
  line1c_used_clean_vehicle_repayment: amount,
  line1d_net_epe_recapture: amount,
  line1e_excessive_payment: amount,
  line1f_twenty_percent_excessive_payment: amount,
  line1y_other_additions: amount,
  line2_amt: amount,
  line4_self_employment_tax: amount,
  line5_form5329_early_tax: amount,
  line6_niit: amount,
  line7_residential_lot_interest: amount,
  line8_installment_sale_interest: amount,
  line9_lihtc_recapture: amount,
  line10_net_epe_recapture: amount,
  line11_medicare_self_employment_tax: amount,
  line12_section965_installment: amount,
  line13a_other_credit_recapture: amount,
  line13b_mortgage_subsidy_recapture: amount,
  line13c_hsa_distribution_tax: amount,
  line13d_hsa_eligibility_tax: amount,
  line13e_archer_msa_tax: amount,
  line13f_medicare_advantage_msa_tax: amount,
  line13g_fractional_interest_recapture: amount,
  line13h_section409a_tax: amount,
  line13i_section457a_tax: amount,
  line13j_section72m5_tax: amount,
  line13k_golden_parachute_tax: amount,
  line13l_trust_accumulation_tax: amount,
  line13m_expatriated_corporation_tax: amount,
  line13n_lookback_interest: amount,
  line13o_nonresident_alien_tax: amount,
  line13z_other_income_taxes: amount,
  line16a_form4137_tip_tax: amount,
  line16b_form8919_wage_tax: amount,
  line17a_household_employment_tax: amount,
  line17b_medicare_wage_tax: amount,
  line17c_w2_uncollected_fica: amount,
  line18_form5329_excess_tax: amount,
  line19a_form8621_line16f_interest: amount,
  line19b_form8621_line24_interest: amount,
}).strict();

export type Schedule2Input2026 = z.input<typeof schedule2Input2026Schema>;

export interface Schedule2Result2026 {
  readonly line1z_additions: number;
  readonly line3_part1_tax: number;
  readonly line14_other_income_taxes: number;
  readonly line15_additional_income_taxes: number;
  readonly line16c_additional_fica: number;
  readonly line17d_other_employment_taxes: number;
  readonly line19c_form8621_interest: number;
  readonly line20_employment_and_other_taxes: number;
  readonly line21_total_additional_taxes: number;
}

function sum(
  input: z.output<typeof schedule2Input2026Schema>,
  keys: readonly (keyof z.output<typeof schedule2Input2026Schema>)[],
): number {
  return keys.reduce((total, key) => total + (input[key] ?? 0), 0);
}

/** Draft 2026 Schedule 2 Parts I–II, with filed line numbers preserved. */
export function calculateSchedule2_2026(
  rawInput: Schedule2Input2026,
): Schedule2Result2026 {
  const input = schedule2Input2026Schema.parse(rawInput);
  // The pinned draft prints line 12 but says line 15 adds lines 4–11 and 14.
  // Do not silently lose a section 965 installment pending final instructions.
  if ((input.line12_section965_installment ?? 0) > 0) {
    throw new Error(
      "2026 Schedule 2 line 12 needs final placement in the line 15 total",
    );
  }
  const line1z = sum(input, [
    "line1a_excess_advance_premium",
    "line1b_new_clean_vehicle_repayment",
    "line1c_used_clean_vehicle_repayment",
    "line1d_net_epe_recapture",
    "line1e_excessive_payment",
    "line1f_twenty_percent_excessive_payment",
    "line1y_other_additions",
  ]);
  const line3 = line1z + (input.line2_amt ?? 0);
  const line14 = sum(input, [
    "line13a_other_credit_recapture",
    "line13b_mortgage_subsidy_recapture",
    "line13c_hsa_distribution_tax",
    "line13d_hsa_eligibility_tax",
    "line13e_archer_msa_tax",
    "line13f_medicare_advantage_msa_tax",
    "line13g_fractional_interest_recapture",
    "line13h_section409a_tax",
    "line13i_section457a_tax",
    "line13j_section72m5_tax",
    "line13k_golden_parachute_tax",
    "line13l_trust_accumulation_tax",
    "line13m_expatriated_corporation_tax",
    "line13n_lookback_interest",
    "line13o_nonresident_alien_tax",
    "line13z_other_income_taxes",
  ]);
  const line15 = line14 + sum(input, [
    "line4_self_employment_tax",
    "line5_form5329_early_tax",
    "line6_niit",
    "line7_residential_lot_interest",
    "line8_installment_sale_interest",
    "line9_lihtc_recapture",
    "line10_net_epe_recapture",
    "line11_medicare_self_employment_tax",
  ]);
  const line16c = sum(input, [
    "line16a_form4137_tip_tax",
    "line16b_form8919_wage_tax",
  ]);
  const line17d = sum(input, [
    "line17a_household_employment_tax",
    "line17b_medicare_wage_tax",
    "line17c_w2_uncollected_fica",
  ]);
  const line19c = sum(input, [
    "line19a_form8621_line16f_interest",
    "line19b_form8621_line24_interest",
  ]);
  const line20 = line16c + line17d +
    (input.line18_form5329_excess_tax ?? 0) + line19c;
  return {
    line1z_additions: line1z,
    line3_part1_tax: line3,
    line14_other_income_taxes: line14,
    line15_additional_income_taxes: line15,
    line16c_additional_fica: line16c,
    line17d_other_employment_taxes: line17d,
    line19c_form8621_interest: line19c,
    line20_employment_and_other_taxes: line20,
    line21_total_additional_taxes: line15 + line20,
  };
}
