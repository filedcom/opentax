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

export interface ScheduleDFields {
  line_1a_proceeds?: number | null;
  line_1a_cost?: number | null;
  line_4_other_st?: number | null;
  line_5_k1_st?: number | null;
  line_6_carryover?: number | null;
  line_8a_proceeds?: number | null;
  line_8a_cost?: number | null;
  line_11_form2439?: number | null;
  line_12_k1_lt?: number | null;
  line13_cap_gain_distrib?: number | null;
  line_12_cap_gain_dist?: number | null;
  line_14_carryover?: number | null;
  line19_unrecaptured_1250?: number | null;
}

export interface Form8889Fields {
  taxpayer_hsa_contributions?: number | null;
  employer_hsa_contributions?: number | null;
  hsa_distributions?: number | null;
  qualified_medical_expenses?: number | null;
}

export interface Form2441Fields {
  dep_care_benefits?: number | null;
}

export interface Form8959Fields {
  medicare_wages?: number | null;
  unreported_tips?: number | null;
  wages_8919?: number | null;
  se_income?: number | null;
  rrta_wages?: number | null;
  medicare_withheld?: number | null;
  rrta_medicare_withheld?: number | null;
}

export interface Form8960Fields {
  line1_taxable_interest?: number | null;
  line2_ordinary_dividends?: number | null;
  line3_annuities?: number | null;
  line4a_passive_income?: number | null;
  line4b_rental_net?: number | null;
  line5a_net_gain?: number | null;
  line5b_net_gain_adjustment?: number | null;
  line7_other_modifications?: number | null;
  line9a_investment_interest_expense?: number | null;
  line9b_state_local_tax?: number | null;
  line10_additional_modifications?: number | null;
}

export interface F8949Transaction {
  part: string;
  description: string;
  date_acquired: string;
  date_sold: string;
  proceeds: number;
  cost_basis: number;
  adjustment_codes?: string;
  adjustment_amount?: number;
  gain_loss: number;
  is_long_term: boolean;
}

export type ScheduleDInput = Partial<ScheduleDFields> & { [extra: string]: unknown };
export type Form8889Input = Partial<Form8889Fields> & { [extra: string]: unknown };
export type Form2441Input = Partial<Form2441Fields> & { [extra: string]: unknown };
export type Form8959Input = Partial<Form8959Fields> & { [extra: string]: unknown };
export type Form8960Input = Partial<Form8960Fields> & { [extra: string]: unknown };

export interface MefFormsPending {
  f1040?: IRS1040Input;
  schedule1?: Schedule1Input;
  schedule2?: Schedule2Input;
  schedule3?: Schedule3Input;
  schedule_d?: ScheduleDInput;
  form8889?: Form8889Input;
  form2441?: Form2441Input;
  form8949?: F8949Transaction[];
  form8959?: Form8959Input;
  form8960?: Form8960Input;
}
