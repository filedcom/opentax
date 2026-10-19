import { form8615Pdf } from "../../../../../2025/pdf/forms/taxes/investments/f8615.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8615 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position.
export const form8615Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8615Pdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8615--dft.pdf",
    pdfSha256:
      "11db7889385b13ea63d2f05cd0bbb4e92afe34523917a7b9f9fc4ddecd7996d7",
    formPages: [1],
  },
  {},
);
