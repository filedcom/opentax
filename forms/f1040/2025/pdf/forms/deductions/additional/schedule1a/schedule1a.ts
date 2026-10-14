import type { PdfFieldEntry, PdfFormDescriptor } from "../../../../review-support/form-descriptor.ts";
import {
  calculateQualifiedTipsSchedule1A,
  calculateSeniorOnlySchedule1A,
  calculateVehicleInterestSchedule1A,
  calculateW2OvertimeSchedule1A,
  inputSchema,
  qualifiedEmployeeTipRows,
  seniorDeduction,
} from "../../../../../../nodes/intermediate/forms/deductions/additional/schedule1a/index.ts";
import { schedule1a } from "../../../../../mef/forms/deductions/additional/schedule1a/schedule1a.ts";
import { appendSchedule1AVehicleStatement } from "./schedule1a_vehicle_statement.ts";
import { appendSchedule1ATipsWorksheet } from "./schedule1a_tips_worksheet.ts";

// Checked against the two-page 2025 IRS AcroForm.
const page1 = "form1[0].Page1[0]";
const page2 = "form1[0].Page2[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "line1_agi", pdfField: `${page1}.f1_03[0]` },
  {
    kind: "text",
    domainKey: "line2b_form2555_exclusion",
    pdfField: `${page1}.f1_05[0]`,
  },
  {
    kind: "text",
    domainKey: "line2e_zero_exclusions",
    pdfField: `${page1}.f1_08[0]`,
    printZero: true,
  },
  { kind: "text", domainKey: "line3_magi", pdfField: `${page1}.f1_09[0]` },
  {
    kind: "text",
    domainKey: "line4a_w2_tips",
    pdfField: `${page1}.f1_10[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line4b_form4137_tips",
    pdfField: `${page1}.f1_11[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line4c_employee_tips",
    pdfField: `${page1}.f1_12[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line5_trade_business_tips",
    pdfField: `${page1}.f1_13[0]`,
  },
  {
    kind: "text",
    domainKey: "line6_total_tips",
    pdfField: `${page1}.f1_14[0]`,
  },
  {
    kind: "text",
    domainKey: "line7_capped_tips",
    pdfField: `${page1}.f1_15[0]`,
  },
  { kind: "text", domainKey: "line8_magi", pdfField: `${page1}.f1_16[0]` },
  { kind: "text", domainKey: "line9_threshold", pdfField: `${page1}.f1_17[0]` },
  {
    kind: "text",
    domainKey: "line10_excess_magi",
    pdfField: `${page1}.f1_18[0]`,
  },
  {
    kind: "text",
    domainKey: "line11_thousands",
    pdfField: `${page1}.f1_19[0]`,
  },
  {
    kind: "text",
    domainKey: "line12_reduction",
    pdfField: `${page1}.f1_20[0]`,
  },
  { kind: "text", domainKey: "line13_tips", pdfField: `${page1}.f1_21[0]` },
  {
    kind: "text",
    domainKey: "line14a_w2_overtime",
    pdfField: `${page1}.f1_22[0]`,
  },
  {
    kind: "text",
    domainKey: "line14b_zero_1099",
    pdfField: `${page1}.f1_23[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line14c_total_overtime",
    pdfField: `${page1}.f1_24[0]`,
  },
  {
    kind: "text",
    domainKey: "line15_capped_overtime",
    pdfField: `${page1}.f1_25[0]`,
  },
  { kind: "text", domainKey: "line16_magi", pdfField: `${page1}.f1_26[0]` },
  {
    kind: "text",
    domainKey: "line17_threshold",
    pdfField: `${page1}.f1_27[0]`,
  },
  {
    kind: "text",
    domainKey: "line18_excess_magi",
    pdfField: `${page1}.f1_28[0]`,
  },
  {
    kind: "text",
    domainKey: "line19_thousands",
    pdfField: `${page1}.f1_29[0]`,
  },
  {
    kind: "text",
    domainKey: "line20_reduction",
    pdfField: `${page1}.f1_30[0]`,
  },
  { kind: "text", domainKey: "line21_overtime", pdfField: `${page1}.f1_31[0]` },
  {
    kind: "text",
    domainKey: "line22a_vin",
    pdfField: `${page2}.Table_Line22[0].Line22a[0].VIN-1_Comb[0].f2_01[0]`,
  },
  {
    kind: "text",
    domainKey: "line22a_elsewhere",
    pdfField: `${page2}.Table_Line22[0].Line22a[0].f2_02[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line22a_interest",
    pdfField: `${page2}.Table_Line22[0].Line22a[0].f2_03[0]`,
  },
  {
    kind: "text",
    domainKey: "line22b_vin",
    pdfField: `${page2}.Table_Line22[0].Line22b[0].VIN-2_Comb[0].f2_04[0]`,
  },
  {
    kind: "text",
    domainKey: "line22b_elsewhere",
    pdfField: `${page2}.Table_Line22[0].Line22b[0].f2_05[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line22b_interest",
    pdfField: `${page2}.Table_Line22[0].Line22b[0].f2_06[0]`,
  },
  {
    kind: "text",
    domainKey: "line23_total_interest",
    pdfField: `${page2}.f2_07[0]`,
  },
  {
    kind: "text",
    domainKey: "line24_capped_interest",
    pdfField: `${page2}.f2_08[0]`,
  },
  { kind: "text", domainKey: "line25_magi", pdfField: `${page2}.f2_09[0]` },
  {
    kind: "text",
    domainKey: "line26_threshold",
    pdfField: `${page2}.f2_10[0]`,
  },
  {
    kind: "text",
    domainKey: "line27_excess_magi",
    pdfField: `${page2}.f2_11[0]`,
  },
  {
    kind: "text",
    domainKey: "line28_thousands",
    pdfField: `${page2}.f2_12[0]`,
  },
  {
    kind: "text",
    domainKey: "line29_reduction",
    pdfField: `${page2}.f2_13[0]`,
  },
  {
    kind: "text",
    domainKey: "line30_vehicle_interest",
    pdfField: `${page2}.f2_14[0]`,
  },
  { kind: "text", domainKey: "line31_magi", pdfField: `${page2}.f2_15[0]` },
  {
    kind: "text",
    domainKey: "line32_threshold",
    pdfField: `${page2}.f2_16[0]`,
  },
  {
    kind: "text",
    domainKey: "line33_excess_magi",
    pdfField: `${page2}.f2_17[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line34_reduction",
    pdfField: `${page2}.f2_18[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line35_per_person",
    pdfField: `${page2}.f2_19[0]`,
  },
  {
    kind: "text",
    domainKey: "line36a_taxpayer",
    pdfField: `${page2}.f2_20[0]`,
  },
  {
    kind: "text",
    domainKey: "line36b_spouse",
    pdfField: `${page2}.f2_21[0]`,
  },
  {
    kind: "text",
    domainKey: "line37_senior",
    pdfField: `${page2}.f2_22[0]`,
  },
  {
    kind: "text",
    domainKey: "line38_total",
    pdfField: `${page2}.f2_23[0]`,
  },
];

export const schedule1aPdf: PdfFormDescriptor = {
  pendingKey: "schedule1a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1a--2025.pdf",
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return raw;
    const input = inputSchema.parse(raw);
    // Keep the PDF authorization identical to native XML authorization.
    if (!schedule1a.build(input, { pending: allPending })) return {};
    const projected: Record<string, unknown> = {
      line1_agi: input.magi,
      line2b_form2555_exclusion: input.form2555_line45_exclusion,
      line2e_zero_exclusions: input.form2555_line45_exclusion ?? 0,
      line3_magi: (input.magi ?? 0) +
        (input.form2555_line45_exclusion ?? 0),
    };
    let total = 0;
    if (
      (input.qualified_employee_tips?.length ?? 0) > 0 ||
      (input.qualified_form4137_tips?.length ?? 0) > 0 ||
      (input.form4070_reports?.length ?? 0) > 0 ||
      (input.employer_tip_statements?.length ?? 0) > 0 ||
      (input.qualified_trade_business_tips?.length ?? 0) > 0
    ) {
      const lines = calculateQualifiedTipsSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        input,
      );
      Object.assign(projected, {
        ...lines,
        ...(qualifiedEmployeeTipRows(input).length > 1
          ? { pdf_tip_sources: qualifiedEmployeeTipRows(input) }
          : {}),
        line8_magi: lines.line3_magi,
        ...(lines.line10_excess_magi === 0
          ? {
            line10_excess_magi: undefined,
            line11_thousands: undefined,
            line12_reduction: undefined,
          }
          : {}),
      });
      total += lines.line13_tips;
    }
    if ((input.qualified_w2_overtime?.length ?? 0) > 0) {
      const lines = calculateW2OvertimeSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        input,
      );
      Object.assign(projected, {
        ...lines,
        line14b_zero_1099: 0,
        line16_magi: lines.line3_magi,
        ...(lines.line18_excess_magi === 0
          ? {
            line18_excess_magi: undefined,
            line19_thousands: undefined,
            line20_reduction: undefined,
          }
          : {}),
      });
      total += lines.line21_overtime;
    }
    if ((input.vehicle_loans?.length ?? 0) > 0) {
      const lines = calculateVehicleInterestSchedule1A(
        { taxYear: 2025, formType: "f1040" },
        input,
      );
      const [first, second] = lines.line22_vehicles;
      const overflow = lines.line22_vehicles.length > 2
        ? lines.line22_vehicles.slice(1)
        : undefined;
      Object.assign(projected, {
        ...lines,
        line22a_vin: first.vin,
        line22a_elsewhere: first.deducted_elsewhere,
        line22a_interest: first.schedule1a_interest,
        line22b_vin: overflow ? "SEEATTACHED" : second?.vin,
        line22b_elsewhere: overflow
          ? overflow.reduce((sum, loan) => sum + loan.deducted_elsewhere, 0)
          : second?.deducted_elsewhere,
        line22b_interest: overflow
          ? overflow.reduce((sum, loan) => sum + loan.schedule1a_interest, 0)
          : second?.schedule1a_interest,
        ...(overflow ? { line22_overflow_vehicles: overflow } : {}),
        line25_magi: lines.line3_magi,
        ...(lines.line27_excess_magi === 0
          ? {
            line27_excess_magi: undefined,
            line28_thousands: undefined,
            line29_reduction: undefined,
          }
          : {}),
      });
      total += lines.line30_vehicle_interest;
    }
    if (seniorDeduction({ taxYear: 2025, formType: "f1040" }, input) > 0) {
      const lines = calculateSeniorOnlySchedule1A(
        { taxYear: 2025, formType: "f1040" },
        input,
      );
      Object.assign(projected, {
        ...lines,
        line31_magi: lines.line3_magi,
      });
      total += lines.line37_senior;
    }
    projected.line38_total = total;
    return projected;
  },
  fields,
  async appendSupplementalPages(document, projected, filer) {
    await appendSchedule1ATipsWorksheet(document, projected, filer);
    await appendSchedule1AVehicleStatement(document, projected, filer);
  },
  filerFields: [
    {
      kind: "text",
      domainKey: "nameShownOnForm1040",
      pdfField: `${page1}.f1_01[0]`,
    },
    {
      kind: "text",
      domainKey: "primarySSN",
      pdfField: `${page1}.f1_02[0]`,
    },
  ],
};
