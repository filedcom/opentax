import { scheduleDPdf } from "../../../../../2025/pdf/forms/income/investments/schedule_d.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule D draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position, including line 13's dotted space.
export const scheduleDPdf2026: PdfFormDescriptor = onTy2026Template(
  scheduleDPdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sd--dft.pdf",
    pdfSha256:
      "0df9af0711964b3198ea04bb0037b29d6afa85578a671553daed46251630b5f1",
    formPages: [1, 2],
  },
  {},
);
