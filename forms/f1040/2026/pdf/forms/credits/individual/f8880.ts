import { form8880PdfFor } from "../../../../../2025/pdf/forms/credits/individual/f8880.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8880 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position; only the printed AGI brackets change.
export const form8880Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8880PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8880--dft.pdf",
    pdfSha256:
      "97a6b5b3df449310dbfb1f9574edb06dd2009f1b04d86261bb1c88fc087c9e01",
    formPages: [1, 2],
  },
  {},
);
