import { z } from "zod";
import type { MefPdfAttachment } from "../../../../../../2025/mef/form-descriptor.ts";
import { type Form8839Input, inputSchema } from "./index.ts";
import { form8839MagiReviewSchema } from "./pre_adoption_reconciliation.ts";
import {
  assertReviewedDomestic8839Source,
  reviewedDomestic8839SourceSchema,
} from "./reviewed_source.ts";
import { bindReviewedDomestic8839DocumentBytes } from "./document_byte_binding.ts";

const documentSchema = z.object({
  source_document_id: z.string().trim().min(1),
  file_name: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.pdf$/).max(64),
  description: z.string().trim().min(1).max(128),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

/** The only public source shape for the bounded domestic adoption claim. */
export const publicForm8839SourceSchema = inputSchema.extend({
  reviewed_source: reviewedDomestic8839SourceSchema,
  magi_review: form8839MagiReviewSchema,
  documents: z.array(documentSchema).min(4),
}).strict();

export type PublicForm8839Source = z.infer<typeof publicForm8839SourceSchema>;

export function hasForm8839Claim(
  pending: {
    readonly form8839?: unknown;
    readonly form8839_route?: unknown;
    readonly schedule3?: unknown;
    readonly f1040?: unknown;
  },
): boolean {
  const source = pending.form8839 as
    | { children?: unknown; adoption_benefits?: unknown }
    | undefined;
  const schedule3 = pending.schedule3 as
    | { line6c_adoption_credit?: unknown }
    | undefined;
  const form1040 = pending.f1040 as
    | { line30_refundable_adoption?: unknown }
    | undefined;
  return (Array.isArray(source?.children) && source.children.length > 0) ||
    (typeof source?.adoption_benefits === "number" &&
      source.adoption_benefits > 0) ||
    pending.form8839_route !== undefined ||
    (typeof schedule3?.line6c_adoption_credit === "number" &&
      schedule3.line6c_adoption_credit > 0) ||
    (typeof form1040?.line30_refundable_adoption === "number" &&
      form1040.line30_refundable_adoption > 0);
}

export function parsePublicForm8839Source(raw: unknown): {
  source: Form8839Input;
  publicSource: PublicForm8839Source;
} {
  const publicSource = publicForm8839SourceSchema.parse(raw);
  const source = inputSchema.parse({
    filing_status: publicSource.filing_status,
    adoption_benefits: publicSource.adoption_benefits,
    children: publicSource.children,
  });
  const reviewed_source = publicSource.reviewed_source;
  const documents = publicSource.documents;
  assertReviewedDomestic8839Source(source, reviewed_source);
  const expected = new Map<string, string>([
    [
      reviewed_source.decree.source_document_id,
      reviewed_source.decree.document_sha256,
    ],
    [
      reviewed_source.birth_record.source_document_id,
      reviewed_source.birth_record.document_sha256,
    ],
  ]);
  for (const expense of reviewed_source.expenses) {
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
    expected.size !== documents.length ||
    new Set(documents.map((document) => document.source_document_id)).size !==
      documents.length ||
    new Set(documents.map((document) => document.file_name)).size !==
      documents.length ||
    new Set(documents.map((document) => document.description)).size !==
      documents.length ||
    documents.some((document) =>
      expected.get(document.source_document_id) !== document.sha256
    )
  ) {
    throw new Error(
      "Form 8839 needs one distinct PDF manifest entry for each reviewed source document",
    );
  }
  return { source, publicSource };
}

/** Bind the submitted BinaryAttachment bytes to every reviewed document. */
export async function assertPublicForm8839Attachments(
  raw: unknown,
  attachments: readonly MefPdfAttachment[],
): Promise<void> {
  const { source, publicSource } = parsePublicForm8839Source(raw);
  const documents = publicSource.documents.map((document) => {
    const matched = attachments.filter((attachment) =>
      attachment.fileName === document.file_name &&
      attachment.description === document.description
    );
    if (matched.length !== 1) {
      throw new Error(
        `Form 8839 needs the reviewed PDF attachment ${document.file_name}`,
      );
    }
    return {
      source_document_id: document.source_document_id,
      bytes: matched[0].bytes,
    };
  });
  await bindReviewedDomestic8839DocumentBytes(
    source,
    publicSource.reviewed_source,
    documents,
  );
}
