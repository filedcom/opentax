import { element } from "../../mef/xml.ts";
import { sha256Hex } from "../prepared-source.ts";
import type { MefBundle } from "./builder.ts";

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
  const names = bundle.attachments.map((item) => item.fileName);
  const digestNames = Object.keys(bundle.attachmentSha256ByFileName);
  if (
    new Set(names).size !== names.length ||
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
