import { z } from "zod";

// One reviewed annual inventory binds both sections to the same living holder.
export const pairedArcherActivityReviewSchema = z.object({
  source_reference: z.string().trim().min(1),
  includes_ltc: z.boolean(),
  no_other_msa_activity_confirmed: z.literal(true),
  medical_expenses_separate_from_ltc_costs_and_reimbursements_confirmed: z
    .literal(true),
}).strict();
