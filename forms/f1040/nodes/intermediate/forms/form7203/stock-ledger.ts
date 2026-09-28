import { z } from "zod";

// A single original-shareholder stock block with only a current K-1 box-1
// ordinary loss. This is source evidence, not a generic S-corporation basis
// history or a substitute for the filed Form 7203.
export const reviewedStockLossLedgerSchema = z.object({
  shareholder_ssn: z.string().regex(/^\d{9}$/),
  shareholder_name_as_on_k1: z.string().regex(
    /^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/,
  ).max(35),
  corporation_ein: z.string().regex(/^\d{9}$/),
  beginning_stock_basis: z.number().int().nonnegative(),
  beginning_basis_workpaper_reference: z.string().trim().min(1),
  original_shareholder: z.literal(true),
  all_shares_one_stock_block: z.literal(true),
  no_current_year_stock_transactions: z.literal(true),
  no_section_1367_1_g_election: z.literal(true),
  no_other_2025_stock_basis_changes: z.literal(true),
  no_other_schedule_e_activity: z.literal(true),
  materially_participated_in_s_corporation: z.literal(true),
  material_participation_workpaper_reference: z.string().trim().min(1),
  no_shareholder_debt_or_repayments: z.literal(true),
  no_prior_year_suspended_losses: z.literal(true),
  no_at_risk_or_passive_limitation: z.literal(true),
}).strict();

export type ReviewedStockLossLedger = z.infer<
  typeof reviewedStockLossLedgerSchema
>;
