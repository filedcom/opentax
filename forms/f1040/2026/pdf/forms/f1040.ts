import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const p1 = "topmostSubform[0].Page1[0].";
const p2 = "topmostSubform[0].Page2[0].";

const textFields: readonly (readonly [string, string])[] = [
  ["taxpayer_first_name_with_initial", `${p1}f1_14[0]`],
  ["taxpayer_last_name", `${p1}f1_15[0]`],
  ["taxpayer_ssn", `${p1}f1_16[0]`],
  ["spouse_first_name", `${p1}f1_17[0]`],
  ["spouse_last_name", `${p1}f1_18[0]`],
  ["spouse_ssn", `${p1}f1_19[0]`],
  ["address_line1", `${p1}Address_ReadOrder[0].f1_20[0]`],
  ["address_line2", `${p1}Address_ReadOrder[0].f1_21[0]`],
  ["address_city", `${p1}Address_ReadOrder[0].f1_22[0]`],
  ["address_state", `${p1}Address_ReadOrder[0].f1_23[0]`],
  ["address_zip", `${p1}Address_ReadOrder[0].f1_24[0]`],
  ["line1a_wages", `${p1}f1_47[0]`],
  ["line1c_unreported_tips", `${p1}f1_49[0]`],
  ["line1i_combat_pay", `${p1}f1_56[0]`],
  ["line6b_ss_taxable", `${p1}f1_69[0]`],
  ["line8_additional_income", `${p1}f1_72[0]`],
  ["line9_total_income", `${p1}f1_73[0]`],
  ["line10_adjustments", `${p1}f1_74[0]`],
  ["line11a_agi", `${p1}f1_75[0]`],
  ["line11b_agi", `${p2}f2_01[0]`],
  ["line12e_standard_or_itemized", `${p2}f2_02[0]`],
  ["line12f_nonitemizer_charity", `${p2}f2_03[0]`],
  ["line13a_schedule1a", `${p2}f2_04[0]`],
  ["line13b_qbi", `${p2}f2_05[0]`],
  ["line14_total_deductions", `${p2}f2_06[0]`],
  ["line15_taxable_income", `${p2}f2_07[0]`],
  ["line16_income_tax", `${p2}f2_09[0]`],
  ["line17_additional_taxes", `${p2}f2_10[0]`],
  ["line18_total_tax_before_credits", `${p2}f2_11[0]`],
  ["line19_child_tax_credit", `${p2}f2_12[0]`],
  ["line20_nonrefundable_credits", `${p2}f2_13[0]`],
  ["line21_credits_total", `${p2}f2_14[0]`],
  ["line22_tax_after_credits", `${p2}f2_15[0]`],
  ["line23_other_taxes", `${p2}f2_16[0]`],
  ["line24a_total_tax", `${p2}f2_17[0]`],
  ["line24b_form1062", `${p2}f2_18[0]`],
  ["line24c_total_tax", `${p2}f2_19[0]`],
  ["line25a_w2_withheld", `${p2}Line25_ReadOrder[0].f2_20[0]`],
  ["line25b_withheld_1099", `${p2}f2_21[0]`],
  ["line25c_other_withheld", `${p2}f2_22[0]`],
  ["line25d_total_withholding", `${p2}f2_23[0]`],
  ["line26_estimated_payments", `${p2}f2_24[0]`],
  ["line27a_eic", `${p2}f2_26[0]`],
  ["line28_actc", `${p2}f2_27[0]`],
  ["line29_refundable_aotc", `${p2}f2_28[0]`],
  ["line30_refundable_adoption", `${p2}f2_29[0]`],
  ["line31_other_payments", `${p2}Line31-32_ReadOrder[0].f2_30[0]`],
  ["line32a_refundable_credits", `${p2}Line31-32_ReadOrder[0].f2_31[0]`],
  ["line32b_public_benefit_reduction", `${p2}f2_32[0]`],
  ["line32c_net_refundable_credits", `${p2}f2_33[0]`],
  ["line33_total_payments", `${p2}f2_34[0]`],
  ["line34_overpayment", `${p2}f2_35[0]`],
  ["line35a_refund", `${p2}f2_36[0]`],
  ["line36_apply_to_2027", `${p2}f2_39[0]`],
  ["line37_amount_owed", `${p2}f2_40[0]`],
  ["line38_underpayment_penalty", `${p2}f2_41[0]`],
  ["taxpayer_occupation", `${p2}f2_45[0]`],
  ["spouse_occupation", `${p2}f2_47[0]`],
];

const fields: readonly PdfFieldEntry[] = [
  ...textFields.map(([domainKey, pdfField]) => ({
    kind: "text" as const,
    domainKey,
    pdfField,
  })),
  ...(["single", "mfj", "mfs"] as const).map((whenValue, index) => ({
    kind: "checkboxWhen" as const,
    domainKey: "filing_status",
    pdfField: `${p1}c1_8[${index}]`,
    whenValue,
  })),
  ...(["hoh", "qss"] as const).map((whenValue, index) => ({
    kind: "checkboxWhen" as const,
    domainKey: "filing_status",
    pdfField: `${p1}HOH-QSS_ReadOrder[0].c1_8[${index}]`,
    whenValue,
  })),
  ...(["true", "false"] as const).flatMap((whenValue, index) => [
    {
      kind: "checkboxWhen" as const,
      domainKey: "digital_assets",
      pdfField: `${p1}c1_10[${index}]`,
      whenValue,
    },
    {
      kind: "checkboxWhen" as const,
      domainKey: "taxpayer_citizen_national_or_work_authorized",
      pdfField: `${p1}c1_11[${index}]`,
      whenValue,
    },
    {
      kind: "checkboxWhen" as const,
      domainKey: "spouse_citizen_national_or_work_authorized",
      pdfField: `${p1}c1_12[${index}]`,
      whenValue,
    },
  ]),
  {
    kind: "checkbox",
    domainKey: "taxpayer_can_be_claimed_as_dependent",
    pdfField: `${p2}c2_1[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "mfs_spouse_itemizing",
    pdfField: `${p2}c2_3[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "taxpayer_age_65_or_older",
    pdfField: `${p2}c2_5[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "taxpayer_blind",
    pdfField: `${p2}c2_6[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "spouse_age_65_or_older",
    pdfField: `${p2}c2_7[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "spouse_blind",
    pdfField: `${p2}c2_8[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "line27b_clergy_schedule_se",
    pdfField: `${p2}c2_12[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "line27c_declines_eic",
    pdfField: `${p2}c2_13[0]`,
  },
];

export const irs1040Pdf2026: PdfFormDescriptor = {
  pendingKey: "f1040",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040--dft.pdf",
  fields,
  pageIndices: () => [1, 2],
  projectFields: (rawFields) => {
    if (rawFields.digital_assets === undefined) {
      throw new Error("TY2026 PDF needs the digital-assets answer");
    }
    if (rawFields.taxpayer_citizen_national_or_work_authorized === undefined) {
      throw new Error(
        "TY2026 PDF needs the taxpayer work-authorization answer",
      );
    }
    if (
      rawFields.filing_status === "mfj" &&
      rawFields.spouse_citizen_national_or_work_authorized === undefined
    ) {
      throw new Error("TY2026 PDF needs the spouse work-authorization answer");
    }
    if (
      rawFields.filing_status !== "mfj" &&
      rawFields.spouse_citizen_national_or_work_authorized !== undefined
    ) {
      throw new Error(
        "TY2026 PDF spouse work-authorization answer requires a joint return",
      );
    }
    return {
      ...rawFields,
      taxpayer_first_name_with_initial: [
        rawFields.taxpayer_first_name,
        rawFields.taxpayer_middle_initial,
      ].filter(Boolean).join(" "),
    };
  },
};
