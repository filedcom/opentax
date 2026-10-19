import { form8606PdfFor } from "../../../../../2025/pdf/forms/income/retirement/f8606.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 8606 draft (page 1 is the IRS cover sheet). Field names lose
// their leading zero (f1_01 -> f1_1); the stand-alone address block gains
// separate state and ZIP fields, so page 1 line fields shift by two. Every
// line keeps its 2025 position.
const P1 = "topmostSubform[0].Page1[0]";
const P2 = "topmostSubform[0].Page2[0]";

const rename: Readonly<Record<string, string>> = {
  [`${P1}.f1_01[0]`]: `${P1}.f1_1[0]`,
  [`${P1}.f1_02[0]`]: `${P1}.f1_2[0]`,
  ...Object.fromEntries(
    Array.from({ length: 15 }, (_, i) => i + 9).map((n) => [
      `${P1}.f1_${String(n).padStart(2, "0")}[0]`,
      `${P1}.f1_${n + 2}[0]`,
    ]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 9 }, (_, i) => i + 1).map((n) => [
      `${P2}.f2_0${n}[0]`,
      `${P2}.f2_${n}[0]`,
    ]),
  ),
};

export const form8606Pdf2026: PdfFormDescriptor = onTy2026Template(
  form8606PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f8606--dft.pdf",
    pdfSha256:
      "4d7e8fe466cf0534817d78bc5e6e84d78971b59cbbed0523eaa6448a20c2f2a6",
    formPages: [1, 2],
  },
  rename,
);
