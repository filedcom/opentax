import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  calculateForm8815,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8815/index.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
  printZero,
});

// 2025 cached AcroForm field inventory: f1_3-f1_11 are line 1's three
// person/institution rows; f1_12-f1_26 are lines 2-14. Lines 7 and 12 each
// have separate whole-number and fractional boxes around a printed dot.
const fields: ReadonlyArray<PdfFieldEntry> = [
  ...[0, 1, 2].flatMap((index) => {
    const row = index + 1;
    const first = 3 + index * 3;
    const prefix = `${page}Table_Line1[0].Row${row}[0].`;
    return [
      text(`student_${row}_name`, `${prefix}f1_${first}[0]`),
      text(`student_${row}_institution`, `${prefix}ColB[0].f1_${first + 1}[0]`),
      text(`student_${row}_address`, `${prefix}ColB[0].f1_${first + 2}[0]`),
    ];
  }),
  text("line2", `${page}f1_12[0]`),
  text("line3", `${page}f1_13[0]`),
  text("line4", `${page}f1_14[0]`),
  text("line5", `${page}f1_15[0]`),
  text("line6", `${page}f1_16[0]`),
  text("line7_whole", `${page}f1_17[0]`),
  text("line7_fraction", `${page}f1_18[0]`),
  text("line8", `${page}f1_19[0]`),
  text("line9", `${page}f1_20[0]`),
  text("line10", `${page}f1_21[0]`),
  text("line11", `${page}f1_22[0]`),
  text("line12_whole", `${page}f1_23[0]`),
  text("line12_fraction", `${page}f1_24[0]`),
  text("line13", `${page}f1_25[0]`, true),
  text("line14", `${page}f1_26[0]`),
];

function fractionBoxes(ratio: number): { whole: string; fraction: string } {
  const [whole, fraction] = ratio.toFixed(3).split(".");
  return { whole, fraction };
}

export const form8815Pdf: PdfFormDescriptor = {
  pendingKey: "form8815",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8815--2025.pdf",
  fields,
  filerFields: [
    text("fullName", `${page}f1_1[0]`),
    text("primarySSN", `${page}f1_2[0]`),
  ],
  pageIndices: () => [0],
  projectFields(fields) {
    if (Object.keys(fields).length === 0) return {};
    if (fields.line14 === undefined) {
      throw new Error("Form 8815 PDF needs computed 2025 form lines");
    }
    const source = inputSchema.parse(Object.fromEntries(
      Object.keys(inputSchema.shape).map((key) => [key, fields[key]]),
    ));
    const lines = calculateForm8815(source, CONFIG_BY_YEAR[2025]);
    for (const [key, value] of Object.entries(lines)) {
      if (fields[key] !== value) {
        throw new Error(`Form 8815 PDF ${key} differs from source calculation`);
      }
    }
    const students = Object.fromEntries(
      source.eligible_students.flatMap((student, index) => {
        const row = index + 1;
        const address = student.institution_address;
        return [
          [`student_${row}_name`, student.person_name],
          [`student_${row}_institution`, student.institution_name],
          [
            `student_${row}_address`,
            [
              address.line1,
              address.line2,
              `${address.city}, ${address.state} ${address.zip}`,
            ].filter(Boolean).join(", "),
          ],
        ];
      }),
    );
    const line7 = fractionBoxes(lines.line7);
    const line12 = fractionBoxes(lines.line12);
    return {
      ...fields,
      ...students,
      line7_whole: line7.whole,
      line7_fraction: line7.fraction,
      line12_whole: lines.line11 > 0 ? line12.whole : undefined,
      line12_fraction: lines.line11 > 0 ? line12.fraction : undefined,
    };
  },
};
