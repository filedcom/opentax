import { schedule1aPdfFor } from "../../../../../2025/pdf/forms/deductions/additional/schedule1a/schedule1a.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Schedule 1-A draft (page 1 is the IRS cover sheet). Part I keeps
// its fields. Tips (Part II) and overtime (Part III) now list each employer
// and business by row; those rows are not mapped, so a return with either
// refuses. Car loan interest moves to page 3 as lines 28-36 with original
// use and U.S. assembly questions, seniors become lines 37-43 and the total
// line 44.
const P2 = "form1[0].Page2[0]";
const P3 = "form1[0].Page3[0]";

const UNMAPPED_PARTS = [
  "line4a_w2_tips",
  "line4b_form4137_tips",
  "line4c_employee_tips",
  "line5_trade_business_tips",
  "line6_total_tips",
  "line7_capped_tips",
  "line8_magi",
  "line9_threshold",
  "line10_excess_magi",
  "line11_thousands",
  "line12_reduction",
  "line13_tips",
  "line14a_w2_overtime",
  "line14b_zero_1099",
  "line14c_total_overtime",
  "line15_capped_overtime",
  "line16_magi",
  "line17_threshold",
  "line18_excess_magi",
  "line19_thousands",
  "line20_reduction",
  "line21_overtime",
];

const vehicleRow = (row: "a" | "b", n: number) => ({
  [`${P2}.Table_Line22[0].Line22${row}[0].VIN-${n}_Comb[0].f2_0${
    n * 3 - 2
  }[0]`]: `${P3}.Table_Line28${row}[0].Line28${row}[0].VIN-${n}_Comb[0].f3_0${
    n * 3 - 2
  }[0]`,
  [`${P2}.Table_Line22[0].Line22${row}[0].f2_0${n * 3 - 1}[0]`]:
    `${P3}.Table_Line28${row}[0].Line28${row}[0].f3_0${n * 3 - 1}[0]`,
  [`${P2}.Table_Line22[0].Line22${row}[0].f2_0${n * 3}[0]`]:
    `${P3}.Table_Line28${row}[0].Line28${row}[0].f3_0${n * 3}[0]`,
});

const rename: Readonly<Record<string, string>> = {
  ...vehicleRow("a", 1),
  ...vehicleRow("b", 2),
  ...Object.fromEntries(
    Array.from({ length: 17 }, (_, index) => [
      `${P2}.f2_${String(7 + index).padStart(2, "0")}[0]`,
      `${P3}.f3_${String(7 + index).padStart(2, "0")}[0]`,
    ]),
  ),
};

// Yes answers come from the loan's required source facts (original use and
// U.S. final assembly are literal `true` in the Schedule 1-A input).
const vehicleAnswers: readonly PdfFieldEntry[] = [
  ["line22a_vin", 1],
  ["line22a_vin", 2],
  ["line22b_vin", 3],
  ["line22b_vin", 4],
].map(([domainKey, box]): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey: `ty2026_${domainKey}_qualifies`,
  pdfField: `${P3}.c3_${box}[0]`,
}));

const base = schedule1aPdfFor(2026);
const draft = onTy2026Template(
  { ...base, pageIndices: () => [0, 2] },
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s1a--dft.pdf",
    pdfSha256:
      "e22aec7feb2f5b734e16ee74d70acfdfdc0d66a5292f69cf0ced3b87543d95ac",
    formPages: [1, 2, 3],
  },
  rename,
  UNMAPPED_PARTS,
  vehicleAnswers,
);

export const schedule1aPdf2026: PdfFormDescriptor = withoutStatements(
  {
    ...draft,
    projectFields(raw, allPending) {
      const projected = base.projectFields?.(raw, allPending) ?? raw;
      if (
        UNMAPPED_PARTS.some((key) =>
          projected[key] !== undefined && projected[key] !== 0
        ) || projected.line22_overflow_vehicles !== undefined
      ) {
        throw new Error(
          "TY2026 PDF Schedule 1-A tips, overtime and more than two vehicles are not mapped; export MeF XML",
        );
      }
      return {
        ...projected,
        ty2026_line22a_vin_qualifies: projected.line22a_vin !== undefined,
        ty2026_line22b_vin_qualifies: projected.line22b_vin !== undefined,
      };
    },
  },
  "Schedule 1-A",
);
