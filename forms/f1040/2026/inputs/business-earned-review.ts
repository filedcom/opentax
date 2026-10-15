import { z } from "zod";
const reference = z.string().trim().min(1);
const identity = {
  business_reference: reference,
  record_reference: reference,
};
/** Source review of who/what produced income; never a final credit amount. */
export const businessEarnedReview2026Schema = z.object({
  record_reference: reference,
  activities: z.array(z.discriminatedUnion("kind", [
    z.object({
      ...identity,
      kind: z.literal("owner_services_only"),
      capital_not_an_income_producing_factor: z.literal(true),
    }).strict(),
    z.object({
      ...identity,
      kind: z.literal("services_and_capital"),
      both_material_income_producing_factors: z.literal(true),
      reasonable_compensation_record_reference: reference,
      reasonable_compensation_for_owner_services: z.number().finite()
        .nonnegative().max(1_000_000_000),
    }).strict(),
    z.object({ ...identity, kind: z.literal("statutory_employee") }).strict(),
  ])).min(1).max(100),
}).strict();
