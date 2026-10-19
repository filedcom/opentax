import { schedule3PdfFor } from "../../../../../2025/pdf/forms/general/return-assembly/schedule3.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule 3 draft (page 1 is the IRS cover sheet). Line 5b is
// reserved and new line 13e (Form 1062) takes f1_34, so lines 14 and 15 move
// to f1_37 and f1_38.
const base = schedule3PdfFor(2026);
const draft = onTy2026Template(
  base,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s3--dft.pdf",
    pdfSha256:
      "5feb6f8d0f08191a2da153573d195fc354f385e26915b99b57d4588893b7cef0",
    formPages: [1],
  },
  {
    "topmostSubform[0].Page1[0].f1_36[0]": "topmostSubform[0].Page1[0].f1_37[0]",
    "topmostSubform[0].Page1[0].f1_37[0]": "topmostSubform[0].Page1[0].f1_38[0]",
  },
  ["line5b_energy_efficient_home"],
);

export const schedule3Pdf2026: PdfFormDescriptor = {
  ...draft,
  projectFields(fields, allPending) {
    const projected = base.projectFields?.(fields, allPending) ?? fields;
    const line5b = projected.line5b_energy_efficient_home;
    if (typeof line5b === "number" && line5b > 0) {
      throw new Error("TY2026 Schedule 3 line 5b is reserved");
    }
    return projected;
  },
};
