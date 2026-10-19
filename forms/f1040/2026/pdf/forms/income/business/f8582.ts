import { form8582PdfFor } from "../../../../../2025/pdf/forms/income/business/f8582.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template, withoutStatements } from "../../../draft-template.ts";

// IRS 2026 Form 8582 draft (page 1 is the IRS cover sheet). Every field keeps
// its 2025 position; field numbers lose their leading zero and the Part IV-VII
// tables are named in roman numerals.
const ROMAN: Readonly<Record<string, string>> = {
  "4": "IV",
  "5": "V",
  "6": "VI",
  "7": "VII",
};

function renamed(field: string): string {
  return field
    .replace(/Table_Part([4-7])\[/, (_, part: string) => `Table_Part${ROMAN[part]}[`)
    .replace(/\.f(\d)_0(\d)\[/, ".f$1_$2[");
}

const base = form8582PdfFor(2026);
const rename: Readonly<Record<string, string>> = Object.fromEntries(
  [...base.fields, ...(base.filerFields ?? [])]
    .flatMap((entry) => [
      entry.pdfField,
      ...("extraPdfFields" in entry ? entry.extraPdfFields ?? [] : []),
    ])
    .map((field) => [field, renamed(field)]),
);

export const form8582Pdf2026: PdfFormDescriptor = withoutStatements(
  onTy2026Template(
    base,
    {
      pdfUrl: "https://www.irs.gov/pub/irs-dft/f8582--dft.pdf",
      pdfSha256:
        "4329950c160bc4e72b545166728e317a80802d1eae5c626deb66520ba42b4f89",
      formPages: [1, 2, 3],
    },
    rename,
  ),
  "Form 8582",
);
