import type { Form8839Input } from "./index.ts";
import {
  assertReviewedDomestic8839Source,
  reviewedDomestic8839SourceSchema,
} from "./reviewed_source.ts";

export type Form8839SourceDocument = Readonly<{
  source_document_id: string;
  bytes: Uint8Array;
}>;

/** Preflight for actual reviewed source bytes; this does not authorize filing. */
export async function bindReviewedDomestic8839DocumentBytes(
  source: Form8839Input,
  rawReview: unknown,
  documents: readonly Form8839SourceDocument[],
): Promise<void> {
  assertReviewedDomestic8839Source(source, rawReview);
  const review = reviewedDomestic8839SourceSchema.parse(rawReview);
  const expected = new Map<string, string>();
  expected.set(review.decree.source_document_id, review.decree.document_sha256);
  expected.set(
    review.birth_record.source_document_id,
    review.birth_record.document_sha256,
  );
  for (const expense of review.expenses) {
    expected.set(expense.source_document_id, expense.receipt_sha256);
    expected.set(
      expense.payment_proof_document_id,
      expense.payment_proof_sha256,
    );
    if (expense.reimbursement) {
      expected.set(
        expense.reimbursement.source_document_id,
        expense.reimbursement.document_sha256,
      );
    }
  }
  if (
    expected.size !== 2 + review.expenses.length * 2 +
        review.expenses.filter((expense) => expense.reimbursement).length ||
    documents.length !== expected.size ||
    new Set(documents.map((document) => document.source_document_id)).size !==
      documents.length ||
    documents.some((document) =>
      !expected.has(document.source_document_id) ||
      !(document.bytes instanceof Uint8Array) || document.bytes.length === 0
    )
  ) {
    throw new Error(
      "Form 8839 reviewed source needs one distinct nonempty byte document for each decree, receipt, payment, and reimbursement reference",
    );
  }
  for (const document of documents) {
    const digest = new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        Uint8Array.from(document.bytes),
      ),
    );
    const actual = Array.from(
      digest,
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (actual !== expected.get(document.source_document_id)) {
      throw new Error(
        `Form 8839 reviewed ${document.source_document_id} bytes differ from its source SHA-256`,
      );
    }
  }
}
