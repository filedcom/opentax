import { PDFDocument } from "pdf-lib";
import {
  calculateForm8835,
  type F8835Item,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  assertForm8835TransferSource,
  form8835TransferDescription,
} from "../../../../../nodes/inputs/credits/business/f8835/transfer-source.ts";
import type { MefPdfAttachment } from "../../../form-descriptor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const transferUnrelatedDeclaration =
  "The eligible taxpayer and members of its controlled group are not related to the transferee taxpayer or members of its controlled group under sections 267(b) or 707(b)(1).";
export const transferComplianceDeclaration =
  "The eligible taxpayer has complied with section 6418 and section 45, including applicable prevailing wage, apprenticeship and domestic content requirements.";
export const transferRecaptureDeclaration =
  "Both parties acknowledge the notification of recapture requirements under section 6418(g)(3), if applicable.";
export const transferPerjuryDeclaration =
  "Under penalties of perjury, we declare that we have examined this statement and, to the best of our knowledge and belief, it is true, correct and complete.";
const addressText = (
  a: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  },
) =>
  [a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(
    ", ",
  );
export function transferStatementFields(item: F8835Item, index: number) {
  const s = item.transfer_source!, t = s.transfers[index];
  return {
    TransferorName: s.transferor.name,
    TransferorTIN: s.transferor.tin,
    TransferorAddress: addressText(s.transferor.address),
    TransfereeName: t.transferee.name,
    TransfereeTIN: t.transferee.tin,
    TransfereeAddress: addressText(t.transferee.address),
    SourceForm: "Form 8835 Part II",
    CreditDescription:
      "Renewable electricity production credit under section 45",
    DocumentationDeclaration:
      "The eligible taxpayer has provided the transferee taxpayer the required minimum documentation under section 1.6418-2(b)(5)(iv).",
    TransfereeConsent:
      "The transferee taxpayer consents to the transfer described in this statement.",
    Form3800Line: calculateForm8835(item).form3800Line,
    FacilityDescription: s.facility_description,
    FacilityAddress: addressText(s.facility_address),
    FacilityCoordinates: `${s.facility_latitude}, ${s.facility_longitude}`,
    TotalFacilityCredit: String(s.total_facility_credit),
    TransferredCredit: String(t.credit_amount),
    TransferorTaxYear: "2025",
    TransfereeTaxYear: "2025",
    RegistrationNumber: s.registration_number,
    CashConsideration: (t.cash_consideration_cents / 100).toFixed(2),
    CashPayments: t.cash_payments.map((p) =>
      `${p.paid_on}: USD ${
        (p.amount_cents / 100).toFixed(2)
      } (${p.method}; ${p.record_reference})`
    ).join("; "),
    UnrelatedDeclaration: transferUnrelatedDeclaration,
    ComplianceDeclaration: transferComplianceDeclaration,
    RecaptureDeclaration: transferRecaptureDeclaration,
    PerjuryDeclaration: transferPerjuryDeclaration,
    TransferorSigner: s.transferor.signer_name,
    TransferorSignedOn: s.transferor.signed_on,
    TransfereeSigner: t.transferee.signer_name,
    TransfereeSignedOn: t.transferee.signed_on,
  };
}
/** Content/byte review does not authenticate either party's signature. */
export async function assertForm8835TransferStatements(
  raw: unknown,
  filer: FilerIdentity | undefined,
  attachments: readonly MefPdfAttachment[],
) {
  if (!raw) return;
  const names = new Set<string>();
  const registrations = new Set<string>();
  for (const item of inputSchema.parse(raw).f8835s) {
    assertForm8835TransferSource(item, calculateForm8835(item).line15, true);
    const s = item.transfer_source;
    if (!s) continue;
    if (registrations.has(s.registration_number)) {
      throw new Error(
        "Form 8835 facilities cannot share a transfer registration",
      );
    }
    registrations.add(s.registration_number);
    if (
      s.transferor.name !== filer?.fullName ||
      s.transferor.tin !== filer?.primarySSN ||
      !filer || addressText(s.transferor.address) !== addressText(filer.address)
    ) throw new Error("Form 8835 transferor differs from return filer");
    for (const [index, t] of s.transfers.entries()) {
      const matches = attachments.filter((a) =>
          a.fileName === t.statement_file_name
        ),
        a = matches[0];
      if (
        matches.length !== 1 || names.has(t.statement_file_name) ||
        a.description !==
          form8835TransferDescription(
            s.facility_description,
            t.transferee.tin,
          ) ||
        await sha256Hex(a.bytes) !== t.statement_sha256
      ) {
        throw new Error(
          "Form 8835 transfer statement differs from distinct retained bytes",
        );
      }
      names.add(t.statement_file_name);
      const pdf = await PDFDocument.load(a.bytes);
      if (!pdf.getPageCount()) {
        throw new Error("Form 8835 transfer statement has no pages");
      }
      for (
        const [key, expected] of Object.entries(
          transferStatementFields(item, index),
        )
      ) {
        if (
          pdf.getForm().getTextField(`Form8835Transfer.${key}`).getText()
            ?.trim().replace(/\s+/g, " ") !==
            expected.trim().replace(/\s+/g, " ")
        ) {
          throw new Error(
            `Form 8835 transfer statement ${key} differs from reviewed source`,
          );
        }
      }
    }
  }
}
