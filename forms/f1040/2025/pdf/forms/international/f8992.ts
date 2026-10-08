import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { projectForm8992Source } from "../../../domains/international/form8992/form8992_source.ts";

const page = "topmostSubform[0].Page1[0].";
const text = (
  domainKey: string,
  number: number,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}f1_${number}[0]`,
  printZero,
});

export const form8992Pdf: PdfFormDescriptor = {
  pendingKey: "form8992",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8992--2022.pdf",
  pageIndices: () => [0],
  filerFields: [
    text("nameLine1", 1),
    text("primarySSN", 2),
  ],
  fields: [
    text("shareholder_name", 3),
    text("shareholder_tin", 4),
    text("part_i_line1", 5, true),
    text("part_i_line2", 6, true),
    text("part_i_line3", 7, true),
    text("part_ii_line1", 8, true),
    text("part_ii_line2", 9, true),
    text("part_ii_line3a", 10, true),
    text("part_ii_line3b", 11, true),
    text("part_ii_line3c", 12, true),
    text("part_ii_line4", 13, true),
    text("part_ii_line5", 14, true),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f5471) return [];
    if (!filer) throw new Error("Form 8992 PDF needs final filer identity");
    const { cfc, calculation, shareholderName } = projectForm8992Source(
      allPending,
      filer,
    );
    return [{
      shareholder_name: shareholderName,
      shareholder_tin: cfc.shareholder_tin,
      ...calculation.form8992,
    }];
  },
};
