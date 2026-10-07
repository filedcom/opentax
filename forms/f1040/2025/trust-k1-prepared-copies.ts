import type { FilerIdentity } from "../mef/header.ts";
import { PDFCheckBox, PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { assertOtherFormsWithholding } from "./f8288-withholding-reconciliation.ts";
import { normalizeAllPending } from "./pending.ts";
import { preparedSourceSha256 } from "./prepared-source.ts";
import {
  type ReconciledTrustK1SourceCopy,
  reconcileTrustK1SourceCopies,
} from "./trust-k1-source-copy-reconciliation.ts";

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Immutable prepared source/native evidence, not an authorized filing packet.
 * Source authenticity, statements and final export integration stay separate. */
export class PreparedTrustK1Copies {
  readonly sourceSha256: string;
  readonly copies: readonly ReconciledTrustK1SourceCopy[];
  readonly filingReady = false;
  readonly #bytes: ReadonlyMap<string, Uint8Array>;

  private constructor(
    sourceSha256: string,
    copies: readonly ReconciledTrustK1SourceCopy[],
    documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
  ) {
    this.sourceSha256 = sourceSha256;
    this.copies = freeze(copies);
    this.#bytes = new Map(
      documents.map((doc) => [doc.reference, Uint8Array.from(doc.bytes)]),
    );
    Object.freeze(this);
  }

  static async prepare(
    pending: Record<string, unknown>,
    filer: FilerIdentity,
    documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
    transcriptions: readonly unknown[],
  ): Promise<PreparedTrustK1Copies> {
    // Capture all caller-owned inputs before the first asynchronous digest.
    const source = structuredClone(pending);
    const normalized = normalizeAllPending(source);
    const owner = structuredClone(filer);
    const retained = documents.map((doc) => ({
      reference: doc.reference,
      bytes: Uint8Array.from(doc.bytes),
    }));
    const recipients = structuredClone(transcriptions);
    const fields = normalized.f1040;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      throw Error("Prepared trust K-1 copies need finalized Form1040 fields");
    }
    assertOtherFormsWithholding(fields, normalized, true);
    const copies = await reconcileTrustK1SourceCopies(
      normalized.k1_trust,
      owner,
      retained,
      recipients,
    );
    const sourceSha256 = await preparedSourceSha256(source, owner);
    return new PreparedTrustK1Copies(sourceSha256, copies, retained);
  }

  /** Defensive copies: packet assembly must never alias the verified bytes. */
  getCopyBytes(reference: string): Uint8Array {
    const bytes = this.#bytes.get(reference);
    if (!bytes) {
      throw Error("Prepared trust K-1 source copy reference is unavailable");
    }
    return Uint8Array.from(bytes);
  }

  /** Fixed source-copy review pages, with no editable field-name collisions.
   * This projects only verified normal appearances from private byte copies;
   * the original retained PDF bytes remain unchanged. Not a filing packet. */
  async buildReviewPdf(pending: Record<string, unknown>, filer: FilerIdentity) {
    await this.assertCurrent(pending, filer);
    const output = await PDFDocument.create();
    const origins: Readonly<
      {
        pageNumber: number;
        copyNumber: number;
        pdfReference: string;
        pdfSha256: string;
        beneficiarySsn: string;
        estateTrustEin: string;
      }
    >[] = [];
    for (const [index, copy] of this.copies.entries()) {
      const source = await PDFDocument.load(
        this.getCopyBytes(copy.pdfReference),
        { updateMetadata: false },
      );
      const form = source.getForm();
      for (const field of form.getFields()) {
        if (field instanceof PDFCheckBox && !field.isChecked()) {
          const normal = field.acroField.getWidgets()[0].AP()?.lookup(
            PDFName.of("N"),
          );
          // The verified official blank state has only an /On glyph. Its
          // outline is already static page content; no /Off mark is printed.
          if (normal instanceof PDFDict && !normal.has(PDFName.of("Off"))) {
            const annotations = source.getPage(0).node.Annots()!;
            const widget = field.acroField.getWidgets()[0];
            const position = annotations.asArray().findIndex((ref) =>
              source.context.lookup(ref) === widget.dict
            );
            if (position < 0) {
              throw Error(
                "Prepared trust K-1 blank widget is missing from its verified page",
              );
            }
            annotations.remove(position);
            form.acroForm.removeField(field.acroField);
          }
        }
      }
      form.flatten({ updateFieldAppearances: false });
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) {
        output.addPage(page);
        origins.push(Object.freeze({
          pageNumber: output.getPageCount(),
          copyNumber: index + 1,
          pdfReference: copy.pdfReference,
          pdfSha256: copy.pdfSha256,
          beneficiarySsn: copy.beneficiarySsn,
          estateTrustEin: copy.estateTrustEin,
        }));
      }
    }
    return {
      pdfBytes: await output.save({ updateFieldAppearances: false }),
      pageOrigins: Object.freeze(origins),
      filingReady: false as const,
    };
  }

  /** Reject changes to source, owner or return totals after preparation. */
  async assertCurrent(
    pending: Record<string, unknown>,
    filer: FilerIdentity,
  ): Promise<void> {
    const source = structuredClone(pending);
    const owner = structuredClone(filer);
    if (await preparedSourceSha256(source, owner) !== this.sourceSha256) {
      throw Error(
        "Prepared trust K-1 copies differ from the current return source or filer",
      );
    }
  }
}
