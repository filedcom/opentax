import { z } from "zod";
const reference = z.string().trim().min(1);
const document = z.object({
  source_document_reference: reference,
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes_base64: z.string().min(1),
}).strict();
export const employerCode2RetainedSourceSchema = z.object({
  w2: document,
  trustee_1099sa: document,
  paid_owner_return: document,
}).strict();
