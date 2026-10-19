import { form6251PdfFor } from "../../../../../2025/pdf/forms/taxes/amt/f6251.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 6251 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position; line 1a now cites Schedule 1-A line 43.
export const form6251Pdf2026: PdfFormDescriptor = onTy2026Template(
  form6251PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f6251--dft.pdf",
    pdfSha256:
      "a547fc9d629e1f04bdc30e088214c716667b88cb1b45447c580c0ae33095b5cc",
    formPages: [1, 2],
  },
  {},
);
