import { form8863PdfFor } from "../../../../../2025/pdf/forms/credits/individual/f8863.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8863 draft (page 1 is the IRS cover sheet). Page 1 lines move
// down but keep their names; the student name field is renamed f2_5.
export const form8863Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8863PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8863--dft.pdf",
    pdfSha256:
      "b037225d76b74a73740398c3ea757d2cde892d4fc1cfe65da35659de8bbddd90",
    formPages: [1, 2],
  },
  {
    "topmostSubform[0].Page2[0].f2-5[0]": "topmostSubform[0].Page2[0].f2_5[0]",
  },
);
