export interface FilerIdentity {
  primarySSN: string;
  nameLine1: string;
  nameControl: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  filingStatus: 1 | 2 | 3 | 4 | 5;
}

export interface IRS1040Fields {
  line1a_wages?: number | null;
  line1c_unreported_tips?: number | null;
  line1e_taxable_dep_care?: number | null;
  line1f_taxable_adoption_benefits?: number | null;
  line1g_wages_8919?: number | null;
  line1i_combat_pay?: number | null;
  line2a_tax_exempt?: number | null;
  line2b_taxable_interest?: number | null;
  line3a_qualified_dividends?: number | null;
  line3b_ordinary_dividends?: number | null;
  line4a_ira_gross?: number | null;
  line4b_ira_taxable?: number | null;
  line5a_pension_gross?: number | null;
  line5b_pension_taxable?: number | null;
  line6a_ss_gross?: number | null;
  line6b_ss_taxable?: number | null;
  line7_capital_gain?: number | null;
  line12e_itemized_deductions?: number | null;
  line13_qbi_deduction?: number | null;
  line17_additional_taxes?: number | null;
  line20_nonrefundable_credits?: number | null;
  line25a_w2_withheld?: number | null;
  line25b_withheld_1099?: number | null;
  line25c_additional_medicare_withheld?: number | null;
  line28_actc?: number | null;
  line29_refundable_aoc?: number | null;
  line30_refundable_adoption?: number | null;
  line31_additional_payments?: number | null;
  line38_amount_paid_extension?: number | null;
}

export interface Schedule1Fields {
  line1_state_refund?: number | null;
  line3_schedule_c?: number | null;
  line4_other_gains?: number | null;
  line6_schedule_f?: number | null;
  line7_unemployment?: number | null;
  line8c_cod_income?: number | null;
  line8e_archer_msa_dist?: number | null;
  line8i_prizes_awards?: number | null;
  line8p_excess_business_loss?: number | null;
  line8z_rtaa?: number | null;
  line8z_taxable_grants?: number | null;
  line8z_substitute_payments?: number | null;
  line8z_attorney_proceeds?: number | null;
  line8z_nqdc?: number | null;
  line8z_other?: number | null;
  line8z_golden_parachute?: number | null;
  line13_hsa_deduction?: number | null;
  line15_se_deduction?: number | null;
  line17_schedule_e?: number | null;
  line18_early_withdrawal?: number | null;
  line20_ira_deduction?: number | null;
  line23_archer_msa_deduction?: number | null;
  line24f_501c18d?: number | null;
}

/**
 * Open input types: known fields are typed; extra keys are allowed with unknown
 * values (not dropped by the type system, just ignored at runtime via FIELD_MAP).
 * The index signature disables excess-property checks so callers may pass
 * arbitrary data from untyped sources without casts.
 */
export type IRS1040Input = Partial<IRS1040Fields> & { [extra: string]: unknown };
export type Schedule1Input = Partial<Schedule1Fields> & { [extra: string]: unknown };

export interface Schedule2Fields {
  line1_amt?: number | null;
  line4_se_tax?: number | null;
  line5_unreported_tip_tax?: number | null;
  line6_uncollected_8919?: number | null;
  line8_form5329_tax?: number | null;
  line11_additional_medicare?: number | null;
  line12_niit?: number | null;
  uncollected_fica?: number | null;
  uncollected_fica_gtl?: number | null;
  section409a_excise?: number | null;
  line17h_nqdc_tax?: number | null;
  golden_parachute_excise?: number | null;
  line17k_golden_parachute_excise?: number | null;
  line17b_hsa_penalty?: number | null;
  line17e_archer_msa_tax?: number | null;
  line17f_medicare_advantage_msa_tax?: number | null;
  lump_sum_tax?: number | null;
}

export interface Schedule3Fields {
  line1_foreign_tax_credit?: number | null;
  line1_foreign_tax_1099?: number | null;
  line2_childcare_credit?: number | null;
  line3_education_credit?: number | null;
  line4_retirement_savings_credit?: number | null;
  line6b_child_tax_credit?: number | null;
  line6c_adoption_credit?: number | null;
  line10_amount_paid_extension?: number | null;
  line11_excess_ss?: number | null;
}

export type Schedule2Input = Partial<Schedule2Fields> & { [extra: string]: unknown };
export type Schedule3Input = Partial<Schedule3Fields> & { [extra: string]: unknown };

export interface MefFormsPending {
  f1040?: IRS1040Input;
  schedule1?: Schedule1Input;
  schedule2?: Schedule2Input;
  schedule3?: Schedule3Input;
}
