import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const p1 = "form1[0].Page1[0].";
const p2 = "form1[0].Page2[0].";

const amounts: readonly (readonly [string, string])[] = [
  ["line1a_excess_advance_premium", `${p1}Line1_ReadOrder[0].f1_03[0]`],
  ["line1b_new_clean_vehicle_repayment", `${p1}f1_04[0]`],
  ["line1c_used_clean_vehicle_repayment", `${p1}f1_05[0]`],
  ["line1d_net_epe_recapture", `${p1}f1_06[0]`],
  ["line1e_excessive_payment", `${p1}f1_07[0]`],
  ["line1f_twenty_percent_excessive_payment", `${p1}f1_08[0]`],
  ["line1y_other_additions", `${p1}f1_10[0]`],
  ["line1z_additions", `${p1}f1_11[0]`],
  ["line2_amt", `${p1}f1_12[0]`],
  ["line3_part1_tax", `${p1}f1_13[0]`],
  ["line4_self_employment_tax", `${p1}f1_15[0]`],
  ["line5_form5329_early_tax", `${p1}f1_16[0]`],
  ["line6_niit", `${p1}f1_17[0]`],
  ["line7_residential_lot_interest", `${p1}f1_18[0]`],
  ["line8_installment_sale_interest", `${p1}f1_19[0]`],
  ["line9_lihtc_recapture", `${p1}f1_20[0]`],
  ["line10_net_epe_recapture", `${p1}f1_21[0]`],
  ["line11_medicare_self_employment_tax", `${p1}f1_22[0]`],
  ["line12_section965_installment", `${p1}f1_23[0]`],
  ["line13a_other_credit_recapture", `${p1}Line13_ReadOrder[0].f1_25[0]`],
  ["line13b_mortgage_subsidy_recapture", `${p1}f1_26[0]`],
  ["line13c_hsa_distribution_tax", `${p1}f1_27[0]`],
  ["line13d_hsa_eligibility_tax", `${p1}f1_28[0]`],
  ["line13e_archer_msa_tax", `${p1}f1_29[0]`],
  ["line13f_medicare_advantage_msa_tax", `${p1}f1_30[0]`],
  ["line13g_fractional_interest_recapture", `${p1}f1_31[0]`],
  ["line13h_section409a_tax", `${p1}f1_32[0]`],
  ["line13i_section457a_tax", `${p1}f1_33[0]`],
  ["line13j_section72m5_tax", `${p1}f1_34[0]`],
  ["line13k_golden_parachute_tax", `${p1}f1_35[0]`],
  ["line13l_trust_accumulation_tax", `${p1}f1_36[0]`],
  ["line13m_expatriated_corporation_tax", `${p2}f2_01[0]`],
  ["line13n_lookback_interest", `${p2}f2_02[0]`],
  ["line13o_nonresident_alien_tax", `${p2}f2_03[0]`],
  ["line13z_other_income_taxes", `${p2}f2_05[0]`],
  ["line14_other_income_taxes", `${p2}f2_06[0]`],
  ["line15_additional_income_taxes", `${p2}f2_07[0]`],
  ["line16a_form4137_tip_tax", `${p2}Line16_ReadOrder[0].f2_08[0]`],
  ["line16b_form8919_wage_tax", `${p2}f2_09[0]`],
  ["line16c_additional_fica", `${p2}f2_10[0]`],
  ["line17a_household_employment_tax", `${p2}Line17_ReadOrder[0].f2_11[0]`],
  ["line17b_medicare_wage_tax", `${p2}f2_12[0]`],
  ["line17c_w2_uncollected_fica", `${p2}f2_13[0]`],
  ["line17d_other_employment_taxes", `${p2}f2_14[0]`],
  ["line18_form5329_excess_tax", `${p2}f2_15[0]`],
  ["line19a_form8621_line16f_interest", `${p2}Line19a_ReadOrder[0].f2_16[0]`],
  ["line19b_form8621_line24_interest", `${p2}f2_17[0]`],
  ["line19c_form8621_interest", `${p2}f2_18[0]`],
  ["line20_employment_and_other_taxes", `${p2}f2_19[0]`],
  ["line21_total_additional_taxes", `${p2}f2_20[0]`],
];

export const irsSchedule2Pdf2026: PdfFormDescriptor = {
  pendingKey: "schedule2",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf",
  pageIndices: () => [1, 2],
  includeWhen: (fields) =>
    typeof fields.line3_part1_tax === "number" ||
    typeof fields.line21_total_additional_taxes === "number",
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${p1}f1_01[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${p1}f1_02[0]` },
    ...amounts.map(([domainKey, pdfField]): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField,
    })),
  ],
};
