import { form8960Pdf } from "../../../../../2025/pdf/forms/taxes/investments/f8960.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8960 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and line; lines from 5b down move down one row.
export const form8960Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8960Pdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8960--dft.pdf",
    pdfSha256:
      "2306f4f334a8b3b1ed73fd5045dec86eed194902923462bf485431c756f66982",
    formPages: [1],
  },
  {},
);
