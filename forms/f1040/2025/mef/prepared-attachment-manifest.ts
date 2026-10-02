import { element } from "../../mef/xml.ts";
import { sha256Hex } from "../prepared-source.ts";
import type { MefBundle } from "./builder.ts";
import { documentId } from "./document-identity.ts";
import { isValidMefPdfFilename } from "./pdf-attachment-filename.ts";

/** Replay the prepared return's document and reference inventory. */
export function assertPreparedDocumentInventory(
  bundle: MefBundle,
): void {
  const returnData = [...bundle.xml.matchAll(
    /<ReturnData documentCnt="(\d+)">([\s\S]*?)<\/ReturnData>/g,
  )];
  const headerCounts = [...bundle.xml.matchAll(
    /<ReturnHeader\b[^>]*\bbinaryAttachmentCnt="(\d+)"/g,
  )];
  const documents = returnData.length === 1
    ? [...returnData[0][2].matchAll(
      /<([A-Za-z0-9]+)\b[^>]*\bdocumentId="([^"]+)"[^>]*>/g,
    )]
    : [];
  const documentIds = documents.map((match) => match[2]);
  const referencedIds = [...bundle.xml.matchAll(
    /\breferenceDocumentId="([^"]+)"/g,
  )].flatMap((match) => match[1].trim().split(/\s+/));
  if (
    returnData.length !== 1 || headerCounts.length !== 1 ||
    Number(returnData[0][1]) !== documents.length ||
    documents[0]?.[1] !== "IRS1040" ||
    new Set(documentIds).size !== documentIds.length ||
    referencedIds.some((id) => !documentIds.includes(id)) ||
    documents.filter((match) => match[1] === "BinaryAttachment").length !==
      bundle.attachments.length ||
    Number(headerCounts[0][1]) !== bundle.attachments.length
  ) {
    throw new Error(
      "Prepared MeF document count, order, IDs, references, or attachment count differs from its return",
    );
  }
  if (
    documents.some((match, index) => match[2] !== documentId(match[1], index))
  ) {
    throw new Error(
      "Prepared MeF document IDs differ from canonical tag and position order",
    );
  }
}

/** Bind the retained PDF bytes and metadata to the prepared XML manifest. */
export async function assertPreparedAttachmentManifest(
  bundle: MefBundle,
): Promise<void> {
  if (
    await sha256Hex(new TextEncoder().encode(bundle.xml)) !==
      bundle.xmlSha256
  ) {
    throw new Error("Prepared MeF XML differs from its digest");
  }
  assertPreparedDocumentInventory(bundle);
  const names = bundle.attachments.map((item) => item.fileName);
  const digestNames = Object.keys(bundle.attachmentSha256ByFileName);
  if (
    new Set(names).size !== names.length ||
    names.some((name) => !isValidMefPdfFilename(name)) ||
    names.length !== digestNames.length ||
    names.some((name) =>
      !Object.hasOwn(bundle.attachmentSha256ByFileName, name)
    )
  ) {
    throw new Error("Prepared MeF PDF attachment set differs from its digests");
  }
  const filedDescriptions = [...bundle.xml.matchAll(
    /<BinaryAttachment\b[^>]*>([\s\S]*?)<\/BinaryAttachment>/g,
  )].map((match) => match[1]);
  if (filedDescriptions.length !== bundle.attachments.length) {
    throw new Error(
      "Prepared MeF binary manifest differs from PDF attachments",
    );
  }
  for (const [index, attachment] of bundle.attachments.entries()) {
    const expected = element("DocumentTypeCd", "PDF") +
      element("Desc", attachment.description) +
      element("AttachmentLocationTxt", attachment.fileName);
    if (filedDescriptions[index] !== expected) {
      throw new Error(
        `Prepared MeF binary manifest differs from PDF attachment ${attachment.fileName}`,
      );
    }
    if (
      await sha256Hex(attachment.bytes) !==
        bundle.attachmentSha256ByFileName[attachment.fileName]
    ) {
      throw new Error(
        `Prepared MeF PDF bytes differ from digest: ${attachment.fileName}`,
      );
    }
  }
}
