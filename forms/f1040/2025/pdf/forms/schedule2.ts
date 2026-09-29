import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm4255Routes,
  type F4255Input,
} from "../../../nodes/inputs/f4255/index.ts";

// IRS Schedule 2 (2025) AcroForm field names.
// Verified layout from https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf
//
// Personal information occupies f1_01 and f1_02. The 2025 redesign then uses
// f1_03 through f1_13 for Part I and f1_15 onward for Part II amounts.

const fields: ReadonlyArray<PdfFieldEntry> = [
  // ── Part I: additions to tax and AMT ────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line1a_excess_advance_premium",
    pdfField: "form1[0].Page1[0].Line1a_ReadOrder[0].f1_03[0]",
  },
  {
    kind: "text",
    domainKey: "line1b_new_clean_vehicle_repayment",
    pdfField: "form1[0].Page1[0].f1_04[0]",
  },
  {
    kind: "text",
    domainKey: "line1c_prev_owned_clean_vehicle_repayment",
    pdfField: "form1[0].Page1[0].f1_05[0]",
  },
  {
    kind: "text",
    domainKey: "line1d_form4255_net_epe",
    pdfField: "form1[0].Page1[0].f1_06[0]",
  },
  {
    kind: "checkbox",
    domainKey: "line1e_form4255_row1d",
    pdfField: "form1[0].Page1[0].Line1e_ReadOrder[0].c1_1[2]",
  },
  {
    kind: "checkbox",
    domainKey: "line1e_form4255_row2a",
    pdfField: "form1[0].Page1[0].Line1e_ReadOrder[0].c1_1[3]",
  },
  {
    kind: "text",
    domainKey: "line1e_form4255_excessive_payment",
    pdfField: "form1[0].Page1[0].f1_07[0]",
  },
  {
    kind: "checkbox",
    domainKey: "line1f_form4255_row1d",
    pdfField: "form1[0].Page1[0].Line1f_ReadOrder[0].c1_2[2]",
  },
  {
    kind: "checkbox",
    domainKey: "line1f_form4255_row2a",
    pdfField: "form1[0].Page1[0].Line1f_ReadOrder[0].c1_2[3]",
  },
  {
    kind: "text",
    domainKey: "line1f_form4255_20_percent_ep",
    pdfField: "form1[0].Page1[0].f1_08[0]",
  },
  {
    kind: "text",
    domainKey: "line2_amt",
    pdfField: "form1[0].Page1[0].f1_12[0]",
  },

  // ── Part II: Other Taxes ─────────────────────────────────────────────────────
  {
    kind: "text",
    domainKey: "line4_se_tax",
    pdfField: "form1[0].Page1[0].f1_15[0]",
  },
  {
    kind: "text",
    domainKey: "line5_unreported_tip_tax",
    pdfField: "form1[0].Page1[0].f1_16[0]",
  },
  {
    kind: "text",
    domainKey: "line6_uncollected_8919",
    pdfField: "form1[0].Page1[0].f1_17[0]",
  },
  {
    kind: "text",
    domainKey: "line8_form5329_tax",
    pdfField: "form1[0].Page1[0].f1_19[0]",
  },
  {
    kind: "text",
    domainKey: "line9_household_employment",
    pdfField: "form1[0].Page1[0].f1_20[0]",
  },
  {
    kind: "text",
    domainKey: "line11_additional_medicare",
    pdfField: "form1[0].Page1[0].f1_22[0]",
  },
  {
    kind: "text",
    domainKey: "line12_niit",
    pdfField: "form1[0].Page1[0].f1_23[0]",
  },
  {
    kind: "text",
    domainKey: "line13_uncollected_fica_total",
    pdfField: "form1[0].Page1[0].f1_24[0]",
  },
  {
    kind: "text",
    domainKey: "line16_lihtc_recapture",
    pdfField: "form1[0].Page1[0].f1_27[0]",
  },
  {
    kind: "text",
    domainKey: "line17a_description",
    pdfField:
      "form1[0].Page2[0].Line17a_ReadOrder[0].Line17_ReadOrder[0].f2_01[0]",
  },
  {
    kind: "text",
    domainKey: "line17a_investment_credit_recapture",
    pdfField: "form1[0].Page2[0].Line17a_ReadOrder[0].f2_02[0]",
  },
  {
    kind: "text",
    domainKey: "line17b_mortgage_subsidy_recapture",
    pdfField: "form1[0].Page2[0].f2_03[0]",
  },
  {
    kind: "text",
    domainKey: "line17c_hsa_penalty",
    pdfField: "form1[0].Page2[0].f2_04[0]",
  },
  {
    kind: "text",
    domainKey: "line17d_hsa_eligibility_tax",
    pdfField: "form1[0].Page2[0].f2_05[0]",
  },
  {
    kind: "text",
    domainKey: "line17e_archer_msa_tax",
    pdfField: "form1[0].Page2[0].f2_06[0]",
  },
  {
    kind: "text",
    domainKey: "line17f_medicare_advantage_msa_tax",
    pdfField: "form1[0].Page2[0].f2_07[0]",
  },
  {
    kind: "text",
    domainKey: "line17h_nqdc_total",
    pdfField: "form1[0].Page2[0].f2_09[0]",
  },
  {
    kind: "text",
    domainKey: "line17k_golden_parachute_total",
    pdfField: "form1[0].Page2[0].f2_12[0]",
  },
  {
    kind: "text",
    domainKey: "line17p_form8621_interest",
    pdfField: "form1[0].Page2[0].f2_17[0]",
  },
  {
    kind: "text",
    domainKey: "line17z_description",
    pdfField: "form1[0].Page2[0].Line17z_ReadOrder[0].f2_19[0]",
  },
  {
    kind: "text",
    domainKey: "line17z_amount",
    pdfField: "form1[0].Page2[0].f2_20[0]",
  },
  {
    kind: "text",
    domainKey: "line19_form4255_net_epe",
    pdfField: "form1[0].Page2[0].f2_22[0]",
  },
  {
    kind: "text",
    domainKey: "line20_965_tax_installment",
    pdfField: "form1[0].Page2[0].f2_23[0]",
  },
  {
    kind: "text",
    domainKey: "line21_total",
    pdfField: "form1[0].Page2[0].f2_24[0]",
  },
];

export const schedule2Pdf: PdfFormDescriptor = {
  pendingKey: "schedule2",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s2--2025.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: "form1[0].Page1[0].f1_01[0]" },
    { kind: "text", domainKey: "primarySSN", pdfField: "form1[0].Page1[0].f1_02[0]" },
  ],
  fields,
  projectFields(fields, allPending) {
    const source = allPending.f4255;
    let form4255Boxes: Record<string, boolean> = {};
    if (source && typeof source === "object" && "rows" in source) {
      const lines = calculateForm4255Routes(source as F4255Input);
      const expected: ReadonlyArray<readonly [string, number]> = [
        ["line1d_form4255_net_epe", lines.line1d],
        [
          "line1e_form4255_excessive_payment",
          lines.line1e_1d + lines.line1e_2a,
        ],
        ["line1f_form4255_20_percent_ep", lines.line1f_1d + lines.line1f_2a],
        ["line19_form4255_net_epe", lines.line19],
      ];
      if (expected.some(([key, amount]) => (fields[key] ?? 0) !== amount)) {
        throw new Error(
          "Schedule 2 PDF Form 4255 lines differ from source rows",
        );
      }
      form4255Boxes = {
        line1e_form4255_row1d: lines.line1e_1d > 0,
        line1e_form4255_row2a: lines.line1e_2a > 0,
        line1f_form4255_row1d: lines.line1f_1d > 0,
        line1f_form4255_row2a: lines.line1f_2a > 0,
      };
    } else if (
      [
        "line1d_form4255_net_epe",
        "line1e_form4255_excessive_payment",
        "line1f_form4255_20_percent_ep",
        "line19_form4255_net_epe",
      ].some((key) => typeof fields[key] === "number" && fields[key] > 0)
    ) {
      throw new Error("Schedule 2 PDF Form 4255 lines require source rows");
    }
    const amount = (key: string): number =>
      typeof fields[key] === "number" ? fields[key] as number : 0;
    const line13 = amount("uncollected_fica") +
      amount("uncollected_fica_gtl");
    const line17h = amount("section409a_excise") +
      amount("line17h_nqdc_tax");
    const line17k = amount("golden_parachute_excise") +
      amount("line17k_golden_parachute_excise");
    const sourceTotals = {
      ...(line13 > 0 ? { line13_uncollected_fica_total: line13 } : {}),
      ...(line17h > 0 ? { line17h_nqdc_total: line17h } : {}),
      ...(line17k > 0 ? { line17k_golden_parachute_total: line17k } : {}),
    };
    const investmentRecapture =
      typeof fields.line17a_investment_credit_recapture ===
          "number"
        ? fields.line17a_investment_credit_recapture
        : 0;
    if (investmentRecapture > 0) {
      throw new Error(
        "Schedule 2 PDF generic 3468 recapture requires a specific Form 4255 credit-line source",
      );
    }
    const newMarketsRecapture =
      typeof fields.line17a_new_markets_credit_recapture === "number"
        ? fields.line17a_new_markets_credit_recapture
        : 0;
    const recaptureCodes = [
      ...(investmentRecapture > 0 ? ["3468"] : []),
      ...(newMarketsRecapture > 0 ? ["NMCR"] : []),
    ];
    const projected = recaptureCodes.length > 0
      ? {
        ...fields,
        ...form4255Boxes,
        ...sourceTotals,
        line17a_description: recaptureCodes.join(", "),
        line17a_investment_credit_recapture: investmentRecapture +
          newMarketsRecapture,
      }
      : { ...fields, ...form4255Boxes, ...sourceTotals };
    const worksheet = allPending.form8978_reporting_year;
    const reduction = worksheet?.schedule2_line17z_reduction;
    const line21 = worksheet?.schedule2_line21;
    if (typeof reduction !== "number" || reduction <= 0) {
      return typeof line21 === "number" && line21 > 0
        ? { ...projected, line21_total: line21 }
        : projected;
    }
    return {
      ...projected,
      line17z_description: "Form 8978 ADJ",
      line17z_amount: `(${Math.round(reduction)})`,
      line21_total: line21,
    };
  },
};
