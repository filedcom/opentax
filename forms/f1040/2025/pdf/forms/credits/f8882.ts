import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../domains/credits/form3800/form3800_final_credit_join.ts";
import { reconcileForm8882DirectEmployer } from "../../../mef/forms/credits/f8882_source.ts";

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
    if (Object.keys(raw).length === 0) return {};
    const { lines } = reconcileForm8882DirectEmployer(raw, allPending);
    return lines;
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending || !prepared) {
      throw new Error("Form 8882 PDF needs the prepared Form 3800 document");
    }
    const { lines } = reconcileForm8882DirectEmployer(
      allPending.f8882,
      allPending,
    );
    const rows = prepared.currentRows.filter((row) => row.line === "1k");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "1k");
    const details = prepared.currentDetails.filter((row) => row.line === "1k");
    const [row] = rows;
    const [amount] = amounts;
    const [detail] = details;
    if (
      fields.line7 !== lines.line7 ||
      rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
      row.metadata.sourceCount !== 1 ||
      row.metadata.referenceDocumentName !== "IRS8882" ||
      !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
      detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
      detail.passThroughEin !== undefined ||
      detail.credit !== lines.line7 ||
      amount.nonpassiveCredit !== lines.line7 ||
      amount.totalCredit !== lines.line7 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !== detail.appliedCredit
    ) {
      throw new Error("Form 8882 PDF differs from filed Form 3800 line 1k");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
