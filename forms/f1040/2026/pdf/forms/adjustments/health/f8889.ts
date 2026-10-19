import { form8889PdfFor } from "../../../../../2025/pdf/forms/adjustments/health/f8889.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8889 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position.
export const form8889Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8889PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8889--dft.pdf",
    pdfSha256:
      "c94550b7d4b735b11e9901c5dbff5dab0aa6dcbbefab04864c61cd5275cafec8",
    formPages: [1],
  },
  {},
);
