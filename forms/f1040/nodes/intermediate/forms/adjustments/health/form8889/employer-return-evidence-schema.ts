import { z } from "zod";

const document = z.object({
  source_document_reference: z.string().trim().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes_base64: z.string().min(1),
}).strict();

/** Retained reviewed records; this does not authenticate an issuer. */
export const employerReturnEvidenceSchema = z.object({
  employer_correction: document,
  trustee_remittance: document,
  filed_w2: document,
  trustee_5498sa: document,
}).strict();
