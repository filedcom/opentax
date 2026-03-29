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
  line1e_taxable_dep_care?: number | null;
  line1i_combat_pay?: number | null;
  line2a_tax_exempt?: number | null;
  line3a_qualified_dividends?: number | null;
  line4a_ira_gross?: number | null;
  line4b_ira_taxable?: number | null;
  line5a_pension_gross?: number | null;
  line5b_pension_taxable?: number | null;
  line25a_w2_withheld?: number | null;
  line25b_withheld_1099?: number | null;
  line12e_itemized_deductions?: number | null;
  line28_actc?: number | null;
  line29_refundable_aoc?: number | null;
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

export interface MefFormsPending {
  f1040?: IRS1040Input;
  schedule1?: Schedule1Input;
}
