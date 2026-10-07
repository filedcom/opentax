import { element } from "../../mef/xml.ts";
import { sha256Hex } from "../prepared-source.ts";
import type { MefBundle } from "./builder.ts";
import {
  documentId,
  hasMismatchedSingleReferenceName,
} from "./document-identity.ts";
import { isValidMefPdfFilename } from "./pdf-attachment-filename.ts";
import { returnDataDocuments } from "./return-document-inventory.ts";

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
  const documents = returnDataDocuments(bundle.xml) ?? [];
  const documentIds = documents.map((document) => document.id);
  const tagsById = new Map(
    documents.map((document) => [document.id, document.tag]),
  );
  const referenceGroups = [...bundle.xml.matchAll(
    /\breferenceDocumentId="([^"]+)"/g,
  )].map((match) => match[1].trim().split(/\s+/));
  const referencedIds = referenceGroups.flat();
  if (
    returnData.length !== 1 || headerCounts.length !== 1 ||
    documents.length === 0 ||
    Number(returnData[0][1]) !== documents.length ||
    documents[0]?.tag !== "IRS1040" ||
    documents.filter((document) => document.tag === "IRS1040").length !== 1 ||
    new Set(documentIds).size !== documentIds.length ||
    referenceGroups.some((group) => new Set(group).size !== group.length) ||
    referencedIds.some((id) => !documentIds.includes(id)) ||
    hasMismatchedSingleReferenceName(bundle.xml, tagsById) ||
    documents.filter((document) => document.tag === "BinaryAttachment")
        .length !==
      bundle.attachments.length ||
    Number(headerCounts[0][1]) !== bundle.attachments.length
  ) {
    throw new Error(
      "Prepared MeF document count, order, IDs, references, or attachment count differs from its return",
    );
  }
  if (
    documents.some((document, index) =>
      document.id !== documentId(document.tag, index)
    )
  ) {
    throw new Error(
      "Prepared MeF document IDs differ from canonical tag and position order",
    );
  }
}

/** Replay retained PDF names, descriptions, and order against ReturnData. */
export function assertPreparedAttachmentMetadata(
  bundle: MefBundle,
): void {
  assertPreparedDocumentInventory(bundle);
  const names = bundle.attachments.map((item) => item.fileName);
  const descriptions = bundle.attachments.map((item) => item.description);
  const digestNames = Object.keys(bundle.attachmentSha256ByFileName);
  if (
    new Set(names).size !== names.length ||
    names.some((name) => !isValidMefPdfFilename(name)) ||
    new Set(descriptions).size !== descriptions.length ||
    descriptions.some((description) =>
      description.trim().length === 0 || description.length > 128
    ) ||
    names.length !== digestNames.length ||
    names.some((name) =>
      !Object.hasOwn(bundle.attachmentSha256ByFileName, name)
    )
  ) {
    throw new Error("Prepared MeF PDF attachment set differs from its digests");
  }
  if (names.some((name, index) => name !== digestNames[index])) {
    throw new Error(
      "Prepared MeF BinaryAttachment order differs from its retained PDF digest order",
    );
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
  assertPreparedAttachmentMetadata(bundle);
  for (const attachment of bundle.attachments) {
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
