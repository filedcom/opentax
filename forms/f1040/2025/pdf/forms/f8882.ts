import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { reconcileForm8882DirectEmployer } from "../../mef/forms/f8882_source.ts";

// Official Rev. 12/2017 PDF AcroForm: p1-t1/t2 identify the filer; odd
// p1-t3 through p1-t19 are the nine printed line amounts. Page 2 is instructions.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.p1-t${number}[0]`,
});

/** Form 8882 PDF projection with the filed Form 3800 claim. */
export const form8882Pdf: PdfFormDescriptor = {
  pendingKey: "f8882",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8882.pdf",
  pageIndices: () => [0],
  fields: [
    text("line1", 3),
    text("line2", 5),
    text("line3", 7),
    text("line4", 9),
    text("line5", 11),
    text("line6", 13),
    text("line7", 15),
    text("line8", 17),
    text("line9", 19),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  projectFields(raw, allPending) {
    const { lines } = reconcileForm8882DirectEmployer(raw, allPending);
    return lines;
  },
};
