import { form5329Pdf } from "../../../../../2025/pdf/forms/taxes/retirement/f5329.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 5329 draft (page 1 is the IRS cover sheet). The stand-alone
// address splits city, state and ZIP, so Parts I-II move up two field numbers;
// page 2 keeps its fields. The new Trump account Parts X-XI are not modelled
// and the graph has no source for them.
const P1 = "topmostSubform[0].Page1[0]";
const rename: Readonly<Record<string, string>> = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => 9 + i).map((n) => [
    `${P1}.f1_${n}[0]`,
    `${P1}.f1_${n + 2}[0]`,
  ]),
);

export const form5329Pdf2026: PdfFormDescriptor = onTy2026Template(
  form5329Pdf,
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f5329--dft.pdf",
    pdfSha256:
      "f8822ccc8d14eca9424255d3b9606a8c210143ad8a317018f50222d03740edbe",
    formPages: [1, 2, 3],
  },
  rename,
);
