import { scheduleBPdf } from "../../../../../2025/pdf/forms/income/investments/schedule_b/schedule_b.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Schedule B draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 name and position, so the Form 8814 notes land on the same dots.
export const scheduleBPdf2026: PdfFormDescriptor = withoutStatements(
  onTy2026Template(
    scheduleBPdf,
    {
      pdfUrl: "https://www.irs.gov/pub/irs-dft/f1040sb--dft.pdf",
      pdfSha256:
        "aa6272f6b3b8a8c6a2aa6ef9d1069f1edb88fb9df4df60278d198da89cdfd93f",
      formPages: [1],
    },
    {},
  ),
  "Schedule B",
);
