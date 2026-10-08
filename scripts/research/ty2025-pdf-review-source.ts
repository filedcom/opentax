import type { FilerIdentity } from "../../forms/f1040/mef/header.ts";
import type { PdfReviewFixture } from "../../forms/f1040/2025/pdf/review-fixtures.ts";

/** Fixed header time for synthetic review artifacts, not production exports. */
export const REVIEW_RETURN_TIMESTAMP = "2025-12-31T12:00:00Z";

export function reviewFiler(filer: FilerIdentity): FilerIdentity {
  return { ...filer, timestamp: REVIEW_RETURN_TIMESTAMP };
}

/** Exact source record serialized by the generator and replayed by the checker. */
export function reviewSourceFileContents(
  fixture: PdfReviewFixture,
  filer: FilerIdentity,
  pending: unknown,
): string {
  return JSON.stringify(
    {
      id: fixture.id,
      inputs: fixture.inputs,
      filer,
      expectedPdfForms: fixture.expectedPdfForms,
      reviewFocus: fixture.reviewFocus,
      ...(fixture.attachments === undefined ? {} : {
        attachments: fixture.attachments.map((attachment) => ({
          fileName: attachment.fileName,
          description: attachment.description,
          bytesBase64: btoa(
            Array.from(attachment.bytes, (byte) => String.fromCharCode(byte))
              .join(""),
          ),
        })),
      }),
      ...(fixture.retainedSourceDocuments === undefined ? {} : {
        retainedSourceDocuments: fixture.retainedSourceDocuments.map((document) => ({
          document_reference: document.document_reference,
          bytesBase64: btoa(
            Array.from(document.bytes, (byte) => String.fromCharCode(byte)).join(""),
          ),
        })),
      }),
      pending,
    },
    null,
    2,
  ) + "\n";
}

export function assertReviewSourceFileContents(
  caseId: string,
  recorded: Uint8Array,
  expected: string,
): void {
  if (new TextDecoder().decode(recorded) !== expected) {
    throw new Error(
      `${caseId}: source JSON differs from current source replay`,
    );
  }
}
