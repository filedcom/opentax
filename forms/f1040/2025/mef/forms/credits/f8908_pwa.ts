import {
  calculateForm8908Source,
  form8908NoAlterationsStatementDescription,
  form8908PwaAttachmentDescription,
  type Form8908Source,
  form8908SourceSchema,
} from "../../../domains/credits/form8908/form8908_source.ts";
import type { MefBuildContext, MefPdfAttachment } from "../../form-descriptor.ts";
import { assertForm8908Form7220PdfContents } from "./f8908_form7220_pdf.ts";
import { assertForm8908NoAlterationsStatementPdf } from "./f8908_no_alterations_pdf.ts";

export type Form8908PwaAttachmentLink = {
  readonly acquisitionRecordReference: string;
  readonly reviewReference: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly description: string;
  readonly documentId: string;
  readonly statementFileName: string;
  readonly statementSha256: string;
  readonly statementDescription: string;
  readonly statementDocumentId: string;
};

/** Read the exact PDFs accepted into the MeF bundle before XML preparation. */
export async function assertForm8908PwaSubmittedPdfs(
  raw: Form8908Source,
  attachments: ReadonlyArray<MefPdfAttachment>,
): Promise<void> {
  const source = form8908SourceSchema.parse(raw);
  calculateForm8908Source(source);
  let needsSignedStatement = false;
  for (const home of source.homes) {
    const document = home.form7220;
    if (!document) continue;
    const matching = attachments.filter((attachment) =>
      attachment.fileName === document.pdf_file_name
    );
    if (
      matching.length !== 1 ||
      matching[0].description !== form8908PwaAttachmentDescription(home)
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs one reviewed Form 7220 binary attachment`,
      );
    }
    await assertForm8908Form7220PdfContents(
      source,
      home.acquisition_record_reference,
      matching[0].bytes,
    );
    const statement = document.signed_no_alterations_statement;
    const statementMatches = attachments.filter((attachment) =>
      attachment.fileName === statement.pdf_file_name
    );
    if (
      statementMatches.length !== 1 ||
      statementMatches[0].description !==
        form8908NoAlterationsStatementDescription(home)
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs one distinct signed no-alterations statement attachment`,
      );
    }
    await assertForm8908NoAlterationsStatementPdf(
      source,
      home.acquisition_record_reference,
      statementMatches[0].bytes,
    );
    needsSignedStatement = true;
  }
  // The signed statement fields and bytes are linked, but neither PDF form
  // values nor a source review authenticate the human signature itself.
  if (needsSignedStatement) {
    throw new Error(
      "Form 8908 no-alterations statement signature authenticity is not verified",
    );
  }
}

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
    const statement = attachment.signed_no_alterations_statement;
    const statementFileName = statement.pdf_file_name;
    const statementDescription = form8908NoAlterationsStatementDescription(
      home,
    );
    const statementMatches = context.binaryAttachmentFileNames?.filter((name) =>
      name === statementFileName
    ).length;
    if (
      statementMatches !== 1 ||
      context.attachmentDescriptionsByFileName?.[statementFileName] !==
        statementDescription ||
      context.attachmentSha256ByFileName?.[statementFileName] !==
        statement.pdf_sha256
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs its reviewed signed statement PDF bytes`,
      );
    }
    const statementDocumentId = context.documentIdsByAttachmentFileName
      ?.[statementFileName];
    if (
      !statementDocumentId ||
      !/^BinaryAttachment[0-9]+$/.test(statementDocumentId) ||
      documentIds.has(statementDocumentId)
    ) {
      throw new Error(
        `Form 8908 residence ${home.acquisition_record_reference} needs a distinct signed statement binary document ID`,
      );
    }
    documentIds.add(statementDocumentId);
    links.push({
      acquisitionRecordReference: home.acquisition_record_reference,
      reviewReference: attachment.review_reference,
      fileName,
      sha256: attachment.pdf_sha256,
      description,
      documentId,
      statementFileName,
      statementSha256: statement.pdf_sha256,
      statementDescription,
      statementDocumentId,
    });
  }
  return links;
}
