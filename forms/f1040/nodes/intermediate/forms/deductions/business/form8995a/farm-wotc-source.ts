import { qualifiedTipQbiSourceSchema } from "../form8995/qualified-tips.ts";
import { independentOwnerHealthSourceSchema } from "../../../adjustments/health/form7206/independent-owner.ts";
import { z } from "zod";
import { itemSchema as farmSchema } from "../../../income/business/schedule_f/model.ts";
import { itemSchema as businessSchema } from "../../../../../inputs/income/business/schedule_c/model.ts";
import { ownerSourcesSchema } from "../../../taxes/self-employment/schedule_se/owner-calculation.ts";
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
  qualified_tip_qbi_source: qualifiedTipQbiSourceSchema.optional(),
  joint_wages_total: z.number().nonnegative(),
}).strict();
export type FarmWotcSource = z.infer<typeof farmWotcSourceSchema>;
