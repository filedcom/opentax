import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../domains/credits/form3800/form3800_final_credit_join.ts";
import { reconcileForm8941DocumentSource } from "../../../mef/forms/credits/f8941_source.ts";

// Inspected on the IRS September 2025 fillable one-page Form 8941.
const page = "topmostSubform[0].Page1[0]";
const text = (domainKey: string, number: number): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.f1_${number}[0]`,
  ...(domainKey.startsWith("line") ? { printZero: true } : {}),
});

/** Official PDF projection for the bounded direct employer route. */
export const form8941Pdf: PdfFormDescriptor = {
  pendingKey: "f8941",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8941--2025.pdf",
  fields: [
    text("owner_name", 1),
    text("owner_ssn", 2),
    { kind: "checkbox", domainKey: "shop_yes", pdfField: `${page}.c1_1[0]` },
    text("shop_marketplace_identifier", 3),
    text("employment_ein", 4),
    {
      kind: "checkbox",
      domainKey: "prior_year_shop_no",
      pdfField: `${page}.c1_2[1]`,
    },
    ...Array.from(
      { length: 16 },
      (_, index) => text(`line${index + 1}`, index + 5),
    ),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const filed = reconcileForm8941DocumentSource(raw, allPending);
    const source = filed.kind === "independent_spouses"
      ? filed.source.independent_members[0]
      : filed.source;
    const lines = filed.kind === "independent_spouses"
      ? filed.memberLines[0]
      : filed.lines;
    return {
      ...lines,
      owner_name: source.owner_name,
      owner_ssn: source.owner_ssn,
      shop_yes: true,
      prior_year_shop_no: true,
      shop_marketplace_identifier: source.shop_marketplace_identifier,
      employment_ein: source.employment_ein,
    };
  },
  instances(fields, filer, allPending, prepared) {
    if (Object.keys(fields).length === 0) return [];
    if (!allPending || !prepared) {
      throw new Error("Form 8941 PDF needs the prepared Form 3800 document");
    }
    const filed = reconcileForm8941DocumentSource(
      allPending.f8941,
      allPending,
      filer,
    );
    const lines = filed.lines;
    const rows = prepared.currentRows.filter((row) => row.line === "4h");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "4h");
    const details = prepared.currentDetails.filter((row) => row.line === "4h");
    const [row] = rows;
    const [amount] = amounts;
    const [detail] = details;
    if (filed.kind === "independent_spouses") {
      const members = filed.source.independent_members;
      const expected = filed.memberLines;
      if (
        fields.line16 !== expected[0].line16 ||
        rows.length !== 1 || amounts.length !== 1 || details.length !== 2 ||
        row.metadata.sourceCount !== 2 ||
        row.metadata.referenceDocumentName !== "IRS8941" ||
        row.entityCredits.length !== 0 ||
        amount.nonpassiveCredit !== lines.line16 ||
        amount.totalCredit !== lines.line16 ||
        amount.appliedCredit !== allPending.f3800.form8941_applied_credit ||
        details.reduce((sum, item) => sum + item.appliedCredit, 0) !==
          amount.appliedCredit ||
        details.some((item, index) =>
          !item.sourceDocumentId ||
          item.credit !== expected[index].line16 ||
          item.passThroughEin !== undefined
        ) ||
        details[0].sourceDocumentId !== row.metadata.referenceDocumentId
      ) {
        throw new Error("Form 8941 spouse PDFs differ from Form 3800 line 4h");
      }
      assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
      return members.map((member, index) => ({
        ...expected[index],
        owner_name: member.owner_name,
        owner_ssn: member.owner_ssn,
        shop_yes: true,
        prior_year_shop_no: true,
        shop_marketplace_identifier: member.shop_marketplace_identifier,
        employment_ein: member.employment_ein,
      }));
    }
    if (
      fields.line16 !== lines.line16 ||
      rows.length !== 1 || amounts.length !== 1 || details.length !== 1 ||
      row.metadata.sourceCount !== 1 ||
      row.metadata.referenceDocumentName !== "IRS8941" ||
      !row.metadata.referenceDocumentId || row.entityCredits.length !== 0 ||
      detail.sourceDocumentId !== row.metadata.referenceDocumentId ||
      detail.passThroughEin !== undefined ||
      detail.credit !== lines.line16 ||
      amount.nonpassiveCredit !== lines.line16 ||
      amount.totalCredit !== lines.line16 ||
      amount.transferOutCredit !== 0 ||
      amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !== detail.appliedCredit ||
      amount.appliedCredit !== allPending.f3800.form8941_applied_credit
    ) {
      throw new Error("Form 8941 PDF differs from filed Form 3800 line 4h");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, allPending);
    return [fields];
  },
};
