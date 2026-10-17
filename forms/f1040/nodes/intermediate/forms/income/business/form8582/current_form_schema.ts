import { z } from "zod";
export const currentPassiveDollarsSchema = z.number().int().nonnegative()
  .refine(Number.isSafeInteger);
export const currentPassiveFormsSchema = z.array(
  z.object({
    activity_id: z.string().trim().min(1),
    special_allowance_eligible: z.boolean(),
    forms: z.array(
      z.object({
        reporting_form: z.enum([
          "Schedule E",
          "Form 4835",
          "Form 4797 Part I",
          "Form 4797 Part II",
        ]),
        current_income: currentPassiveDollarsSchema,
        current_loss: currentPassiveDollarsSchema,
      }).strict(),
    ).min(1),
  }).strict(),
).min(1);
