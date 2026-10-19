import { form4562PdfFor } from "../../../../../2025/pdf/forms/deductions/business/f4562.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Form 4562 draft (page 1 is the IRS cover sheet). Part I keeps its
// field names; line 14 splits into 14a-14d and the engine's special allowance
// is the section 168(k) line 14a (f1_22, as in 2025). The Section B table drops
// column (a), so each row's (c)-(g) fields move up three numbers.
const P1 = "topmostSubform[0].Page1[0]";
const rename: Readonly<Record<string, string>> = Object.fromEntries(
  [..."abcdef"].flatMap((row, index) =>
    [0, 1, 2, 3, 4].map((column) => {
      const at = `${P1}.SectionBTable[0].Line19${row}[0]`;
      const n = 27 + index * 6 + column;
      return [`${at}.f1_${n}[0]`, `${at}.f1_${n + 3}[0]`];
    })
  ),
);

export const form4562Pdf2026: PdfFormDescriptor = withoutStatements(
  onTy2026Template(
    form4562PdfFor(2026),
    {
      pdfUrl: "https://www.irs.gov/pub/irs-dft/f4562--dft.pdf",
      pdfSha256:
        "c76264c1ecc0792abc12315eed87802cd934dc18d072c2d72e94180591ca94ef",
      formPages: [1, 2],
    },
    rename,
  ),
  "Form 4562",
);
