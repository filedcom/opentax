import { form8959Pdf } from "../../../../../2025/pdf/forms/taxes/employment/f8959.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8959 draft (page 1 is the IRS cover sheet). RRTA compensation
// moves up to Part II (lines 8-11); new line 12 adds lines 7 and 11 for
// Schedule 2 line 17b; self-employment income becomes Part IV (lines 13-18),
// whose line 18 goes to Schedule 2 line 11. The 2025 line 18 total is gone.
const P1 = "topmostSubform[0].Page1[0]";
const f = (n: number) => `${P1}.f1_${n}[0]`;

const rename: Readonly<Record<string, string>> = {
  [f(16)]: f(10),
  [f(17)]: f(11),
  [f(18)]: f(12),
  [f(19)]: f(13),
  [f(10)]: f(15),
  [f(11)]: f(16),
  [f(12)]: f(17),
  [f(13)]: f(18),
  [f(14)]: f(19),
  [f(15)]: f(20),
};

const draft = onTy2026Template(
  form8959Pdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8959--dft.pdf",
    pdfSha256:
      "8f663b2ca3dd052537a4d8aea4ae9aada0606b0f7dc7711fa8948489ef870d2f",
    formPages: [1],
  },
  rename,
  ["line18_total_tax"],
  [{ kind: "text", domainKey: "ty2026_line12", pdfField: f(14) }],
);

function amount(fields: Record<string, unknown>, key: string): number {
  const value = fields[key];
  return typeof value === "number" ? value : 0;
}

/** Line 12 is the 2025 line 18 total less the self-employment tax. */
function withLine12(fields: Record<string, unknown>): Record<string, unknown> {
  if (fields.line7_wage_tax === undefined && fields.line17_rrta_tax === undefined) {
    return fields;
  }
  const line12 = amount(fields, "line7_wage_tax") +
    amount(fields, "line17_rrta_tax");
  if (
    line12 + amount(fields, "line13_se_tax") !==
      amount(fields, "line18_total_tax")
  ) {
    throw new Error(
      "TY2026 PDF Form 8959 lines 12 and 18 differ from the computed total",
    );
  }
  return { ...fields, ty2026_line12: line12 };
}

export const form8959Pdf2026: PdfFormDescriptor = {
  ...draft,
  projectFields: (raw, all) =>
    withLine12(draft.projectFields ? draft.projectFields(raw, all) : raw),
};
