import { scheduleSePdfFor } from "../../../../../2025/pdf/forms/taxes/self-employment/schedule_se.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule SE draft (page 1 is the IRS cover sheet). Lines and
// widgets match 2025; only line 8a left its read-order container.
export const scheduleSePdf2026: PdfFormDescriptor = onTy2026Template(
  scheduleSePdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sse--dft.pdf",
    pdfSha256:
      "a59fa5dcf2f0a8a5a71c46aa3837e9e8e605eeecc0a666bcb784a368900d141c",
    formPages: [1, 2],
  },
  {
    "topmostSubform[0].Page1[0].Line8a_ReadOrder[0].f1_14[0]":
      "topmostSubform[0].Page1[0].f1_14[0]",
  },
);
