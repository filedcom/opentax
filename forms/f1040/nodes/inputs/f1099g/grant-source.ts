import { z } from "zod";

/** One reviewed nonbusiness Form 1099-G box 6 payment. */
export const taxableGrantSourceSchema = z.object({
  payer_name: z.string().trim().min(1),
  payer_tin: z.string().regex(/^\d{9}$/),
  recipient_tin: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  account_number: z.string().trim().min(1).optional(),
  amount: z.number().int().positive(),
}).strict();

export type TaxableGrantSource = z.infer<typeof taxableGrantSourceSchema>;
