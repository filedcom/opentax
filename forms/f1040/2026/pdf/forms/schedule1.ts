import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";

const amounts: readonly (readonly [string, string])[] = [
  ["line1_state_refund", `${p1}f1_04[0]`],
  ["line2a_alimony_received", `${p1}f1_05[0]`],
  ["line3_schedule_c", `${p1}f1_07[0]`],
  ["line4_other_gains", `${p1}f1_08[0]`],
  ["line5_schedule_e", `${p1}f1_09[0]`],
  ["line6_schedule_f", `${p1}f1_10[0]`],
  ["line7_unemployment", `${p1}f1_12[0]`],
  ["line7_repaid", `${p1}Line7_ReadOrder[0].f1_11[0]`],
  ["line8a_nol_print", `${p1}Line8a_ReadOrder[0].f1_13[0]`],
  ["line8c_cod_income", `${p1}f1_15[0]`],
  ["line8d_feie_print", `${p1}f1_16[0]`],
  ["line8e_archer_msa_dist", `${p1}f1_17[0]`],
  ["line8i_prizes_awards", `${p1}f1_21[0]`],
  ["line8p_excess_business_loss", `${p1}f1_28[0]`],
  ["line8z_description", `${p1}Line8z_ReadOrder[0].f1_35[0]`],
  ["line8z_other", `${p1}f1_36[0]`],
  ["line9_total_other_income", `${p1}f1_37[0]`],
  ["line10_total_additional_income", `${p1}f1_38[0]`],
  ["line11_educator_expenses", `${p2}f2_01[0]`],
  ["line12_business_expenses", `${p2}f2_02[0]`],
  ["line13_hsa_deduction", `${p2}f2_03[0]`],
  ["line14_moving_expenses", `${p2}f2_04[0]`],
  ["line15_se_deduction", `${p2}f2_05[0]`],
  ["line16_sep_simple", `${p2}f2_06[0]`],
  ["line17_se_health_insurance", `${p2}f2_07[0]`],
  ["line18_early_withdrawal", `${p2}f2_08[0]`],
  ["line20_ira_deduction", `${p2}f2_12[0]`],
  ["line21_student_loan_interest", `${p2}f2_13[0]`],
  ["line23_archer_msa_deduction", `${p2}f2_15[0]`],
  ["line24f_501c18d", `${p2}f2_21[0]`],
  ["line25_total_other_adjustments", `${p2}f2_29[0]`],
  ["line26_total_adjustments", `${p2}f2_30[0]`],
];

export const irsSchedule1Pdf2026: PdfFormDescriptor = {
  pendingKey: "schedule1",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s1--dft.pdf",
  pageIndices: () => [1, 2],
  includeWhen: (fields) => fields.file_schedule1 === true,
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${p1}f1_01[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${p1}f1_02[0]` },
    {
      kind: "checkbox",
      domainKey: "line7_repaid_checked",
      pdfField: `${p1}Line7_ReadOrder[0].c1_3[0]`,
    },
    ...amounts.map(([domainKey, pdfField]): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField,
    })),
  ],
};
