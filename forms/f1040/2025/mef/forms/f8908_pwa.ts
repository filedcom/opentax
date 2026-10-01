import {
  calculateForm8908Source,
  form8908PwaAttachmentDescription,
  type Form8908Source,
  form8908SourceSchema,
} from "../../form8908_source.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

export type Form8908PwaAttachmentLink = {
  readonly acquisitionRecordReference: string;
  readonly reviewReference: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly description: string;
  readonly documentId: string;
};

/** Bind each increased-credit residence to its own validated Form 7220 PDF. */
export function reconcileForm8908PwaAttachments(
  raw: Form8908Source,
  context: MefBuildContext,
): readonly Form8908PwaAttachmentLink[] {
  const source = form8908SourceSchema.parse(raw);
  calculateForm8908Source(source);
  const links: Form8908PwaAttachmentLink[] = [];
  const documentIds = new Set<string>();
  for (const home of source.homes) {
    const attachment = home.form7220;
    if (!attachment) continue;
    const fileName = attachment.pdf_file_name;
    const description = form8908PwaAttachmentDescription(home);
    const nameMatches = context.binaryAttachmentFileNames?.filter((name) =>
      name === fileName
    ).length;
    if (
      nameMatches !== 1 ||
      context.attachmentDescriptionsByFileName?.[fileName] !== description ||
      context.attachmentSha256ByFileName?.[fileName] !== attachment.pdf_sha256
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs its reviewed completed Form 7220 PDF bytes`,
      );
    }
    const documentId = context.documentIdsByAttachmentFileName?.[fileName];
    if (
      !documentId || !/^BinaryAttachment[0-9]+$/.test(documentId) ||
      documentIds.has(documentId)
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs a distinct linked Form 7220 binary document ID`,
      );
    }
    documentIds.add(documentId);
    links.push({
      acquisitionRecordReference: home.acquisition_record_reference,
      reviewReference: attachment.review_reference,
      fileName,
      sha256: attachment.pdf_sha256,
      description,
      documentId,
    });
  }
  return links;
}
