import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { inputSchema } from "../../../../nodes/inputs/f8881/index.ts";
import { reconcileForm8881DirectEmployer } from "../../../mef/forms/credits/f8881.ts";
import { assertForm3800FinalCreditJoin } from "../../../domains/credits/form3800/form3800_final_credit_join.ts";

// Field names and positions were inspected on the IRS December 2025
// fillable one-page Form 8881.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, fieldNumber: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${fieldNumber}[0]`,
});

export const form8881Pdf: PdfFormDescriptor = {
  pendingKey: "f8881",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8881--2025.pdf",
  fields: [
    text("lineA", 3),
    text("line1", 4),
    text("line2", 5),
    text("line3Count", 6),
    text("line3", 7),
    text("line4", 8),
    text("line5", 9),
    text("line6a", 10),
    text("line6b", 11),
    text("line6c", 12),
    text("line6d", 13),
    text("line6e1", 14),
    text("line6e2", 15),
    text("line6e3", 16),
    text("line6e4", 17),
    text("line6f", 18),
    text("line6g", 19),
    text("line8", 21),
    text("line9", 22),
    text("line11", 24),
    text("line12Count", 25),
    text("line12", 26),
    text("line13", 27),
    text("line15", 29),
  ],
  filerFields: [text("nameLine1", 1), text("primarySSN", 2)],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const source = inputSchema.parse(raw);
    if (
      JSON.stringify(source) !==
        JSON.stringify(inputSchema.parse(allPending.f8881))
    ) {
      throw new Error("Form 8881 PDF source differs from filed return");
    }
    const lines = reconcileForm8881DirectEmployer(allPending);
    return {
      ...lines,
      lineA: source.startup
        ?.preceding_first_credit_year_qualified_employee_count,
      line3Count: source.startup?.eligible_non_hce_count,
      line12Count: source.military_spouses?.employees.length,
      line6e1: lines.line6a > 50 ? lines.line6e1 : undefined,
      line6e2: lines.line6a > 50 ? lines.line6e2 : undefined,
      line6e3: lines.line6a > 50 ? lines.line6e3 : undefined,
      line6e4: lines.line6a > 50 ? lines.line6e4 : undefined,
    };
  },
  instances(fields, _filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending?.f8881 || !allPending.f3800) {
      throw new Error("Form 8881 PDF needs the filed source return");
    }
    const lines = reconcileForm8881DirectEmployer(allPending);
    const expected = form8881Pdf.projectFields!(allPending.f8881, allPending);
    const parts = [
      { line: "1j", credit: lines.line8 },
      { line: "1dd", credit: lines.line11 },
      { line: "1ee", credit: lines.line15 },
    ];
    const documentIds = new Set<string>();
    if (JSON.stringify(fields) !== JSON.stringify(expected)) {
      throw new Error("Form 8881 PDF differs from filed source lines");
    }
    if (parts.every((part) => part.credit === 0)) return [fields];
    if (!prepared) {
      throw new Error("Form 8881 PDF needs the prepared Form 3800 document");
    }
    for (const part of parts) {
      const rows = prepared.currentRows.filter((row) => row.line === part.line);
      const amounts = prepared.currentAmounts.filter((row) =>
        row.line === part.line
      );
      const details = prepared.currentDetails.filter((row) =>
        row.line === part.line
      );
      if (part.credit === 0) {
        if (rows.length || amounts.length || details.length) {
          throw new Error(`Form 8881 PDF has an unclaimed ${part.line} row`);
        }
        continue;
      }
      const [row] = rows;
      const [amount] = amounts;
      const [detail] = details;
      if (
        rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
        row.metadata.sourceCount !== 1 ||
        row.metadata.referenceDocumentName !== "IRS8881" ||
        !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
        detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
        detail.passThroughEin !== undefined ||
        detail.credit !== part.credit ||
        amount.nonpassiveCredit !== part.credit ||
        amount.totalCredit !== part.credit ||
        amount.transferOutCredit !== 0 ||
        amount.passiveBeforeLimit !== 0 ||
        amount.passiveAfterLimit !== 0 ||
        amount.appliedCredit !== detail.appliedCredit
      ) {
        throw new Error(
          `Form 8881 PDF differs from prepared Form 3800 ${part.line}`,
        );
      }
      documentIds.add(row.metadata.referenceDocumentId);
    }
    if (
      documentIds.size !== 1 ||
      prepared.lines.line38 !== allPending.f3800.allowed_credit
    ) {
      throw new Error("Form 8881 PDF has inconsistent prepared credit links");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
