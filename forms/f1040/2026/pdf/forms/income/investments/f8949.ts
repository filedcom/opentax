import { form8949PdfFor } from "../../../../../2025/pdf/forms/income/investments/f8949.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8949 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position.
export const form8949Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8949PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8949--dft.pdf",
    pdfSha256:
      "891d869c87ffe9c6d7f79079d19ebf4ac0afa7257f6374cd95936e44a7079ffe",
    formPages: [1, 2],
  },
  {},
);
