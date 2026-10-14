import { z } from "zod";

/** One identified Form 1099-G box 5 RTAA payment for Schedule 1 line 8z. */
export const rtaaSourceSchema = z.object({
  payer_name: z.string().trim().min(1),
  payer_tin: z.string().regex(/^\d{9}$/),
  recipient_tin: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
  account_number: z.string().trim().min(1).optional(),
  amount: z.number().int().positive(),
}).strict();

export type RtaaSource = z.infer<typeof rtaaSourceSchema>;
