import { PDFDocument } from "pdf-lib";
import {
  type SourceDocumentBytes,
  type SourceDocumentClaim,
  VerifiedSourceDocuments,
} from "../../../../core/runtime/source-documents.ts";

/** Per-execution covenant capability; copies preserve original signed PDFs. */
export class Form1062Covenants2026 {
  private constructor(
    readonly documents: VerifiedSourceDocuments,
    private readonly pages: ReadonlyMap<string, number>,
  ) {}

  static async verify(
    claims: readonly SourceDocumentClaim[],
    documents: readonly SourceDocumentBytes[],
  ): Promise<Form1062Covenants2026> {
    const verified = await VerifiedSourceDocuments.verify(claims, documents);
    const pages = new Map<string, number>();
    for (const claim of verified.manifest) {
      let doc: PDFDocument;
      try {
        doc = await PDFDocument.load(verified.getBytes(claim.reference)!);
      } catch {
        throw new Error(
          "Form 1062 covenant must be a readable, unencrypted PDF copy",
        );
      }
      if (doc.getPageCount() < 1) {
        throw new Error("Form 1062 covenant PDF has no pages");
      }
      pages.set(claim.reference, doc.getPageCount());
    }
    return new Form1062Covenants2026(verified, pages);
  }

  assertMatches(claims: readonly SourceDocumentClaim[]): void {
    const actual = this.documents.manifest;
    if (
      actual.length !== claims.length ||
      claims.some((c) =>
        !actual.some((a) =>
          a.reference === c.reference && a.sha256 === c.sha256
        )
      )
    ) {
      throw new Error(
        "Form 1062 covenant documents belong to another election",
      );
    }
  }

  originals() {
    return this.documents.manifest.map((claim) => ({
      ...claim,
      bytes: this.documents.getBytes(claim.reference)!,
      pages: this.pages.get(claim.reference)!,
    }));
  }
}
