import { form2441PdfFor } from "../../../../../2025/pdf/forms/credits/individual/f2441.ts";
import type { PdfFormDescriptor } from "../../../../../2025/pdf/review-support/form-descriptor.ts";
import { onTy2026Template } from "../../../draft-template.ts";

// IRS 2026 Form 2441 draft (page 1 is the IRS cover sheet). Part I turns its
// provider table sideways: lines 1a-1e are rows and providers are columns.
// Line 2 onward keeps its 2025 fields.
const P1 = "topmostSubform[0].Page1[0]";
const old = (provider: number) => `${P1}.PartITable[0].BodyRow${provider}[0]`;
const row = (line: string) => `${P1}.PartITable[0].Row${line}[0]`;

const rename: Readonly<Record<string, string>> = Object.fromEntries(
  [1, 2, 3].flatMap((provider) => {
    const at = (provider - 1) * 4;
    return [
      [`${old(provider)}.f1_${3 + at}[0]`,
        `${row("1a")}.Provider${provider}[0].f1_${2 + provider}[0]`],
      [`${old(provider)}.ColB[0].f1_${4 + at}[0]`,
        `${row("1b")}.Provider${provider}[0].f1_${5 + provider}[0]`],
      [`${old(provider)}.f1_${5 + at}[0]`,
        `${row("1c")}.f1_${8 + provider}[0]`],
      ...[0, 1].map((box) => [
        `${old(provider)}.ColD[0].c1_${3 + provider}[${box}]`,
        `${row("1d")}.Provider${provider}[0].c1_${3 + provider}[${box}]`,
      ]),
      [`${old(provider)}.f1_${6 + at}[0]`,
        `${row("1e")}.f1_${11 + provider}[0]`],
    ];
  }),
);

export const form2441Pdf2026: PdfFormDescriptor = onTy2026Template(
  form2441PdfFor(2026),
  {
    pdfUrl: "https://www.irs.gov/pub/irs-dft/f2441--dft.pdf",
    pdfSha256:
      "67eca7567ce5ff06e72d40a07db487f406da33139e664c0c0d9c67a4e31e9385",
    formPages: [1, 2],
  },
  rename,
);
