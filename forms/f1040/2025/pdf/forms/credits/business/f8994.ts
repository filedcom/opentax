import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../../domains/credits/business/form3800/form3800_final_credit_join.ts";
import { reconcileForm8994DocumentSource } from "../../../../domains/credits/business/form8994/form8994_source.ts";

// The January 2021 one-page IRS AcroForm is the filing revision for TY2025.
const page = "topmostSubform[0].Page1[0].";
const text = (domainKey: string, field: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}${field}`,
});
const yes = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField: `${page}c1_${number}[0]`,
  whenValue: "true",
});

/** Official direct-employer PDF projection for the bounded source. */
export const form8994Pdf: PdfFormDescriptor = {
  pendingKey: "f8994",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8994.pdf",
  pageIndices: () => [0],
  fields: [
    yes("line_a_yes", 1),
    yes("line_b_yes", 2),
    yes("line_c_yes", 3),
    yes("line_d_yes", 4),
    text("line1", "f1_03[0]"),
    text("line2", "f1_04[0]"),
    text("line3", "f1_05[0]"),
  ],
  filerFields: [
    text("nameLine1", "f1_01[0]"),
    text("primarySSN", "f1_02[0]"),
  ],
  projectFields(raw, allPending) {
    if (allPending.f8994 === undefined) return {};
    const { lines } = reconcileForm8994DocumentSource(raw, allPending);
    return {
      line_a_yes: true,
      line_b_yes: true,
      line_c_yes: true,
      line_d_yes: true,
      line1: lines.line1,
      line2: undefined,
      line3: lines.line3,
    };
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending || !prepared) {
      throw new Error("Form 8994 PDF needs the prepared Form 3800 document");
    }
    const { lines } = reconcileForm8994DocumentSource(
      allPending.f8994,
      allPending,
    );
    const rows = prepared.currentRows.filter((row) => row.line === "4j");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "4j");
    const details = prepared.currentDetails.filter((row) => row.line === "4j");
    const [row] = rows;
    const [amount] = amounts;
    const [detail] = details;
    if (
      fields.line3 !== lines.line3 ||
      rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
      row.metadata.sourceCount !== 1 ||
      row.metadata.referenceDocumentName !== "IRS8994" ||
      !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
      detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
      detail.passThroughEin !== undefined ||
      detail.credit !== lines.line3 ||
      amount.nonpassiveCredit !== lines.line3 ||
      amount.totalCredit !== lines.line3 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !== detail.appliedCredit ||
      amount.appliedCredit !== allPending.f3800.form8994_applied_credit
    ) {
      throw new Error("Form 8994 PDF differs from filed Form 3800 line 4j");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
