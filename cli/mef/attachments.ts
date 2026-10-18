/**
 * Response attachments (STP guide §1.9.5–1.9.8): ZIP archives holding
 * acknowledgements.xml, receipts.xml or statusrecords.xml, whose elements
 * are defined in Common/efileAttachments.xsd. Inner ZIPs are read too, since
 * transmitter data items may each sit in their own ZIP (§1.5.1).
 */
import { unzipEntries } from "../../forms/f1040/2025/mef/submissions/zip.ts";
import { EFILE_NAMESPACE } from "./protocol.ts";
import {
  attributeValue,
  child,
  childElements,
  childText,
  descendants,
  parseXml,
  standaloneElementSource,
  type XmlDocument,
  type XmlElement,
} from "./xml.ts";

const decoder = new TextDecoder("utf-8", { fatal: true });

export enum MefAcceptanceStatus {
  Accepted = "Accepted",
  Rejected = "Rejected",
  /** Any other AcceptanceStatusTxt, kept verbatim in `acceptanceStatusTxt`. */
  Other = "Other",
}

export type MefValidationError = {
  readonly errorId: string | undefined;
  readonly documentId: string | undefined;
  readonly xpath: string | undefined;
  readonly category: string | undefined;
  readonly message: string | undefined;
  readonly ruleNumber: string | undefined;
  readonly severity: string | undefined;
  readonly fieldValue: string | undefined;
};

export type MefAcknowledgement = {
  readonly submissionId: string;
  readonly efin: string | undefined;
  readonly taxYear: string | undefined;
  readonly submissionType: string | undefined;
  readonly status: MefAcceptanceStatus;
  readonly acceptanceStatusTxt: string;
  readonly statusDate: string | undefined;
  readonly receiptId: string | undefined;
  readonly containedAlerts: boolean;
  readonly errors: readonly MefValidationError[];
  /** The Acknowledgement element as received, with its namespace declarations. */
  readonly xml: string;
};

export type MefReceipt = {
  readonly submissionId: string;
  readonly receivedTs: string | undefined;
  readonly receiptId: string | undefined;
};

export type MefStatusRecord = {
  readonly submissionId: string;
  readonly status: string;
  readonly statusDate: string | undefined;
  readonly disclaimer: string | undefined;
};

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b &&
    bytes[2] === 0x03 && bytes[3] === 0x04;
}

/** Every XML document in the attachment, descending into inner ZIPs. */
export function attachmentDocuments(bytes: Uint8Array): XmlDocument[] {
  if (bytes.length === 0) return [];
  if (!isZip(bytes)) return [parseXml(decoder.decode(bytes))];
  return Object.values(unzipEntries(bytes)).flatMap((entry) =>
    isZip(entry)
      ? attachmentDocuments(entry)
      : /^\s*</.test(decoder.decode(entry.subarray(0, 64)))
      ? [parseXml(decoder.decode(entry))]
      : []
  );
}

function efile(element: XmlElement, name: string): string | undefined {
  return childText(element, EFILE_NAMESPACE, name);
}

function statusOf(text: string): MefAcceptanceStatus {
  return text === MefAcceptanceStatus.Accepted
    ? MefAcceptanceStatus.Accepted
    : text === MefAcceptanceStatus.Rejected
    ? MefAcceptanceStatus.Rejected
    : MefAcceptanceStatus.Other;
}

function validationErrors(ack: XmlElement): MefValidationError[] {
  const list = child(ack, EFILE_NAMESPACE, "ValidationErrorList");
  if (list === undefined) return [];
  return childElements(list).map((group) => ({
    errorId: attributeValue(group, "", "errorId"),
    documentId: efile(group, "DocumentId"),
    xpath: efile(group, "XpathContentTxt"),
    category: efile(group, "ErrorCategoryCd"),
    message: efile(group, "ErrorMessageTxt"),
    ruleNumber: efile(group, "RuleNum"),
    severity: efile(group, "SeverityCd"),
    fieldValue: efile(group, "FieldValueTxt"),
  }));
}

export function parseAcknowledgements(bytes: Uint8Array): MefAcknowledgement[] {
  return attachmentDocuments(bytes).flatMap((document) =>
    descendants(document.root, EFILE_NAMESPACE, "Acknowledgement").map(
      (ack) => {
        const acceptance = efile(ack, "AcceptanceStatusTxt") ?? "";
        return {
          submissionId: efile(ack, "SubmissionId") ?? "",
          efin: efile(ack, "EFIN"),
          taxYear: efile(ack, "TaxYr"),
          submissionType: efile(ack, "SubmissionTyp"),
          status: statusOf(acceptance),
          acceptanceStatusTxt: acceptance,
          statusDate: efile(ack, "StatusDt"),
          receiptId: efile(ack, "ReceiptId"),
          containedAlerts: ["true", "1"].includes(
            efile(ack, "ContainedAlertsInd") ?? "",
          ),
          errors: validationErrors(ack),
          xml: standaloneElementSource(document, ack),
        };
      },
    )
  );
}

export function parseReceipts(bytes: Uint8Array): MefReceipt[] {
  return attachmentDocuments(bytes).flatMap((document) =>
    descendants(document.root, EFILE_NAMESPACE, "SubmissionReceiptGrp").map(
      (receipt) => ({
        submissionId: efile(receipt, "SubmissionId") ?? "",
        receivedTs: efile(receipt, "SubmissionReceivedTs"),
        receiptId: efile(receipt, "ReceiptId"),
      }),
    )
  );
}

export function parseStatusRecords(bytes: Uint8Array): MefStatusRecord[] {
  return attachmentDocuments(bytes).flatMap((document) =>
    descendants(document.root, EFILE_NAMESPACE, "StatusRecordGrp").map(
      (record) => ({
        submissionId: efile(record, "SubmissionId") ?? "",
        status: efile(record, "SubmissionStatusTxt") ?? "",
        statusDate: efile(record, "SubmsnStatusAcknowledgementDt"),
        disclaimer: efile(record, "DisclaimerTxt"),
      }),
    )
  );
}
