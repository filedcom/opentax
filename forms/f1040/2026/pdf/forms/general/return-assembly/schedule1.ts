import { schedule1Pdf } from "../../../../../2025/pdf/forms/general/return-assembly/schedule1/schedule1.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Schedule 1 draft (page 1 is the IRS cover sheet). Every mapped
// field keeps its 2025 name and line; only the unmapped line 24 container
// was renamed.
export const schedule1Pdf2026: PdfFormDescriptor = onTy2026Template(
  schedule1Pdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040s1--dft.pdf",
    pdfSha256:
      "a017a1b717d1c70ff8d831ef8b73c730e5b24f147c394c37f792035a9df22fad",
    formPages: [1, 2],
  },
  {},
);
