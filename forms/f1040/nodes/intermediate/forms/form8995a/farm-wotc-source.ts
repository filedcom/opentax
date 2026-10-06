import { independentOwnerHealthSourceSchema } from "../form7206/independent-owner.ts";
import { z } from "zod";
import { itemSchema as farmSchema } from "../schedule_f/model.ts";
import { itemSchema as businessSchema } from "../../../inputs/schedule_c/model.ts";
import { ownerSourcesSchema } from "../schedule_se/owner-calculation.ts";
const business = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("schedule_f"),
    item: farmSchema,
    determined_wage_reduction: z.number().nonnegative(),
  }),
  z.object({
    kind: z.literal("schedule_c"),
    item: businessSchema,
    determined_wage_reduction: z.number().nonnegative(),
  }),
]);
export const farmWotcSourceSchema = z.object({
  businesses: z.array(business).min(1).max(3),
  se_tax_deduction: z.number().nonnegative(),
  joint_se_source: ownerSourcesSchema.optional(),
  taxpayer_ssn: z.string().regex(/^\d{9}$/),
  independent_health_plans_source: independentOwnerHealthSourceSchema
    .optional(),
  se_health_insurance_deduction: z.number().nonnegative().optional(),
  joint_wages_total: z.number().nonnegative(),
}).strict();
export type FarmWotcSource = z.infer<typeof farmWotcSourceSchema>;
