import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../pdf/form-descriptor.ts";

const p = "topmostSubform[0].Page1[0].";
const lineFields: readonly (readonly [string, string])[] = [
  ["line1_total", "f1_03[0]"],
  ["line2_childcare_credit", "f1_04[0]"],
  ["line3_education_credit", "f1_05[0]"],
  ["line4_retirement_savings_credit", "f1_06[0]"],
  ["line5a_residential_clean_energy", "f1_07[0]"],
  ["line6a_total", "Line6a_ReadOrder[0].f1_09[0]"],
  ["line6b_prior_year_min_tax_credit", "f1_10[0]"],
  ["line6c_adoption_credit", "f1_11[0]"],
  ["line6d_elderly_disabled_credit", "f1_12[0]"],
  ["line6f_total", "f1_14[0]"],
  ["line6g_mortgage_interest_credit", "f1_15[0]"],
  ["line6h_dc_homebuyer_credit", "f1_16[0]"],
  ["line6i_qualified_electric_vehicle_credit", "f1_17[0]"],
  ["line6j_alt_fuel_vehicle_refueling", "f1_18[0]"],
  ["line6k_tax_credit_bonds", "f1_19[0]"],
  ["line6l_form8978_credit", "f1_20[0]"],
  ["line6m_total", "f1_21[0]"],
  ["line6z_description", "Line6z_ReadOrder[0].f2_22[0]"],
  ["line6z_other_nonrefundable", "f1_23[0]"],
  ["line7_total", "f1_24[0]"],
  ["line8_total", "f1_25[0]"],
  ["line9_premium_tax_credit", "f1_26[0]"],
  ["line10_amount_paid_extension", "f1_27[0]"],
  ["line11_excess_ss", "f1_28[0]"],
  ["line12_fuel_tax_credit", "f1_29[0]"],
  ["line13a_form2439", "Line13_ReadOrder[0].f1_30[0]"],
  ["line13b_section1341", "f1_31[0]"],
  ["line13c_form3800_elective_payment", "f1_32[0]"],
  ["line13d_deferred_section965", "f1_33[0]"],
  ["line13e_form1062", "f1_34[0]"],
  ["line13z_description", "Line13z_ReadOrder[0].f1_35[0]"],
  ["line13z_other_refundable", "f1_36[0]"],
  ["line14_total", "f1_37[0]"],
  ["line15_total", "f1_38[0]"],
];

export const irsSchedule3Pdf2026: PdfFormDescriptor = {
  pendingKey: "schedule3",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s3--dft.pdf",
  pageIndices: () => [1],
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${p}f1_01[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${p}f1_02[0]` },
    ...lineFields.map(([domainKey, pdfField]): PdfFieldEntry => ({
      kind: "text",
      domainKey,
      pdfField: `${p}${pdfField}`,
    })),
  ],
};
