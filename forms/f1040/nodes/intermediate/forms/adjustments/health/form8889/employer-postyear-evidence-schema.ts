import { z } from "zod";
const document = z.object({
  source_document_reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes_base64: z.string().min(1),
}).strict();
/** Reviewed transaction bytes, without a claim that a 2026 1099-SA was issued. */
export const employerPostyearEvidenceSchema = z.object({
  filed_2025_w2: document,
  trustee_2026_payment: document,
  owner_2026_receipt: document,
}).strict();
