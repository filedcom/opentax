import { PDFDocument } from "pdf-lib";
import { VerifiedSourceDocuments } from "../../../core/runtime/source-documents.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema as trustK1InputSchema } from "../nodes/inputs/k1_trust/index.ts";

export interface ReviewedTrustK1Copy {
  readonly pdfReference: string;
  readonly pdfSha256: string;
  readonly estateTrustEin: string;
  readonly beneficiarySsn: string;
  readonly backupWithholding: number;
  /** SHA binding and PDF readability do not authenticate printed contents. */
  readonly printedContentsVerified: false;
}

/** Bind reviewed box-13-B metadata to exact readable PDF bytes, without filing it. */
export async function inspectTrustK1IssuedCopies(
  rawSource: unknown,
  filer: FilerIdentity,
  documents: ReadonlyArray<{ reference: string; bytes: Uint8Array }>,
): Promise<readonly ReviewedTrustK1Copy[]> {
  const positive = trustK1InputSchema.parse(rawSource).k1_trusts.filter((
    item,
  ) => item.box13_code_b_backup_withholding !== undefined);
  if (positive.length === 0) {
    throw new Error("Trust K-1 issued-copy review needs box 13 code B");
  }
  const allowedSsn = [filer.primarySSN];
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) allowedSsn.push(filer.spouse.ssn);
  const sourceKeys = new Set<string>();
  const claims = positive.map((item) => {
    const review = item.box13_code_b_issued_copy_review;
    if (
      !review || !item.estate_trust_ein || !item.beneficiary_ssn ||
      !item.source_document_reference ||
      !allowedSsn.includes(item.beneficiary_ssn)
    ) {
      throw new Error(
        "Trust K-1 box 13 code B needs a distinct issued-copy PDF review owned by this return",
      );
    }
    const key = `${item.estate_trust_ein}:${item.source_document_reference}`;
    if (sourceKeys.has(key)) {
      throw new Error("Duplicate trust K-1 box 13 code B source");
    }
    sourceKeys.add(key);
    return { reference: review.pdf_reference, sha256: review.pdf_sha256 };
  });
  const verified = await VerifiedSourceDocuments.verify(claims, documents);
  return await Promise.all(positive.map(async (item) => {
    const review = item.box13_code_b_issued_copy_review!;
    const bytes = verified.getBytes(review.pdf_reference);
    if (!bytes || bytes.length > 10_000_000) {
      throw new Error("Trust K-1 issued-copy PDF bytes are unavailable");
    }
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(bytes);
    } catch {
      throw new Error("Trust K-1 issued-copy bytes need a readable PDF");
    }
    if (pdf.getPageCount() === 0) {
      throw new Error("Trust K-1 issued-copy PDF needs at least one page");
    }
    return {
      pdfReference: review.pdf_reference,
      pdfSha256: review.pdf_sha256,
      estateTrustEin: review.estate_trust_ein,
      beneficiarySsn: review.beneficiary_ssn,
      backupWithholding: review.box13_code_b_backup_withholding,
      printedContentsVerified: false,
    };
  }));
}
