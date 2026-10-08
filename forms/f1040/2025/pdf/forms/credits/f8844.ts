import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../domains/credits/form3800/form3800_final_credit_join.ts";
import { reconcileForm8844DirectEmployer } from "../../../mef/forms/credits/f8844_source.ts";

const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
});

export const form8844Pdf: PdfFormDescriptor = {
  pendingKey: "f8844",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8844.pdf",
  fields: [
    text("line1", 3),
    text("line2", 4),
    text("line3", 5),
    text("line4", 6),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  projectFields(fields, allPending) {
    if (!Array.isArray(fields.f8844s) || fields.f8844s.length === 0) return {};
    const { source, lines } = reconcileForm8844DirectEmployer(allPending);
    if (JSON.stringify(fields) !== JSON.stringify(source)) {
      throw new Error("Form 8844 PDF source differs from filed MeF source");
    }
    return { ...fields, ...lines };
  },
  includeWhen(fields) {
    return Array.isArray(fields.f8844s) && fields.f8844s.length > 0;
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending || !prepared) {
      throw new Error("Form 8844 PDF needs the prepared Form 3800 document");
    }
    const { lines } = reconcileForm8844DirectEmployer(allPending);
    const rows = prepared.currentRows.filter((row) => row.line === "3");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "3");
    const details = prepared.currentDetails.filter((row) => row.line === "3");
    const [row] = rows;
    const [amount] = amounts;
    const [detail] = details;
    if (
      fields.line2 !== lines.line2 || fields.line4 !== lines.line4 ||
      rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
      row.metadata.sourceCount !== 1 ||
      row.metadata.referenceDocumentName !== "IRS8844" ||
      !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
      detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
      detail.passThroughEin !== undefined ||
      detail.credit !== lines.line4 ||
      amount.nonpassiveCredit !== lines.line4 ||
      amount.totalCredit !== lines.line4 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !== detail.appliedCredit
    ) {
      throw new Error("Form 8844 PDF differs from filed Form 3800 line 3");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
