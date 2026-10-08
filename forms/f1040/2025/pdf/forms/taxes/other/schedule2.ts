import { StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  calculateForm4255Routes,
  type F4255Input,
} from "../../../../../nodes/inputs/taxes/credit-recapture/f4255/index.ts";
import { necBox3ExciseFromSources } from "../../../../../nodes/inputs/income/business/f1099nec/index.ts";
import { section1294DueFromCalculatedForm } from "../../../../../nodes/inputs/income/foreign/f8621/section1294.ts";
import { calculateForm8874Recapture } from "../../../../../nodes/inputs/credits/business/f8874/recapture_node.ts";
import type { F8874RecaptureInput } from "../../../../../nodes/inputs/credits/business/f8874/recapture_node.ts";
import { assertForm8874RecaptureOwners } from "../../../../../nodes/inputs/credits/business/f8874/recapture_owner.ts";
import {
  assertNo2025Schedule2Line10,
  assertNoUnsupportedSchedule2Line14,
} from "../../../../../nodes/intermediate/aggregation/taxes/other/schedule2/index.ts";
import { assertSection453aSchedule2Line } from "../../../../domains/taxes/other/section453a-reconciliation.ts";

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
    domainKey: "line1z_total_additions",
    pdfField: "form1[0].Page1[0].f1_11[0]",
  },
  {
    kind: "text",
    domainKey: "line2_amt",
    pdfField: "form1[0].Page1[0].f1_12[0]",
  },
  {
    kind: "text",
    domainKey: "line3_additional_tax",
    pdfField: "form1[0].Page1[0].f1_13[0]",
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
    domainKey: "line7_unreported_ss_medicare_total",
    pdfField: "form1[0].Page1[0].f1_18[0]",
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
    domainKey: "line15_section453a_interest",
    pdfField: "form1[0].Page1[0].f1_26[0]",
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
    domainKey: "line17q_form8621_1294_interest",
    pdfField: "form1[0].Page2[0].f2_18[0]",
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
    domainKey: "line18_other_additional_taxes",
    pdfField: "form1[0].Page2[0].f2_21[0]",
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
    {
      kind: "text",
      domainKey: "nameShownOnForm1040",
      pdfField: "form1[0].Page1[0].f1_01[0]",
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: "form1[0].Page1[0].f1_02[0]",
    },
  ],
  fields,
  async appendSupplementalPages(document, _fields, filer, allPending) {
    const reduction = allPending?.form8978_reporting_year
      ?.schedule2_line17z_reduction;
    const tax = section1294DueFromCalculatedForm(allPending?.form8621).tax;
    if (typeof reduction !== "number" || reduction <= 0 || tax <= 0) return;
    const name = filer?.fullName ?? filer?.nameLine1;
    const ssn = filer?.primarySSN?.replaceAll("-", "");
    if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
      throw new Error("Schedule 2 line 17z statement needs filer identity");
    }
    const page = document.addPage([612, 792]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("Schedule 2 (Form 1040) line 17z - other taxes statement", {
      x: 42,
      y: 748,
      font: bold,
      size: 12,
    });
    page.drawText(`${name} | SSN ${ssn} | Tax year 2025`, {
      x: 42,
      y: 718,
      font,
      size: 9,
    });
    page.drawText(`1294DT - deferred tax due from Form 8621: ${tax}`, {
      x: 42,
      y: 680,
      font,
      size: 10,
    });
    page.drawText(`Form 8978 ADJ: (${Math.round(reduction)})`, {
      x: 42,
      y: 658,
      font,
      size: 10,
    });
    page.drawText(`Net line 17z: ${tax - Math.round(reduction)}`, {
      x: 42,
      y: 630,
      font: bold,
      size: 10,
    });
  },
  projectFields(fields, allPending) {
    assertNo2025Schedule2Line10(fields);
    assertNoUnsupportedSchedule2Line14(fields);
    assertSection453aSchedule2Line(
      fields.line15_section453a_interest,
      allPending.f453a_interest,
      allPending.general?.taxpayer_ssn,
    );
    const necExcise = typeof fields.line17k_golden_parachute_excise === "number"
      ? fields.line17k_golden_parachute_excise
      : 0;
    if (necExcise > 0 || allPending.f1099nec !== undefined) {
      const general = allPending.general ?? {};
      const taxpayerSsn = general.taxpayer_ssn;
      if (typeof taxpayerSsn !== "string") {
        throw new Error("Schedule 2 PDF 1099-NEC box 3 needs filer identity");
      }
      const recipients = [taxpayerSsn];
      if (
        general.filing_status === "mfj" &&
        typeof general.spouse_ssn === "string"
      ) {
        recipients.push(general.spouse_ssn);
      }
      const sourced = necBox3ExciseFromSources(
        allPending.f1099nec,
        recipients,
      );
      if (Math.abs(sourced - necExcise) > 0.001) {
        throw new Error(
          "Schedule 2 PDF line 17k differs from 1099-NEC box 3 sources",
        );
      }
    }
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
    const newMarketsSource = allPending.f8874_recapture;
    if (newMarketsSource !== undefined || newMarketsRecapture > 0) {
      if (newMarketsSource === undefined) {
        throw new Error(
          "Schedule 2 PDF NMCR needs a Form 8874-B recapture source",
        );
      }
      const calculated = calculateForm8874Recapture(
        newMarketsSource as F8874RecaptureInput,
      );
      assertForm8874RecaptureOwners(newMarketsSource, allPending);
      if (calculated !== newMarketsRecapture) {
        throw new Error(
          "Schedule 2 PDF NMCR differs from Form 8874-B recapture source",
        );
      }
    }
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
    const partVI = section1294DueFromCalculatedForm(allPending.form8621);
    if (
      amount("line17q_form8621_1294_interest") !== partVI.interest ||
      amount("line17z_form8621_1294_deferred_tax") !== partVI.tax
    ) {
      throw new Error("Schedule 2 PDF Part VI differs from Form 8621 sources");
    }
    const reduction = typeof worksheet?.schedule2_line17z_reduction === "number"
      ? worksheet.schedule2_line17z_reduction
      : 0;
    const sumAmount = (key: string): number => {
      const value = fields[key];
      return Array.isArray(value)
        ? value.reduce(
          (sum, item) => sum + (typeof item === "number" ? item : 0),
          0,
        )
        : typeof value === "number"
        ? value
        : 0;
    };
    const line1z = [
      "line1a_excess_advance_premium",
      "line1b_new_clean_vehicle_repayment",
      "line1c_prev_owned_clean_vehicle_repayment",
      "line1d_form4255_net_epe",
      "line1e_form4255_excessive_payment",
      "line1f_form4255_20_percent_ep",
    ].reduce((sum, key) => sum + sumAmount(key), 0);
    const line3 = line1z + amount("line2_amt");
    const line7 = amount("line5_unreported_tip_tax") +
      amount("line6_uncollected_8919");
    const line17z = amount("line17z_other_additional_taxes") + partVI.tax -
      reduction;
    const line18 = [
      "line17a_investment_credit_recapture",
      "line17a_new_markets_credit_recapture",
      "line17b_mortgage_subsidy_recapture",
      "line17c_hsa_penalty",
      "line17d_hsa_eligibility_tax",
      "line17e_archer_msa_tax",
      "line17f_medicare_advantage_msa_tax",
      "section409a_excise",
      "line17h_nqdc_tax",
      "golden_parachute_excise",
      "line17k_golden_parachute_excise",
      "line17p_form8621_interest",
      "line17q_form8621_1294_interest",
    ].reduce((sum, key) => sum + amount(key), line17z);
    if (line18 < 0) {
      throw new Error(
        "Schedule 2 PDF line 18 cannot print a negative Form 8978 adjustment",
      );
    }
    const calculatedPart2 = amount("line4_se_tax") + line7 +
      amount("line8_form5329_tax") +
      amount("line9_household_employment") +
      amount("line11_additional_medicare") +
      amount("line12_niit") +
      amount("line15_section453a_interest") + line13 +
      amount("line16_lihtc_recapture") + line18 +
      amount("line19_form4255_net_epe");
    const line21 = typeof worksheet?.schedule2_line21 === "number"
      ? worksheet.schedule2_line21
      : calculatedPart2;
    return {
      ...projected,
      ...(line1z > 0 ? { line1z_total_additions: line1z } : {}),
      ...(line3 > 0 ? { line3_additional_tax: line3 } : {}),
      ...(line7 > 0 ? { line7_unreported_ss_medicare_total: line7 } : {}),
      ...(line18 > 0 ? { line18_other_additional_taxes: line18 } : {}),
      ...(line21 > 0 || reduction > 0 ? { line21_total: line21 } : {}),
      ...(reduction > 0 || partVI.tax > 0
        ? {
          line17z_description: reduction > 0 && partVI.tax > 0
            ? "SEE STATEMENT"
            : partVI.tax > 0
            ? "1294DT"
            : "Form 8978 ADJ",
          line17z_amount: line17z < 0
            ? `(${Math.abs(Math.round(line17z))})`
            : Math.round(line17z),
        }
        : {}),
    };
  },
};
