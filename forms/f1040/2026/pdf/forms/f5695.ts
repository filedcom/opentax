import type { PdfFormDescriptor } from "../../../pdf/form-descriptor.ts";

const page = "topmostSubform[0].Page1[0].";

/** The six printed widgets in the pinned carryforward-only 2026 draft. */
export const irsForm5695Pdf2026: PdfFormDescriptor = {
  pendingKey: "form5695",
  pdfUrl: "https://www.irs.gov/pub/irs-dft/f5695--dft.pdf",
  pageIndices: () => [1],
  fields: [
    { kind: "text", domainKey: "filer_name", pdfField: `${page}f1_01[0]` },
    { kind: "text", domainKey: "filer_ssn", pdfField: `${page}f1_02[0]` },
    ...([
      "line1_carryforward",
      "line2_limit",
      "line3_credit",
      "line4_to_2027",
    ] as const)
      .map((domainKey, index) => ({
        kind: "text" as const,
        domainKey,
        pdfField: `${page}f1_${index + 3}[0]`,
      })),
  ],
};
