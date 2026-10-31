import { schedule2PdfFor } from "../../../../../2025/pdf/forms/taxes/other/schedule2.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { section1294DueFromCalculatedForm } from "../../../../../nodes/inputs/income/foreign/f8621/section1294.ts";

// IRS 2026 Schedule 2 draft (page 1 is the IRS cover sheet). Part I keeps the
// 2025 lines. Part II is regrouped: Section A income taxes (lines 4-15),
// Section B employment and other taxes (16a-20) and line 21. The 2025 values
// are reassigned to the 2026 lines below; the Form 8959 and Form 5329 amounts
// split by their source lines. Line 12 (section 965) is not in the total.
const schedule2Pdf = schedule2PdfFor(2026);
const P1 = "form1[0].Page1[0]";
const P2 = "form1[0].Page2[0]";

const LINES: ReadonlyArray<readonly [string, string]> = [
  ["line1a_excess_advance_premium", `${P1}.Line1_ReadOrder[0].f1_03[0]`],
  ["line1b_new_clean_vehicle_repayment", `${P1}.f1_04[0]`],
  ["line1c_prev_owned_clean_vehicle_repayment", `${P1}.f1_05[0]`],
  ["line1d_form4255_net_epe", `${P1}.f1_06[0]`],
  ["line1e_form4255_excessive_payment", `${P1}.f1_07[0]`],
  ["line1f_form4255_20_percent_ep", `${P1}.f1_08[0]`],
  ["line1z_total_additions", `${P1}.f1_11[0]`],
  ["line2_amt", `${P1}.f1_12[0]`],
  ["line3_additional_tax", `${P1}.f1_13[0]`],
  ["ty2026_line4", `${P1}.f1_15[0]`],
  ["ty2026_line5", `${P1}.f1_16[0]`],
  ["ty2026_line6", `${P1}.f1_17[0]`],
  ["ty2026_line8", `${P1}.f1_19[0]`],
  ["ty2026_line9", `${P1}.f1_20[0]`],
  ["ty2026_line10", `${P1}.f1_21[0]`],
  ["ty2026_line11", `${P1}.f1_22[0]`],
  ["ty2026_line12", `${P1}.f1_23[0]`],
  ["ty2026_line13a_description", `${P1}.Line13_ReadOrder[0].Line13a_ReadOrder[0].f1_24[0]`],
  ["ty2026_line13a", `${P1}.Line13_ReadOrder[0].f1_25[0]`],
  ["ty2026_line13b", `${P1}.f1_26[0]`],
  ["ty2026_line13c", `${P1}.f1_27[0]`],
  ["ty2026_line13d", `${P1}.f1_28[0]`],
  ["ty2026_line13e", `${P1}.f1_29[0]`],
  ["ty2026_line13f", `${P1}.f1_30[0]`],
  ["ty2026_line13h", `${P1}.f1_32[0]`],
  ["ty2026_line13k", `${P1}.f1_35[0]`],
  ["ty2026_line14", `${P2}.f2_06[0]`],
  ["ty2026_line15", `${P2}.f2_07[0]`],
  ["ty2026_line16a", `${P2}.Line16_ReadOrder[0].f2_08[0]`],
  ["ty2026_line16b", `${P2}.f2_09[0]`],
  ["ty2026_line16c", `${P2}.f2_10[0]`],
  ["ty2026_line17a", `${P2}.Line17_ReadOrder[0].f2_11[0]`],
  ["ty2026_line17b", `${P2}.f2_12[0]`],
  ["ty2026_line17c", `${P2}.f2_13[0]`],
  ["ty2026_line17d", `${P2}.f2_14[0]`],
  ["ty2026_line18", `${P2}.f2_15[0]`],
  ["ty2026_line19a", `${P2}.Line19a_ReadOrder[0].f2_16[0]`],
  ["ty2026_line19b", `${P2}.f2_17[0]`],
  ["ty2026_line19c", `${P2}.f2_18[0]`],
  ["ty2026_line20", `${P2}.f2_19[0]`],
  ["ty2026_line21", `${P2}.f2_20[0]`],
];

const BOXES: ReadonlyArray<readonly [string, string]> = [
  ["line1e_form4255_row1d", `${P1}.Line1e_ReadOrder[0].c1_1[2]`],
  ["line1e_form4255_row2a", `${P1}.Line1e_ReadOrder[0].c1_1[3]`],
  ["line1f_form4255_row1d", `${P1}.Line1f_ReadOrder[0].c1_2[2]`],
  ["line1f_form4255_row2a", `${P1}.Line1f_ReadOrder[0].c1_2[3]`],
];

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...LINES.map(([domainKey, pdfField]): PdfFieldEntry => ({
    kind: "text",
    domainKey,
    pdfField,
  })),
  ...BOXES.map(([domainKey, pdfField]): PdfFieldEntry => ({
    kind: "checkbox",
    domainKey,
    pdfField,
  })),
];

const sum = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

function refuseUnplaced(
  amount: (key: string) => number,
  projected: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): void {
  const reduction = allPending.form8978_reporting_year
    ?.schedule2_line17z_reduction;
  if (
    (typeof reduction === "number" && reduction > 0) ||
    section1294DueFromCalculatedForm(allPending.form8621).tax > 0 ||
    amount("line17z_other_additional_taxes") > 0
  ) {
    throw new Error(
      "TY2026 PDF Schedule 2 line 13z is not mapped; export MeF XML",
    );
  }
  if (projected.line4_exempt_form4361 === true) {
    throw new Error(
      "TY2026 PDF Schedule 2 Form 4361 exemption box is not mapped on the 2026 draft; export MeF XML",
    );
  }
}

function form5329Split(
  amount: (key: string) => number,
  fields: Record<string, unknown>,
): { line5: number; line18: number } {
  const total = amount("line8_form5329_tax");
  if (total > 0 && typeof fields.line8_form5329_chapter1_tax !== "number") {
    throw new Error(
      "TY2026 PDF Schedule 2 lines 5 and 18 need the Form 5329 chapter 1 tax",
    );
  }
  const line5 = amount("line8_form5329_chapter1_tax");
  return { line5, line18: total - line5 };
}

function form8959Split(
  amount: (key: string) => number,
  allPending: Record<string, Record<string, unknown>>,
): { line11: number; line17b: number } {
  const total = amount("line11_additional_medicare");
  const se = allPending.form8959?.line13_se_tax;
  if (total > 0 && typeof se !== "number") {
    throw new Error(
      "TY2026 PDF Schedule 2 lines 11 and 17b need Form 8959 line 13",
    );
  }
  const line11 = typeof se === "number" ? se : 0;
  return { line11, line17b: total - line11 };
}

/** The 2025 Part II amounts on the 2026 lines. */
function ty2026Lines(
  projected: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const amount = (key: string): number =>
    typeof projected[key] === "number" ? projected[key] as number : 0;
  refuseUnplaced(amount, projected, allPending);
  const { line5, line18 } = form5329Split(amount, projected);
  const { line11, line17b } = form8959Split(amount, allPending);
  const line13 = [
    amount("line17a_investment_credit_recapture"),
    amount("line17b_mortgage_subsidy_recapture"),
    amount("line17c_hsa_penalty"),
    amount("line17d_hsa_eligibility_tax"),
    amount("line17e_archer_msa_tax"),
    amount("line17f_medicare_advantage_msa_tax"),
    amount("line17h_nqdc_total"),
    amount("line17k_golden_parachute_total"),
  ];
  const line14 = sum(line13);
  const line15 = sum([
    amount("line4_se_tax"),
    line5,
    amount("line12_niit"),
    amount("line15_section453a_interest"),
    amount("line16_lihtc_recapture"),
    amount("line19_form4255_net_epe"),
    line11,
    line14,
  ]);
  const line16c = amount("line5_unreported_tip_tax") +
    amount("line6_uncollected_8919");
  const line17d = amount("line9_household_employment") + line17b +
    amount("line13_uncollected_fica_total");
  const line19c = amount("line17p_form8621_interest") +
    amount("line17q_form8621_1294_interest");
  const line20 = line16c + line17d + line18 + line19c;
  const line21 = line15 + line20;
  if (Math.abs(line21 - amount("line21_total")) > 0.5) {
    throw new Error(
      "TY2026 PDF Schedule 2 line 21 differs from the 2025-layout total",
    );
  }
  return {
    ...projected,
    ty2026_line4: amount("line4_se_tax"),
    ty2026_line5: line5,
    ty2026_line6: amount("line12_niit"),
    ty2026_line8: amount("line15_section453a_interest"),
    ty2026_line9: amount("line16_lihtc_recapture"),
    ty2026_line10: amount("line19_form4255_net_epe"),
    ty2026_line11: line11,
    ty2026_line12: amount("line20_965_tax_installment"),
    ty2026_line13a_description: projected.line17a_description,
    ty2026_line13a: line13[0],
    ty2026_line13b: line13[1],
    ty2026_line13c: line13[2],
    ty2026_line13d: line13[3],
    ty2026_line13e: line13[4],
    ty2026_line13f: line13[5],
    ty2026_line13h: line13[6],
    ty2026_line13k: line13[7],
    ty2026_line14: line14,
    ty2026_line15: line15,
    ty2026_line16a: amount("line5_unreported_tip_tax"),
    ty2026_line16b: amount("line6_uncollected_8919"),
    ty2026_line16c: line16c,
    ty2026_line17a: amount("line9_household_employment"),
    ty2026_line17b: line17b,
    ty2026_line17c: amount("line13_uncollected_fica_total"),
    ty2026_line17d: line17d,
    ty2026_line18: line18,
    ty2026_line19a: amount("line17p_form8621_interest"),
    ty2026_line19b: amount("line17q_form8621_1294_interest"),
    ty2026_line19c: line19c,
    ty2026_line20: line20,
    ty2026_line21: line21,
  };
}

export const schedule2Pdf2026: PdfFormDescriptor = {
  pendingKey: schedule2Pdf.pendingKey,
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s2--dft.pdf",
  pdfSha256: "0e3d4faa4b96f692bc31119d2c86189c3d8b9263e8f3aaaf7c3da371887ebc56",
  pageIndices: () => [1, 2],
  filerFields: schedule2Pdf.filerFields,
  fields,
  projectFields(fields, allPending) {
    const projected = schedule2Pdf.projectFields?.(fields, allPending) ??
      fields;
    return ty2026Lines(projected, allPending);
  },
};
