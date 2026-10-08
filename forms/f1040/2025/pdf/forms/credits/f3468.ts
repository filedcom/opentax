import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";
import { assertForm3800FinalCreditJoin } from "../../../domains/credits/form3800/form3800_final_credit_join.ts";
import { reconcileFiledTrustPartVClaims } from "../../../mef/forms/credits/f3468_source.ts";
import { inputSchema as f3468InputSchema } from "../../../../nodes/inputs/f3468/index.ts";
import { inputSchema as f3800InputSchema } from "../../../../nodes/inputs/f3800/index.ts";

const p1 = "topmostSubform[0].Page1[0]";
const p3 = "topmostSubform[0].Page3[0]";
const p4 = "topmostSubform[0].Page4[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const checked = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey,
  pdfField,
  whenValue: "true",
});
const usDate = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
};

/** Printable Form 3468 Part I and Part V for one trust solar facility. */
export const form3468Pdf: PdfFormDescriptor = {
  pendingKey: "f3468",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f3468--2025.pdf",
  pageIndices: () => [0, 2, 3],
  fields: [
    text("filer_name", `${p1}.f1_1[0]`),
    text("filer_ssn", `${p1}.f1_2[0]`),
    text("facility_type", `${p1}.f1_7[0]`),
    text("owner_name", `${p1}.f1_8[0]`),
    text("owner_ein", `${p1}.f1_9[0]`),
    text("facility_address", `${p1}.f1_10[0]`),
    text("construction_date", `${p1}.f1_17[0]`),
    text("service_date", `${p1}.f1_18[0]`),
    checked("no_expansion", `${p1}.c1_3[1]`),
    checked("under_one_mw", `${p1}.c1_4[0]`),
    checked("pwa_not_applicable", `${p1}.c1_5[3]`),
    checked("no_domestic_bonus", `${p1}.c1_6[2]`),
    checked("no_community_bonus", `${p1}.c1_7[2]`),
    checked("no_low_income_bonus", `${p1}.c1_8[4]`),
    text("line1a", `${p3}.Line1a_Part5_ReadOrder[0].f3_12[0]`),
    text("line1b_percent", `${p3}.f3_13[0]`),
    text("line1c", `${p3}.f3_14[0]`),
    text("line2", `${p3}.f3_26[0]`),
    text("line5", `${p4}.f4_16[0]`),
    text("line7", `${p4}.f4_22[0]`),
    text("line8", `${p4}.f4_23[0]`),
    text("line11", `${p4}.f4_26[0]`),
  ],
  instances(raw, filer, all, prepared) {
    if (!all?.f3468) return [];
    if (!filer || !prepared || !all.f3800 || !all.schedule3) {
      throw new Error(
        "Form 3468 PDF needs the filer and prepared Form 3800 return",
      );
    }
    if (
      JSON.stringify(f3468InputSchema.parse(raw)) !==
        JSON.stringify(f3468InputSchema.parse(all.f3468))
    ) {
      throw new Error("Form 3468 PDF source differs from pending return");
    }
    assertForm3800FinalCreditJoin(prepared.lines.line38, all);
    const claims = reconcileFiledTrustPartVClaims(all);
    if (claims.length === 0) {
      throw new Error("Form 3468 PDF has no supported trust Part V claim");
    }
    const entries = f3800InputSchema.parse(all.f3800)
      .f3468_trust_part_v_credit_entries ?? [];
    const claimKey = (claim: typeof claims[number]) =>
      JSON.stringify([
        claim.source_type,
        claim.source_ein,
        claim.source_document_reference,
        claim.source_statement_reference,
        claim.credit_amount,
        claim.subject_to_passive_activity_limit,
      ]);
    const entryKey = (entry: typeof entries[number]) =>
      JSON.stringify([
        entry.source_type,
        entry.source_ein,
        entry.source_document_reference,
        entry.source_statement_reference,
        entry.credit_amount,
        entry.subject_to_passive_activity_limit,
      ]);
    const claimKeys = claims.map(claimKey);
    const entryKeys = entries.map(entryKey);
    const rows = prepared.currentRows.filter((row) => row.line === "1v");
    const amounts = prepared.currentAmounts.filter((row) => row.line === "1v");
    const details = prepared.currentDetails.filter((row) => row.line === "1v");
    const documentIds = prepared.form3468DocumentIds;
    const credit = claims.reduce((sum, claim) => sum + claim.credit_amount, 0);
    const [row] = rows;
    const [amount] = amounts;
    if (
      claimKeys.length !== entryKeys.length ||
      new Set(claimKeys).size !== claimKeys.length ||
      claimKeys.some((key) => !entryKeys.includes(key)) ||
      rows.length !== 1 || amounts.length !== 1 ||
      !row || !amount ||
      details.length !== claims.length ||
      documentIds?.length !== claims.length ||
      new Set(documentIds).size !== claims.length ||
      row.metadata.sourceCount !== claims.length ||
      row.metadata.referenceDocumentName !== "IRS3468" ||
      row.metadata.referenceDocumentId !== documentIds?.join(" ") ||
      row.entityCredits.length !== claims.length ||
      row.entityCredits.some((entity, index) =>
        !("ein" in entity.entity) ||
        entity.entity.ein !== claims[index].source_ein ||
        entity.credit !== claims[index].credit_amount
      ) ||
      amount.nonpassiveCredit !== credit || amount.totalCredit !== credit ||
      amount.transferOutCredit !== 0 || amount.passiveBeforeLimit !== 0 ||
      amount.passiveAfterLimit !== 0 ||
      amount.appliedCredit !==
        details.reduce((sum, detail) => sum + detail.appliedCredit, 0) ||
      details.some((detail, index) =>
        detail.sourceDocumentId !== documentIds?.[index] ||
        detail.passThroughEin !== claims[index].source_ein ||
        detail.credit !== claims[index].credit_amount ||
        detail.appliedCredit < 0 ||
        detail.appliedCredit > claims[index].credit_amount
      )
    ) {
      throw new Error(
        "Form 3468 PDF credit differs from prepared Form 3800 line 1v",
      );
    }
    return claims.map((claim, index) => {
      const s = claim.statement;
      const detail = details[index];
      if (
        s.beneficiary_ssn !== filer.primarySSN ||
        !detail.sourceDocumentId ||
        claim.source_name.length > 70
      ) {
        throw new Error(
          "Form 3468 PDF property differs from K-1 or Form 3800 Part V",
        );
      }
      const a = s.facility_address;
      const address = `${a.line1}, ${a.city}, ${a.state} ${a.zip}`;
      if (address.length > 110) {
        throw new Error("Form 3468 PDF facility address exceeds its field");
      }
      return {
        filer_name: filer.nameLine1,
        filer_ssn: filer.primarySSN,
        facility_type: "Solar",
        owner_name: claim.source_name,
        owner_ein: claim.source_ein,
        facility_address: address,
        construction_date: usDate(s.construction_started_on),
        service_date: usDate(s.placed_in_service_on),
        no_expansion: true,
        under_one_mw: true,
        pwa_not_applicable: true,
        no_domestic_bonus: true,
        no_community_bonus: true,
        no_low_income_bonus: true,
        line1a: s.beneficiary_allocated_qualified_basis,
        line1b_percent: 30,
        line1c: claim.credit_amount,
        line2: claim.credit_amount,
        line5: claim.credit_amount,
        line7: claim.credit_amount,
        line8: claim.credit_amount,
        line11: claim.credit_amount,
      };
    });
  },
};
