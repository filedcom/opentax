import { form8995PdfFor } from "../../../../../2025/pdf/forms/deductions/business/f8995/f8995.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Form 8995 draft (page 1 is the IRS cover sheet). Lines 1-15 keep
// their fields; new line 16 is the IRC 199A(i) minimum deduction and line 17
// the deduction, so the two loss carryforwards move to lines 18 and 19.
const P1 = "topmostSubform[0].Page1[0]";

const rename: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => {
      const number = index + 1;
      const row = ["", "", "Table[0].Row1i[0].", "Table[0].Row1i[0].",
        "Table[0].Row1i[0].", "Table[0].Row1ii[0].", "Table[0].Row1ii[0].",
        "Table[0].Row1ii[0].", "Table[0].Row1iii[0]."][index];
      return [
        `${P1}.${row}f1_0${number}[0]`,
        `${P1}.${row}f1_${number}[0]`,
      ];
    }),
  ),
  [`${P1}.Line2_ReadOrder[0].f1_18[0]`]: `${P1}.f1_18[0]`,
  [`${P1}.Line6_ReadOrder[0].f1_22[0]`]: `${P1}.f1_22[0]`,
};

const added = [16, 17, 18, 19].map((line): PdfFieldEntry => ({
  kind: "text",
  domainKey: `ty2026_line${line}`,
  pdfField: `${P1}.f1_${line + 16}[0]`,
  printZero: true,
}));

const base = form8995PdfFor(2026);
const draft = withoutStatements(
  onTy2026Template(
    base,
    {
      pdfUrl: "https://www.irs.gov/pub/irs-dft/f8995--dft.pdf",
      pdfSha256:
        "d698390e2990de21b8df9ccb485f9309b817707d4871581118337bf7c1b14fd8",
      formPages: [1],
    },
    rename,
    ["line16", "line17"],
    added,
  ),
  "Form 8995",
);

export const form8995Pdf2026: PdfFormDescriptor = {
  ...draft,
  projectFields(fields, allPending) {
    if (fields.minimum_deduction !== undefined) {
      throw new Error(
        "TY2026 PDF Form 8995 line 16 minimum deduction is not mapped; export MeF XML",
      );
    }
    const projected = base.projectFields?.(fields, allPending) ?? fields;
    if (typeof projected.line15 !== "number") return projected;
    return {
      ...projected,
      ty2026_line16: 0,
      ty2026_line17: projected.line15,
      ty2026_line18: projected.line16,
      ty2026_line19: projected.line17,
    };
  },
};
